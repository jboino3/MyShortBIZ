# server/schemas/blog.py

from pydantic import BaseModel, Field
from typing import Optional


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
