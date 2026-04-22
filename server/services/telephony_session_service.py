import json
import logging
import os
from datetime import datetime
from threading import Lock
from typing import Any, Optional

from sqlalchemy.orm import Session

from models import TelephonySession, ThesisProject

logger = logging.getLogger(__name__)

TELEPHONY_THESIS_USER_ID = os.getenv("TELEPHONY_THESIS_USER_ID", "").strip()
TELEPHONY_PHONE_NUMBER = os.getenv("THESIS_PHONE_NUMBER", "").strip()


class TelephonySessionService:
    _MAX_EVENT_LOG = 50
    _MAX_MESSAGE_HISTORY = 120
    _MAX_TRANSCRIPT_HISTORY = 120

    def __init__(self):
        self._context_cache: dict[str, dict[str, Any]] = {}
        self._cache_lock = Lock()

    def _parse_json(self, raw: Optional[str], fallback: Any):
        if not raw:
            return fallback
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return fallback

    def _serialize(self, value: Any) -> str:
        return json.dumps(value, default=str)

    def _cache_context(self, call_id: str, context: dict[str, Any]):
        with self._cache_lock:
            self._context_cache[call_id] = dict(context)

    def cache_context(self, call_id: str, context: dict[str, Any]):
        self._cache_context(call_id, context)

    def get_cached_context(self, call_id: str) -> dict[str, Any]:
        with self._cache_lock:
            return dict(self._context_cache.get(call_id, {}))

    def clear_cached_context(self, call_id: str):
        with self._cache_lock:
            self._context_cache.pop(call_id, None)

    def _trim_text(self, value: Optional[str], limit: int = 220) -> Optional[str]:
        if value is None:
            return None
        cleaned = " ".join(str(value).split())
        if len(cleaned) <= limit:
            return cleaned
        clipped = cleaned[:limit].rsplit(" ", 1)[0].rstrip(" ,;:")
        return f"{clipped or cleaned[:limit]}..."

    def _sanitize_message_entry(self, message: dict[str, Any]) -> dict[str, Any]:
        entry: dict[str, Any] = {}
        for key in ("role", "time", "endTime", "secondsFromStart", "duration", "source"):
            if message.get(key) is not None:
                entry[key] = message[key]

        text = message.get("message") or message.get("text")
        if text:
            entry["message"] = self._trim_text(text, limit=260)

        metadata = message.get("metadata") or {}
        if metadata.get("wordLevelConfidence"):
            entry["wordCount"] = len(metadata["wordLevelConfidence"])

        return entry

    def _message_key(self, message: dict[str, Any]) -> tuple[Any, ...]:
        return (
            message.get("role"),
            message.get("message"),
            message.get("time"),
            message.get("endTime"),
        )

    def _dedupe_messages(self, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
        deduped: list[dict[str, Any]] = []
        seen: set[tuple[Any, ...]] = set()
        for item in messages:
            sanitized = self._sanitize_message_entry(item)
            if not sanitized:
                continue
            key = self._message_key(sanitized)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(sanitized)
        return deduped[-self._MAX_MESSAGE_HISTORY :]

    def _sanitize_artifacts(self, artifacts: dict[str, Any]) -> dict[str, Any]:
        if not artifacts:
            return {}

        sanitized: dict[str, Any] = {}
        transcript = artifacts.get("transcript")
        if transcript:
            sanitized["transcript"] = transcript

        recording = artifacts.get("recording")
        if recording:
            sanitized["recording"] = recording

        if artifacts.get("hangDetected") is not None:
            sanitized["hangDetected"] = bool(artifacts.get("hangDetected"))

        return sanitized

    def _sanitize_event_payload(self, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        message = payload.get("message") or {}
        call = message.get("call") or {}
        summary: dict[str, Any] = {
            "type": message.get("type", event_type),
            "callId": call.get("id"),
            "phoneNumberId": call.get("phoneNumberId"),
            "status": message.get("status"),
            "role": message.get("role"),
            "transcriptType": message.get("transcriptType"),
            "timestamp": message.get("timestamp"),
        }

        transcript = message.get("transcript")
        if transcript:
            summary["transcript"] = self._trim_text(transcript, limit=180)

        text = message.get("text")
        if text:
            summary["text"] = self._trim_text(text, limit=180)

        assistant = message.get("assistant") or {}
        if assistant:
            summary["assistant"] = {
                "name": assistant.get("name"),
                "firstMessage": self._trim_text(assistant.get("firstMessage"), limit=120),
            }

        messages = message.get("messages") or []
        if messages:
            sanitized_messages = self._dedupe_messages(messages)
            summary["messagesCount"] = len(sanitized_messages)
            if sanitized_messages:
                summary["lastMessage"] = sanitized_messages[-1]

        artifact = message.get("artifact") or {}
        if artifact:
            sanitized_artifact = self._sanitize_artifacts(artifact)
            if sanitized_artifact:
                summary["artifact"] = sanitized_artifact

        return {key: value for key, value in summary.items() if value not in (None, "", [], {})}

    def _best_reference_clip(self, reference_clips: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
        completed = [
            item for item in reference_clips
            if item.get("completed") and item.get("file_path")
        ]
        if not completed:
            return None

        def sort_key(item: dict[str, Any]):
            return (
                float(item.get("duration_seconds") or 0.0),
                item.get("recorded_at") or "",
                item.get("clip_id") or "",
            )

        return sorted(completed, key=sort_key, reverse=True)[0]

    def resolve_thesis_project(self, db: Session) -> Optional[ThesisProject]:
        query = db.query(ThesisProject)
        if TELEPHONY_THESIS_USER_ID:
            project = query.filter(ThesisProject.user_id == TELEPHONY_THESIS_USER_ID).first()
            if project:
                return project

        projects = query.order_by(ThesisProject.updated_at.desc(), ThesisProject.created_at.desc()).all()
        if not projects:
            return None

        scored_projects: list[tuple[int, ThesisProject]] = []
        for project in projects:
            voice_profile = self._parse_json(project.voice_profile_json, {})
            reference_clips = self._parse_json(project.phrase_progress_json, [])
            completed_clips = [
                item for item in reference_clips if item.get("completed") and item.get("file_path")
            ]

            score = 0
            if completed_clips:
                score += 10
            if voice_profile.get("status") == "ready_for_agent":
                score += 5
            if voice_profile.get("preview_available"):
                score += 2

            scored_projects.append((score, project))

        scored_projects.sort(
            key=lambda item: (
                item[0],
                item[1].updated_at or item[1].created_at,
                item[1].created_at,
            ),
            reverse=True,
        )
        return scored_projects[0][1]

    def build_call_context(self, db: Session) -> dict[str, Any]:
        project = self.resolve_thesis_project(db)
        if not project:
            return {
                "thesis_project_id": None,
                "user_id": None,
                "agent_config": {},
                "phone_config": {},
                "voice_profile": {},
                "reference_clips": [],
                "voice_prompt_path": None,
            }

        agent_config = self._parse_json(project.agent_config_json, {})
        phone_config = self._parse_json(project.phone_config_json, {})
        if TELEPHONY_PHONE_NUMBER:
            phone_config["phone_number"] = TELEPHONY_PHONE_NUMBER
        voice_profile = self._parse_json(project.voice_profile_json, {})
        reference_clips = self._parse_json(project.phrase_progress_json, [])
        best_clip = self._best_reference_clip(reference_clips)
        return {
            "thesis_project_id": project.id,
            "user_id": project.user_id,
            "voice_profile_name": project.voice_profile_name,
            "agent_config": agent_config,
            "phone_config": phone_config,
            "voice_profile": voice_profile,
            "reference_clips": reference_clips,
            "voice_prompt_path": best_clip.get("file_path") if best_clip else None,
        }

    def get_session(self, db: Session, call_id: str) -> Optional[TelephonySession]:
        return db.query(TelephonySession).filter(TelephonySession.call_id == call_id).first()

    def upsert_session(
        self,
        db: Session,
        *,
        call_id: str,
        provider: str,
        mode: str,
        status: str,
        assistant_id: Optional[str] = None,
        phone_number_id: Optional[str] = None,
        inbound_number: Optional[str] = None,
        customer_number: Optional[str] = None,
        metadata_updates: Optional[dict[str, Any]] = None,
        last_event_type: Optional[str] = None,
    ) -> TelephonySession:
        session = self.get_session(db, call_id)
        if not session:
            context = self.build_call_context(db)
            self._cache_context(call_id, context)
            session = TelephonySession(
                provider=provider,
                call_id=call_id,
                mode=mode,
                status=status,
                assistant_id=assistant_id,
                phone_number_id=phone_number_id,
                inbound_number=inbound_number,
                customer_number=customer_number,
                user_id=context.get("user_id"),
                thesis_project_id=context.get("thesis_project_id"),
                session_metadata_json=self._serialize(
                    {
                        "context": context,
                        **(metadata_updates or {}),
                    }
                ),
                messages_json=self._serialize([]),
                transcript_json=self._serialize([]),
                artifacts_json=self._serialize({}),
                last_event_type=last_event_type,
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            return session

        if assistant_id is not None:
            session.assistant_id = assistant_id
        if phone_number_id is not None:
            session.phone_number_id = phone_number_id
        if inbound_number is not None:
            session.inbound_number = inbound_number
        if customer_number is not None:
            session.customer_number = customer_number
        session.mode = mode or session.mode
        session.status = status or session.status
        session.last_event_type = last_event_type or session.last_event_type

        metadata = self._parse_json(session.session_metadata_json, {})
        if metadata_updates:
            metadata.update(metadata_updates)
        if not self.get_cached_context(call_id):
            self._cache_context(call_id, metadata.get("context", {}))
        session.session_metadata_json = self._serialize(metadata)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def append_event(self, db: Session, call_id: str, event_type: str, payload: dict[str, Any]):
        session = self.get_session(db, call_id)
        if not session:
            logger.warning("Dropping telephony event because no session exists for call_id=%s type=%s", call_id, event_type)
            return

        metadata = self._parse_json(session.session_metadata_json, {})
        event_log = metadata.get("event_log", [])
        event_log.append(
            {
                "type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "payload": self._sanitize_event_payload(event_type, payload),
            }
        )
        metadata["event_log"] = event_log[-self._MAX_EVENT_LOG :]
        session.session_metadata_json = self._serialize(metadata)
        session.last_event_type = event_type
        db.add(session)
        db.commit()

    def append_messages(self, db: Session, call_id: str, messages: list[dict[str, Any]]):
        session = self.get_session(db, call_id)
        if not session:
            return
        existing = self._parse_json(session.messages_json, [])
        combined = self._dedupe_messages(existing + (messages or []))
        if combined == existing:
            return
        session.messages_json = self._serialize(combined)
        db.add(session)
        db.commit()

    def append_transcript_entry(self, db: Session, call_id: str, entry: dict[str, Any]):
        session = self.get_session(db, call_id)
        if not session:
            return
        existing = self._parse_json(session.transcript_json, [])
        cleaned = {
            "role": entry.get("role"),
            "transcriptType": entry.get("transcriptType"),
            "transcript": self._trim_text(entry.get("transcript"), limit=220),
            "originalTranscript": self._trim_text(entry.get("originalTranscript"), limit=220),
            "timestamp": entry.get("timestamp"),
        }
        existing.append({key: value for key, value in cleaned.items() if value not in (None, "")})
        session.transcript_json = self._serialize(existing[-self._MAX_TRANSCRIPT_HISTORY :])
        db.add(session)
        db.commit()

    def update_artifacts(self, db: Session, call_id: str, artifacts: dict[str, Any], status: Optional[str] = None):
        session = self.get_session(db, call_id)
        if not session:
            return
        current = self._parse_json(session.artifacts_json, {})
        current.update(self._sanitize_artifacts(artifacts))
        session.artifacts_json = self._serialize(current)
        if status:
            session.status = status
            if status == "ended":
                session.ended_at = datetime.utcnow()
                self.clear_cached_context(call_id)
        db.add(session)
        db.commit()

    def get_voice_prompt_path(self, session: TelephonySession) -> Optional[str]:
        metadata = self._parse_json(session.session_metadata_json, {})
        context = metadata.get("context", {})
        return context.get("voice_prompt_path")

    def get_context(self, session: TelephonySession) -> dict[str, Any]:
        metadata = self._parse_json(session.session_metadata_json, {})
        return metadata.get("context", {})

    def save_caller_lead(self, db: Session, call_id: str, lead: dict[str, Any]) -> dict[str, Any]:
        session = self.get_session(db, call_id)
        if not session:
            return {"saved": False, "reason": "session_not_found"}
        metadata = self._parse_json(session.session_metadata_json, {})
        leads = metadata.get("captured_leads", [])
        leads.append(
            {
                **lead,
                "captured_at": datetime.utcnow().isoformat(),
            }
        )
        metadata["captured_leads"] = leads[-20:]
        session.session_metadata_json = self._serialize(metadata)
        db.add(session)
        db.commit()
        return {"saved": True, "leadCount": len(metadata["captured_leads"])}


telephony_session_service = TelephonySessionService()
