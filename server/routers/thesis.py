import json
import os
import hashlib
from datetime import datetime
from pathlib import Path
from time import perf_counter
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import get_db
from models import ThesisProject
from services.thesis_agent_service import thesis_agent_service
from services.thesis_generation_service import thesis_generation_service
from services.thesis_voice_service import thesis_voice_service
from .auth import get_current_user, UserOut

router = APIRouter(prefix="/thesis", tags=["thesis"])

THESIS_DEMO_MODE = os.getenv("THESIS_DEMO_MODE", "true").lower() in {"1", "true", "yes", "on"}
THESIS_PHONE_PROVIDER = os.getenv("THESIS_PHONE_PROVIDER", "Vapi")
THESIS_LIVE_PHONE_READY = os.getenv("THESIS_LIVE_PHONE_READY", "false").lower() in {"1", "true", "yes", "on"}
THESIS_PHONE_NUMBER = os.getenv("THESIS_PHONE_NUMBER", "+1 878-251-9238")
THESIS_UPLOAD_ROOT = os.getenv("THESIS_UPLOAD_ROOT", "server/uploads/thesis")
THESIS_CONVERSATION_VOICE_MODEL = os.getenv("THESIS_CONVERSATION_VOICE_MODEL", "turbo").strip().lower()


class ReferenceClipItem(BaseModel):
    clip_id: str
    label: str
    prompt: str
    completed: bool = False
    clip_label: Optional[str] = None
    file_path: Optional[str] = None
    recorded_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None


class ConsentState(BaseModel):
    profile_name: Optional[str] = None
    confirmed_owner: bool = False
    consent_to_clone: bool = False
    consent_to_delete: bool = False
    consent_business_use: bool = False
    acknowledged_disclosure: bool = False
    completed_at: Optional[datetime] = None


class VoiceProfileState(BaseModel):
    status: Literal["not_started", "recording", "ready", "generating", "ready_for_agent", "error"] = "not_started"
    attached_to_agent: bool = False
    recorded_clips: int = 0
    preview_available: bool = False
    generated_at: Optional[datetime] = None
    preview_text: Optional[str] = None
    preview_audio_base64: Optional[str] = None
    notes: Optional[str] = None
    generation_progress: int = 0
    generation_target: int = 1000
    generation_error: Optional[str] = None
    conversation_ready: bool = False
    conversation_cache_ready: bool = False
    conversation_cache_progress: int = 0
    conversation_cache_target: int = 0
    conversation_history: List[dict[str, Any]] = Field(default_factory=list)


class PhoneAgentConfig(BaseModel):
    agent_name: str = "Maya"
    business_name: str = "MyShortBIZ Demo Studio"
    greeting_script: str = (
        "Thanks for calling MyShortBIZ Demo Studio. This is Maya, our AI business phone agent. "
        "How can I help you today?"
    )
    business_description: str = (
        "A creator-focused business tools platform showcasing a consent-first voice assistant for inbound calls."
    )
    business_hours: str = "Monday to Friday, 9:00 AM to 6:00 PM"
    call_objective: str = "Answer FAQs, collect caller information, and book follow-up calls."
    fallback_behavior: str = "If unsure, collect the caller's name, reason for calling, and callback number."
    transfer_instructions: str = "Escalate urgent billing or technical incidents to a human callback within one business hour."
    after_hours_behavior: str = "Offer to take a voicemail summary and promise next-business-day follow-up."


class PhoneNumberConfig(BaseModel):
    phone_number: str = THESIS_PHONE_NUMBER
    forwarding_number: Optional[str] = None
    routing_mode: Literal["ai_first", "forward_only", "voicemail_after_hours"] = "ai_first"
    connection_status: Literal["not_connected", "connected", "demo_connected"] = "demo_connected"
    ownership_confirmed: bool = False
    ai_disclosure_enabled: bool = True
    notes: str = "Use Vapi to attach the business number to this backend, then route inbound calls to the thesis agent workflow."


class TalkNowGuideStep(BaseModel):
    title: str
    detail: str


