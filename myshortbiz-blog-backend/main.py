from __future__ import annotations

import os
from datetime import datetime
from typing import Optional, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import SQLModel, Field as SQLField, Session, create_engine, select
from openai import OpenAI
import markdown as md

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY in environment (.env).")


OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")  # change anytime

client = OpenAI(api_key=OPENAI_API_KEY)

# ---- DB ----
engine = create_engine("sqlite:///myshortbiz.db", echo=False)


class User(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    email: str
    tokens_remaining: int = 100_000  # seed for testing


class Blog(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    user_id: int
    title: str
    topic: str
    audience: str
    tone: str
    word_count: int
    features_json: str

    token_cost: int
    content_markdown: str
    content_html: str
    created_at: datetime = SQLField(default_factory=datetime.utcnow)


def init_db():
    SQLModel.metadata.create_all(engine)
    # Create a test user if none exists
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "test@myshortbiz.local")).first()
        if not user:
            session.add(User(email="test@myshortbiz.local", tokens_remaining=100_000))
            session.commit()


# ---- Request/Response Schemas ----
class BlogFeatures(BaseModel):
    bullets: bool = True
    numbered: bool = False
    qa: bool = True
    chart: bool = False
    images: bool = False
    meta_description: bool = True
    call_to_action: bool = True


class BlogGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=200)
    audience: str = Field("General audience", max_length=200)
    tone: str = Field("Professional", max_length=50)
    seo_keyword: Optional[str] = Field(None, max_length=80)
    word_count: int = Field(800, ge=300, le=2500)
    features: BlogFeatures = BlogFeatures()


class BlogGenerateResponse(BaseModel):
    blog_id: int
    title: str
    token_cost: int
    tokens_remaining: int
    content_markdown: str
    content_html: str


# ---- Token Costing (simple + predictable) ----
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
    # Quick predictable heuristic for MVP:
    # ~3 tokens per word + feature add-ons
    base = word_count * 3
    add_ons = 0
    for k, cost in FEATURE_COSTS.items():
        if getattr(features, k, False):
            add_ons += cost
    return base + add_ons


def build_prompt(req: BlogGenerateRequest) -> str:
    flags = []
    if req.features.meta_description:
        flags.append("- Include an SEO meta description (155-160 chars).")
    if req.features.bullets:
        flags.append("- Use bullet points where helpful.")
    if req.features.numbered:
        flags.append("- Include at least one numbered list.")
    if req.features.chart:
        flags.append("- Include a small section titled 'Chart Data' that outputs JSON for a simple chart (title, labels[], values[]).")
    if req.features.qa:
        flags.append("- Add a Q&A section near the end with 5 questions and answers.")
    if req.features.call_to_action:
        flags.append("- End with a clear call-to-action for a business tool/service.")
    if req.features.images:
        flags.append("- Suggest 2 image prompts (do not generate images), one featured image + one inline image.")

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


def extract_text_from_response(resp: Any) -> str:
    """
    The Responses API returns content in a structured way; easiest robust approach:
    iterate output blocks and collect 'output_text' items.
    """
    parts = []
    for item in getattr(resp, "output", []) or []:
        for c in getattr(item, "content", []) or []:
            if getattr(c, "type", None) == "output_text":
                parts.append(getattr(c, "text", ""))
    text = "\n".join([p for p in parts if p])
    if not text.strip():
        # fallback: some SDK versions also expose output_text directly
        text = getattr(resp, "output_text", "") or ""
    return text


app = FastAPI(title="MyShortBIZ Blog Creator API")


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/blog/generate", response_model=BlogGenerateResponse)
def generate_blog(req: BlogGenerateRequest):
    # For MVP testing: always use our seeded test user
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "test@myshortbiz.local")).first()
        if not user:
            raise HTTPException(status_code=500, detail="Test user missing.")

        token_cost = estimate_token_cost(req.word_count, req.features)
        if user.tokens_remaining < token_cost:
            raise HTTPException(status_code=402, detail="Not enough tokens.")

        prompt = build_prompt(req)

        # Responses API is the recommended unified API. :contentReference[oaicite:4]{index=4}
        resp = client.responses.create(
            model=OPENAI_MODEL,
            input=prompt,
        )

        markdown_text = extract_text_from_response(resp).strip()
        if not markdown_text:
            raise HTTPException(status_code=500, detail="Model returned empty output.")

        # Convert Markdown -> HTML for your frontend preview
        html = md.markdown(markdown_text, extensions=["fenced_code", "tables"])

        # Naive title extract: first H1 line
        title = "Untitled"
        for line in markdown_text.splitlines():
            if line.strip().startswith("# "):
                title = line.strip()[2:].strip()
                break

        # Deduct tokens and save
        user.tokens_remaining -= token_cost

        blog = Blog(
            user_id=user.id,
            title=title,
            topic=req.topic,
            audience=req.audience,
            tone=req.tone,
            word_count=req.word_count,
            features_json=req.features.model_dump_json(),
            token_cost=token_cost,
            content_markdown=markdown_text,
            content_html=html,
        )
        session.add(blog)
        session.add(user)
        session.commit()
        session.refresh(blog)
        session.refresh(user)

        return BlogGenerateResponse(
            blog_id=blog.id,
            title=blog.title,
            token_cost=blog.token_cost,
            tokens_remaining=user.tokens_remaining,
            content_markdown=blog.content_markdown,
            content_html=blog.content_html,
        )


@app.get("/api/blog/{blog_id}")
def get_blog(blog_id: int):
    with Session(engine) as session:
        blog = session.get(Blog, blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found.")
        return blog
