from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, HttpUrl
from typing import List, Optional

from sqlalchemy.orm import Session

from .auth import get_current_user  # returns UserInDB with id as UUID string
from db import get_db
from models import Page, Block, PageView, LinkClick

router = APIRouter(
    prefix="/content",
    tags=["content"],
)


# ------------------------
# Pydantic models
# ------------------------

class PageSave(BaseModel):
    slug: str
    title: str
    bio: Optional[str] = None
    avatar_url: Optional[HttpUrl] = None
    theme: Optional[str] = None  # e.g. "purple-dark"


class PageOut(PageSave):
    id: int
    owner_id: str        # UUID string


class BlockCreate(BaseModel):
    label: str
    url: HttpUrl
    is_primary: bool = False
    sort_order: Optional[int] = None
    is_active: bool = True


class BlockUpdate(BaseModel):
    label: Optional[str] = None
    url: Optional[HttpUrl] = None
    is_primary: Optional[bool] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class BlockOut(BlockCreate):
    id: int
    page_id: int
    owner_id: str        # UUID string


class PublicPageResponse(BaseModel):
    page: PageOut
    blocks: List[BlockOut]


class TrackViewIn(BaseModel):
    slug: str  # page slug


class TrackClickIn(BaseModel):
    slug: str      # page slug (for safety)
    block_id: int  # which block was clicked


class TrackResponse(BaseModel):
    ok: bool


# ------------------------
# Helper functions
# ------------------------

def _page_to_schema(page: Page) -> PageOut:
    return PageOut(
        id=page.id,
        owner_id=page.owner_id,
        slug=page.slug,
        title=page.title,
        bio=page.bio,
        avatar_url=page.avatar_url,
        theme=page.theme,
    )


def _block_to_schema(block: Block) -> BlockOut:
    return BlockOut(
        id=block.id,
        page_id=block.page_id,
        owner_id=block.owner_id,
        label=block.label,
        url=block.url,
        is_primary=block.is_primary,
        sort_order=block.sort_order,
        is_active=block.is_active,
    )


def _get_page_by_owner(db: Session, user_id: str) -> Optional[Page]:
    return db.query(Page).filter(Page.owner_id == user_id).first()


def _get_page_by_slug(db: Session, slug: str) -> Optional[Page]:
    return db.query(Page).filter(Page.slug == slug).first()


def _require_page_for_owner(db: Session, user_id: str) -> Page:
    page = _get_page_by_owner(db, user_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't have a page yet. Create one with PUT /content/me/page.",
        )
    return page


# ------------------------
# Page endpoints (owner)
# ------------------------