class TestCallResult(BaseModel):
    scenario_id: str
    scenario_title: str
    caller: str
    outcome: str
    transcript: List[str]
    created_at: datetime


class ThesisProjectUpdate(BaseModel):
    active_step: Optional[str] = None
    reference_clips: Optional[List[ReferenceClipItem]] = None
    consent: Optional[ConsentState] = None
    voice_profile: Optional[VoiceProfileState] = None
    agent_config: Optional[PhoneAgentConfig] = None
    phone_config: Optional[PhoneNumberConfig] = None
    test_results: Optional[List[TestCallResult]] = None


class GenerateVoiceProfileRequest(BaseModel):
    attach_to_agent: bool = True
    preview_text: str = Field(default="Hello, this is the thesis voice clone speaking in my custom business phone voice.")


class VoicePreviewRequest(BaseModel):
    text: str = Field(default="Thank you for calling. I can answer questions, collect details, and route your request.")


class AgentConversationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)


class TestCallRequest(BaseModel):
    scenario_id: str = Field(default="new-appointment")
    scenario_title: str = Field(default="New appointment request")
    caller: str = Field(default="Jordan Lee")


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str
    created_at: str
    audio_base64: Optional[str] = None
    audio_url: Optional[str] = None
    audio_pending: bool = False
    audio_job_id: Optional[str] = None


class AgentConversationResponse(BaseModel):
    conversation_history: List[ConversationTurn]
    assistant_turn: ConversationTurn
    response_time_ms: int
    conversation_ready: bool


class AgentConversationResetResponse(BaseModel):
    conversation_history: List[ConversationTurn]
    conversation_ready: bool


class AgentThinkingAudioResponse(BaseModel):
    text: str
    audio_url: str


class AgentConversationAudioStatusResponse(BaseModel):
    status: Literal["queued", "generating", "ready", "error"]
    audio_url: Optional[str] = None
    error: Optional[str] = None


class ThesisProjectResponse(BaseModel):
    id: int
    active_step: str
    demo_mode: bool
    credits_required: bool
    phone_provider: str
    live_phone_ready: bool
    voice_profile_name: Optional[str]
    reference_clips: List[ReferenceClipItem]
    consent: ConsentState
    voice_profile: VoiceProfileState
    agent_config: PhoneAgentConfig
    phone_config: PhoneNumberConfig
    talknow_guide: List[TalkNowGuideStep]
    test_results: List[TestCallResult]
    created_at: datetime
    updated_at: datetime


