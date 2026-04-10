# server/routers/dashboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from db import get_db
from routers.auth import get_current_user, UserOut
from models import User, Blog, Page, PageView, LinkClick, Subscription, Plan

router = APIRouter(prefix="/api/me", tags=["dashboard"])


@router.get("/dashboard")
def get_dashboard(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()

    blog_count = db.query(Blog).filter(Blog.user_id == user.id).count()

    page = db.query(Page).filter(Page.owner_id == user.id).first()

    total_views = 0
    total_clicks = 0
    if page:
        total_views = db.query(PageView).filter(PageView.page_id == page.id).count()
        total_clicks = db.query(LinkClick).filter(LinkClick.page_id == page.id).count()

    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == user.id, Subscription.status == "active")
        .first()
    )

    plan_name = None
    if sub:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan:
            plan_name = plan.name

    return {
        "email": user.email,
        "tokens_remaining": user.tokens_remaining,
        "plan": plan_name,
        "blog_count": blog_count,
        "page_slug": page.slug if page else None,
        "total_views": total_views,
        "total_clicks": total_clicks,
    }