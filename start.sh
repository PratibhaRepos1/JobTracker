#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

(cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000) &
BACK_PID=$!

(cd frontend && npm run dev) &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" INT TERM EXIT
wait
