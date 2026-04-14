# server/routers/blog.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models import Blog, User
from schemas.blog import BlogGenerateRequest, BlogGenerateResponse
from services.blog_service import (
    estimate_token_cost,
    generate_blog_markdown,
    markdown_to_html,
    extract_title,
)

from routers.auth import get_current_user, UserOut

router = APIRouter(prefix="/api/blog", tags=["Blog"])


# ------------------------
# Generate Blog
# ------------------------
@router.post("/generate", response_model=BlogGenerateResponse)
def generate_blog(
    req: BlogGenerateRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token_cost = estimate_token_cost(req.word_count, req.features)

    if user.tokens_remaining < token_cost:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Not enough tokens.",
        )

    markdown_text = generate_blog_markdown(req, db, user)
    if not markdown_text:
        raise HTTPException(status_code=500, detail="Model returned empty output.")

    html = markdown_to_html(markdown_text)
    title = extract_title(markdown_text)

    blog = Blog(
        user_id=user.id,
        title=title,
        topic=req.topic,
        audience=req.audience,
        tone=req.tone,
        word_count=req.word_count,
        features_json=req.features.model_dump_json(),
        token_cost=token_cost,
        content_markdown=markdown_text,
        content_html=html,
    )

    db.add(blog)
    db.commit()
    db.refresh(blog)

    return BlogGenerateResponse(
        blog_id=blog.id,
        title=blog.title,
        token_cost=blog.token_cost,
        tokens_remaining=user.tokens_remaining,
        content_markdown=blog.content_markdown,
        content_html=blog.content_html,
    )


# ------------------------
# Get Single Blog
# ------------------------
@router.get("/{blog_id}")
def get_blog(
    blog_id: int,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    blog = (
        db.query(Blog)
        .filter(Blog.id == blog_id, Blog.user_id == current_user.id)
        .first()
    )
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    return blog


# ------------------------
# Get My Blogs
# ------------------------
@router.get("/my")
def get_my_blogs(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    blogs = (
        db.query(Blog)
        .filter(Blog.user_id == current_user.id)
        .order_by(Blog.created_at.desc())
        .all()
    )

    return blogs