from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import User
from routers.auth import get_current_user
from schemas.ai_bio import BioGenerateRequest, BioGenerateResponse
from services.ai_bio_service import generate_bio

router = APIRouter(prefix="/ai/bio", tags=["AI Bio"])


@router.post("/generate", response_model=BioGenerateResponse)
def generate_bio_endpoint(
    req: BioGenerateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tokens_remaining <= 0:
        raise HTTPException(status_code=402, detail="Not enough tokens")

    content, tokens_used = generate_bio(req, db, user)

    return BioGenerateResponse(
        content=content,
        tokens_used=tokens_used,
        tokens_remaining=user.tokens_remaining,
    )