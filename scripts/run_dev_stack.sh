#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash scripts/cleanup_dev_stack.sh
sleep 1

exec npx concurrently \
  -k \
  -n API,WEB,VOICE,PUBLIC,PHONE \
  -c green,cyan,magenta,yellow,blue \
  "bash -lc 'cd server && . .venv/bin/activate && uvicorn main:app --reload --port 8000'" \
  "bash -lc 'npm run dev:web'" \
  "bash -lc 'npm run dev:voice'" \
  "bash -lc 'npm run dev:public:ngrok'" \
  "bash -lc 'npm run dev:telephony:ready'"
