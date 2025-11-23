from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import get_db
from models import Plan, Subscription, PaymentEvent
from .auth import get_current_user, UserOut

router = APIRouter(prefix="/payments", tags=["payments"])


# ------------------------
# Pydantic models
# ------------------------

class CheckoutRequest(BaseModel):
    plan_slug: str


class CheckoutResponse(BaseModel):
    subscription_id: int
    checkout_url: str
    status: str


class SubscriptionOut(BaseModel):
    id: int
    plan_slug: str
    plan_name: str
    status: str
    started_at: datetime
    current_period_end: Optional[datetime] = None


class PaymentEventOut(BaseModel):
    id: int
    subscription_id: int
    event_type: str
    created_at: datetime


class WebhookStubPayload(BaseModel):
    subscription_id: int
    event_type: str = "invoice_paid"  # for now


# ------------------------
# Helpers
# ------------------------

def _require_admin(user: UserOut):
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )


def _subscription_to_schema(sub: Subscription) -> SubscriptionOut:
    return SubscriptionOut(
        id=sub.id,
        plan_slug=sub.plan.slug if sub.plan else "",
        plan_name=sub.plan.name if sub.plan else "",
        status=sub.status,
        started_at=sub.started_at,
        current_period_end=sub.current_period_end,
    )


def _event_to_schema(ev: PaymentEvent) -> PaymentEventOut:
    return PaymentEventOut(
        id=ev.id,
        subscription_id=ev.subscription_id,
        event_type=ev.event_type,
        created_at=ev.created_at,
    )


# ------------------------
# Checkout (stub)
# ------------------------

@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    payload: CheckoutRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a pending subscription and return a fake BTCPay URL.
    """
    plan = db.query(Plan).filter(Plan.slug == payload.plan_slug, Plan.is_active.is_(True)).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found or inactive.",
        )

    # Optional: ensure user doesn't already have an active sub for this plan
    existing_active = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.plan_id == plan.id,
            Subscription.status == "active",
        )
        .first()
    )
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription for this plan.",
        )

    # Create subscription in pending status
    fake_invoice_id = f"INV-{current_user.id[:8]}-{plan.slug}-{int(datetime.utcnow().timestamp())}"

    sub = Subscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status="pending",
        btcpay_invoice_id=fake_invoice_id,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    # Log checkout event
    event = PaymentEvent(
        subscription_id=sub.id,
        event_type="checkout_created",
        raw_payload=None,
    )
    db.add(event)
    db.commit()

    checkout_url = f"https://btcpay.example.com/invoice/{fake_invoice_id}"

    return CheckoutResponse(
        subscription_id=sub.id,
        checkout_url=checkout_url,
        status=sub.status,
    )


# ------------------------
# Webhook stub
# ------------------------

@router.post("/webhook", status_code=status.HTTP_202_ACCEPTED)
def webhook_stub(
    payload: WebhookStubPayload,
    db: Session = Depends(get_db),
):
    """
    Stub webhook: flip subscription status based on event_type.
    In real BTCPay integration, you'd validate signature and parse their JSON.
    """
    sub = db.query(Subscription).filter(Subscription.id == payload.subscription_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    # Very naive stub: mark active if invoice_paid
    if payload.event_type == "invoice_paid":
        sub.status = "active"
        # Optionally set current_period_end here
    elif payload.event_type == "subscription_canceled":
        sub.status = "canceled"

    db.add(sub)

    event = PaymentEvent(
        subscription_id=sub.id,
        event_type=payload.event_type,
        raw_payload=None,
    )
    db.add(event)

    db.commit()
    return {"ok": True}


# ------------------------
# User-facing endpoints
# ------------------------

@router.get("/my-subscriptions", response_model=List[SubscriptionOut])
def get_my_subscriptions(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subs = (
        db.query(Subscription)
        .join(Plan, Subscription.plan_id == Plan.id)
        .filter(Subscription.user_id == current_user.id)
        .order_by(Subscription.started_at.desc())
        .all()
    )
    return [_subscription_to_schema(s) for s in subs]


# ------------------------
# Admin endpoints
# ------------------------

@router.get("/subscriptions", response_model=List[SubscriptionOut])
def list_all_subscriptions(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    subs = (
        db.query(Subscription)
        .join(Plan, Subscription.plan_id == Plan.id)
        .order_by(Subscription.started_at.desc())
        .all()
    )
    return [_subscription_to_schema(s) for s in subs]


@router.get("/events", response_model=List[PaymentEventOut])
def list_all_events(
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)

    events = db.query(PaymentEvent).order_by(PaymentEvent.created_at.desc()).all()
    return [_event_to_schema(e) for e in events]
