from pydantic import BaseModel
from typing import Optional


class SocialGenerateRequest(BaseModel):
    platform: str = "Instagram"
    topic: str
    tone: str = "Professional"
    audience: Optional[str] = None
    call_to_action: Optional[str] = None
    include_hashtags: bool = True
    max_length: int = 280


class SocialGenerateResponse(BaseModel):
    content: str
    tokens_used: int
    tokens_remaining: int