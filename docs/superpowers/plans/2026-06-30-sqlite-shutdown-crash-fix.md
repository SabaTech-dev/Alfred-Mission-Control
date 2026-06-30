# SQLite Shutdown Crash Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el SIGABRT (core dumped) recurrente en Alfred Mission Control causado por destructores nativos de better-sqlite3 corriendo tras la destrucción del env de Node.

**Architecture:** Fix centralizado en `src/lib/sqlite-wrapper.ts` (único punto por el que pasan TODAS las instancias de `Database`). El wrapper rastrea cada DB abierta en un `Set` y registra handlers de shutdown (`beforeExit`, `exit`, `SIGTERM`, `SIGINT`) que cierran todas las conexiones **mientras el env aún vive**. Al cerrar la DB nativa, better-sqlite3 finaliza todos los prepared statements, dejando los destructores nativos como no-ops → no SIGABRT.

**Tech Stack:** Next.js 16.2.9, better-sqlite3 12.11.1, Node v26, Vitest, TypeScript.

## Root Cause (evidencia)

Stack trace del crash (journalctl, restart counter = 8):
```
Assertion failed: (env) != nullptr
node::RemoveEnvironmentCleanupHook(...) [next-server]
Statement::~Statement() [better_sqlite3.node]
→ Aborted (core dumped), exit code 134
```

- 5 stores singleton (`activities-db`, `kanban-db`, `agent-config-store`, `plugins-store`, `webhooks-store`) mantienen `_db` vivo a nivel de módulo.
- TODA creación de `Database` pasa por `@/lib/sqlite-wrapper` (verificado con grep).
- Los DBs per-request YA cierran correctamente con `db.close()` en `finally`.

## Global Constraints

- No tocar configuración de CI/CD ni systemd sin confirmación.
- Convenciones del repo: double quotes, `"use client"` solo en client components, `export const dynamic = "force-dynamic"` en routes.
- Auth mocks deben quedar locales al test file (no globales en vitest.setup.ts), per AGENTS.md.

---

### Task 1: Shutdown handler central en sqlite-wrapper (TDD)

**Files:**
- Modify: `src/lib/sqlite-wrapper.ts`
- Test: `src/lib/sqlite-wrapper.shutdown.test.ts` (crear)

**Interfaces:**
- Produce: la clase `Database` (wrapper) auto-registra cada instancia para cierre en shutdown. Exporta `__closeAllForShutdown()` solo para tests.

- [ ] **Step 1: Escribir test fallido** — crear `src/lib/sqlite-wrapper.shutdown.test.ts` que verifique: (a) al crear una DB queda registrada, (b) `__closeAllForShutdown()` la cierra, (c) tras shutdown `exec()` lanza "closed", (d) el handler se registra una sola vez.

- [ ] **Step 2: Run test → FAIL**

- [ ] **Step 3: Implementar** — añadir `_openDbs: Set`, `_registered: boolean`, `_registerShutdown()` con handlers `beforeExit`/`exit`/`SIGTERM`/`SIGINT`, registrar en constructor, quitar del Set en `close()`.

- [ ] **Step 4: Run test → PASS**

- [ ] **Step 5: Commit**

### Task 2: Verificar fixes in-progress

Los cambios sin commitear (layout.tsx SW self-heal, sw-safety.test.ts, system/route.test.ts auth mock, desk-positions.ts, i18n/provider.tsx, suggestions-engine) son fixes válidos. Verificar que pasan sus tests.

### Task 3: `npm run build` sin errores

### Task 4: Reiniciar servicio + verificar estabilidad

`systemctl restart alfred-mission-control`, esperar, y comprobar `systemctl status` + journalctl sin SIGABRT (restart counter sin crecer).

### Task 5: Verificar rutas SPA + panel agentes + endpoints

Curl a `/api/telemetry/dashboard`, `/api/system`, `/api/notifications`, `/api/agents`. Verificar panel muestra 7 agentes.

### Task 6: Suite completa de tests

`npm run test:run` + `npm run test:backend` verde.

### Task 7: Commit + push

Conventional commits: `fix(sqlite): close DBs on process shutdown to prevent SIGABRT`.
