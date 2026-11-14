#!/usr/bin/env bash
set -e

# Startup script for DocuScan & Inspector Web App
cd "$(dirname "$0")"

# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"

echo "Starting DocuScan Web Application on http://${HOST}:${PORT}..."

if [ -f ".venv/bin/uvicorn" ]; then
    exec .venv/bin/uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload
elif command -v uvicorn >/dev/null 2>&1; then
    exec uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload
else
    echo "Error: uvicorn not found. Please activate your virtualenv or install requirements: pip install -r requirements.txt"
    exit 1
fi
