# Security Audit: AMC Pipeline Features + DB Recovery

**Commit:** 7957356  
**Auditor:** coder agent  
**Date:** 2026-05-23  
**Scope:** Pipeline scrap route, pipeline API, OpportunityPopupModal, pipeline-db, cache, session-store, openclaw-chat-sessions

---

## Executive Summary

**Overall Risk: LOW** — The codebase demonstrates good security practices. No Critical or High findings. 3 Medium and 3 Low issues identified.

---

## Findings

### M-1: Error details leaked in Pipeline GET endpoint
- **File:** `src/app/api/pipeline/route.ts:21`
- **OWASP:** A01:2021 – Broken Access Control / A09:2021 – Security Misconfiguration
- **CVSS:** 5.3 (Medium)
- **Description:** The GET error handler returns `details: String(error)` which may expose internal paths, DB schema details, or stack traces to any authenticated user.
- **PoC:** Trigger a DB failure (e.g., corrupt DB file) → GET /api/pipeline returns `{"error":"Failed to load pipeline","details":"SqliteError: ... data/kanban.db ..."}`
- **Mitigation:** Remove `details` field in production or log server-side only:
  ```typescript
  return NextResponse.json({ error: "Failed to load pipeline" }, { status: 500 });
  ```

### M-2: Session store uses UUID tokens with no rate limiting on generation
- **File:** `src/lib/session-store.ts`
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **CVSS:** 4.4 (Medium)
- **Description:** `generateToken()` creates UUID-based session tokens stored in-memory with no rate limiting. An attacker with access to the token generation endpoint could flood memory with sessions. Also, sessions are in-memory only — lost on restart, no persistence.
- **PoC:** Call generateToken in a loop → Map grows unbounded → potential OOM
- **Mitigation:** Add rate limiting on token generation, cap max sessions, implement cleanup interval.

### M-3: Scraping endpoint lacks user-facing auth
- **File:** `src/app/api/pipeline/scrap/route.ts`
- **OWASP:** A01:2021 – Broken Access Control
- **CVSS:** 4.2 (Medium)
- **Description:** The scrap endpoint checks for `x-agent-id` / `x-agent-key` headers. The `PipelineClient.tsx` calls this endpoint from the browser (line ~140) **without** passing any auth headers, meaning the POST from the browser will always fail with 401. This is a functional bug but also a security issue — either the endpoint needs browser-accessible auth or the check should be removed/adapted.
- **PoC:** Click "Lanzar Scraping" button → 401 Unauthorized
- **Mitigation:** Either add the API key to the client-side fetch (not recommended for browser), or implement CSRF-protected session-based auth, or make the endpoint validate against the AMC app's own session.

### L-1: Potential XSS via `opp.description` / `opp.notes` in OpportunityPopupModal
- **File:** `src/app/(dashboard)/pipeline/OpportunityPopupModal.tsx`
- **OWASP:** A03:2021 – Injection
- **CVSS:** 2.4 (Low)
- **Description:** User-provided content (`opp.description`, `opp.notes`, `opp.company`, `opp.title`, `opp.source`) is rendered as React text children (not via `dangerouslySetInnerHTML`). React auto-escapes this content, so XSS is **not exploitable** via standard React rendering. However, the `sanitizeHref` function for `contact_linkedin` and `contact_email` is well-implemented. No issue found.
- **Status:** ✅ Safe (React auto-escaping)

### L-2: Command Injection in scrap/route.ts — RESOLVED
- **File:** `src/app/api/pipeline/scrap/route.ts`
- **OWASP:** A03:2021 – Injection
- **CVSS:** N/A (Mitigated)
- **Description:** The original concern was command injection via path concatenation. The implementation correctly uses `execFile` (not `exec`), which bypasses shell interpretation entirely. Additionally, `isSafePath()` validates against directory traversal and shell metacharacters. Double protection layer.
- **Status:** ✅ No vulnerability

### L-3: SQL Injection in pipeline-db.ts — RESOLVED
- **File:** `src/lib/pipeline-db.ts`
- **OWASP:** A03:2021 – Injection
- **CVSS:** N/A (Mitigated)
- **Description:** All queries use parameterized statements (`?` placeholders). The `updateOpportunity` function uses an allowlisted column set (`ALLOWED_UPDATE_COLUMNS`). Input validation via Zod schemas in `api-validation.ts` further constrains stage values and service types to enums.
- **Status:** ✅ No vulnerability

---

## Files Reviewed — Security Status

| File | Status | Notes |
|------|--------|-------|
| `src/app/api/pipeline/scrap/route.ts` | ✅ Good | execFile (no shell), isSafePath, auth check |
| `src/app/api/pipeline/route.ts` | ⚠️ M-1 | Error details leaked in GET |
| `PipelineClient.tsx` | ⚠️ M-3 | Scraping button sends no auth |
| `OpportunityPopupModal.tsx` | ✅ Good | sanitizeHref, React auto-escaping |
| `PipelineOppCard.tsx` | ✅ Good | Renders text only |
| `PipelineStageColumn.tsx` | ✅ Good | Props passthrough |
| `src/lib/cache.ts` | ✅ Good | Simple in-memory, no external input |
| `src/lib/session-store.ts` | ⚠️ M-2 | No rate limit, UUID tokens, in-memory only |
| `src/lib/openclaw-chat-sessions.ts` | ✅ Good | Stub, returns empty |
| `src/lib/pipeline-db.ts` | ✅ Good | Parameterized queries, allowlisted columns |
| `src/lib/api-validation.ts` | ✅ Good | Zod schemas, enum constraints |

---

## Summary Table

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| M-1 | Medium (5.3) | Error details leaked in Pipeline GET | Open |
| M-2 | Medium (4.4) | Session store no rate limit / in-memory only | Open |
| M-3 | Medium (4.2) | Scraping endpoint browser auth mismatch | Open (functional bug) |
| L-1 | Low (2.4) | XSS in OpportunityPopupModal | ✅ Safe (React) |
| L-2 | N/A | Command injection scrap/route | ✅ Mitigated |
| L-3 | N/A | SQL injection pipeline-db | ✅ Mitigated |

---

## Recommended Priority Actions

1. **M-1:** Remove `details` from error response (1 line change)
2. **M-3:** Fix auth flow for scraping button (either server-side call or session auth)
3. **M-2:** Add rate limiting and max session cap to session-store
