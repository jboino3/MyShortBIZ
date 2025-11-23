from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class Subscription(BaseModel):
    id: str
    user_id: str
    plan_code: str
    status: str  # "pending", "active", "expired", "canceled"
    btcpay_invoice_id: str
    currency: str
    amount: float
    created_at: datetime
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