@router.get("/me/page", response_model=Optional[PageOut])
def get_my_page(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the current user's page, or null if none exists yet.
    """
    page = _get_page_by_owner(db, current_user.id)
    if not page:
        return None
    return _page_to_schema(page)


@router.put("/me/page", response_model=PageOut)
def upsert_my_page(
    payload: PageSave,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update the current user's page.
    """
    user_id = current_user.id

    page = _get_page_by_owner(db, user_id)
    if page:
        # Update existing page
        page.slug = payload.slug
        page.title = payload.title
        page.bio = payload.bio
        page.avatar_url = str(payload.avatar_url) if payload.avatar_url else None
        page.theme = payload.theme
    else:
        # Create new page
        page = Page(
            owner_id=user_id,
            slug=payload.slug,
            title=payload.title,
            bio=payload.bio,
            avatar_url=str(payload.avatar_url) if payload.avatar_url else None,
            theme=payload.theme,
        )
        db.add(page)

    db.commit()
    db.refresh(page)
    return _page_to_schema(page)


# ------------------------
# Block (link) endpoints (owner)
# ------------------------

@router.get("/me/blocks", response_model=List[BlockOut])
def list_my_blocks(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all blocks (links) for the current user's page, ordered by sort_order then id.
    """
    page = _require_page_for_owner(db, current_user.id)

    blocks = (
        db.query(Block)
        .filter(Block.owner_id == current_user.id, Block.page_id == page.id)
        .order_by(Block.sort_order.is_(None), Block.sort_order, Block.id)
        .all()
    )

    return [_block_to_schema(b) for b in blocks]


@router.post("/me/blocks", response_model=BlockOut, status_code=status.HTTP_201_CREATED)
def create_block(
    payload: BlockCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new block (link) on the current user's page.
    """
    page = _require_page_for_owner(db, current_user.id)

    # If sort_order not given, put it at the end
    if payload.sort_order is None:
        existing_blocks = (
            db.query(Block)
            .filter(Block.owner_id == current_user.id, Block.page_id == page.id)
            .all()
        )
        max_order = max((b.sort_order or 0 for b in existing_blocks), default=0)
        sort_order = max_order + 1
    else:
        sort_order = payload.sort_order

    block = Block(
        page_id=page.id,
        owner_id=current_user.id,
        label=payload.label,
        url=str(payload.url),
        is_primary=payload.is_primary,
        sort_order=sort_order,
        is_active=payload.is_active,
    )

    db.add(block)
    db.commit()
    db.refresh(block)

    return _block_to_schema(block)


@router.patch("/me/blocks/{block_id}", response_model=BlockOut)
def update_block(
    block_id: int,
    payload: BlockUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update one of the current user's blocks (links).
    """
    block = (
        db.query(Block)
        .filter(Block.id == block_id, Block.owner_id == current_user.id)
        .first()
    )
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found.")

    data = payload.dict(exclude_unset=True)

    if "label" in data:
        block.label = data["label"]
    if "url" in data:
        block.url = str(data["url"]) if data["url"] is not None else block.url
    if "is_primary" in data:
        block.is_primary = data["is_primary"]
    if "sort_order" in data:
        block.sort_order = data["sort_order"]
    if "is_active" in data:
        block.is_active = data["is_active"]

    db.commit()
    db.refresh(block)
    return _block_to_schema(block)


@router.delete("/me/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(
    block_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete one of the current user's blocks (links).
    """
    block = (
        db.query(Block)
        .filter(Block.id == block_id, Block.owner_id == current_user.id)
        .first()
    )
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found.")

    db.delete(block)
    db.commit()
    return


# ------------------------
# Public endpoints (no auth)
# ------------------------

@router.get("/public/pages/{slug}", response_model=PublicPageResponse)
def get_public_page_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Public endpoint: fetch a page + its active blocks by slug.
    This is what the public MyShortBIZ profile will use.
    """
    page = _get_page_by_slug(db, slug)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found.",
        )

    blocks = (
        db.query(Block)
        .filter(Block.page_id == page.id, Block.is_active.is_(True))
        .order_by(Block.sort_order.is_(None), Block.sort_order, Block.id)
        .all()
    )

    return PublicPageResponse(
        page=_page_to_schema(page),
        blocks=[_block_to_schema(b) for b in blocks],
    )


@router.post("/public/track/view", response_model=TrackResponse, status_code=status.HTTP_201_CREATED)
def track_page_view(
    payload: TrackViewIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Track a public page view by slug.
    """
    page = _get_page_by_slug(db, payload.slug)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found.",
        )

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    ref = request.headers.get("referer") or request.headers.get("referrer")

    view = PageView(
        page_id=page.id,
        ip_address=ip,
        user_agent=ua,
        referrer=ref,
    )
    db.add(view)
    db.commit()

    return TrackResponse(ok=True)


@router.post("/public/track/click", response_model=TrackResponse, status_code=status.HTTP_201_CREATED)
def track_link_click(
    payload: TrackClickIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Track a public link click for a specific block on a page.
    """
    page = _get_page_by_slug(db, payload.slug)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found.",
        )

    block = (
        db.query(Block)
        .filter(Block.id == payload.block_id, Block.page_id == page.id)
        .first()
    )
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found for this page.",
        )

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    ref = request.headers.get("referer") or request.headers.get("referrer")

    click = LinkClick(
        page_id=page.id,
        block_id=block.id,
        ip_address=ip,
        user_agent=ua,
        referrer=ref,
    )
    db.add(click)
    db.commit()

    return TrackResponse(ok=True)
