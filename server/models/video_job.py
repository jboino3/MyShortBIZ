from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from db import Base


class VideoJob(Base):
    __tablename__ = "video_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    provider = Column(String, nullable=False, default="runway")
    provider_job_id = Column(String, nullable=True, index=True)

    prompt = Column(Text, nullable=False)
    prompt_image = Column(Text, nullable=True)

    model = Column(String, nullable=False, default="gen4.5")
    ratio = Column(String, nullable=False, default="1280:720")
    duration = Column(Integer, nullable=False, default=5)

    status = Column(String, nullable=False, default="queued")
    output_url = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)