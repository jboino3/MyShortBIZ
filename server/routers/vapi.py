import base64
import hmac
import io
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime
from typing import Any, Iterator, Literal, Optional
from urllib.error import URLError
from urllib.request import urlopen

import torchaudio
from fastapi.concurrency import run_in_threadpool
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import get_db
from services.telephony_session_service import telephony_session_service
from services.thesis_agent_service import thesis_agent_service
from services.thesis_generation_service import thesis_generation_service
from services.phone_speech_service import normalize_phone_tts_text
from services.thesis_voice_service import thesis_voice_service
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telephony/vapi", tags=["telephony"])

TELEPHONY_MODE = os.getenv("TELEPHONY_MODE", "direct")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID", "").strip()
VAPI_PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID", "").strip()
VAPI_WEBHOOK_SECRET = os.getenv("VAPI_WEBHOOK_SECRET", "").strip()
VAPI_WEBHOOK_HEADER = os.getenv("VAPI_WEBHOOK_HEADER", "X-Vapi-Secret").strip()
VAPI_WEBHOOK_BEARER = os.getenv("VAPI_WEBHOOK_BEARER", "").strip()
VAPI_SERVER_CREDENTIAL_ID = os.getenv("VAPI_SERVER_CREDENTIAL_ID", "").strip()
VAPI_VOICE_CREDENTIAL_ID = os.getenv("VAPI_VOICE_CREDENTIAL_ID", "").strip() or VAPI_SERVER_CREDENTIAL_ID
VAPI_MODEL_PROVIDER = os.getenv("VAPI_MODEL_PROVIDER", "openai")
VAPI_MODEL_NAME = os.getenv("VAPI_MODEL_NAME", "gpt-4o-mini")
VAPI_TRANSCRIBER_PROVIDER = os.getenv("VAPI_TRANSCRIBER_PROVIDER", "deepgram")
VAPI_TRANSCRIBER_MODEL = os.getenv("VAPI_TRANSCRIBER_MODEL", "flux-general-en")
VAPI_TRANSCRIBER_LANGUAGE = os.getenv("VAPI_TRANSCRIBER_LANGUAGE", "en").strip()
VAPI_TRANSCRIBER_EOT_THRESHOLD = float(os.getenv("VAPI_TRANSCRIBER_EOT_THRESHOLD", "0.65"))
VAPI_TRANSCRIBER_EOT_TIMEOUT_MS = int(os.getenv("VAPI_TRANSCRIBER_EOT_TIMEOUT_MS", "2200"))
VAPI_END_OF_TURN_SECONDS = float(os.getenv("VAPI_END_OF_TURN_SECONDS", "1.0"))
VAPI_START_WAIT_SECONDS = float(os.getenv("VAPI_START_WAIT_SECONDS", "0.4"))
VAPI_ON_NO_PUNCTUATION_SECONDS = float(os.getenv("VAPI_ON_NO_PUNCTUATION_SECONDS", "1.0"))
VAPI_ON_PUNCTUATION_SECONDS = float(os.getenv("VAPI_ON_PUNCTUATION_SECONDS", "0.45"))
VAPI_ON_NUMBER_SECONDS = float(os.getenv("VAPI_ON_NUMBER_SECONDS", "0.65"))
VAPI_SIP_URI = os.getenv("VAPI_SIP_URI", "").strip()
VAPI_DEFAULT_GREETING = os.getenv("VAPI_DEFAULT_GREETING", "Thanks for calling MyShortBIZ. This is Nate. How can I help?")
VAPI_DAEMON_HEALTH_URL = os.getenv("THESIS_VOICE_DAEMON_URL", "http://127.0.0.1:8011").rstrip("/") + "/health"
VAPI_FALLBACK_VOICE_PROVIDER = os.getenv("VAPI_FALLBACK_VOICE_PROVIDER", "vapi")
VAPI_FALLBACK_VOICE_ID = os.getenv("VAPI_FALLBACK_VOICE_ID", "Elliot")
VAPI_PHONE_MODEL_NAME = os.getenv("VAPI_PHONE_MODEL_NAME", "thesis-phone-agent")
VAPI_PHONE_REPLY_MAX_CHARS = int(os.getenv("VAPI_PHONE_REPLY_MAX_CHARS", "150"))