def _parse_json(raw: Optional[str], fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def _serialize(value) -> str:
    return json.dumps(value, default=str)


def _best_reference_clip(clips: List[ReferenceClipItem]) -> Optional[ReferenceClipItem]:
    completed = [
        item
        for item in clips
        if item.completed and item.file_path and Path(item.file_path).exists()
    ]
    if not completed:
        return None

    return sorted(
        completed,
        key=lambda item: (
            float(item.duration_seconds or 0.0),
            item.recorded_at.isoformat() if item.recorded_at else "",
            item.clip_id,
        ),
        reverse=True,
    )[0]


def _default_consent() -> ConsentState:
    return ConsentState()


def _default_voice_profile() -> VoiceProfileState:
    return VoiceProfileState(
        notes="Upload or record one or more clean reference clips, then generate a zero-shot local voice clone."
    )


def _default_agent_config() -> PhoneAgentConfig:
    return PhoneAgentConfig()


def _default_phone_config() -> PhoneNumberConfig:
    return PhoneNumberConfig(connection_status="demo_connected" if THESIS_DEMO_MODE else "not_connected")


def _default_test_results() -> List[TestCallResult]:
    return []


def _talknow_guide() -> List[TalkNowGuideStep]:
    return [
        TalkNowGuideStep(
            title="Open the Vapi dashboard",
            detail="Sign in to Vapi, open the Phone Numbers section, and confirm the thesis number is present in your account.",
        ),
        TalkNowGuideStep(
            title="Confirm the thesis Vapi number",
            detail=f"Verify that the inbound Vapi number is {THESIS_PHONE_NUMBER} and that the Vapi phone number ID matches the backend configuration.",
        ),
        TalkNowGuideStep(
            title="Set the server URL or patch it from the CLI",
            detail="Use the provided configure_vapi_number.py script or the Vapi dashboard to point inbound calls at /telephony/vapi/assistant-request on this backend.",
        ),
        TalkNowGuideStep(
            title="Enable AI-answer disclosure",
            detail="Keep the greeting and assistant prompt configured so callers are told when they are speaking with an AI business phone agent using the cloned business voice.",
        ),
        TalkNowGuideStep(
            title="Verify public HTTPS reachability",
            detail="Expose the backend with ngrok or another tunnel and ensure Vapi can reach the public /telephony/vapi endpoints.",
        ),
        TalkNowGuideStep(
            title="Run a live check",
            detail=f"Call {THESIS_PHONE_NUMBER} from another device and confirm the assistant-request webhook, Vapi events webhook, and custom voice endpoint all complete successfully.",
        ),
    ]


def _uploads_root() -> Path:
    root = Path(THESIS_UPLOAD_ROOT)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[2] / root
    root.mkdir(parents=True, exist_ok=True)
    return root


def _conversation_cache_missing(project: ThesisProject, response: ThesisProjectResponse) -> bool:
    completed = [item for item in response.reference_clips if item.completed and item.file_path]
    best_clip = _best_reference_clip(completed)
    if not best_clip:
        return False
    replies = thesis_agent_service.warmup_replies(
        agent_config=response.agent_config.model_dump(mode="json"),
        phone_config=response.phone_config.model_dump(mode="json"),
        business_name=response.agent_config.business_name,
    )
    return any(
        not thesis_voice_service.has_cached_preview(
            project.user_id,
            best_clip.file_path,
            reply,
            variant=THESIS_CONVERSATION_VOICE_MODEL,
        )
        for reply in replies
    )


def _get_or_create_project(db: Session, current_user: UserOut) -> ThesisProject:
    project = db.query(ThesisProject).filter(ThesisProject.user_id == current_user.id).first()
    if project:
        return project

    project = ThesisProject(
        user_id=current_user.id,
        active_step="overview",
        demo_mode=THESIS_DEMO_MODE,
        credits_required=False,
        voice_profile_name="",
        phrase_progress_json=_serialize([]),
        consent_json=_serialize(_default_consent().model_dump(mode="json")),
        voice_profile_json=_serialize(_default_voice_profile().model_dump(mode="json")),
        agent_config_json=_serialize(_default_agent_config().model_dump(mode="json")),
        phone_config_json=_serialize(_default_phone_config().model_dump(mode="json")),
        test_results_json=_serialize([]),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def _to_response(project: ThesisProject) -> ThesisProjectResponse:
    phrase_progress = [ReferenceClipItem(**item) for item in _parse_json(project.phrase_progress_json, [])]
    consent = ConsentState(**_parse_json(project.consent_json, _default_consent().model_dump(mode="json")))
    voice_profile = VoiceProfileState(
        **_parse_json(project.voice_profile_json, _default_voice_profile().model_dump(mode="json"))
    )
    agent_config = PhoneAgentConfig(
        **_parse_json(project.agent_config_json, _default_agent_config().model_dump(mode="json"))
    )
    phone_config = PhoneNumberConfig(
        **_parse_json(project.phone_config_json, _default_phone_config().model_dump(mode="json"))
    )
    test_results = [TestCallResult(**item) for item in _parse_json(project.test_results_json, [])]

    return ThesisProjectResponse(
        id=project.id,
        active_step=project.active_step,
        demo_mode=project.demo_mode,
        credits_required=project.credits_required,
        phone_provider=THESIS_PHONE_PROVIDER,
        live_phone_ready=THESIS_LIVE_PHONE_READY,
        voice_profile_name=project.voice_profile_name,
        reference_clips=phrase_progress,
        consent=consent,
        voice_profile=voice_profile,
        agent_config=agent_config,
        phone_config=phone_config,
        talknow_guide=_talknow_guide(),
        test_results=test_results,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def _apply_update(project: ThesisProject, payload: ThesisProjectUpdate):
    if payload.active_step is not None:
        project.active_step = payload.active_step
    if payload.reference_clips is not None:
        project.phrase_progress_json = _serialize([item.model_dump(mode="json") for item in payload.reference_clips])
    if payload.consent is not None:
        project.consent_json = _serialize(payload.consent.model_dump(mode="json"))
        project.voice_profile_name = payload.consent.profile_name or project.voice_profile_name
    if payload.voice_profile is not None:
        project.voice_profile_json = _serialize(payload.voice_profile.model_dump(mode="json"))
    if payload.agent_config is not None:
        project.agent_config_json = _serialize(payload.agent_config.model_dump(mode="json"))
    if payload.phone_config is not None:
        project.phone_config_json = _serialize(payload.phone_config.model_dump(mode="json"))
    if payload.test_results is not None:
        project.test_results_json = _serialize([item.model_dump(mode="json") for item in payload.test_results])


@router.get("/me", response_model=ThesisProjectResponse)
def get_my_thesis_project(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    response = _to_response(project)
    if response.voice_profile.status == "ready_for_agent":
        cache_missing = _conversation_cache_missing(project, response)
        if cache_missing:
            if response.voice_profile.conversation_cache_ready:
                next_voice = response.voice_profile.model_copy(update={"conversation_cache_ready": False})
                project.voice_profile_json = _serialize(next_voice.model_dump(mode="json"))
                db.add(project)
                db.commit()
                db.refresh(project)
                response = _to_response(project)
            thesis_generation_service.start_cache_warmup(project.id)
        elif not response.voice_profile.conversation_cache_ready:
            next_voice = response.voice_profile.model_copy(update={"conversation_cache_ready": True})
            project.voice_profile_json = _serialize(next_voice.model_dump(mode="json"))
            db.add(project)
            db.commit()
            db.refresh(project)
            response = _to_response(project)
    return response


@router.post("/reference-clips/upload", response_model=ThesisProjectResponse, status_code=status.HTTP_201_CREATED)
async def upload_reference_clip(
    clip_id: str = Form(...),
    label: str = Form(...),
    prompt: str = Form(...),
    duration_seconds: Optional[float] = Form(default=None),
    file: UploadFile = File(...),
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reference clips must be uploaded as WAV files.")

    project = _get_or_create_project(db, current_user)
    uploads_dir = _uploads_root() / current_user.id
    uploads_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    output_path = uploads_dir / f"{clip_id}-{timestamp}.wav"

    contents = await file.read()
    output_path.write_bytes(contents)

    response = _to_response(project)
    clips_by_id = {item.clip_id: item for item in response.reference_clips}
    clips_by_id[clip_id] = ReferenceClipItem(
        clip_id=clip_id,
        label=label,
        prompt=prompt,
        completed=True,
        clip_label=output_path.name,
        file_path=str(output_path),
        recorded_at=datetime.utcnow(),
        duration_seconds=duration_seconds,
    )
    clips = list(clips_by_id.values())
    project.phrase_progress_json = _serialize([item.model_dump(mode="json") for item in clips])
    project.voice_profile_json = _serialize(
        response.voice_profile.model_copy(
            update={
                "status": "recording",
                "recorded_clips": sum(1 for item in clips if item.completed),
                "notes": "Reference clips stored. Complete consent, then generate the local voice clone.",
            }
        ).model_dump(mode="json")
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_response(project)


@router.put("/me", response_model=ThesisProjectResponse)
def upsert_my_thesis_project(
    payload: ThesisProjectUpdate,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    _apply_update(project, payload)
    db.add(project)
    db.commit()
    db.refresh(project)
    response = _to_response(project)
    if response.voice_profile.status == "ready_for_agent" and (
        payload.agent_config is not None or payload.phone_config is not None
    ):
        cache_missing = _conversation_cache_missing(project, response)
        if cache_missing:
            if response.voice_profile.conversation_cache_ready:
                next_voice = response.voice_profile.model_copy(update={"conversation_cache_ready": False})
                project.voice_profile_json = _serialize(next_voice.model_dump(mode="json"))
                db.add(project)
                db.commit()
                db.refresh(project)
                response = _to_response(project)
            thesis_generation_service.start_cache_warmup(project.id)
        elif not response.voice_profile.conversation_cache_ready:
            next_voice = response.voice_profile.model_copy(update={"conversation_cache_ready": True})
            project.voice_profile_json = _serialize(next_voice.model_dump(mode="json"))
            db.add(project)
            db.commit()
            db.refresh(project)
            response = _to_response(project)
    return response


@router.post("/voice-profile/generate", response_model=ThesisProjectResponse)
def generate_voice_profile(
    payload: GenerateVoiceProfileRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    response = _to_response(project)

    completed_clips = [item for item in response.reference_clips if item.completed and item.file_path]
    best_clip = _best_reference_clip(completed_clips)
    recorded_clips = len(completed_clips)
    consent_complete = all(
        [
            response.consent.confirmed_owner,
            response.consent.consent_to_clone,
            response.consent.consent_to_delete,
            response.consent.consent_business_use,
            response.consent.acknowledged_disclosure,
        ]
    )

    if recorded_clips == 0:
        project.voice_profile_json = _serialize(
            response.voice_profile.model_copy(
                update={
                    "status": "not_started",
                    "recorded_clips": 0,
                    "generation_progress": 0,
                    "generation_target": 1000,
                    "notes": "Upload at least one clean WAV reference clip before starting generation.",
                }
            ).model_dump(mode="json")
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return _to_response(project)

    if not consent_complete or not best_clip:
        project.voice_profile_json = _serialize(
            response.voice_profile.model_copy(
                update={
                    "status": "recording",
                    "recorded_clips": recorded_clips,
                    "generation_progress": 0,
                    "generation_target": 1000,
                    "notes": "Upload at least one clean WAV reference clip and complete all consent acknowledgements to generate the profile.",
                }
            ).model_dump(mode="json")
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return _to_response(project)

    voice_profile = response.voice_profile.model_copy(
        update={
            "status": "generating",
            "attached_to_agent": False,
            "recorded_clips": recorded_clips,
            "preview_available": False,
            "generated_at": None,
            "preview_text": payload.preview_text,
            "preview_audio_base64": None,
            "generation_progress": 1,
            "generation_target": 1000,
            "generation_error": None,
            "conversation_ready": False,
            "conversation_cache_ready": False,
            "conversation_cache_progress": 0,
            "conversation_cache_target": 0,
            "notes": "Queued the local clone job. Progress will update until the voice is ready.",
        }
    )
    project.voice_profile_json = _serialize(voice_profile.model_dump(mode="json"))
    if not project.voice_profile_name:
        project.voice_profile_name = response.consent.profile_name or f"{response.agent_config.business_name} Voice Profile"

    db.add(project)
    db.commit()
    db.refresh(project)
    thesis_generation_service.start_generation(
        project_id=project.id,
        user_id=current_user.id,
        prompt_path=best_clip.file_path,
        preview_text=payload.preview_text,
        recorded_clips=recorded_clips,
        attach_to_agent=payload.attach_to_agent,
        profile_name=project.voice_profile_name,
    )
    return _to_response(project)


@router.get("/voice-profile/status", response_model=ThesisProjectResponse)
def get_voice_profile_status(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    return _to_response(project)


@router.post("/voice-preview", response_model=ThesisProjectResponse)
def generate_voice_preview(
    payload: VoicePreviewRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    response = _to_response(project)
    completed_clips = [item for item in response.reference_clips if item.completed and item.file_path]
    best_clip = _best_reference_clip(completed_clips)
    if not best_clip:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a WAV reference clip first.")

    preview = thesis_voice_service.generate_preview(
        current_user.id,
        best_clip.file_path,
        payload.text,
    )

    next_voice = response.voice_profile.model_copy(
        update={
            "status": "ready_for_agent" if response.voice_profile.status != "error" else response.voice_profile.status,
            "recorded_clips": len(completed_clips),
            "preview_available": True,
            "generated_at": datetime.utcnow(),
            "preview_text": payload.text,
            "preview_audio_base64": preview["audio_base64"],
            "generation_progress": 1000,
            "generation_target": 1000,
            "generation_error": None,
            "conversation_ready": True,
            "conversation_cache_ready": True,
            "conversation_cache_progress": 1,
            "conversation_cache_target": 1,
            "notes": "Local preview regenerated from the current reference clip.",
        }
    )
    project.voice_profile_json = _serialize(next_voice.model_dump(mode="json"))
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_response(project)


@router.post("/agent/reset", response_model=AgentConversationResetResponse)
def reset_agent_conversation(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    response = _to_response(project)
    next_voice = response.voice_profile.model_copy(
        update={
            "conversation_history": [],
            "conversation_ready": response.voice_profile.status == "ready_for_agent",
            "conversation_cache_ready": response.voice_profile.conversation_cache_ready,
            "preview_audio_base64": None,
        }
    )
    project.voice_profile_json = _serialize(next_voice.model_dump(mode="json"))
    db.add(project)
    db.commit()
    db.refresh(project)
    return AgentConversationResetResponse(
        conversation_history=[],
        conversation_ready=next_voice.conversation_ready,
    )


@router.get("/agent/thinking-audio", response_model=AgentThinkingAudioResponse)
def get_agent_thinking_audio(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    response = _to_response(project)
    completed_clips = [item for item in response.reference_clips if item.completed and item.file_path]
    best_clip = _best_reference_clip(completed_clips)
    if not best_clip:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a WAV reference clip first.")

    thinking_text = "Let me think."
    preview = thesis_voice_service.generate_preview(
        current_user.id,
        best_clip.file_path,
        thinking_text,
        variant=THESIS_CONVERSATION_VOICE_MODEL,
    )
    return AgentThinkingAudioResponse(
        text=thinking_text,
        audio_url=f"/thesis/generated-audio/{Path(preview['output_path']).name}",
    )


@router.post("/agent/respond", response_model=AgentConversationResponse)
def respond_as_agent(
    payload: AgentConversationRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    started_at = perf_counter()
    project = _get_or_create_project(db, current_user)
    response = _to_response(project)
    completed_clips = [item for item in response.reference_clips if item.completed and item.file_path]
    best_clip = _best_reference_clip(completed_clips)
    if not best_clip:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a WAV reference clip first.")
    if response.voice_profile.status != "ready_for_agent":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Generate the cloned voice before starting a live conversation.")

    history = list(response.voice_profile.conversation_history or [])
    user_turn = thesis_agent_service.build_turn("user", payload.text)
    history.append(user_turn)

    reply_text = thesis_agent_service.build_reply(
        agent_config=response.agent_config.model_dump(mode="json"),
        phone_config=response.phone_config.model_dump(mode="json"),
        business_name=response.agent_config.business_name,
        history=history[:-1],
        user_message=payload.text,
    )
    assistant_turn = thesis_agent_service.build_turn("assistant", reply_text)
    history.append(assistant_turn)

    audio_url: str | None = None
    audio_pending = False
    audio_job_id: str | None = None
    if thesis_voice_service.has_cached_preview(
        current_user.id,
        best_clip.file_path,
        reply_text,
        variant=THESIS_CONVERSATION_VOICE_MODEL,
    ):
        preview = thesis_voice_service.generate_preview(
            current_user.id,
            best_clip.file_path,
            reply_text,
            variant=THESIS_CONVERSATION_VOICE_MODEL,
        )
        audio_url = f"/thesis/generated-audio/{Path(preview['output_path']).name}"
    else:
        audio_pending = True
        audio_job_id = hashlib.sha1(
            f"{current_user.id}|{best_clip.file_path}|{THESIS_CONVERSATION_VOICE_MODEL}|{reply_text}".encode("utf-8")
        ).hexdigest()
        thesis_generation_service.start_conversation_audio_job(
            job_id=audio_job_id,
            user_id=current_user.id,
            prompt_path=best_clip.file_path,
            reply_text=reply_text,
            variant=THESIS_CONVERSATION_VOICE_MODEL,
        )

    next_voice = response.voice_profile.model_copy(
        update={
            "preview_available": True,
            "generated_at": datetime.utcnow(),
            "preview_text": reply_text,
            "preview_audio_base64": None,
            "generation_progress": 1000,
            "generation_target": 1000,
            "generation_error": None,
            "conversation_ready": True,
            "conversation_history": history[-24:],
            "notes": "Conversation reply generated from the cloned voice and current business agent configuration.",
        }
    )
    project.voice_profile_json = _serialize(next_voice.model_dump(mode="json"))
    db.add(project)
    db.commit()
    db.refresh(project)
    response_history = [ConversationTurn(**item) for item in history[-24:]]
    response_assistant_turn = ConversationTurn(
        **assistant_turn,
        audio_url=audio_url,
        audio_pending=audio_pending,
        audio_job_id=audio_job_id,
    )
    if response_history:
        response_history[-1] = response_assistant_turn
    return AgentConversationResponse(
        conversation_history=response_history,
        assistant_turn=response_assistant_turn,
        response_time_ms=int((perf_counter() - started_at) * 1000),
        conversation_ready=True,
    )


@router.get("/agent/audio-status/{job_id}", response_model=AgentConversationAudioStatusResponse)
def get_agent_audio_status(
    job_id: str,
    current_user: UserOut = Depends(get_current_user),
):
    job = thesis_generation_service.get_conversation_audio_job(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation audio job not found.")

    return AgentConversationAudioStatusResponse(
        status=job.get("status", "queued"),
        audio_url=job.get("audio_url"),
        error=job.get("error"),
    )


@router.get("/generated-audio/{file_name}")
def get_generated_audio(
    file_name: str,
    current_user: UserOut = Depends(get_current_user),
):
    safe_user_id = current_user.id.replace("/", "_")
    if not file_name.startswith(f"{safe_user_id}-") or ".." in file_name or "/" in file_name:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found.")

    file_path = thesis_voice_service.outputs_root / file_name
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio file not found.")

    return FileResponse(file_path, media_type="audio/wav", filename=file_name)


@router.post("/test-call", response_model=ThesisProjectResponse)
def run_test_call(
    payload: TestCallRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_or_create_project(db, current_user)
    response = _to_response(project)
    business_name = response.agent_config.business_name
    agent_name = response.agent_config.agent_name
    phone_number = response.phone_config.phone_number
    routed_outcome = (
        "Captured caller details and queued a follow-up."
        if response.phone_config.routing_mode == "ai_first"
        else "Forwarded the caller according to the current routing policy."
    )

    transcript = [
        f"Caller {payload.caller}: Hi, I need help with {payload.scenario_title.lower()}.",
        f"{agent_name}: {response.agent_config.greeting_script} This line is registered through Vapi for the thesis demo number {response.phone_config.phone_number}.",
        (
            f"{agent_name}: I can help with that for {business_name}. "
            f"I’ll confirm your callback details and summarize the request for our team."
        ),
        f"Caller {payload.caller}: My best number is {phone_number} and afternoons work best.",
        f"{agent_name}: Perfect. I’ve saved that and marked the request for follow-up during business hours.",
    ]

    result = TestCallResult(
        scenario_id=payload.scenario_id,
        scenario_title=payload.scenario_title,
        caller=payload.caller,
        outcome=routed_outcome,
        transcript=transcript,
        created_at=datetime.utcnow(),
    )

    test_results = response.test_results
    test_results.insert(0, result)
    project.test_results_json = _serialize([item.model_dump(mode="json") for item in test_results[:5]])

    if response.voice_profile.status == "ready_for_agent":
        updated_voice = response.voice_profile.model_copy(update={"attached_to_agent": True})
        project.voice_profile_json = _serialize(updated_voice.model_dump(mode="json"))

    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_response(project)
