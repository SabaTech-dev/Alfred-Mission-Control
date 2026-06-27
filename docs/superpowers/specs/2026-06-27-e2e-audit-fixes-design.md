# AMC E2E Audit Fixes — Design

## Goal

Eliminar los errores detectados por `scripts/e2e-audit-v3.mjs`: 0 SSR errors y
0 console errors en todas las páginas, sin timeouts de navegación.

## Diagnóstico (reproducido)

El audit reportaba: 6 timeouts de navegación (Dashboard, Kanban, Pipeline,
Analytics, Performance, Cron), console errors en Agents/Calendar/System y un
error SSR en Office. Causas raíz:

### RC1 — `execSync` bloqueante en `agent-ops.ts` (CAUSA RAÍZ DE LOS TIMEOUTS)

`loadAgentsFromConfig()` ejecuta `execSync("openclaw agents list --json",
{ timeout: 5000 })` en cada petición a `/api/agents` y `/api/agents/status`.
En `next start` (single-threaded) esto **bloquea el event loop 5 s**, lo que
en cascada bloquea también las peticiones HTML de otras páginas → el audit
(8 s de timeout por navegación) agota el tiempo.

### RC2 — Office renderiza un componente no definido

`office/page.tsx` usaba `<Office3D>` pero solo importa `Office3DClient`
(que ya envuelve el 3D con `next/dynamic` `ssr: false`). Referencia
indefinida → error de render en Server Components.

### RC3 — `console.error` en fetches abortados por navegación

`StatusBar` (en el layout de TODAS las páginas), `SystemClient`,
`SettingsClient`, `useDashboardTelemetry`, `useKanbanData`, `PipelineClient`,
`AgentsClient` y `WeeklyCalendar` registran `console.error` cuando un fetch
falla. Al navegar, el audit aborta los polls en curso →
`TypeError: Failed to fetch` → se cuenta como error de consola.

## Solución

### S1 — Helper `isAbortFetchError` (fundación, DRY)

`src/lib/fetch-errors.ts` con `isAbortFetchError(error)`:
- `true` para `DOMException` con `name === "AbortError"`.
- `true` para `TypeError` cuyo mensaje contenga "fetch" (abort por navegación).
- `false` para errores reales (HTTP, parseo, etc.).

Los clientes lo usan para tragar (no loguear) errores transitorios y seguir
mostrando el estado de error en la UI.

### S2 — Cache del subprocess `openclaw agents list` (RC1)

Envolver la lectura del CLI en `createCache({ ttlMs: 30_000, compute })`.
Resultado: el subprocess solo se lanza una vez cada 30 s (no por petición),
desbloqueando el event loop. Si el CLI falla, el compute devuelve un mapa
vacío (sin bloqueo).

### S3 — Office usa `Office3DClient` (RC2)

Ya corregido en working tree. Se añade `force-dynamic`.

### S4 — Clientes usan `isAbortFetchError` en sus catch (RC3)

Sustituye los chequeos inline repetidos por el helper compartido y se aplica
también a dashboard/kanban/pipeline/agents.

## Tests (TDD)

- `fetch-errors.test.ts`: clasificación de abort vs error real.
- `agent-ops` cache: el subprocess no se relanza dentro del TTL.
- Office: render sin lanzar referencia indefinida.
- Clientes: no se llama `console.error` ante un abort.

## Commits (uno por issue)

1. `feat(lib): add isAbortFetchError helper`
2. `fix(office): use client-only Office3DClient to avoid SSR error`
3. `fix(dashboard): suppress transient telemetry fetch errors`
4. `fix(kanban): suppress transient fetch errors during navigation`
5. `fix(pipeline): suppress transient fetch errors during navigation`
6. `perf(agents): cache openclaw agents list to unblock event loop`
7. `fix(calendar): suppress transient system monitor fetch errors in StatusBar`

## Fuera de alcance

`agent-auth.ts`, `package.json`, `sessions/` (cambios no relacionados, ya
presentes en el working tree) — no se modifican ni se commitean.
