from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime

from db import Base


class AIUsage(Base):
    __tablename__ = "ai_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))

    feature = Column(String)   # blog, seo, email, etc.
    model = Column(String)     # gpt-4o-mini, etc.

    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    total_tokens = Column(Integer)

    cost_usd = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)