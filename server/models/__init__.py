import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from db import Base

from .ai_usage import AIUsage
from .blog import Blog
from .block import Block
from .contact import Contact
from .page import LinkClick, Page, PageView
from .short_link import ShortLink
from .video_job import VideoJob


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    tokens_remaining = Column(Integer, nullable=False, default=100000)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    thesis_projects = relationship("ThesisProject", back_populates="user", cascade="all, delete-orphan")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False)
    currency = Column(String, default="USD")
    interval = Column(String, default="monthly")
    max_links = Column(Integer, nullable=True)
    max_pages = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    subscriptions = relationship("Subscription", back_populates="plan")

    @property
    def code(self):
        return self.slug

    @code.setter
    def code(self, value):
        self.slug = value

    @property
    def price_usd(self):
        return float(self.price_cents or 0) / 100.0

    @price_usd.setter
    def price_usd(self, value):
        self.price_cents = int(round(float(value) * 100))

    @property
    def billing_interval(self):
        return self.interval

    @billing_interval.setter
    def billing_interval(self, value):
        self.interval = value


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), index=True)

    status = Column(String, default="pending")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    btcpay_invoice_id = Column(String, nullable=True)

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    events = relationship("PaymentEvent", back_populates="subscription", cascade="all, delete-orphan")

    @property
    def plan_code(self):
        return self.plan.slug if self.plan else None

    @property
    def expires_at(self):
        return self.current_period_end

    @expires_at.setter
    def expires_at(self, value):
        self.current_period_end = value


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), index=True)
    event_type = Column(String, nullable=False)
    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    subscription = relationship("Subscription", back_populates="events")


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
    "AIUsage",
    "Blog",
    "Block",
    "Contact",
    "LinkClick",
    "Page",
    "PageView",
    "PaymentEvent",
    "Plan",
    "ShortLink",
    "Subscription",
    "TelephonySession",
    "ThesisProject",
    "User",
    "VideoJob",
]
