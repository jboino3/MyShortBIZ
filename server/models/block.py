from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from db import Base


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