class VapiParty(BaseModel):
    number: Optional[str] = None


class VapiCall(BaseModel):
    id: str
    phoneNumberId: Optional[str] = None
    phoneNumber: Optional[VapiParty] = None
    customer: Optional[VapiParty] = None
    assistantId: Optional[str] = None


class VapiToolCall(BaseModel):
    id: str
    name: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class VapiArtifact(BaseModel):
    transcript: Optional[str] = None
    recording: Optional[dict[str, Any]] = None
    messages: Optional[list[dict[str, Any]]] = None


class VapiMessage(BaseModel):
    type: str
    call: Optional[VapiCall] = None
    status: Optional[str] = None
    role: Optional[str] = None
    transcriptType: Optional[str] = None
    transcript: Optional[str] = None
    originalTranscript: Optional[str] = None
    messages: Optional[list[dict[str, Any]]] = None
    messagesOpenAIFormatted: Optional[list[dict[str, Any]]] = None
    artifact: Optional[VapiArtifact] = None
    output: Optional[dict[str, Any]] = None
    toolCallList: Optional[list[VapiToolCall]] = None
    destination: Optional[dict[str, Any]] = None
    request: Optional[str] = None
    assistant: Optional[dict[str, Any]] = None
    customer: Optional[dict[str, Any]] = None
    phoneNumber: Optional[dict[str, Any]] = None
    text: Optional[str] = None
    sampleRate: Optional[int] = None
    timestamp: Optional[int] = None


class VapiEnvelope(BaseModel):
    message: VapiMessage


class CustomLlmMessage(BaseModel):
    role: str
    content: Any


class CustomLlmRequest(BaseModel):
    model: Optional[str] = None
    messages: list[CustomLlmMessage] = Field(default_factory=list)
    temperature: Optional[float] = None
    stream: Optional[bool] = True


class TelephonyStatusResponse(BaseModel):
    status: Literal["ok"]
    mode: str
    voice_daemon_healthy: bool
    phone_reply_cache_ready: bool
    public_base_url_configured: bool
    vapi_api_key_present: bool
    phone_number_id_masked: Optional[str]
    assistant_id_present: bool
    webhook_auth_configured: bool


def _mask_value(value: str) -> str:
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}***{value[-4:]}"


def _verify_vapi_request(request: Request):
    if not VAPI_WEBHOOK_SECRET and not VAPI_WEBHOOK_BEARER:
        return

    authorization = request.headers.get("Authorization", "")
    header_secret = request.headers.get(VAPI_WEBHOOK_HEADER, "")

    valid = False
    if VAPI_WEBHOOK_BEARER and authorization.startswith("Bearer "):
        valid = hmac.compare_digest(authorization.split(" ", 1)[1], VAPI_WEBHOOK_BEARER)
    if not valid and VAPI_WEBHOOK_SECRET:
        valid = hmac.compare_digest(header_secret, VAPI_WEBHOOK_SECRET)

    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Vapi webhook credentials.")


def _voice_server_config() -> dict[str, Any]:
    server = {
        "url": f"{PUBLIC_BASE_URL}/telephony/vapi/voice",
        "timeoutSeconds": 45,
    }
    if VAPI_VOICE_CREDENTIAL_ID:
        server["credentialId"] = VAPI_VOICE_CREDENTIAL_ID
    elif VAPI_WEBHOOK_SECRET:
        server["secret"] = VAPI_WEBHOOK_SECRET
    return server


def _events_server_config() -> dict[str, Any]:
    server = {
        "url": f"{PUBLIC_BASE_URL}/telephony/vapi/events",
        "timeoutSeconds": 20,
    }
    if VAPI_SERVER_CREDENTIAL_ID:
        server["credentialId"] = VAPI_SERVER_CREDENTIAL_ID
    elif VAPI_WEBHOOK_SECRET:
        server["secret"] = VAPI_WEBHOOK_SECRET
    return server


def _compact_business_description(raw: str) -> str:
    text = " ".join((raw or "").replace("\n", " ").split())
    if not text:
        return "A creator-first business toolkit."

    sentences = [segment.strip() for segment in text.split(".") if segment.strip()]
    if not sentences:
        return text[:700]

    compact = ". ".join(sentences[:3]).strip()
    if compact and not compact.endswith("."):
        compact += "."
    return compact[:700]


