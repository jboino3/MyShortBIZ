from pydantic import BaseModel, Field, HttpUrl
from typing import Optional


class VideoGenerateRequest(BaseModel):
    # Direct prompt path
    prompt: Optional[str] = Field(None, min_length=3, max_length=2000)

    # Structured prompt-builder path
    topic: Optional[str] = Field(None, min_length=3, max_length=300)
    product_name: Optional[str] = None
    product_type: Optional[str] = None
    target_audience: Optional[str] = None
    platform: str = "TikTok"
    tone: str = "Professional"
    goal: str = "Promote a product"
    call_to_action: Optional[str] = None
    visual_style: Optional[str] = None
    extra_context: Optional[str] = None

    # Runway settings
    prompt_image: Optional[HttpUrl] = None
    ratio: str = "1280:720"
    duration: int = Field(5, ge=2, le=10)


class VideoGenerateResponse(BaseModel):
    id: int
    provider: str
    model: str
    status: str
    provider_job_id: Optional[str] = None
    final_prompt: str


class VideoJobOut(BaseModel):
    id: int
    provider: str
    provider_job_id: Optional[str] = None
    prompt: str
    prompt_image: Optional[str] = None
    model: str
    ratio: str
    duration: int
    status: str
    output_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True