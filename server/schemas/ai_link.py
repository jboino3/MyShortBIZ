from pydantic import BaseModel, HttpUrl
from typing import Optional


class LinkGenerateRequest(BaseModel):
    original_url: HttpUrl
    destination_summary: Optional[str] = None
    audience: Optional[str] = None
    tone: str = "Professional"
    goal: Optional[str] = None
    platform: Optional[str] = None
    custom_slug: Optional[str] = None


class LinkGenerateResponse(BaseModel):
    id: int
    original_url: str
    short_code: str
    short_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    cta_text: Optional[str] = None
    tokens_used: int
    tokens_remaining: int


class ShortLinkOut(BaseModel):
    id: int
    original_url: str
    short_code: str
    title: Optional[str] = None
    description: Optional[str] = None
    cta_text: Optional[str] = None
    click_count: int

    class Config:
        from_attributes = True