def _clean_phone_reply(text: str) -> str:
    text = " ".join((text or "").split())
    if len(text) <= VAPI_PHONE_REPLY_MAX_CHARS:
        return text
    clipped = text[:VAPI_PHONE_REPLY_MAX_CHARS].rsplit(" ", 1)[0].rstrip(" ,;:")
    return clipped or text[:VAPI_PHONE_REPLY_MAX_CHARS]


def _normalize_phone_tts_text(text: str) -> str:
    return normalize_phone_tts_text(text)


def _message_content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text" and item.get("text"):
                    parts.append(str(item["text"]).strip())
                elif "content" in item and item.get("content"):
                    parts.append(str(item["content"]).strip())
            elif item:
                parts.append(str(item).strip())
        return " ".join(part for part in parts if part)
    return str(content or "").strip()


def _phone_history_from_messages(messages: list[CustomLlmMessage]) -> tuple[list[dict[str, str]], str]:
    history: list[dict[str, str]] = []

    for item in messages:
        role = item.role
        text = _message_content_to_text(item.content)
        if not text or role == "system":
            continue
        normalized_role = "assistant" if role == "assistant" else "user"
        entry = {"role": normalized_role, "text": text}
        if history and history[-1] == entry:
            continue
        history.append(entry)

    trimmed_history = history[-24:]
    last_user_index = next(
        (index for index in range(len(trimmed_history) - 1, -1, -1) if trimmed_history[index]["role"] == "user"),
        None,
    )
    if last_user_index is None:
        return trimmed_history, ""

    last_user_message = trimmed_history[last_user_index]["text"]
    return trimmed_history[:last_user_index], last_user_message


def _phone_reply_from_messages(db: Session, messages: list[CustomLlmMessage]) -> str:
    context = telephony_session_service.build_call_context(db)
    agent_config = context.get("agent_config", {})
    phone_config = context.get("phone_config", {})
    business_name = agent_config.get("business_name", "MyShortBIZ")
    history, last_user_message = _phone_history_from_messages(messages)

    if not last_user_message:
        return _clean_phone_reply(
            agent_config.get("greeting_script") or VAPI_DEFAULT_GREETING
        )

    reply = thesis_agent_service.build_phone_reply(
        agent_config=agent_config,
        phone_config=phone_config,
        business_name=business_name,
        history=history,
        user_message=last_user_message,
        max_chars=VAPI_PHONE_REPLY_MAX_CHARS,
    )
    return _clean_phone_reply(reply)


def _stream_openai_reply(reply_text: str, model_name: str) -> Iterator[str]:
    stream_id = f"chatcmpl-{uuid.uuid4().hex}"
    created = int(time.time())
    role_event = {
        "id": stream_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model_name,
        "choices": [
            {
                "index": 0,
                "delta": {"role": "assistant"},
                "finish_reason": None,
            }
        ],
    }
    yield f"data: {json.dumps(role_event)}\n\n"

    if reply_text:
        content_event = {
            "id": stream_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model_name,
            "choices": [
                {
                    "index": 0,
                    "delta": {"content": reply_text},
                    "finish_reason": None,
                }
            ],
        }
        yield f"data: {json.dumps(content_event)}\n\n"

    final_event = {
        "id": stream_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model_name,
        "choices": [
            {
                "index": 0,
                "delta": {},
                "finish_reason": "stop",
            }
        ],
    }
    yield f"data: {json.dumps(final_event)}\n\n"
    yield "data: [DONE]\n\n"


