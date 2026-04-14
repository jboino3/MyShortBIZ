import os
from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.orm import Session

from models import User
from schemas.ai_bio import BioGenerateRequest
from services.ai_usage_service import log_ai_usage
from services.ai_billing_service import calculate_platform_tokens

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in .env")

client = OpenAI(api_key=OPENAI_API_KEY)


def build_bio_prompt(req: BioGenerateRequest) -> str:
    return f"""
You are a professional branding writer.

Write a short, polished bio for the following person.

Name: {req.name}
Profession: {req.profession or "Not provided"}
Niche: {req.niche or "Not provided"}
Tone: {req.tone}
Platform: {req.platform}
Achievements: {req.achievements or "Not provided"}
Skills: {req.skills or "Not provided"}
Audience: {req.audience or "Not provided"}
Maximum length: {req.max_length} characters

Requirements:
- Make it clear, engaging, and polished
- Match the requested tone
- Fit the target platform
- Keep it concise
- Output only the bio text
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


def generate_bio(req: BioGenerateRequest, db: Session, user: User):
    prompt = build_bio_prompt(req)

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
        feature="bio",
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