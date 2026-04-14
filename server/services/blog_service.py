# server/services/blog_service.py

import os
import markdown as md
from dotenv import load_dotenv
from openai import OpenAI
from services.ai_usage_service import log_ai_usage
from services.ai_billing_service import calculate_platform_tokens
from sqlalchemy.orm import Session
from models import User

from schemas.blog import BlogGenerateRequest, BlogFeatures

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in .env")

client = OpenAI(api_key=OPENAI_API_KEY)

FEATURE_COSTS = {
    "bullets": 150,
    "numbered": 150,
    "qa": 250,
    "chart": 400,
    "images": 800,
    "meta_description": 120,
    "call_to_action": 120,
}


def estimate_token_cost(word_count: int, features: BlogFeatures) -> int:
    base = word_count * 3
    add_ons = sum(cost for k, cost in FEATURE_COSTS.items() if getattr(features, k, False))
    return base + add_ons


def build_prompt(req: BlogGenerateRequest) -> str:

    if hasattr(req, 'existing_content') and req.existing_content:
        return f"""
        You are an editor. Below is a draft blog post:
        
        "{req.existing_content}"
        
        The user wants to make these adjustments: "{req.refinement_instruction}"
        
        Rewrite the post keeping the original structure but applying those specific changes. 
        Output ONLY the updated Markdown.
        """.strip()

    flags = []
    if req.features.meta_description:
        flags.append("- Include an SEO meta description (155–160 chars).")
    if req.features.bullets:
        flags.append("- Use bullet points where helpful.")
    if req.features.numbered:
        flags.append("- Include at least one numbered list.")
    if req.features.chart:
        flags.append("- Include a section titled 'Chart Data' that outputs JSON: {title, labels[], values[]}.")
    if req.features.qa:
        flags.append("- Add a Q&A section with 5 questions and answers.")
    if req.features.call_to_action:
        flags.append("- End with a clear call-to-action for MyShortBIZ.")
    if req.features.images:
        flags.append("- Suggest 2 image prompts (featured + inline). Do not generate images.")

    keyword_line = f"Primary SEO keyword: {req.seo_keyword}\n" if req.seo_keyword else ""
    keyword_list = getattr(req, 'all_keywords', [])
    keyword_line = f"Mandatory keywords to include: {', '.join(keyword_list)}\n" if keyword_list else ""

    return f"""
You are a professional SEO content writer for a business productivity SaaS called "MyShortBIZ".

Write an engaging blog post in clean Markdown.

Topic: {req.topic}
Specific Instructions: {getattr(req, 'description', 'Write a general post about the topic.')}
Target audience: {req.audience}
Tone: {req.tone}
{keyword_line}
Length: approximately {req.word_count} words.

Requirements:
- Use H1 for the title, then H2/H3 structure.
- You MUST follow the 'Specific Instructions' provided above strictly.
- Hooky intro, practical value, and a short conclusion.
{chr(10).join(flags)}

Output ONLY Markdown. Do not include backticks fences.
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


def generate_blog_markdown(req: BlogGenerateRequest, db: Session, user: User) -> str:
    prompt = build_prompt(req)

    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    markdown_text = _extract_text(resp)

    # AI USAGE TRACKING

    usage = resp.usage
    prompt_tokens = usage.input_tokens
    completion_tokens = usage.output_tokens
    total_tokens = usage.total_tokens

    # Rough cost estimate (adjust later based on model pricing)
    cost_usd = total_tokens * 0.000002

    log_ai_usage(
        db=db,
        user_id=user.id,
        feature="blog",
        model=OPENAI_MODEL,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
    )

    # Deduct platform tokens
    platform_tokens = calculate_platform_tokens(total_tokens)
    user.tokens_remaining -= platform_tokens
    db.commit()

    return markdown_text


def markdown_to_html(markdown_text: str) -> str:
    return md.markdown(markdown_text, extensions=["tables", "fenced_code"])


def extract_title(markdown_text: str) -> str:
    for line in markdown_text.splitlines():
        if line.strip().startswith("# "):
            return line.strip()[2:].strip()
    return "Untitled"
