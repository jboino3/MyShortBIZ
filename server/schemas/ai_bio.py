from pydantic import BaseModel
from typing import Optional


class BioGenerateRequest(BaseModel):
    name: str
    profession: Optional[str] = None
    niche: Optional[str] = None
    tone: str = "Professional"
    platform: str = "General"
    achievements: Optional[str] = None
    skills: Optional[str] = None
    audience: Optional[str] = None
    max_length: int = 160


class BioGenerateResponse(BaseModel):
    content: str
    tokens_used: int
    tokens_remaining: int