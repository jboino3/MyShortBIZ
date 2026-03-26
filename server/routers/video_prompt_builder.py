from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import User
from routers.auth import get_current_user
from schemas.video_prompt_builder import (
    VideoPromptBuildRequest,
    VideoPromptBuildResponse,
)
from services.video_prompt_builder_service import build_video_prompt_package

router = APIRouter(prefix="/ai/video-prompt", tags=["AI Video Prompt"])


@router.post("/build", response_model=VideoPromptBuildResponse)
def build_video_prompt_endpoint(
    req: VideoPromptBuildRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tokens_remaining <= 0:
        raise HTTPException(status_code=402, detail="Not enough tokens")

    payload, tokens_used = build_video_prompt_package(req, db, user)

    return VideoPromptBuildResponse(
        runway_prompt=payload.get("runway_prompt", ""),
        hook=payload.get("hook", ""),
        visual_direction=payload.get("visual_direction", ""),
        caption=payload.get("caption", ""),
        cta_text=payload.get("cta_text", ""),
        tokens_used=tokens_used,
        tokens_remaining=user.tokens_remaining,
    )