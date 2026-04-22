import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Optional


@dataclass
class StripeCheckoutSession:
    id: str
    url: str


class StripeService:
    def __init__(self, secret_key: Optional[str] = None):
        self.secret_key = secret_key or os.getenv("STRIPE_SECRET_KEY", "")

    def create_checkout_session(
        self,
        *,
        product_name: str,
        amount_cents: int,
        currency: str,
        success_url: str,
        cancel_url: str,
        customer_email: Optional[str] = None,
        metadata: Optional[dict[str, str]] = None,
    ) -> StripeCheckoutSession:
        if not self.secret_key:
            raise RuntimeError("Stripe is not configured. Set STRIPE_SECRET_KEY.")

        if amount_cents <= 0:
            raise RuntimeError("Amount must be greater than zero.")

        payload = {
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "line_items[0][quantity]": "1",
            "line_items[0][price_data][currency]": currency.lower(),
            "line_items[0][price_data][unit_amount]": str(amount_cents),
            "line_items[0][price_data][product_data][name]": product_name,
        }

        if customer_email:
            payload["customer_email"] = customer_email

        if metadata:
            for key, value in metadata.items():
                payload[f"metadata[{key}]"] = str(value)

        data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.stripe.com/v1/checkout/sessions",
            data=data,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                body = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:  # type: ignore[attr-defined]
            err_body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"Stripe request failed: {err_body}") from exc
        except Exception as exc:
            raise RuntimeError("Unable to connect to Stripe.") from exc

        parsed = json.loads(body)
        checkout_url = parsed.get("url")
        session_id = parsed.get("id")
        if not checkout_url or not session_id:
            raise RuntimeError("Stripe did not return a valid checkout session.")

        return StripeCheckoutSession(id=session_id, url=checkout_url)


stripe_service = StripeService()
