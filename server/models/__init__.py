# server/models/__init__.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    ForeignKey,
    DateTime,
    func,
)
from sqlalchemy.orm import relationship

from db import Base


# ------------------------
# Users / Auth
# ------------------------

class User(Base):
    __tablename__ = "users"

    # UUID string as primary key
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)  # "user" or "admin"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    thesis_projects = relationship("ThesisProject", back_populates="user", cascade="all, delete-orphan")


# ------------------------
# Plans / Billing
# ------------------------

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)  # e.g. "starter", "pro"
    description = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False)
    currency = Column(String, default="USD")
    interval = Column(String, default="monthly")  # "monthly", "yearly", etc.
    max_links = Column(Integer, nullable=True)    # feature gating
    max_pages = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), index=True)

    status = Column(String, default="pending")  # "pending", "active", "canceled"
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    current_period_end = Column(DateTime(timezone=True), nullable=True)

    btcpay_invoice_id = Column(String, nullable=True)

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    events = relationship("PaymentEvent", back_populates="subscription", cascade="all, delete-orphan")


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), index=True)
    event_type = Column(String, nullable=False)  # e.g. "checkout_created", "invoice_paid"
    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    subscription = relationship("Subscription", back_populates="events")


# ------------------------
# Content / Page + Blocks
# ------------------------

class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, index=True)  # UUID string from User.id
    slug = Column(String, unique=True, index=True)
    title = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    theme = Column(String, nullable=True)

    blocks = relationship(
        "Block",
        back_populates="page",
        cascade="all, delete-orphan",
        order_by="Block.sort_order",
    )

    views = relationship("PageView", back_populates="page", cascade="all, delete-orphan")
    clicks = relationship("LinkClick", back_populates="page", cascade="all, delete-orphan")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id", ondelete="CASCADE"), index=True)
    owner_id = Column(String, index=True)

    label = Column(String, nullable=False)
    url = Column(String, nullable=False)
    is_primary = Column(Boolean, default=False)
    sort_order = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    page = relationship("Page", back_populates="blocks")
    clicks = relationship("LinkClick", back_populates="block", cascade="all, delete-orphan")


class PageView(Base):
    __tablename__ = "page_views"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id", ondelete="CASCADE"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    referrer = Column(String, nullable=True)

    page = relationship("Page", back_populates="views")


class LinkClick(Base):
    __tablename__ = "link_clicks"

    id = Column(Integer, primary_key=True, index=True)
    page_id = Column(Integer, ForeignKey("pages.id", ondelete="CASCADE"), index=True)
    block_id = Column(Integer, ForeignKey("blocks.id", ondelete="CASCADE"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    referrer = Column(String, nullable=True)

    page = relationship("Page", back_populates="clicks")
    block = relationship("Block", back_populates="clicks")


# ------------------------
# Thesis Voice Agent Demo
# ------------------------

class ThesisProject(Base):
    __tablename__ = "thesis_projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    active_step = Column(String, default="overview", nullable=False)
    demo_mode = Column(Boolean, default=True, nullable=False)
    credits_required = Column(Boolean, default=False, nullable=False)
    voice_profile_name = Column(String, nullable=True)
    phrase_progress_json = Column(Text, nullable=True)
    consent_json = Column(Text, nullable=True)
    voice_profile_json = Column(Text, nullable=True)
    agent_config_json = Column(Text, nullable=True)
    phone_config_json = Column(Text, nullable=True)
    test_results_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="thesis_projects")


class TelephonySession(Base):
    __tablename__ = "telephony_sessions"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False, default="vapi", index=True)
    call_id = Column(String, nullable=False, unique=True, index=True)
    mode = Column(String, nullable=False, default="direct", index=True)
    status = Column(String, nullable=False, default="queued", index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    thesis_project_id = Column(Integer, ForeignKey("thesis_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    assistant_id = Column(String, nullable=True)
    phone_number_id = Column(String, nullable=True)
    inbound_number = Column(String, nullable=True)
    customer_number = Column(String, nullable=True)
    last_event_type = Column(String, nullable=True)
    session_metadata_json = Column(Text, nullable=True)
    messages_json = Column(Text, nullable=True)
    transcript_json = Column(Text, nullable=True)
    artifacts_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)


__all__ = [
    "User",
    "Plan",
    "Subscription",
    "PaymentEvent",
    "Page",
    "Block",
    "PageView",
    "LinkClick",
    "ThesisProject",
    "TelephonySession",
]
