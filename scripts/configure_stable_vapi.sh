#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_ENV="$ROOT_DIR/server/.env"

if [[ ! -f "$SERVER_ENV" ]]; then
  echo "Missing $SERVER_ENV"
  exit 1
fi

read_env_value() {
  local key="$1"
  python3 - "$SERVER_ENV" "$key" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
key = sys.argv[2]
for line in env_path.read_text().splitlines():
    if line.startswith(f"{key}="):
        print(line.split("=", 1)[1].strip())
        raise SystemExit(0)
PY
}

NGROK_DOMAIN="${NGROK_DOMAIN:-$(read_env_value NGROK_DOMAIN)}"
VAPI_PHONE_NUMBER_ID="${VAPI_PHONE_NUMBER_ID:-$(read_env_value VAPI_PHONE_NUMBER_ID)}"

if [[ -z "${NGROK_DOMAIN:-}" ]]; then
  echo "NGROK_DOMAIN is not set in server/.env."
  exit 1
fi

if [[ -z "${VAPI_PHONE_NUMBER_ID:-}" ]]; then
  echo "VAPI_PHONE_NUMBER_ID is not set in server/.env."
  exit 1
fi

PUBLIC_URL="https://${NGROK_DOMAIN}"

python3 - <<PY
from pathlib import Path

env_path = Path(r"$SERVER_ENV")
lines = env_path.read_text().splitlines()
updated = False
for index, line in enumerate(lines):
    if line.startswith("PUBLIC_BASE_URL="):
        lines[index] = "PUBLIC_BASE_URL=$PUBLIC_URL"
        updated = True
        break
if not updated:
    lines.append("PUBLIC_BASE_URL=$PUBLIC_URL")
env_path.write_text("\n".join(lines) + "\n")
print("Updated PUBLIC_BASE_URL to $PUBLIC_URL")
PY

exec "$ROOT_DIR/server/.venv/bin/python" "$ROOT_DIR/scripts/configure_vapi_number.py" \
  --mode direct \
  --public-base-url "$PUBLIC_URL" \
  --phone-number-id "$VAPI_PHONE_NUMBER_ID" \
  --show-current
