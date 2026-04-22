#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_ENV="$ROOT_DIR/server/.env"
NGROK_BIN="${NGROK_BIN:-}"
NGROK_CONFIG_PATH="${NGROK_CONFIG_PATH:-$ROOT_DIR/server/.cache/ngrok/ngrok.yml}"
NGROK_PUBLIC_CHECK_PATH="${NGROK_PUBLIC_CHECK_PATH:-/api/health}"
NGROK_PUBLIC_CHECK_INTERVAL="${NGROK_PUBLIC_CHECK_INTERVAL:-15}"
NGROK_PUBLIC_FAILURE_THRESHOLD="${NGROK_PUBLIC_FAILURE_THRESHOLD:-3}"

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

NGROK_AUTHTOKEN="${NGROK_AUTHTOKEN:-$(read_env_value NGROK_AUTHTOKEN)}"
NGROK_DOMAIN="${NGROK_DOMAIN:-$(read_env_value NGROK_DOMAIN)}"
NGROK_CACHE_DIR="${NGROK_CACHE_DIR:-$ROOT_DIR/server/.cache/ngrok/bin}"

download_ngrok() {
  local arch
  arch="$(uname -m)"
  local archive_url=""
  case "$arch" in
    x86_64|amd64)
      archive_url="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz"
      ;;
    aarch64|arm64)
      archive_url="https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz"
      ;;
    *)
      echo "Unsupported architecture for automatic ngrok download: $arch"
      return 1
      ;;
  esac

  mkdir -p "$NGROK_CACHE_DIR"
  local archive_path="$NGROK_CACHE_DIR/ngrok.tgz"
  local extracted_bin="$NGROK_CACHE_DIR/ngrok"

  echo "[PUBLIC] Downloading ngrok agent for $arch"
  curl -fsSL "$archive_url" -o "$archive_path"
  tar -xzf "$archive_path" -C "$NGROK_CACHE_DIR"
  rm -f "$archive_path"

  if [[ ! -x "$extracted_bin" ]]; then
    echo "ngrok download completed but binary was not found at $extracted_bin"
    return 1
  fi

  NGROK_BIN="$extracted_bin"
}

if [[ -z "$NGROK_BIN" ]]; then
  if command -v ngrok >/dev/null 2>&1; then
    NGROK_BIN="$(command -v ngrok)"
  elif [[ -x /tmp/ngrok ]]; then
    NGROK_BIN="/tmp/ngrok"
  elif [[ -x "$NGROK_CACHE_DIR/ngrok" ]]; then
    NGROK_BIN="$NGROK_CACHE_DIR/ngrok"
  fi
fi

if [[ -z "$NGROK_BIN" ]]; then
  download_ngrok || {
    echo "ngrok is not installed and automatic download failed."
    exit 1
  }
fi

if [[ -z "${NGROK_AUTHTOKEN}" ]]; then
  echo "NGROK_AUTHTOKEN is not set in server/.env."
  exit 1
fi

if [[ -z "${NGROK_DOMAIN}" ]]; then
  echo "NGROK_DOMAIN is not set in server/.env."
  echo "Use your free static ngrok domain, for example: example.ngrok.app"
  exit 1
fi

mkdir -p "$(dirname "$NGROK_CONFIG_PATH")"
"$NGROK_BIN" config add-authtoken "$NGROK_AUTHTOKEN" --config "$NGROK_CONFIG_PATH" >/dev/null

NGROK_PID=""

cleanup() {
  if [[ -n "${NGROK_PID:-}" ]] && kill -0 "$NGROK_PID" 2>/dev/null; then
    kill "$NGROK_PID" 2>/dev/null || true
    wait "$NGROK_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

start_ngrok() {
  cleanup
  "$NGROK_BIN" http 8000 --url="$NGROK_DOMAIN" --config "$NGROK_CONFIG_PATH" &
  NGROK_PID=$!
}

public_url="https://${NGROK_DOMAIN}${NGROK_PUBLIC_CHECK_PATH}"

public_tunnel_ready() {
  local body_file
  body_file="$(mktemp)"
  local status
  status="$(curl -sS -L --max-time 15 -o "$body_file" -w '%{http_code}' "$public_url" || true)"

  if grep -q 'ERR_NGROK_3200' "$body_file"; then
    rm -f "$body_file"
    return 1
  fi

  rm -f "$body_file"
  if [[ "$status" == "000" ]]; then
    return 1
  fi
  return 0
}

echo "[PUBLIC] Starting ngrok tunnel for https://${NGROK_DOMAIN}"
start_ngrok
consecutive_failures=0

while true; do
  if [[ -n "${NGROK_PID:-}" ]] && ! kill -0 "$NGROK_PID" 2>/dev/null; then
    if public_tunnel_ready; then
      echo "[PUBLIC] Another ngrok process is already serving ${public_url}. Waiting instead of restarting."
      NGROK_PID=""
      consecutive_failures=0
      sleep "$NGROK_PUBLIC_CHECK_INTERVAL"
      continue
    fi

    echo "[PUBLIC] ngrok process exited. Restarting."
    start_ngrok
    consecutive_failures=0
    sleep 3
    continue
  fi

  if ! public_tunnel_ready; then
    consecutive_failures=$((consecutive_failures + 1))
    echo "[PUBLIC] Public tunnel check failed for ${public_url} (${consecutive_failures}/${NGROK_PUBLIC_FAILURE_THRESHOLD})."
    if (( consecutive_failures >= NGROK_PUBLIC_FAILURE_THRESHOLD )); then
      echo "[PUBLIC] Failure threshold reached. Restarting ngrok."
      start_ngrok
      consecutive_failures=0
      sleep 3
      continue
    fi
  else
    consecutive_failures=0
  fi

  sleep "$NGROK_PUBLIC_CHECK_INTERVAL"
done
