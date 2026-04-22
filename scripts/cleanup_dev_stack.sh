#!/usr/bin/env bash
set -euo pipefail

# Kill any prior repo-local dev stack so npm run dev is idempotent.
pkill -f '/home/anya/MyShortBIZ/node_modules/.bin/concurrently' 2>/dev/null || true
pkill -f 'concurrently -k -n API,WEB,VOICE,PUBLIC,PHONE' 2>/dev/null || true
pkill -f '/home/anya/MyShortBIZ/node_modules/.bin/vite' 2>/dev/null || true
pkill -f '/tmp/ngrok http 8000 --url=saddlebag-reboot-overcast.ngrok-free.dev' 2>/dev/null || true
pkill -f '/home/anya/MyShortBIZ/server/.cache/ngrok/bin/ngrok http 8000' 2>/dev/null || true
pkill -f 'uvicorn main:app --reload --port 8000' 2>/dev/null || true
pkill -f 'uvicorn voice_daemon:app --port 8011' 2>/dev/null || true
pkill -f 'bash scripts/start_ngrok_tunnel.sh' 2>/dev/null || true
pkill -f 'bash scripts/ensure_telephony_ready.sh' 2>/dev/null || true
