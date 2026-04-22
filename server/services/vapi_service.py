import json
import logging
import os
import time
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)


class VapiService:
    def __init__(self):
        self.api_key = os.getenv("VAPI_API_KEY", "")
        self.api_base = os.getenv("VAPI_API_BASE_URL", "https://api.vapi.ai").rstrip("/")

    def _request(self, method: str, path: str, payload: Optional[dict[str, Any]] = None, retries: int = 2) -> Any:
        if not self.api_key:
            raise RuntimeError("VAPI_API_KEY is not configured.")

        url = f"{self.api_base}{path}"
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "MyShortBIZ-Telephony/1.0",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
        }

        attempt = 0
        while True:
            attempt += 1
            request = Request(url, data=body, headers=headers, method=method)
            try:
                with urlopen(request, timeout=30) as response:
                    raw = response.read().decode("utf-8")
                    return json.loads(raw) if raw else {}
            except HTTPError as exc:
                status_code = getattr(exc, "status", None) or exc.code
                detail = exc.read().decode("utf-8", errors="ignore")
                if attempt <= retries and status_code in {408, 409, 425, 429, 500, 502, 503, 504}:
                    time.sleep(min(2 ** attempt, 5))
                    continue
                raise RuntimeError(f"Vapi API {method} {path} failed with {status_code}: {detail}") from exc
            except URLError as exc:
                if attempt <= retries:
                    time.sleep(min(2 ** attempt, 5))
                    continue
                raise RuntimeError(f"Unable to reach Vapi API at {url}: {exc}") from exc

    def get_phone_number(self, phone_number_id: str) -> dict[str, Any]:
        return self._request("GET", f"/phone-number/{phone_number_id}")

    def list_phone_numbers(self) -> list[dict[str, Any]]:
        result = self._request("GET", "/phone-number")
        return result if isinstance(result, list) else []

    def update_phone_number(self, phone_number_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        logger.info("Updating Vapi phone number configuration for phone_number_id=%s", phone_number_id)
        return self._request("PATCH", f"/phone-number/{phone_number_id}", payload=payload)

    def configure_direct_mode(
        self,
        *,
        phone_number_id: str,
        public_base_url: str,
        credential_id: Optional[str] = None,
    ) -> dict[str, Any]:
        server = {
            "url": f"{public_base_url.rstrip('/')}/telephony/vapi/assistant-request",
            "timeoutSeconds": 20,
        }
        if credential_id:
            server["credentialId"] = credential_id

        payload = {
            "assistantId": None,
            "hooks": [],
            "server": server,
        }
        return self.update_phone_number(phone_number_id, payload)

    def configure_sip_transfer_mode(
        self,
        *,
        phone_number_id: str,
        sip_uri: str,
        message: str = "Connecting your call now.",
    ) -> dict[str, Any]:
        payload = {
            "hooks": [
                {
                    "on": "call.ringing",
                    "do": [
                        {
                            "type": "transfer",
                            "destination": {
                                "type": "sip",
                                "sipUri": sip_uri,
                                "message": message,
                            },
                        }
                    ],
                }
            ]
        }
        return self.update_phone_number(phone_number_id, payload)


vapi_service = VapiService()
