from pydantic import BaseModel
from datetime import datetime
from typing import Any, Dict, Optional


class PaymentEvent(BaseModel):
    id: str
    btcpay_invoice_id: str
    event_type: str
    payload: Dict[str, Any]
    created_at: datetime
    subscription_id: Optional[str] = None
