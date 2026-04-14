import json
import os
from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.orm import Session

from models import User
from schemas.video_prompt_builder import VideoPromptBuildRequest
from services.ai_usage_service import log_ai_usage
from services.ai_billing_service import calculate_platform_tokens

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in .env")

client = OpenAI(api_key=OPENAI_API_KEY)


def build_video_prompt_builder_prompt(req: VideoPromptBuildRequest) -> str:
    return f"""
You are an expert short-form video marketing strategist.

Create a JSON object with exactly these keys:
runway_prompt
hook
visual_direction
caption
cta_text

Context:
Topic: {req.topic}
Product name: {req.product_name or "Not provided"}
Product type: {req.product_type or "Not provided"}
Target audience: {req.target_audience or "General audience"}
Platform: {req.platform}
Tone: {req.tone}
Goal: {req.goal}
Call to action: {req.call_to_action or "Not provided"}
Visual style: {req.visual_style or "Not provided"}
Duration seconds: {req.duration_seconds}
Aspect ratio: {req.aspect_ratio}
Extra context: {req.extra_context or "None"}

Rules:
- runway_prompt should be cinematic, visual, and highly descriptive
- make the prompt suitable for AI video generation
- avoid mentioning camera UI, subtitles, or editing overlays unless implied
- hook should be a short opening concept
- visual_direction should explain the creative direction in 1-2 sentences
- caption should fit the target platform
- cta_text should be short and compelling
- output ONLY valid JSON
""".strip()


def _extract_text(resp) -> str:
    parts = []
    for item in getattr(resp, "output", []) or []:
        for c in getattr(item, "content", []) or []:
            if getattr(c, "type", None) == "output_text":
                parts.append(getattr(c, "text", ""))
    text = "\n".join([p for p in parts if p]).strip()
    if not text:
        text = (getattr(resp, "output_text", "") or "").strip()
    return text


def _fallback_payload(req: VideoPromptBuildRequest) -> dict:
    cta = req.call_to_action or "Learn more"
    return {
        "runway_prompt": (
            f"A polished {req.platform} style promotional video about {req.topic}, "
            f"with a {req.tone.lower()} tone, visually engaging scenes, clean composition, "
            f"strong product focus, and a modern cinematic look."
        ),
        "hook": f"See how {req.topic} stands out.",
        "visual_direction": (
            f"Use a {req.tone.lower()} tone with visually clean, engaging shots tailored for {req.platform}. "
            f"Keep pacing tight and attention-grabbing."
        ),
        "caption": f"{req.topic} — made for {req.target_audience or 'your audience'}.",
        "cta_text": cta,
    }


def build_video_prompt_package(req: VideoPromptBuildRequest, db: Session, user: User):
    prompt = build_video_prompt_builder_prompt(req)

    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    raw_text = _extract_text(resp)

    try:
        payload = json.loads(raw_text)
    except Exception:
        payload = _fallback_payload(req)

    usage = resp.usage
    prompt_tokens = usage.input_tokens
    completion_tokens = usage.output_tokens
    total_tokens = usage.total_tokens

    cost_usd = total_tokens * 0.000002

    log_ai_usage(
        db=db,
        user_id=user.id,
        feature="video_prompt_builder",
        model=OPENAI_MODEL,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
    )

    platform_tokens = calculate_platform_tokens(total_tokens)
    user.tokens_remaining -= platform_tokens
    db.commit()

    return payload, platform_tokens