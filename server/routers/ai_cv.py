from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from routers.auth import get_current_user
from models import User
from schemas.ai_cv import CVGenerateRequest, CVGenerateResponse
from services.ai_cv_service import generate_cv

router = APIRouter(prefix="/ai/cv", tags=["AI CV"])


@router.post("/generate", response_model=CVGenerateResponse)
def generate_cv_endpoint(
    req: CVGenerateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()

    if user.tokens_remaining <= 0:
        raise HTTPException(status_code=402, detail="Not enough tokens")

    content, tokens_used = generate_cv(req, db, user)

    return CVGenerateResponse(
        content_markdown=content,
        tokens_used=tokens_used,
        tokens_remaining=user.tokens_remaining,
    )