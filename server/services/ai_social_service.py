import os
from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.orm import Session

from models import User
from schemas.ai_social import SocialGenerateRequest
from services.ai_usage_service import log_ai_usage
from services.ai_billing_service import calculate_platform_tokens

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in .env")

client = OpenAI(api_key=OPENAI_API_KEY)


def build_social_prompt(req: SocialGenerateRequest) -> str:
    return f"""
You are a social media copywriter.

Write one polished social media post.

Platform: {req.platform}
Topic: {req.topic}
Tone: {req.tone}
Audience: {req.audience or "General audience"}
Call to action: {req.call_to_action or "None"}
Include hashtags: {"Yes" if req.include_hashtags else "No"}
Maximum length: {req.max_length} characters

Requirements:
- Match the platform style
- Make it engaging and natural
- Keep it concise
- Output only the post text
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


def generate_social_post(req: SocialGenerateRequest, db: Session, user: User):
    prompt = build_social_prompt(req)

    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    content = _extract_text(resp)

    usage = resp.usage
    prompt_tokens = usage.input_tokens
    completion_tokens = usage.output_tokens
    total_tokens = usage.total_tokens

    cost_usd = total_tokens * 0.000002

    log_ai_usage(
        db=db,
        user_id=user.id,
        feature="social",
        model=OPENAI_MODEL,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
    )

    platform_tokens = calculate_platform_tokens(total_tokens)
    user.tokens_remaining -= platform_tokens
    db.commit()

    return content, platform_tokens