def _build_transient_assistant(db: Session, call: Optional[VapiCall]) -> dict[str, Any]:
    context = telephony_session_service.build_call_context(db)
    agent_config = context.get("agent_config", {})
    phone_config = context.get("phone_config", {})

    business_name = agent_config.get("business_name", "MyShortBIZ")
    agent_name = agent_config.get("agent_name", "Maya")
    configured_greeting = agent_config.get("greeting_script") or VAPI_DEFAULT_GREETING
    greeting = _clean_phone_reply(configured_greeting) or VAPI_DEFAULT_GREETING
    business_description = _compact_business_description(
        agent_config.get("business_description", "A creator-first business toolkit.")
    )
    business_hours = agent_config.get("business_hours", "Monday to Friday, 9 AM to 6 PM")
    call_objective = agent_config.get("call_objective", "Answer questions and collect callback details.")
    fallback_behavior = agent_config.get("fallback_behavior", "If uncertain, collect the caller's name, number, and reason for calling.")
    transfer_instructions = agent_config.get("transfer_instructions", "Escalate urgent issues to a human callback.")
    after_hours_behavior = agent_config.get("after_hours_behavior", "Take a voicemail summary for next-business-day follow-up.")
    business_number = phone_config.get("phone_number") or (call.phoneNumber.number if call and call.phoneNumber else "")

    system_prompt = (
        f"You are {agent_name}, the inbound business phone agent for {business_name}. "
        f"Business description: {business_description} "
        f"Business hours: {business_hours} "
        f"Primary objective: {call_objective} "
        f"Fallback behavior: {fallback_behavior} "
        f"Transfer instructions: {transfer_instructions} "
        f"After hours behavior: {after_hours_behavior} "
        f"Current business number: {business_number}. "
        "Keep answers concise, friendly, and phone-appropriate. "
        "Always disclose that the caller is speaking with an AI assistant if asked. "
        "When collecting contact details, prefer explicit confirmation."
    )

    return {
        "name": "MyShortBIZ Thesis Inbound Assistant",
        "firstMessage": greeting,
        "transcriber": {
            "provider": VAPI_TRANSCRIBER_PROVIDER,
            "model": VAPI_TRANSCRIBER_MODEL,
            "language": VAPI_TRANSCRIBER_LANGUAGE,
            "eotThreshold": VAPI_TRANSCRIBER_EOT_THRESHOLD,
            "eotTimeoutMs": VAPI_TRANSCRIBER_EOT_TIMEOUT_MS,
        },
        "backgroundSound": "off",
        "startSpeakingPlan": {
            "waitSeconds": VAPI_START_WAIT_SECONDS,
            "smartEndpointingPlan": {
                "provider": "vapi",
            },
            "transcriptionEndpointingPlan": {
                "onNoPunctuationSeconds": VAPI_ON_NO_PUNCTUATION_SECONDS,
                "onPunctuationSeconds": VAPI_ON_PUNCTUATION_SECONDS,
                "onNumberSeconds": VAPI_ON_NUMBER_SECONDS,
            },
            "smartEndpointingEnabled": False,
        },
        "stopSpeakingPlan": {
            "numWords": 3,
            "voiceSeconds": 0.45,
            "backoffSeconds": 1.2,
            "acknowledgementPhrases": [
                "okay",
                "right",
                "uh-huh",
                "yeah",
                "mm-hmm",
                "got it",
            ],
        },
        "model": {
            "provider": "custom-llm",
            "model": VAPI_PHONE_MODEL_NAME,
            "url": f"{PUBLIC_BASE_URL}/telephony/vapi/chat/completions",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                }
            ],
        },
        "voice": {
            "provider": "custom-voice",
            "server": _voice_server_config(),
            "fallbackPlan": {
                "voices": [
                    {
                        "provider": VAPI_FALLBACK_VOICE_PROVIDER,
                        "voiceId": VAPI_FALLBACK_VOICE_ID,
                    }
                ]
            },
        },
        "server": _events_server_config(),
        "serverMessages": [
            "status-update",
            "transcript",
            "conversation-update",
            "end-of-call-report",
            "hang",
        ],
    }


def _tool_result_for_call(db: Session, call_id: str, tool_call: VapiToolCall) -> dict[str, Any]:
    session = telephony_session_service.get_session(db, call_id)
    context = telephony_session_service.get_context(session) if session else {}
    agent_config = context.get("agent_config", {})
    phone_config = context.get("phone_config", {})

    if tool_call.name == "getBusinessContext":
        result = {
            "businessName": agent_config.get("business_name", "MyShortBIZ"),
            "businessHours": agent_config.get("business_hours", "Monday to Friday, 9 AM to 6 PM"),
            "objective": agent_config.get("call_objective", "Answer questions and collect caller details."),
            "fallbackBehavior": agent_config.get("fallback_behavior"),
            "transferInstructions": agent_config.get("transfer_instructions"),
            "phoneNumber": phone_config.get("phone_number"),
        }
    elif tool_call.name == "saveCallerLead":
        result = telephony_session_service.save_caller_lead(db, call_id, tool_call.parameters)
    elif tool_call.name == "escalateToHuman":
        result = {
            "escalated": True,
            "message": agent_config.get("transfer_instructions", "A human follow-up has been requested."),
            "reason": tool_call.parameters.get("reason"),
            "urgency": tool_call.parameters.get("urgency"),
        }
    else:
        result = {"handled": False, "reason": "unknown_tool"}

    return {
        "name": tool_call.name,
        "toolCallId": tool_call.id,
        "result": json.dumps(result),
    }


