import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, HttpUrl
from sqlalchemy.orm import Session

from db import get_db
from models import Plan, Subscription, PaymentEvent
from services.btcpay_service import btcpay_service
from services.stripe_service import stripe_service
from .auth import get_current_user, UserOut

router = APIRouter(prefix="/payments", tags=["payments"])


class CheckoutRequest(BaseModel):
    plan_slug: str


class CardCheckoutRequest(BaseModel):
    plan_slug: str
    success_url: HttpUrl
    cancel_url: HttpUrl
    customer_email: Optional[EmailStr] = None
    cardholder_name: Optional[str] = None


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
    event_type: str = "invoice_paid"


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


def _get_plan_or_404(db: Session, plan_slug: str) -> Plan:
    plan = db.query(Plan).filter(Plan.slug == plan_slug, Plan.is_active.is_(True)).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found or inactive.",
        )
    return plan


def _create_pending_subscription(
    db: Session,
    user_id: str,
    plan: Plan,
    external_invoice_id: Optional[str],
) -> Subscription:
    existing_active = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
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

    sub = Subscription(
        user_id=user_id,
        plan_id=plan.id,
        status="pending",
        btcpay_invoice_id=external_invoice_id,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def _log_payment_event(db: Session, subscription_id: int, event_type: str, payload: Optional[dict] = None):
    event = PaymentEvent(
        subscription_id=subscription_id,
        event_type=event_type,
        raw_payload=json.dumps(payload) if payload else None,
    )
    db.add(event)
    db.commit()


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(
    payload: CheckoutRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Legacy checkout endpoint preserved as-is for backward compatibility.
    """
    plan = _get_plan_or_404(db, payload.plan_slug)

    fake_invoice_id = f"INV-{current_user.id[:8]}-{plan.slug}-{int(datetime.utcnow().timestamp())}"
    sub = _create_pending_subscription(db, current_user.id, plan, fake_invoice_id)

    _log_payment_event(db, sub.id, "checkout_created")

    checkout_url = f"https://btcpay.example.com/invoice/{fake_invoice_id}"

    return CheckoutResponse(
        subscription_id=sub.id,
        checkout_url=checkout_url,
        status=sub.status,
    )


@router.post("/checkout/bitcoin", response_model=CheckoutResponse)
def checkout_bitcoin(
    payload: CheckoutRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = _get_plan_or_404(db, payload.plan_slug)

    amount = float(plan.price_cents) / 100.0
    invoice = btcpay_service.create_invoice(
        amount=amount,
        currency=plan.currency,
        metadata={"user_id": current_user.id, "plan_slug": plan.slug},
    )

    sub = _create_pending_subscription(db, current_user.id, plan, invoice.id)

    _log_payment_event(
        db,
        sub.id,
        "bitcoin_checkout_created",
        payload={
            "invoice_id": invoice.id,
            "checkout_url": invoice.checkout_url,
            "amount": invoice.amount,
            "currency": invoice.currency,
        },
    )

    return CheckoutResponse(
        subscription_id=sub.id,
        checkout_url=invoice.checkout_url,
        status=sub.status,
    )


@router.post("/checkout/card", response_model=CheckoutResponse)
def checkout_card(
    payload: CardCheckoutRequest,
    current_user: UserOut = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = _get_plan_or_404(db, payload.plan_slug)

    try:
        session = stripe_service.create_checkout_session(
            product_name=f"{plan.name} Plan",
            amount_cents=plan.price_cents,
            currency=plan.currency,
            success_url=str(payload.success_url),
            cancel_url=str(payload.cancel_url),
            customer_email=payload.customer_email,
            metadata={
                "user_id": current_user.id,
                "plan_slug": plan.slug,
                "cardholder_name": payload.cardholder_name or "",
            },
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    sub = _create_pending_subscription(db, current_user.id, plan, None)

    _log_payment_event(
        db,
        sub.id,
        "card_checkout_created",
        payload={
            "stripe_session_id": session.id,
            "checkout_url": session.url,
        },
    )

    return CheckoutResponse(
        subscription_id=sub.id,
        checkout_url=session.url,
        status=sub.status,
    )


@router.post("/webhook", status_code=status.HTTP_202_ACCEPTED)
def webhook_stub(
    payload: WebhookStubPayload,
    db: Session = Depends(get_db),
):
    sub = db.query(Subscription).filter(Subscription.id == payload.subscription_id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

    if payload.event_type == "invoice_paid":
        sub.status = "active"
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
