from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import User
from routers.auth import get_current_user
from schemas.ai_social import SocialGenerateRequest, SocialGenerateResponse
from services.ai_social_service import generate_social_post

router = APIRouter(prefix="/ai/social", tags=["AI Social"])


@router.post("/generate", response_model=SocialGenerateResponse)
def generate_social_endpoint(
    req: SocialGenerateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tokens_remaining <= 0:
        raise HTTPException(status_code=402, detail="Not enough tokens")

    content, tokens_used = generate_social_post(req, db, user)

    return SocialGenerateResponse(
        content=content,
        tokens_used=tokens_used,
        tokens_remaining=user.tokens_remaining,
    )