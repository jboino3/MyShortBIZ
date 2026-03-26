from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from db import Base


class ShortLink(Base):
    __tablename__ = "short_links"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    original_url = Column(Text, nullable=False)
    short_code = Column(String(64), unique=True, nullable=False, index=True)

    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    cta_text = Column(String(255), nullable=True)

    click_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)