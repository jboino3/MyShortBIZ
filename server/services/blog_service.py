# server/services/blog_service.py

import os
import markdown as md
from dotenv import load_dotenv
from openai import OpenAI

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

    return f"""
You are a professional SEO content writer for a business productivity SaaS called "MyShortBIZ".

Write an engaging blog post in clean Markdown.

Topic: {req.topic}
Target audience: {req.audience}
Tone: {req.tone}
{keyword_line}
Length: approximately {req.word_count} words.

Requirements:
- Use H1 for the title, then H2/H3 structure.
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


def generate_blog_markdown(req: BlogGenerateRequest) -> str:
    prompt = build_prompt(req)
    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )
    return _extract_text(resp)


def markdown_to_html(markdown_text: str) -> str:
    return md.markdown(markdown_text, extensions=["tables", "fenced_code"])


def extract_title(markdown_text: str) -> str:
    for line in markdown_text.splitlines():
        if line.strip().startswith("# "):
            return line.strip()[2:].strip()
    return "Untitled"
