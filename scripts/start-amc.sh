#!/bin/bash
# AMC Start Script — production server
# Generated: 2026-05-26
cd /home/joker/.openclaw/workspace/Alfred-Mission-Control

# Critical env vars (from .env.local)
export KANBAN_AGENT_KEYS="main:sk-main-alfred-2026,coder:sk-coder-alfred-2026,research:sk-research-alfred-2026,security:sk-security-alfred-2026,devops:sk-devops-alfred-2026,qa-tester:sk-qa-tester-alfred-2026"
export JWT_SECRET="+zr5elwd/q0rSHBNqv0lkj1SZUSPJ8aDY4JxhJGHYuc="

echo "[AMC] Starting next-server on port 3000"
echo "[AMC] KANBAN_AGENT_KEYS loaded: ${#KANBAN_AGENT_KEYS} chars"

exec npx next start -p 3000
