from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    plan_code: str  # must match one of the codes from /pricing/plans


class CheckoutResponse(BaseModel):
    subscription_id: str
    invoice_id: str
    checkout_url: str
