import base64
import contextlib
import hashlib
import io
import json
import os
import re
import time
import unicodedata
from pathlib import Path
from threading import Lock
from urllib.error import URLError
from urllib.request import Request, urlopen

import torch
import torchaudio


class ThesisVoiceService:
    def __init__(self):
        self.repo_root = Path(__file__).resolve().parents[2]
        self.cache_root = self.repo_root / "server" / ".cache"
        self.hf_home = self.cache_root / "huggingface"
        self.xdg_home = self.cache_root / "xdg"
        self.outputs_root = self.repo_root / "server" / "generated_audio"
        self.daemon_url = os.getenv("THESIS_VOICE_DAEMON_URL", "http://127.0.0.1:8011")
        self.daemon_mode = os.getenv("THESIS_VOICE_DAEMON_MODE", "false").lower() in {"1", "true", "yes", "on"}
        self.model_variant = os.getenv("THESIS_VOICE_MODEL", "turbo").strip().lower()
        self.conversation_model_variant = os.getenv("THESIS_CONVERSATION_VOICE_MODEL", "turbo").strip().lower()
        self.max_cached_wavs_per_user_variant = max(1, int(os.getenv("THESIS_AUDIO_CACHE_MAX_WAVS", "40")))
        self.max_cached_pcms_per_user_variant = max(1, int(os.getenv("THESIS_AUDIO_CACHE_MAX_PCMS", "80")))
        self.cache_max_age_seconds = max(0, int(os.getenv("THESIS_AUDIO_CACHE_MAX_AGE_SECONDS", str(14 * 24 * 60 * 60))))
        self._models: dict[str, object] = {}
        self._preview_cache: dict[str, dict] = {}
        self._pcm_cache: dict[str, bytes] = {}
        self._lock = Lock()

        self.hf_home.mkdir(parents=True, exist_ok=True)
        self.xdg_home.mkdir(parents=True, exist_ok=True)
        self.outputs_root.mkdir(parents=True, exist_ok=True)

        os.environ.setdefault("HF_HOME", str(self.hf_home))
        os.environ.setdefault("XDG_CACHE_HOME", str(self.xdg_home))

    def _normalize_variant(self, variant: str | None) -> str:
        value = (variant or self.model_variant).strip().lower()
        return value if value in {"standard", "turbo"} else self.model_variant

    def _load_model(self, variant: str | None = None):
        normalized_variant = self._normalize_variant(variant)
        existing = self._models.get(normalized_variant)
        if existing is not None:
            return existing

        with self._lock:
            existing = self._models.get(normalized_variant)
            if existing is not None:
                return existing

            if normalized_variant == "turbo":
                from chatterbox.tts_turbo import ChatterboxTurboTTS

                self._models[normalized_variant] = self._run_quietly(ChatterboxTurboTTS.from_pretrained, device="cpu")
            else:
                from chatterbox.tts import ChatterboxTTS

                self._models[normalized_variant] = self._run_quietly(ChatterboxTTS.from_pretrained, device="cpu")
            return self._models[normalized_variant]

    def preload_variants(self):
        self._load_model(self.conversation_model_variant)

    def _run_quietly(self, func, *args, **kwargs):
        sink = io.StringIO()
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            return func(*args, **kwargs)

    def _split_text_into_chunks(self, text: str, max_chars: int = 220) -> list[str]:
        sentences = [segment.strip() for segment in re.split(r"(?<=[.!?])\s+", text.strip()) if segment.strip()]
        if not sentences:
            return [text.strip()] if text.strip() else []

        chunks: list[str] = []
        current = ""
        for sentence in sentences:
            candidate = f"{current} {sentence}".strip() if current else sentence
            if current and len(candidate) > max_chars:
                chunks.append(current)
                current = sentence
            else:
                current = candidate
        if current:
            chunks.append(current)
        return chunks

    def _generate_long_form(self, model, prompt_path: str, text: str):
        if hasattr(model, "prepare_conditionals"):
            model.prepare_conditionals(prompt_path)

        parts = []
        silence = torch.zeros(1, int(getattr(model, "sr", 24000) * 0.18))
        chunks = self._split_text_into_chunks(text)
        for index, chunk in enumerate(chunks):
            wav = self._run_quietly(
                model.generate,
                chunk,
                audio_prompt_path=None if hasattr(model, "prepare_conditionals") else prompt_path,
            )
            parts.append(wav)
            if index != len(chunks) - 1:
                parts.append(silence)

        if not parts:
            return self._run_quietly(model.generate, text, audio_prompt_path=prompt_path)

        return torch.cat(parts, dim=1)

    def _cache_key(self, *, prompt_path: str, text: str, variant: str) -> str:
        normalized_text = self._normalize_cache_text(text)
        digest = hashlib.sha1(f"{prompt_path}|{variant}|{normalized_text}".encode("utf-8")).hexdigest()
        return digest

    def _normalize_cache_text(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKC", text or "")
        normalized = (
            normalized.replace("’", "'")
            .replace("‘", "'")
            .replace("“", '"')
            .replace("”", '"')
            .replace("–", "-")
            .replace("—", "-")
        )
        return " ".join(normalized.split()).strip()

    def _touch(self, path: Path):
        now = time.time()
        os.utime(path, (now, now))

    def _prune_cache_files(self, *, safe_user_id: str, variant: str, suffix: str, keep: int):
        prefix = f"{safe_user_id}-{variant}-"
        files = [path for path in self.outputs_root.glob(f"{prefix}*{suffix}") if path.is_file()]
        if not files:
            return

        expired: list[Path] = []
        retained: list[Path] = []
        if self.cache_max_age_seconds > 0:
            cutoff = time.time() - self.cache_max_age_seconds
            for path in files:
                if path.stat().st_mtime < cutoff:
                    expired.append(path)
                else:
                    retained.append(path)
        else:
            retained = files

        retained.sort(key=lambda path: path.stat().st_mtime, reverse=True)
        for path in [*expired, *retained[keep:]]:
            try:
                path.unlink()
            except FileNotFoundError:
                pass

    def prune_output_cache(self):
        grouped: set[tuple[str, str, str]] = set()
        for path in self.outputs_root.iterdir():
            if not path.is_file() or path.suffix not in {".wav", ".pcm"}:
                continue
            stem = path.stem
            user_id, sep, remainder = stem.partition("-")
            if not sep:
                continue
            variant, sep, _ = remainder.partition("-")
            if not sep:
                continue
            grouped.add((user_id, variant, path.suffix))

        for safe_user_id, variant, suffix in grouped:
            keep = self.max_cached_wavs_per_user_variant if suffix == ".wav" else self.max_cached_pcms_per_user_variant
            self._prune_cache_files(
                safe_user_id=safe_user_id,
                variant=variant,
                suffix=suffix,
                keep=keep,
            )

    def _cached_preview_result(self, user_id: str, prompt_path: str, text: str, variant: str | None = None) -> dict | None:
        normalized_variant = self._normalize_variant(variant)
        cache_key = self._cache_key(prompt_path=prompt_path, text=text, variant=normalized_variant)
        cached = self._preview_cache.get(cache_key)
        if cached is not None:
            output_path = Path(cached["output_path"])
            if output_path.exists():
                self._touch(output_path)
                return cached
            self._preview_cache.pop(cache_key, None)

        safe_user_id = user_id.replace("/", "_")
        output_path = self.outputs_root / f"{safe_user_id}-{normalized_variant}-{cache_key[:12]}.wav"
        if output_path.exists():
            self._touch(output_path)
            audio_bytes = output_path.read_bytes()
            result = {
                "output_path": str(output_path),
                "sample_rate": 24000,
                "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
            }
            self._preview_cache[cache_key] = result
            return result

        return None

    def has_cached_preview(self, user_id: str, prompt_path: str, text: str, variant: str | None = None) -> bool:
        return self._cached_preview_result(user_id, prompt_path, text, variant=variant) is not None

    def generate_preview_local(self, user_id: str, prompt_path: str, text: str, variant: str | None = None) -> dict:
        normalized_variant = self._normalize_variant(variant)
        cache_key = self._cache_key(prompt_path=prompt_path, text=text, variant=normalized_variant)
        safe_user_id = user_id.replace("/", "_")
        output_path = self.outputs_root / f"{safe_user_id}-{normalized_variant}-{cache_key[:12]}.wav"
        cached = self._cached_preview_result(user_id, prompt_path, text, variant=variant)
        if cached is not None:
            return cached

        model = self._load_model(normalized_variant)
        if len(text) > 260:
            wav = self._generate_long_form(model, prompt_path, text)
        else:
            wav = self._run_quietly(model.generate, text, audio_prompt_path=prompt_path)

        torchaudio.save(str(output_path), wav, model.sr)
        self._touch(output_path)

        audio_bytes = output_path.read_bytes()
        result = {
            "output_path": str(output_path),
            "sample_rate": model.sr,
            "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
        }
        self._preview_cache[cache_key] = result
        self._prune_cache_files(
            safe_user_id=safe_user_id,
            variant=normalized_variant,
            suffix=".wav",
            keep=self.max_cached_wavs_per_user_variant,
        )
        return result

    def _generate_via_daemon(self, user_id: str, prompt_path: str, text: str, variant: str | None = None) -> dict:
        payload = json.dumps(
            {
                "user_id": user_id,
                "prompt_path": prompt_path,
                "text": text,
                "variant": self._normalize_variant(variant),
            }
        ).encode("utf-8")
        request = Request(
            f"{self.daemon_url}/generate-preview",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))

    def generate_preview(self, user_id: str, prompt_path: str, text: str, variant: str | None = None) -> dict:
        cached = self._cached_preview_result(user_id, prompt_path, text, variant=variant)
        if cached is not None:
            return cached

        if self.daemon_mode:
            try:
                return self._generate_via_daemon(user_id, prompt_path, text, variant=variant)
            except (URLError, TimeoutError, OSError, ValueError):
                pass

        return self.generate_preview_local(user_id, prompt_path, text, variant=variant)

    def _pcm_from_preview(self, preview: dict, sample_rate: int) -> bytes:
        waveform, preview_sample_rate = torchaudio.load(preview["output_path"])
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        if preview_sample_rate != sample_rate:
            waveform = torchaudio.functional.resample(waveform, preview_sample_rate, sample_rate)

        return (
            (waveform.clamp(-1.0, 1.0) * 32767.0)
            .short()
            .transpose(0, 1)
            .contiguous()
            .numpy()
            .astype("<i2")
            .tobytes()
        )

    def generate_phone_pcm_local(
        self,
        user_id: str,
        prompt_path: str,
        text: str,
        sample_rate: int,
        variant: str | None = None,
    ) -> bytes:
        normalized_variant = self._normalize_variant(variant)
        cache_key = self._cache_key(
            prompt_path=prompt_path,
            text=f"pcm:{sample_rate}:{text}",
            variant=normalized_variant,
        )
        cached = self._pcm_cache.get(cache_key)
        if cached is not None:
            return cached

        safe_user_id = user_id.replace("/", "_")
        output_path = self.outputs_root / f"{safe_user_id}-{normalized_variant}-{cache_key[:12]}.pcm"
        if output_path.exists():
            self._touch(output_path)
            pcm_bytes = output_path.read_bytes()
            self._pcm_cache[cache_key] = pcm_bytes
            return pcm_bytes

        preview = self.generate_preview_local(user_id, prompt_path, text, variant=normalized_variant)
        pcm_bytes = self._pcm_from_preview(preview, sample_rate)
        output_path.write_bytes(pcm_bytes)
        self._touch(output_path)
        self._pcm_cache[cache_key] = pcm_bytes
        self._prune_cache_files(
            safe_user_id=safe_user_id,
            variant=normalized_variant,
            suffix=".pcm",
            keep=self.max_cached_pcms_per_user_variant,
        )
        return pcm_bytes

    def generate_phone_pcm(
        self,
        user_id: str,
        prompt_path: str,
        text: str,
        sample_rate: int,
        variant: str | None = None,
    ) -> bytes:
        normalized_variant = self._normalize_variant(variant)
        cache_key = self._cache_key(
            prompt_path=prompt_path,
            text=f"pcm:{sample_rate}:{text}",
            variant=normalized_variant,
        )
        cached = self._pcm_cache.get(cache_key)
        if cached is not None:
            return cached

        safe_user_id = user_id.replace("/", "_")
        output_path = self.outputs_root / f"{safe_user_id}-{normalized_variant}-{cache_key[:12]}.pcm"
        if output_path.exists():
            self._touch(output_path)
            pcm_bytes = output_path.read_bytes()
            self._pcm_cache[cache_key] = pcm_bytes
            return pcm_bytes

        preview = self.generate_preview(user_id, prompt_path, text, variant=normalized_variant)
        pcm_bytes = self._pcm_from_preview(preview, sample_rate)
        output_path.write_bytes(pcm_bytes)
        self._touch(output_path)
        self._pcm_cache[cache_key] = pcm_bytes
        self._prune_cache_files(
            safe_user_id=safe_user_id,
            variant=normalized_variant,
            suffix=".pcm",
            keep=self.max_cached_pcms_per_user_variant,
        )
        return pcm_bytes

    def has_cached_phone_pcm(
        self,
        user_id: str,
        prompt_path: str,
        text: str,
        sample_rate: int,
        variant: str | None = None,
    ) -> bool:
        normalized_variant = self._normalize_variant(variant)
        cache_key = self._cache_key(
            prompt_path=prompt_path,
            text=f"pcm:{sample_rate}:{text}",
            variant=normalized_variant,
        )
        if cache_key in self._pcm_cache:
            return True

        safe_user_id = user_id.replace("/", "_")
        output_path = self.outputs_root / f"{safe_user_id}-{normalized_variant}-{cache_key[:12]}.pcm"
        return output_path.exists()


thesis_voice_service = ThesisVoiceService()
