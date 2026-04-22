from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db import Base


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
