#!/bin/bash
# AMC Start Script — production server
# Generated: 2026-05-26 | Security fix: 2026-06-02
cd /home/joker/.openclaw/workspace/Alfred-Mission-Control

# Load secrets from .env.local (never hardcode)
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
  echo "[AMC] Secrets loaded from .env.local (${#KANBAN_AGENT_KEYS} chars)"
else
  echo "[AMC] ERROR: .env.local not found!" >&2
  exit 1
fi

echo "[AMC] Starting next-server on port 3000"

exec npx next start -p 3000
