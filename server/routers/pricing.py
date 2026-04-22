from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import get_db
from models import Plan
from .auth import get_current_user, UserOut

router = APIRouter(prefix="/pricing", tags=["pricing"])

DEFAULT_PLANS = [
    {
        "name": "Starter",
        "slug": "starter-10",
        "description": "Entry plan for creators getting started.",
        "price_cents": 1000,
        "currency": "USD",
        "interval": "monthly",
        "max_links": 10,
        "max_pages": 1,
        "is_active": True,
    },
    {
        "name": "Growth",
        "slug": "growth-30",
        "description": "Expanded plan for growing creator businesses.",
        "price_cents": 3000,
        "currency": "USD",
        "interval": "monthly",
        "max_links": 50,
        "max_pages": 5,
        "is_active": True,
    },
    {
        "name": "Scale",
        "slug": "scale-100",
        "description": "High-capacity plan for established creators.",
        "price_cents": 10000,
        "currency": "USD",
        "interval": "monthly",
        "max_links": None,
        "max_pages": None,
        "is_active": True,
    },
]


# ------------------------
# Pydantic models
# ------------------------

class PlanBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price_cents: int
    currency: str = "USD"
    interval: str = "monthly"
    max_links: Optional[int] = None
    max_pages: Optional[int] = None
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    currency: Optional[str] = None
    interval: Optional[str] = None
    max_links: Optional[int] = None
    max_pages: Optional[int] = None
    is_active: Optional[bool] = None


class PlanOut(PlanBase):
    id: int


# ------------------------
# Helpers
# ------------------------

def _require_admin(user: UserOut):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )


def _plan_to_schema(plan: Plan) -> PlanOut:
    return PlanOut(
        id=plan.id,
        name=plan.name,
        slug=plan.slug,
        description=plan.description,
        price_cents=plan.price_cents,
        currency=plan.currency,
        interval=plan.interval,
        max_links=plan.max_links,
        max_pages=plan.max_pages,
        is_active=plan.is_active,
    )


def _ensure_default_plans(db: Session) -> None:
    existing_slugs = {
        slug for (slug,) in db.query(Plan.slug).filter(Plan.slug.in_([plan["slug"] for plan in DEFAULT_PLANS]))
    }
    missing_plans = [plan for plan in DEFAULT_PLANS if plan["slug"] not in existing_slugs]
    if not missing_plans:
        return

    for plan_data in missing_plans:
        db.add(Plan(**plan_data))

    db.commit()


# ------------------------
# Public endpoints
# ------------------------

@router.get("/plans", response_model=List[PlanOut])
def list_active_plans(db: Session = Depends(get_db)):
    """
    Public: list all active plans.
    """
    _ensure_default_plans(db)
    plans = db.query(Plan).filter(Plan.is_active.is_(True)).order_by(Plan.price_cents).all()
    return [_plan_to_schema(p) for p in plans]


# ------------------------
# Admin endpoints
# ------------------------

@router.post("/plans", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    existing = db.query(Plan).filter(Plan.slug == payload.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan slug already exists.",
        )

    plan = Plan(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        price_cents=payload.price_cents,
        currency=payload.currency,
        interval=payload.interval,
        max_links=payload.max_links,
        max_pages=payload.max_pages,
        is_active=payload.is_active,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_to_schema(plan)


@router.put("/plans/{plan_id}", response_model=PlanOut)
def update_plan(
    plan_id: int,
    payload: PlanUpdate,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")

    data = payload.dict(exclude_unset=True)

    for field, value in data.items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return _plan_to_schema(plan)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")

    db.delete(plan)
    db.commit()
    return
