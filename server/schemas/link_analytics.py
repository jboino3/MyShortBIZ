from pydantic import BaseModel
from typing import Optional


class ShortLinkAnalyticsItem(BaseModel):
    id: int
    short_code: str
    original_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    cta_text: Optional[str] = None
    click_count: int

    class Config:
        from_attributes = True


class ShortLinkAnalyticsSummary(BaseModel):
    total_links: int
    total_clicks: int
    links: list[ShortLinkAnalyticsItem]