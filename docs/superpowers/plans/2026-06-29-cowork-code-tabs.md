# Cowork Tab and Code Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two final Saba-Agent-Os features to Alfred Mission Control: a multi-agent Cowork collaboration panel (`/cowork`) and a lightweight Code tools tab (`/code`).

**Architecture:** Pure client pages under the `(dashboard)` route group reading existing APIs (`/api/agents`, new `/api/code/files`). localStorage-backed layout persistence for cowork. Pure-function unified-diff for the code diff viewer. All UI follows existing CSS-variable theming and i18n conventions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, lucide-react, Tailwind CSS v4.

## Global Constraints

- DO NOT modify: `useAutoVoice.ts`, `AutoVoiceProvider.tsx`, `vitest.setup.ts`, `vitest.config.ts`.
- Styling uses CSS variables (`var(--card)`, `var(--border)`, etc.) — never hardcoded colors.
- All user-visible text internationalized via `useI18n()`; keys in BOTH `en.json` and `es.json`.
- Strict TypeScript (`npx tsc --noEmit` clean).
- `npx vitest run` all green; `npm run build` clean.
- Named exports for components; `"use client"` directive on client pages.
- Commit message (exact): `feat(amc): add Cowork Tab and Code Tab — final Saba-Agent-Os features`

---

## File Structure

**Create:**
- `src/lib/cowork.ts` — localStorage helpers for cowork panel layout + session state.
- `src/lib/cowork.test.ts` — unit tests.
- `src/lib/code-diff.ts` — pure-function unified diff generator.
- `src/lib/code-diff.test.ts` — unit tests.
- `src/app/api/code/files/route.ts` — safe directory listing endpoint.
- `src/app/api/code/files/route.test.ts` — endpoint tests.
- `src/app/(dashboard)/cowork/page.tsx` — Cowork collaboration page.
- `src/app/(dashboard)/code/page.tsx` — Code tools page.

**Modify:**
- `src/i18n/messages/en.json` — add `dock.cowork`, `dock.code`, `help.cowork`, `help.code`, `cowork.*`, `code.*`.
- `src/i18n/messages/es.json` — same keys in Spanish.
- `src/components/Alfred/Dock.tsx` — add two nav items (Users icon → `/cowork`, Code icon → `/code`).

---

## Task 1: i18n keys

**Files:** Modify `src/i18n/messages/en.json`, `src/i18n/messages/es.json`.

Add to `dock` object: `cowork`, `code`. Add to `help`: `cowork`, `code` (title+description). Add top-level `cowork` and `code` sections with all UI strings (titles, subtitles, empty states, button labels, status badges, placeholders, PR modal labels).

---

## Task 2: cowork lib (TDD)

`src/lib/cowork.ts` exports:
- `STORAGE_KEY = "amc_cowork_layout"`
- `loadLayout(): CoworkLayout` / `saveLayout(layout)`
- `CoworkLayout { panels: number; agents: string[] }`
- Guarded against non-browser / corrupt JSON; defaults to `{ panels: 2, agents: [] }`.

Tests: storage key constant, load empty/corrupt defaults, save/load round-trip.

---

## Task 3: code-diff lib (TDD)

`src/lib/code-diff.ts` exports `computeUnifiedDiff(before: string, after: string): DiffLine[]` where `DiffLine = { type: "context"|"add"|"remove"; text: string }`. LCS-based line diff, no deps.

Tests: identical input → all context; pure addition; pure removal; mixed change; empty inputs.

---

## Task 4: /api/code/files route (TDD)

`src/app/api/code/files/route.ts` — `GET` with `?path=`. Validates path resolves inside the project root (reject `..`, absolute, traversal). Returns `{ path, entries: [{name, type:"file"|"dir"}] }`. Reads only directories.

Tests: missing path → 400; traversal `../` → 400; valid dir → 200 listing; nonexistent → 404.

---

## Task 5: Cowork page

Grid of 2–4 panels (resizable CSS grid via inline `gridTemplateColumns`). Each panel: agent dropdown (from `/api/agents`), status badge, current task input, mini log textarea. "Start Session" creates panels. localStorage persistence. Empty state.

---

## Task 6: Code page

Three-column layout: file tree (path input → `/api/code/files`), code viewer (readonly textarea monospace), diff viewer (two textareas → unified diff). "Create PR" modal → copies formatted body to clipboard.

---

## Task 7: Dock nav

Add to Dock core section: `/cowork` (Users icon), `/code` (Code icon).

---

## Task 8: Verify + commit

Run `npx vitest run`, `npm run build`. Commit with the exact message.