def _handle_event(envelope: VapiEnvelope, db: Session) -> Optional[dict[str, Any]]:
    message = envelope.message
    event_type = message.type
    call = message.call
    call_id = call.id if call else "unknown"
    caller_number = call.customer.number if call and call.customer else None
    mode = TELEPHONY_MODE

    logger.info("Vapi event received type=%s call_id=%s caller=%s mode=%s", event_type, call_id, caller_number, mode)

    if event_type == "assistant-request":
        return _handle_assistant_request(envelope, db)

    telephony_session_service.append_event(
        db,
        call_id,
        event_type,
        envelope.model_dump(mode="json"),
    )

    if event_type == "status-update":
        telephony_session_service.upsert_session(
            db,
            call_id=call_id,
            provider="vapi",
            mode=mode,
            status=message.status or "queued",
            assistant_id=call.assistantId if call else None,
            phone_number_id=call.phoneNumberId if call else None,
            inbound_number=call.phoneNumber.number if call and call.phoneNumber else None,
            customer_number=caller_number,
            last_event_type=event_type,
        )
    elif event_type == "transcript":
        telephony_session_service.append_transcript_entry(
            db,
            call_id,
            {
                "role": message.role,
                "transcriptType": message.transcriptType,
                "transcript": message.transcript,
                "originalTranscript": message.originalTranscript,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
    elif event_type == "conversation-update":
        telephony_session_service.append_messages(
            db,
            call_id,
            message.messages or [],
        )
    elif event_type == "end-of-call-report":
        artifacts = message.artifact.model_dump(mode="json") if message.artifact else {}
        telephony_session_service.update_artifacts(db, call_id, artifacts, status="ended")
    elif event_type == "hang":
        telephony_session_service.update_artifacts(db, call_id, {"hangDetected": True}, status="ended")
    elif event_type == "tool-calls":
        tool_calls = message.toolCallList or []
        return {
            "results": [_tool_result_for_call(db, call_id, tool_call) for tool_call in tool_calls]
        }

    return {"ok": True}


def _handle_assistant_request(envelope: VapiEnvelope, db: Session) -> dict[str, Any]:
    call = envelope.message.call
    call_id = call.id if call else "unknown"
    caller_number = call.customer.number if call and call.customer else None

    session = telephony_session_service.upsert_session(
        db,
        call_id=call_id,
        provider="vapi",
        mode=TELEPHONY_MODE,
        status="ringing",
        assistant_id=call.assistantId if call else None,
        phone_number_id=call.phoneNumberId if call else None,
        inbound_number=call.phoneNumber.number if call and call.phoneNumber else None,
        customer_number=caller_number,
        last_event_type="assistant-request",
    )

    if TELEPHONY_MODE == "sip-transfer":
        if not VAPI_SIP_URI:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SIP transfer mode is enabled but VAPI_SIP_URI is not configured.")
        return {
            "destination": {
                "type": "sip",
                "sipUri": VAPI_SIP_URI,
                "message": "Transferring your call now.",
            }
        }

    if VAPI_ASSISTANT_ID and os.getenv("VAPI_USE_SAVED_ASSISTANT", "false").lower() in {"1", "true", "yes", "on"}:
        return {"assistantId": VAPI_ASSISTANT_ID}

    return {"assistant": _build_transient_assistant(db, call)}


def _phone_reply_cache_ready(db: Session) -> bool:
    context = telephony_session_service.build_call_context(db)
    prompt_path = context.get("voice_prompt_path")
    user_id = context.get("user_id")
    agent_config = context.get("agent_config", {})
    phone_config = context.get("phone_config", {})
    business_name = agent_config.get("business_name", "MyShortBIZ")

    if not prompt_path or not user_id:
        return False

    warm_replies = thesis_agent_service.demo_phone_replies(
        agent_config=agent_config,
        phone_config=phone_config,
        business_name=business_name,
        prompts=thesis_agent_service.critical_demo_phone_prompts(),
    )
    if not warm_replies:
        return False

    return all(
        thesis_voice_service.has_cached_phone_pcm(
            user_id,
            prompt_path,
            _normalize_phone_tts_text(text),
            8000,
            variant=thesis_voice_service.conversation_model_variant,
        )
        for text in warm_replies
    )


@router.get("/health", response_model=TelephonyStatusResponse)
def telephony_health(db: Session = Depends(get_db)):
    cache_ready = _phone_reply_cache_ready(db)
    daemon_healthy = False
    try:
        with urlopen(VAPI_DAEMON_HEALTH_URL, timeout=2) as response:
            payload = json.loads(response.read().decode("utf-8"))
            daemon_healthy = payload.get("status") == "ok"
    except (URLError, ValueError, OSError):
        daemon_healthy = False

    return TelephonyStatusResponse(
        status="ok",
        mode=TELEPHONY_MODE,
        voice_daemon_healthy=daemon_healthy or cache_ready,
        phone_reply_cache_ready=cache_ready,
        public_base_url_configured=bool(PUBLIC_BASE_URL),
        vapi_api_key_present=bool(os.getenv("VAPI_API_KEY")),
        phone_number_id_masked=_mask_value(VAPI_PHONE_NUMBER_ID) if VAPI_PHONE_NUMBER_ID else None,
        assistant_id_present=bool(VAPI_ASSISTANT_ID),
        webhook_auth_configured=bool(VAPI_WEBHOOK_SECRET or VAPI_WEBHOOK_BEARER or VAPI_SERVER_CREDENTIAL_ID),
    )


@router.post("/assistant-request")
async def assistant_request(envelope: VapiEnvelope, request: Request, db: Session = Depends(get_db)):
    _verify_vapi_request(request)
    return _handle_assistant_request(envelope, db)


@router.post("/events")
async def vapi_events(envelope: VapiEnvelope, request: Request, db: Session = Depends(get_db)):
    _verify_vapi_request(request)
    return _handle_event(envelope, db)


@router.post("/voice")
async def vapi_voice(envelope: VapiEnvelope, request: Request, db: Session = Depends(get_db)):
    _verify_vapi_request(request)
    message = envelope.message
    if message.type != "voice-request":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported voice request payload.")
    if not message.call or not message.call.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing call ID in voice request.")
    if not message.text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing text in voice request.")
    if not message.sampleRate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing sampleRate in voice request.")

    cached_context = telephony_session_service.get_cached_context(message.call.id)
    prompt_path = cached_context.get("voice_prompt_path")
    user_id = cached_context.get("user_id")
    if not prompt_path or not user_id:
        session = telephony_session_service.get_session(db, message.call.id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No telephony session found for this call.")
        cached_context = telephony_session_service.get_context(session)
        telephony_session_service.cache_context(message.call.id, cached_context)
        prompt_path = cached_context.get("voice_prompt_path")
        user_id = cached_context.get("user_id")

    if not prompt_path:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No voice reference clip is configured for this inbound assistant.")

    spoken_text = _normalize_phone_tts_text(message.text)

    pcm = await run_in_threadpool(
        thesis_voice_service.generate_phone_pcm_local,
        user_id or "telephony",
        prompt_path,
        spoken_text,
        message.sampleRate,
        thesis_voice_service.conversation_model_variant,
    )
    return Response(content=pcm, media_type="application/octet-stream")


@router.post("/chat/completions")
async def vapi_chat_completions(payload: CustomLlmRequest, request: Request, db: Session = Depends(get_db)):
    _verify_vapi_request(request)
    reply_text = _phone_reply_from_messages(db, payload.messages)

    if payload.stream is False:
        return {
            "id": f"chatcmpl-{uuid.uuid4().hex}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": payload.model or VAPI_PHONE_MODEL_NAME,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": reply_text,
                    },
                    "finish_reason": "stop",
                }
            ],
        }

    return StreamingResponse(
        _stream_openai_reply(reply_text, payload.model or VAPI_PHONE_MODEL_NAME),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
