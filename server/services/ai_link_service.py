import json
import os
import random
import re
import string
from urllib.parse import urlparse

from dotenv import load_dotenv
from openai import OpenAI
from sqlalchemy.orm import Session

from models import User
from models.short_link import ShortLink
from schemas.ai_link import LinkGenerateRequest
from services.ai_usage_service import log_ai_usage
from services.ai_billing_service import calculate_platform_tokens

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in .env")

client = OpenAI(api_key=OPENAI_API_KEY)


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\- ]+", "", value)
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value[:40].strip("-")


def _random_suffix(length: int = 4) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def _ensure_unique_short_code(db: Session, desired: str) -> str:
    base = _slugify(desired) or _random_suffix(6)
    candidate = base

    while db.query(ShortLink).filter(ShortLink.short_code == candidate).first():
        candidate = f"{base}-{_random_suffix(4)}"

    return candidate


def build_link_prompt(req: LinkGenerateRequest) -> str:
    domain = urlparse(str(req.original_url)).netloc or "unknown domain"

    return f"""
You are helping generate a smart branded short link record.

Create a JSON object with exactly these keys:
short_code
title
description
cta_text

Context:
Original URL: {req.original_url}
Domain: {domain}
Destination summary: {req.destination_summary or "Not provided"}
Audience: {req.audience or "General audience"}
Tone: {req.tone}
Goal: {req.goal or "Drive clicks"}
Platform: {req.platform or "General"}

Rules:
- short_code should be lowercase, short, memorable, and URL-safe
- no spaces
- title should be concise
- description should be 1 sentence max
- cta_text should be short and clickable
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


def _fallback_payload(req: LinkGenerateRequest) -> dict:
    domain = urlparse(str(req.original_url)).netloc.replace("www.", "")
    guessed = _slugify(req.custom_slug or req.goal or req.platform or domain or "link")

    return {
        "short_code": guessed or _random_suffix(6),
        "title": req.goal or "Useful Link",
        "description": req.destination_summary or f"Visit this resource from {domain}.",
        "cta_text": "Open Link",
    }


def generate_short_link_record(req: LinkGenerateRequest, db: Session, user: User) -> tuple[ShortLink, int]:
    prompt = build_link_prompt(req)

    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    raw_text = _extract_text(resp)

    try:
        payload = json.loads(raw_text)
    except Exception:
        payload = _fallback_payload(req)

    raw_code = req.custom_slug or payload.get("short_code") or "link"
    short_code = _ensure_unique_short_code(db, raw_code)

    title = payload.get("title") or "Useful Link"
    description = payload.get("description") or None
    cta_text = payload.get("cta_text") or "Open Link"

    usage = resp.usage
    prompt_tokens = usage.input_tokens
    completion_tokens = usage.output_tokens
    total_tokens = usage.total_tokens

    cost_usd = total_tokens * 0.000002

    log_ai_usage(
        db=db,
        user_id=user.id,
        feature="link",
        model=OPENAI_MODEL,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
    )

    platform_tokens = calculate_platform_tokens(total_tokens)
    user.tokens_remaining -= platform_tokens

    short_link = ShortLink(
        user_id=user.id,
        original_url=str(req.original_url),
        short_code=short_code,
        title=title,
        description=description,
        cta_text=cta_text,
    )

    db.add(short_link)
    db.commit()
    db.refresh(short_link)

    return short_link, platform_tokens