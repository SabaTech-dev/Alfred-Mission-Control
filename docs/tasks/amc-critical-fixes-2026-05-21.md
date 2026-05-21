# AMC Critical Fixes — Task Brief for OpenCode

## Project
`/home/ubuntu/.openclaw/workspace/Alfred-Mission-Control`

## Context
AMC (Alfred Mission Control) is our Kanban + Dashboard system (Next.js 15, SQLite via node-sqlite3-wasm, systemd). Commit eb5a257 refactored kanban-db.ts (from ~2300 lines to a re-export hub moving code to src/lib/kanban/ directory). This refactoring broke several features.

## Critical Issues Found (Priority Order)

### ISSUE 1: Pipeline API returns 500 (5 endpoints)
**Severity:** HIGH  
**Endpoints affected:**
- GET /api/pipeline → 500 `{"error":"Failed to load pipeline"}`
- GET /api/pipeline/research → 500 `{"error":"Failed to load research pipeline"}`
- GET /api/pipeline/auto-sync → 500
- GET /api/pipeline/sync-reports → 500
- GET /api/pipeline/[id] → 500

**Root cause hypothesis:** `pipeline-db.ts` imports from `kanban-db` which now re-exports from `src/lib/kanban/`. The runtime error is caught by try/catch in route handlers but the actual stack trace is lost. The `listOpportunities()` function calls `getDb()` which initializes the database and runs `initSchema()`.

**Files to investigate:**
- `src/app/api/pipeline/route.ts` — route handler (adds better error logging)
- `src/lib/pipeline-db.ts` — pipeline database functions
- `src/lib/kanban-db.ts` — re-export hub (refactored in eb5a257)
- `src/lib/kanban/kanban-schema.ts` — schema initialization
- `src/lib/sqlite-wrapper.ts` — SQLite wrapper with retry logic
- `src/lib/pipeline-kanban-bridge.ts` — bridge that imports createTask, listTasks from kanban-db

**Fix approach:**
1. Add `console.error("Full error:", error)` to all pipeline route handlers to see the actual stack trace
2. Test if the error is in initSchema(), getDb(), or in the query itself
3. Fix the root cause
4. Verify all 5 pipeline endpoints return 200

### ISSUE 2: Chat page returns 401 for browser users
**Severity:** HIGH  
**What:** The `/api/chat/agents/[agentId]` and `/api/chat/gateway/health` endpoints return 401 even with valid agent auth. The chat page at `/chat` in the dashboard doesn't load.

**Files to investigate:**
- `src/app/api/chat/agents/[agentId]/route.ts`
- `src/app/api/chat/gateway/health/route.ts`
- `src/app/(dashboard)/chat/` — frontend page
- `middleware.ts` — check if `/api/chat` is properly classified

**Fix approach:**
1. Check if `/api/chat` is in AGENT_ONLY or AGENT_OR_SESSION prefixes in middleware.ts
2. If it's AGENT_ONLY, move to AGENT_OR_SESSION so browser sessions can also access it
3. Verify the chat page loads in the browser

### ISSUE 3: Heartbeat endpoint returns 401 with agent auth
**Severity:** HIGH  
**Endpoint:** GET /api/heartbeat → 401

**Note:** The `/api/heartbeat/tasks` and `/api/heartbeat/agents/[id]` endpoints DO work (they use the kanban agent auth pattern). But the base `/api/heartbeat` returns 401.

**Files to investigate:**
- `src/app/api/heartbeat/route.ts` — check what auth it expects
- `middleware.ts` — verify `/api/heartbeat` prefix is in AGENT_ONLY_API_PREFIXES

### ISSUE 4: Wiki endpoints all return 401 with agent auth (7 endpoints)
**Severity:** MEDIUM  
**Endpoints:**
- GET /api/wiki/backlinks → 401
- GET /api/wiki/graph → 401
- GET /api/wiki/meta → 401
- GET /api/wiki/note → 401
- GET /api/wiki/search → 401
- GET /api/wiki/sync → 401
- GET /api/wiki/tree → 401

**Fix approach:**
1. Check middleware.ts — `/api/wiki` should be in AGENT_OR_SESSION_API_PREFIXES
2. If it's missing, add it
3. Verify all 7 endpoints return 200 with agent auth

### ISSUE 5: Several system endpoints return 401 with agent auth
**Severity:** MEDIUM  
**Endpoints:**
- GET /api/system/backups → 401
- GET /api/system/performance → 401
- GET /api/system/uptime → 401

**Fix approach:** Same as ISSUE 4 — check middleware classification.

### ISSUE 6: Agents config/status endpoints return 401
**Severity:** MEDIUM  
**Endpoints:**
- GET /api/agents/config → 401
- GET /api/agents/status → 401

**Fix approach:** Check if these require browser session only. If agents need access, add to AGENT_OR_SESSION.

### ISSUE 7: Sessions transcript returns 401
**Severity:** LOW  
**Endpoint:** GET /api/sessions/[key]/transcript → 401

**Fix approach:** Likely needs browser session. Low priority.

### ISSUE 8: TypeScript compilation errors in test files
**Severity:** LOW  
**Details:** 30+ errors TS18048 'response' is possibly 'undefined' in test files.

**Fix approach:** Add null checks in test files. Not blocking.

## Definition of Done

1. All pipeline endpoints return 200 with correct data
2. Chat page loads in browser (no 401)
3. Heartbeat base endpoint returns 200 with agent auth
4. Wiki endpoints return 200 with agent auth
5. System endpoints return 200 with agent auth
6. `npm run build` succeeds with no errors
7. Manual test: curl each previously-broken endpoint returns 200
8. Commit with message: `fix(amc): resolve runtime errors in pipeline, auth, and middleware`

## Build & Deploy

After fixes:
```bash
cd /home/ubuntu/.openclaw/workspace/Alfred-Mission-Control
npm run build
sudo systemctl restart alfred-mission-control
```

## Testing Commands

```bash
# Pipeline
curl -s -H "X-Agent-Id: main" -H "X-Agent-Key: sk-mai…2026" http://localhost:3000/api/pipeline
# Chat
curl -s -H "X-Agent-Id: main" -H "X-Agent-Key: sk-mai…2026" http://localhost:3000/api/chat/gateway/health
# Heartbeat
curl -s -H "X-Agent-Id: main" -H "X-Agent-Key: sk-mai…2026" http://localhost:3000/api/heartbeat
# Wiki
curl -s -H "X-Agent-Id: main" -H "X-Agent-Key: sk-mai…2026" http://localhost:3000/api/wiki/tree
# System
curl -s -H "X-Agent-Id: main" -H "X-Agent-Key: sk-mai…2026" http://localhost:3000/api/system/uptime
```
