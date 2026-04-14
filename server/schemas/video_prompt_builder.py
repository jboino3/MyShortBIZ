from pydantic import BaseModel, Field
from typing import Optional


class VideoPromptBuildRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300)
    product_name: Optional[str] = None
    product_type: Optional[str] = None
    target_audience: Optional[str] = None
    platform: str = "TikTok"
    tone: str = "Professional"
    goal: str = "Promote a product"
    call_to_action: Optional[str] = None
    visual_style: Optional[str] = None
    duration_seconds: int = Field(5, ge=2, le=10)
    aspect_ratio: str = "1280:720"
    extra_context: Optional[str] = None


class VideoPromptBuildResponse(BaseModel):
    runway_prompt: str
    hook: str
    visual_direction: str
    caption: str
    cta_text: str
    tokens_used: int
    tokens_remaining: int