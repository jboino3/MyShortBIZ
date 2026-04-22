from __future__ import annotations

import json
import threading
import time
from datetime import datetime
from pathlib import Path

from db import SessionLocal
from models import ThesisProject
from services.thesis_agent_service import thesis_agent_service
from services.thesis_voice_service import thesis_voice_service


class ThesisGenerationService:
    def __init__(self):
        self._jobs: dict[int, threading.Thread] = {}
        self._conversation_audio_jobs: dict[str, dict] = {}
        self._lock = threading.Lock()

    def _parse_json(self, raw: str | None, fallback):
        if not raw:
            return fallback
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return fallback

    def _serialize(self, value) -> str:
        return json.dumps(value, default=str)

    def _existing_completed_clips(self, reference_clips: list[dict]) -> list[dict]:
        return [
            item
            for item in reference_clips
            if item.get("completed") and item.get("file_path") and Path(item["file_path"]).exists()
        ]

    def _best_existing_clip(self, reference_clips: list[dict]) -> dict | None:
        completed = self._existing_completed_clips(reference_clips)
        if not completed:
            return None
        return sorted(
            completed,
            key=lambda item: (
                float(item.get("duration_seconds") or 0.0),
                item.get("recorded_at") or "",
                item.get("clip_id") or "",
            ),
            reverse=True,
        )[0]

    def _update_voice_profile(self, project_id: int, updater):
        db = SessionLocal()
        try:
            project = db.query(ThesisProject).filter(ThesisProject.id == project_id).first()
            if not project:
                return
            voice_profile = self._parse_json(project.voice_profile_json, {})
            next_voice_profile = updater(voice_profile)
            project.voice_profile_json = self._serialize(next_voice_profile)
            db.add(project)
            db.commit()
        finally:
            db.close()

    def _promote_reference_prompt(self, *, project_id: int, user_id: str, source_prompt_path: str) -> str:
        preserved_prompt_path = thesis_voice_service.preserve_reference_prompt(user_id, source_prompt_path)
        db = SessionLocal()
        try:
            project = db.query(ThesisProject).filter(ThesisProject.id == project_id).first()
            if not project:
                return preserved_prompt_path

            reference_clips = self._parse_json(project.phrase_progress_json, [])
            updated = False
            for item in reference_clips:
                if item.get("file_path") == source_prompt_path:
                    item["file_path"] = preserved_prompt_path
                    item["clip_label"] = Path(preserved_prompt_path).name
                    updated = True
                    break

            if not updated:
                best_clip = self._best_existing_clip(reference_clips)
                if best_clip:
                    best_clip["file_path"] = preserved_prompt_path
                    best_clip["clip_label"] = Path(preserved_prompt_path).name
                    updated = True

            if updated:
                project.phrase_progress_json = self._serialize(reference_clips)
                db.add(project)
                db.commit()
        finally:
            db.close()

        if thesis_voice_service.is_reference_upload_path(source_prompt_path):
            thesis_voice_service.clear_reference_uploads_for_user(user_id)
        return preserved_prompt_path

    def migrate_reference_prompts_and_cleanup_uploads(self):
        db = SessionLocal()
        try:
            projects = db.query(ThesisProject).all()
            for project in projects:
                voice_profile = self._parse_json(project.voice_profile_json, {})
                if not (
                    voice_profile.get("preview_available")
                    or voice_profile.get("status") in {"ready", "ready_for_agent"}
                ):
                    continue

                reference_clips = self._parse_json(project.phrase_progress_json, [])
                best_clip = self._best_existing_clip(reference_clips)
                if not best_clip:
                    continue

                preserved_prompt_path = thesis_voice_service.preserve_reference_prompt(
                    project.user_id,
                    best_clip["file_path"],
                )

                if best_clip.get("file_path") != preserved_prompt_path:
                    for item in reference_clips:
                        if (
                            item.get("clip_id") == best_clip.get("clip_id")
                            and item.get("file_path") == best_clip.get("file_path")
                        ):
                            item["file_path"] = preserved_prompt_path
                            item["clip_label"] = Path(preserved_prompt_path).name
                            project.phrase_progress_json = self._serialize(reference_clips)
                            db.add(project)
                            db.commit()
                            break

                thesis_voice_service.clear_reference_uploads_for_user(project.user_id)
        finally:
            db.close()

        thesis_voice_service.prune_reference_uploads()

    def _set_progress(self, project_id: int, *, status: str, progress: int, notes: str, attached_to_agent: bool | None = None):
        def updater(voice_profile: dict):
            voice_profile["status"] = status
            voice_profile["generation_progress"] = progress
            voice_profile["generation_target"] = 1000
            voice_profile["notes"] = notes
            voice_profile.setdefault("conversation_history", [])
            voice_profile.setdefault("preview_available", False)
            voice_profile.setdefault("recorded_clips", 0)
            voice_profile.setdefault("conversation_cache_ready", False)
            voice_profile.setdefault("conversation_cache_progress", 0)
            voice_profile.setdefault("conversation_cache_target", 0)
            if attached_to_agent is not None:
                voice_profile["attached_to_agent"] = attached_to_agent
            return voice_profile

        self._update_voice_profile(project_id, updater)

    def start_generation(
        self,
        *,
        project_id: int,
        user_id: str,
        prompt_path: str,
        preview_text: str,
        recorded_clips: int,
        attach_to_agent: bool,
        profile_name: str | None,
    ) -> bool:
        with self._lock:
            current = self._jobs.get(project_id)
            if current and current.is_alive():
                return False

            worker = threading.Thread(
                target=self._run_generation,
                kwargs={
                    "project_id": project_id,
                    "user_id": user_id,
                    "prompt_path": prompt_path,
                    "preview_text": preview_text,
                    "recorded_clips": recorded_clips,
                    "attach_to_agent": attach_to_agent,
                    "profile_name": profile_name,
                },
                daemon=True,
            )
            self._jobs[project_id] = worker
            worker.start()
            return True

    def start_cache_warmup(self, project_id: int) -> bool:
        with self._lock:
            current = self._jobs.get(project_id)
            if current and current.is_alive():
                return False

            worker = threading.Thread(
                target=self._warm_conversation_cache,
                kwargs={"project_id": project_id},
                daemon=True,
            )
            self._jobs[project_id] = worker
            worker.start()
            return True

    def start_conversation_audio_job(
        self,
        *,
        job_id: str,
        user_id: str,
        prompt_path: str,
        reply_text: str,
        variant: str,
    ) -> dict:
        with self._lock:
            existing = self._conversation_audio_jobs.get(job_id)
            if existing:
                if existing.get("status") == "ready" and existing.get("audio_url"):
                    return dict(existing)
                if existing.get("status") in {"queued", "generating"}:
                    return dict(existing)
                # Retry errored jobs instead of pinning this reply to a permanent failure state.
                self._conversation_audio_jobs.pop(job_id, None)

            if thesis_voice_service.has_cached_preview(
                user_id,
                prompt_path,
                reply_text,
                variant=variant,
            ):
                cached = thesis_voice_service.generate_preview(
                    user_id,
                    prompt_path,
                    reply_text,
                    variant=variant,
                )
                audio_url = f"/thesis/generated-audio/{cached['output_path'].split('/')[-1]}"
                self._conversation_audio_jobs[job_id] = {
                    "status": "ready",
                    "audio_url": audio_url,
                    "error": None,
                }
                return dict(self._conversation_audio_jobs[job_id])

            self._conversation_audio_jobs[job_id] = {
                "status": "queued",
                "audio_url": None,
                "error": None,
            }

            worker = threading.Thread(
                target=self._run_conversation_audio_job,
                kwargs={
                    "job_id": job_id,
                    "user_id": user_id,
                    "prompt_path": prompt_path,
                    "reply_text": reply_text,
                    "variant": variant,
                },
                daemon=True,
            )
            worker.start()
            return dict(self._conversation_audio_jobs[job_id])

    def get_conversation_audio_job(self, job_id: str) -> dict | None:
        with self._lock:
            job = self._conversation_audio_jobs.get(job_id)
            if not job:
                return None
            return dict(job)

    def _set_conversation_audio_job(self, job_id: str, **updates):
        with self._lock:
            existing = self._conversation_audio_jobs.get(job_id)
            if not existing:
                return
            existing.update(updates)

    def _run_conversation_audio_job(
        self,
        *,
        job_id: str,
        user_id: str,
        prompt_path: str,
        reply_text: str,
        variant: str,
    ):
        self._set_conversation_audio_job(job_id, status="generating", error=None)
        try:
            preview = thesis_voice_service.generate_preview(
                user_id,
                prompt_path,
                reply_text,
                variant=variant,
            )
            self._set_conversation_audio_job(
                job_id,
                status="ready",
                audio_url=f"/thesis/generated-audio/{preview['output_path'].split('/')[-1]}",
                error=None,
            )
        except Exception as exc:  # noqa: BLE001
            self._set_conversation_audio_job(
                job_id,
                status="error",
                error=str(exc),
            )

    def _run_generation(
        self,
        *,
        project_id: int,
        user_id: str,
        prompt_path: str,
        preview_text: str,
        recorded_clips: int,
        attach_to_agent: bool,
        profile_name: str | None,
    ):
        self._set_progress(
            project_id,
            status="generating",
            progress=30,
            notes="Queued the local clone job and validating the reference clip.",
            attached_to_agent=False,
        )

        result_holder: dict[str, dict] = {}
        error_holder: dict[str, str] = {}

        def generate():
            try:
                result_holder["preview"] = thesis_voice_service.generate_preview(user_id, prompt_path, preview_text)
            except Exception as exc:  # noqa: BLE001
                error_holder["error"] = str(exc)

        generation_thread = threading.Thread(target=generate, daemon=True)
        generation_thread.start()

        progress = 90
        started_at = time.time()
        while generation_thread.is_alive():
            self._set_progress(
                project_id,
                status="generating",
                progress=min(progress, 920),
                notes="Generating the cloned voice preview with the current local model. This path is slower but preserves the best voice quality.",
                attached_to_agent=False,
            )
            time.sleep(1.0)
            elapsed = time.time() - started_at
            progress = min(920, 90 + int(elapsed * 22))

        generation_thread.join()

        if error_holder.get("error"):
            self._update_voice_profile(
                project_id,
                lambda voice_profile: {
                    **voice_profile,
                    "status": "error",
                    "attached_to_agent": False,
                    "recorded_clips": recorded_clips,
                    "preview_available": False,
                    "generated_at": None,
                    "preview_text": preview_text,
                    "preview_audio_base64": None,
                    "generation_progress": 1000,
                    "generation_target": 1000,
                    "conversation_ready": False,
                    "conversation_cache_ready": False,
                    "conversation_cache_progress": 0,
                    "conversation_cache_target": 0,
                    "notes": f"Local voice generation failed: {error_holder['error']}",
                    "generation_error": error_holder["error"],
                },
            )
            return

        preview = result_holder["preview"]
        self._promote_reference_prompt(
            project_id=project_id,
            user_id=user_id,
            source_prompt_path=prompt_path,
        )

        def finalize(voice_profile: dict):
            history = voice_profile.get("conversation_history") or []
            return {
                **voice_profile,
                "status": "ready_for_agent",
                "attached_to_agent": attach_to_agent,
                "recorded_clips": recorded_clips,
                "preview_available": True,
                "generated_at": datetime.utcnow().isoformat(),
                "preview_text": preview_text,
                "preview_audio_base64": preview["audio_base64"],
                "generation_progress": 1000,
                "generation_target": 1000,
                "generation_error": None,
                "conversation_ready": True,
                "conversation_cache_ready": False,
                "conversation_cache_progress": 0,
                "conversation_cache_target": 0,
                "conversation_history": history,
                "notes": (
                    f"Local zero-shot voice clone generated from the uploaded reference audio."
                    if profile_name
                    else "Local zero-shot voice clone generated from the uploaded reference audio."
                ),
            }

        self._update_voice_profile(project_id, finalize)
        self._warm_conversation_cache(project_id)

    def _warm_conversation_cache(self, project_id: int):
        db = SessionLocal()
        try:
            project = db.query(ThesisProject).filter(ThesisProject.id == project_id).first()
            if not project:
                return
            agent_config = self._parse_json(project.agent_config_json, {})
            phone_config = self._parse_json(project.phone_config_json, {})
            reference_clips = self._parse_json(project.phrase_progress_json, [])
            best_clip = self._best_existing_clip(reference_clips)
            if not best_clip:
                return
            reply_texts = thesis_agent_service.warmup_replies(
                agent_config=agent_config,
                phone_config=phone_config,
                business_name=agent_config.get("business_name", "MyShortBIZ"),
            )
            unique_replies = list(dict.fromkeys(reply_texts))
            total_replies = max(len(unique_replies), 1)
            voice_profile = self._parse_json(project.voice_profile_json, {})
            voice_profile["conversation_cache_ready"] = False
            voice_profile["conversation_cache_progress"] = 0
            voice_profile["conversation_cache_target"] = total_replies
            voice_profile["notes"] = "Warming common replies for faster live responses."
            project.voice_profile_json = self._serialize(voice_profile)
            db.add(project)
            db.commit()

            completed_replies = 0
            for reply in unique_replies:
                thesis_voice_service.generate_preview(
                    project.user_id,
                    best_clip["file_path"],
                    reply,
                    variant=thesis_voice_service.conversation_model_variant,
                )
                completed_replies += 1
                voice_profile = self._parse_json(project.voice_profile_json, {})
                voice_profile["conversation_cache_progress"] = completed_replies
                voice_profile["conversation_cache_target"] = total_replies
                project.voice_profile_json = self._serialize(voice_profile)
                db.add(project)
                db.commit()
            voice_profile = self._parse_json(project.voice_profile_json, {})
            voice_profile["conversation_cache_ready"] = True
            voice_profile["conversation_cache_progress"] = total_replies
            voice_profile["conversation_cache_target"] = total_replies
            voice_profile["notes"] = "Common replies are warmed and ready for faster live responses."
            project.voice_profile_json = self._serialize(voice_profile)
            db.add(project)
            db.commit()
        except Exception:
            return
        finally:
            db.close()


thesis_generation_service = ThesisGenerationService()
