# server/routers/blog.py

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import json

from db import get_db
from models.blog import Blog
from schemas.blog import BlogGenerateRequest, BlogGenerateResponse
from services.blog_service import (
    estimate_token_cost,
    generate_blog_markdown,
    markdown_to_html,
    extract_title,
)

# NOTE: Replace with your real SQLAlchemy User model import
# Example:
# from models.user import User
# For now, we’ll query "users" table via raw SQL if needed.

from sqlalchemy import text

router = APIRouter(prefix="/api/blog", tags=["Blog"])


@router.post("/generate", response_model=BlogGenerateResponse)
def generate_blog(
    req: BlogGenerateRequest,
    db: Session = Depends(get_db),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
):
    if not x_user_id:
        raise HTTPException(
            status_code=401,
            detail="Missing X-User-Id header (temporary dev auth).",
        )

    # Fetch tokens for the user (assumes users table has tokens_remaining)
    row = db.execute(
        text("SELECT id, tokens_remaining FROM users WHERE id = :id"),
        {"id": x_user_id},
    ).mappings().first()

    if not row:
        raise HTTPException(404, "User not found for X-User-Id")

    token_cost = estimate_token_cost(req.word_count, req.features)
    if row["tokens_remaining"] < token_cost:
        raise HTTPException(status_code=402, detail="Not enough tokens.")

    markdown_text = generate_blog_markdown(req)
    if not markdown_text:
        raise HTTPException(500, "Model returned empty output.")

    html = markdown_to_html(markdown_text)
    title = extract_title(markdown_text)

    # Deduct tokens
    db.execute(
        text("UPDATE users SET tokens_remaining = tokens_remaining - :cost WHERE id = :id"),
        {"cost": token_cost, "id": x_user_id},
    )

    blog = Blog(
        user_id=x_user_id,
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

    # Fetch new balance
    new_row = db.execute(
        text("SELECT tokens_remaining FROM users WHERE id = :id"),
        {"id": x_user_id},
    ).mappings().first()

    return BlogGenerateResponse(
        blog_id=blog.id,
        title=blog.title,
        token_cost=blog.token_cost,
        tokens_remaining=new_row["tokens_remaining"],
        content_markdown=blog.content_markdown,
        content_html=blog.content_html,
    )


@router.get("/{blog_id}")
def get_blog(blog_id: int, db: Session = Depends(get_db)):
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    if not blog:
        raise HTTPException(404, "Blog not found")
    return blog
