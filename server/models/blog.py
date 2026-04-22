from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from db import Base

class Blog(Base):
    __tablename__ = "blogs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    topic = Column(String(255), nullable=False)
    audience = Column(String(255), nullable=False)
    tone = Column(String(80), nullable=False)
    word_count = Column(Integer, nullable=False)

    features_json = Column(Text, nullable=False)
    token_cost = Column(Integer, nullable=False)

    content_markdown = Column(Text, nullable=False)
    content_html = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
