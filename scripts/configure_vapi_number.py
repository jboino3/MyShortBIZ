#!/usr/bin/env python3
import argparse
import json
import os
import sys

from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER_DIR = os.path.join(ROOT_DIR, "server")
if SERVER_DIR not in sys.path:
    sys.path.insert(0, SERVER_DIR)

load_dotenv(os.path.join(SERVER_DIR, ".env"))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

from services.vapi_service import vapi_service  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Configure a Vapi phone number for direct or SIP transfer mode.")
    parser.add_argument(
        "--mode",
        choices=["direct", "sip-transfer"],
        default=os.getenv("TELEPHONY_MODE", "direct"),
        help="Telephony mode to apply to the Vapi phone number.",
    )
    parser.add_argument(
        "--phone-number-id",
        default=os.getenv("VAPI_PHONE_NUMBER_ID", "").strip(),
        help="Vapi phone number ID to update.",
    )
    parser.add_argument(
        "--public-base-url",
        default=os.getenv("PUBLIC_BASE_URL", "").strip(),
        help="Public base URL for this backend, used in direct mode.",
    )
    parser.add_argument(
        "--credential-id",
        default=os.getenv("VAPI_SERVER_CREDENTIAL_ID", "").strip(),
        help="Optional Vapi credential ID for the assistant-request server webhook.",
    )
    parser.add_argument(
        "--sip-uri",
        default=os.getenv("VAPI_SIP_URI", "").strip(),
        help="SIP URI to transfer to when using sip-transfer mode.",
    )
    parser.add_argument(
        "--message",
        default="Connecting your call now.",
        help="Transfer message used in sip-transfer mode.",
    )
    parser.add_argument(
        "--show-current",
        action="store_true",
        help="Fetch and print the current Vapi phone number configuration before making changes.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.phone_number_id:
        raise SystemExit("VAPI_PHONE_NUMBER_ID or --phone-number-id is required.")

    if args.show_current:
        current = vapi_service.get_phone_number(args.phone_number_id)
        print(json.dumps(current, indent=2))

    if args.mode == "direct":
        if not args.public_base_url:
            raise SystemExit("PUBLIC_BASE_URL or --public-base-url is required in direct mode.")
        updated = vapi_service.configure_direct_mode(
            phone_number_id=args.phone_number_id,
            public_base_url=args.public_base_url,
            credential_id=args.credential_id or None,
        )
    else:
        if not args.sip_uri:
            raise SystemExit("VAPI_SIP_URI or --sip-uri is required in sip-transfer mode.")
        updated = vapi_service.configure_sip_transfer_mode(
            phone_number_id=args.phone_number_id,
            sip_uri=args.sip_uri,
            message=args.message,
        )

    print(json.dumps(updated, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
