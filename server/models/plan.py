from pydantic import BaseModel
from typing import List, Optional


class Plan(BaseModel):
    code: str                      # e.g. "starter", "pro"
    name: str                      # e.g. "Starter"
    description: Optional[str] = None
    price_usd: float               # e.g. 9.99
    billing_interval: str = "monthly"  # "monthly", "yearly", etc.
    is_active: bool = True
    features: List[str] = []
