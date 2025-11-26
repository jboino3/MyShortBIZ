from dataclasses import dataclass
from typing import Optional
import uuid


@dataclass
class BtcPayInvoice:
    id: str
    checkout_url: str
    amount: float
    currency: str


class BtcPayService:
    """
    Wrapper around BTCPay Server API.

    Right now this is a stub that just fakes an invoice.
    Later, you'll:
      - store BTCPAY_URL, STORE_ID, API_KEY in env vars
      - use httpx/requests to call the real BTCPay API
    """

    def __init__(
        self,
        base_url: str = "https://btcpay.example.com",  #replace
        store_id: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.store_id = store_id
        self.api_key = api_key

    def create_invoice(self, amount: float, currency: str, metadata: dict | None = None) -> BtcPayInvoice:
        """
        Stub: generate a fake invoice.
        Replace with real HTTP call when you connect BTCPay.
        """
        invoice_id = str(uuid.uuid4())
        checkout_url = f"{self.base_url}/i/{invoice_id}"

        # Here you would:
        #  - POST to BTCPay API /api/v1/stores/{storeId}/invoices
        #  - pass amount, currency, metadata
        #  - get back real invoiceId & checkoutLink

        return BtcPayInvoice(
            id=invoice_id,
            checkout_url=checkout_url,
            amount=amount,
            currency=currency,
        )


# Global service instance (you can later wire env vars here)
btcpay_service = BtcPayService()
