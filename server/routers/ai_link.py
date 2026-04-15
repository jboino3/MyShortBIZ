from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from db import get_db
from models import User
from models.short_link import ShortLink
from routers.auth import get_current_user
from schemas.ai_link import LinkGenerateRequest, LinkGenerateResponse, ShortLinkOut
from services.ai_link_service import generate_short_link_record
from schemas.link_analytics import (
    ShortLinkAnalyticsItem,
    ShortLinkAnalyticsSummary,
)

# These imports used in debug/users endpoint
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import User

router = APIRouter(tags=["AI Link"])


@router.post("/ai/link/generate", response_model=LinkGenerateResponse)
def generate_link_endpoint(
    req: LinkGenerateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.tokens_remaining <= 0:
        raise HTTPException(status_code=402, detail="Not enough tokens")

    short_link, tokens_used = generate_short_link_record(req, db, user)

    base_url = str(request.base_url).rstrip("/")
    short_url = f"{base_url}/r/{short_link.short_code}"

    return LinkGenerateResponse(
        id=short_link.id,
        original_url=short_link.original_url,
        short_code=short_link.short_code,
        short_url=short_url,
        title=short_link.title,
        description=short_link.description,
        cta_text=short_link.cta_text,
        tokens_used=tokens_used,
        tokens_remaining=user.tokens_remaining,
    )


@router.get("/ai/link/my", response_model=list[ShortLinkOut])
def list_my_links(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    links = (
        db.query(ShortLink)
        .filter(ShortLink.user_id == current_user.id)
        .order_by(ShortLink.created_at.desc())
        .all()
    )
    return links


@router.get("/r/{short_code}")
def redirect_short_link(short_code: str, db: Session = Depends(get_db)):
    link = db.query(ShortLink).filter(ShortLink.short_code == short_code).first()
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found")

    link.click_count += 1
    db.commit()

    return RedirectResponse(url=link.original_url, status_code=307)

@router.get("/ai/link/analytics", response_model=ShortLinkAnalyticsSummary)
def get_my_link_analytics(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    links = (
        db.query(ShortLink)
        .filter(ShortLink.user_id == current_user.id)
        .order_by(ShortLink.created_at.desc())
        .all()
    )

    total_clicks = sum(link.click_count for link in links)

    return ShortLinkAnalyticsSummary(
        total_links=len(links),
        total_clicks=total_clicks,
        links=links,
    )


@router.get("/ai/link/analytics/{link_id}", response_model=ShortLinkAnalyticsItem)
def get_single_link_analytics(
    link_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    link = (
        db.query(ShortLink)
        .filter(
            ShortLink.id == link_id,
            ShortLink.user_id == current_user.id,
        )
        .first()
    )

    if not link:
        raise HTTPException(status_code=404, detail="Short link not found")

    return link

@router.get("/debug/users")
def debug_users(db: Session = Depends(get_db)):
    return db.query(User).all()