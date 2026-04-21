#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_ENV="$ROOT_DIR/server/.env"
LOCAL_HEALTH_URL="http://127.0.0.1:8000/api/health"

read_env_value() {
  local key="$1"
  python3 - "$SERVER_ENV" "$key" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
key = sys.argv[2]
if not env_path.exists():
    raise SystemExit(0)
for line in env_path.read_text().splitlines():
    if line.startswith(f"{key}="):
        print(line.split("=", 1)[1].strip())
        raise SystemExit(0)
PY
}

NGROK_DOMAIN="${NGROK_DOMAIN:-$(read_env_value NGROK_DOMAIN)}"
PUBLIC_HEALTH_URL="https://${NGROK_DOMAIN}/telephony/vapi/health"
PATCH_SCRIPT="$ROOT_DIR/scripts/configure_stable_vapi.sh"
HEALTH_FAILURE_THRESHOLD="${HEALTH_FAILURE_THRESHOLD:-3}"

health_ready() {
  local url="$1"
  local output
  if ! output="$(curl -fsS --max-time 12 "$url" 2>/dev/null)"; then
    return 1
  fi
  if [[ "$url" == "$PUBLIC_HEALTH_URL" ]]; then
    grep -q '"status":"ok"' <<<"$output" &&
      grep -q '"voice_daemon_healthy":true' <<<"$output" &&
      grep -q '"phone_reply_cache_ready":true' <<<"$output"
    return $?
  fi
  grep -q '"status":"ok"' <<<"$output"
}

if [[ -z "${NGROK_DOMAIN:-}" ]]; then
  echo "[PHONE] NGROK_DOMAIN is missing. Telephony auto-setup cannot start."
  exit 1
fi

echo "[PHONE] Waiting for local API on $LOCAL_HEALTH_URL"
until health_ready "$LOCAL_HEALTH_URL"; do
  sleep 2
done

echo "[PHONE] Waiting for public tunnel on $PUBLIC_HEALTH_URL"
until health_ready "$PUBLIC_HEALTH_URL"; do
  sleep 2
done

echo "[PHONE] Public tunnel is reachable. Patching Vapi number."
bash "$PATCH_SCRIPT"
echo "[PHONE] Telephony is ready."

local_failures=0
public_failures=0

while true; do
  if ! health_ready "$LOCAL_HEALTH_URL"; then
    local_failures=$((local_failures + 1))
    echo "[PHONE] Local API health check failed (${local_failures}/${HEALTH_FAILURE_THRESHOLD})."
    if (( local_failures >= HEALTH_FAILURE_THRESHOLD )); then
      echo "[PHONE] Local API health is down. Waiting for recovery."
      until health_ready "$LOCAL_HEALTH_URL"; do
        sleep 2
      done
      echo "[PHONE] Local API recovered."
      local_failures=0
    fi
  else
    local_failures=0
  fi

  if ! health_ready "$PUBLIC_HEALTH_URL"; then
    public_failures=$((public_failures + 1))
    echo "[PHONE] Public tunnel health check failed (${public_failures}/${HEALTH_FAILURE_THRESHOLD})."
    if (( public_failures >= HEALTH_FAILURE_THRESHOLD )); then
      echo "[PHONE] Public tunnel health is down. Waiting for recovery."
      until health_ready "$PUBLIC_HEALTH_URL"; do
        sleep 2
      done
      echo "[PHONE] Public tunnel recovered. Repatching Vapi number."
      bash "$PATCH_SCRIPT"
      echo "[PHONE] Telephony is ready again."
      public_failures=0
    fi
  else
    public_failures=0
  fi

  sleep 15
done
