# Pipeline Security Audit — 2026-06-25

Branch: `fix/amc-pipeline-full-review`
Auditor: build agent (SDD pipeline)
Scope: 11 archivos del dominio Pipeline.

Resultado: **0 Critical / 0 High / 0 Medium sin fixear**. Todos los
hallazgos Medium/Low detectados se han corregido in-place. Quedan 2
hallazgos Info documentados sin fix (uno por estar fuera del repo AMC,
otro por ser Info no crítico).

---

## Metodología

Se revisaron los siguientes archivos siguiendo el checklist OWASP Top 10
(A01:2021 – A07:2021) y la skill `security-auditor`:

1. `middleware.ts`
2. `src/lib/agent-auth.ts`
3. `src/app/api/pipeline/route.ts`
4. `src/app/api/pipeline/[id]/route.ts`
5. `src/app/api/pipeline/scrap/route.ts`
6. `src/app/api/pipeline/research/route.ts`
7. `src/app/api/pipeline/kanban-bridge/route.ts`
8. `src/lib/pipeline-db.ts`
9. `src/lib/pipeline-kanban-bridge.ts`
10. `scrapers/lead-scraper/config.js`
11. `scrapers/lead-scraper/pipeline-client.js`

---

## Hallazgos

### FIX-1 — Comparación de API key vulnerable a timing attack

- **Severity**: Medium (fix aplicado)
- **File**: `src/lib/agent-auth.ts:82`
- **Description**: La comparación `expectedKey !== agentKey` usa el operador
  de desigualdad de strings, que hace short-circuit en el primer byte
  distinto. Esto expone un side-channel de tiempo: un atacante puede medir
  el tiempo de respuesta para adivinar el key byte a byte.
- **Evidence**: OWASP A02:2021 (Cryptographic Failures); CWE-208.
- **Remediation applied**: nueva función `constantTimeEqual(a, b)` basada en
  `crypto.timingSafeEqual`. Si las longitudes difieren se ejecuta de todos
  modos una comparación dummy para mantener el tiempo independiente del
  secreto. La firma pública de `validateAgentAuth` no cambia.

### FIX-2 — Command-injection surface engañosa en scrap endpoint

- **Severity**: Low (fix aplicado)
- **File**: `src/app/api/pipeline/scrap/route.ts:43-92`
- **Description**: El handler validaba `body.workspaceDir` y
  `body.scriptPath` pero luego **nunca los usaba**: el script que se
  ejecutaba era siempre `process.env.OPENCLAW_WORKSPACE/scripts/lead-scraper/index-v2.js`.
  El código declaraba `finalScriptPath = body.scriptPath || scriptPath`
  pero a continuación invocaba `execFileAsync("node", [scriptPath], ...)` —
  usando la constante local, no la variable "final". Esto creaba dos
  problemas: (a) lectores creían que el body influía en la ejecución;
  (b) TypeScript no tipaba `body`, dando errores LSP y permitiendo bugs
  silenciosos.
  Aunque `execFile` (no `exec`) ya impedía inyección de shell, el contrato
  era ambiguo.
- **Evidence**: OWASP A03:2021 (Injection defense in depth).
- **Remediation applied**: se tipa el body con `ScrapRequestBody`. Se
  documentan las garantías: el script ejecutado es fijo por el servidor.
  Los campos del body se validan estrictamente si están presentes
  (rechazo 400 si contienen caracteres prohibidos) para no romper
  clientes existentes, pero **jamás** influencian la ejecución. Se
  eliminó la variable muerta `finalScriptPath`.

### FIX-3 — Information leak en errores de /api/pipeline/research

- **Severity**: Low (fix aplicado)
- **File**: `src/app/api/pipeline/research/route.ts:277-280`
- **Description**: El catch devolvía
  `{ error: "...", detail: msg }` donde `msg` era el mensaje interno del
  error. Esto podía filtrar rutas absolutas del filesystem, permisos o
  configuración interna a un atacante que provocara errores.
- **Evidence**: OWASP A05:2021 (Security Misconfiguration — error
  handling); CWE-209.
- **Remediation applied**: se elimina `detail` del cuerpo de respuesta.
  El detalle original se conserva en `console.error` para diagnóstico
  server-side.

### FIX-4 — Inconsistencia de tipos en getOpportunity

- **Severity**: Low (fix aplicado)
- **File**: `src/lib/pipeline-db.ts:196-200`
- **Description**: La firma declaraba `Opportunity | null` pero en
  runtime devolvía `undefined` cuando no existía (better-sqlite3
  devuelve `undefined` en `.get()` sin match). Esto rompía el contrato
  de tipos y obligaba a los consumidores a defenderse contra ambos
  valores. Tests que asumían el contrato documentado fallaban.
- **Evidence**: Type-safety / contract enforcement.
- **Remediation applied**: `?? null` al valor de retorno. Ahora la
  función cumple su firma declarada.

### FIX-5 — STAGE_STATUS_MAP faltaba clave `done`

- **Severity**: Info (fix aplicado)
- **File**: `src/lib/pipeline-kanban-bridge.ts:40-48`
- **Description**: El `Record<PipelineStage, ...>` exige todas las
  claves de `PipelineStage`, pero `STAGE_STATUS_MAP` omitía `done`,
  generando un error TypeScript preexistente. No era explotable pero
  indicaba que el mapeo estaba incompleto.
- **Remediation applied**: se añade `done: "done"` al map. Coincide con
  la semántica: oportunidades `done` tienen todas sus tareas `done`.

### PENDING-1 — USER_AGENTS corruptos en scraper config

- **Severity**: Info (pendiente de fix en PR separado)
- **File**: `scrapers/lead-scraper/config.js` (symlink → `scripts/lead-scraper/config.js`, fuera del repo AMC)
- **Description**: Cinco de los diez `USER_AGENTS` contienen el substring
  `Chrome//bin/sh: 1: ak: not found Safari/537.36`. Esto es el artifact
  de un comando shell que se ejecutó accidentalmente y quedó embebido en
  el string. No es un vector de seguridad (los user-agents se envían
  como header HTTP, no se interpretan), pero puede activar WAFs o ser
  detectado como bot por su patrón anómalo.
- **Why deferred**: el archivo está fuera del repo AMC (vía symlink a
  `scripts/lead-scraper/`). Fixearlo requiere modificar el workspace
  padre o convertir el symlink en un directorio real dentro del repo
  AMC, lo cual arrastra 20+ archivos del scraper fuera del scope de
  este PR. Se documenta como tarea pendiente.

---

## Hallazgos Info (no requieren fix)

### INFO-1 — IDOR by-design en /api/pipeline/[id]

- **File**: `src/app/api/pipeline/[id]/route.ts`
- **Description**: Cualquier agente autenticado (con X-Agent-Key válido)
  o sesión JWT puede GET/PATCH/DELETE cualquier oportunidad, sin
  verificar ownership. No hay campo `owner_agent_id` en el modelo.
- **Decision**: by-design. El pipeline es un recurso compartido del
  workspace; todos los agentes legítimos pueden operar todas las
  oportunidades. La autorización está en el middleware (auténtico +
  agente permitido). Si en el futuro se aíslan por cliente/proyecto,
  añadir columna `owner_agent_id` y check en cada handler.

### INFO-2 — Sin rate limiting explícito en endpoints pipeline

- **File**: todos los `route.ts`
- **Description**: No hay rate limiting dedicado. La protección
  recae en el middleware de auth.
- **Decision**: Aceptable para uso interno. Si el dashboard se
  expone a internet, añadir rate limiting en middleware (p.ej.
  Upstash Ratelimit) — pero eso es un cambio cross-cutting que excede
  el scope de este PR.

### INFO-3 — POST /api/pipeline/kanban-bridge acepta `action` arbitrario

- **File**: `src/app/api/pipeline/kanban-bridge/route.ts:97`
- **Description**: Lee `body.action` sin validación Zod. Los valores
  no reconocidos caen al default 400 `Unknown action`. No hay
  inyección posible (sólo es un dispatch sobre 3 strings conocidos).
- **Decision**: aceptable. Si se añaden más acciones, mover a un enum
  Zod.

### INFO-4 — Scraper credentials fuera de source

- **File**: `scrapers/lead-scraper/config.js:24-29`
- **Description**: `AGENT_ID` y `AGENT_KEY` se leen de env vars
  (`PIPELINE_AGENT_ID`, `PIPELINE_AGENT_KEY`) y el proceso hace
  `exit(1)` si faltan. Buen patrón: nada hardcodeado.
- **Status**: OK.

### INFO-5 — pipeline-client.js usa headers de auth correctos

- **File**: `scrapers/lead-scraper/pipeline-client.js:4-8`
- **Description**: Las cabeceras `X-Agent-Id` y `X-Agent-Key` se
  inyectan en todas las peticiones. No hay logging de credenciales.
- **Status**: OK.

---

## Tests que bloquean regresiones

Los siguientes tests cubren los fixes aplicados:

- `src/lib/pipeline-db.test.ts > SQL injection hardening` (4 casos)
  cubre parametrización en createOpportunity, updateOpportunity,
  findOpportunityByCompanyTitle y findOpportunityByCompany.
- `src/lib/pipeline-db.test.ts > updateOpportunity > ignores unknown
  columns (whitelist enforcement)` cubre que ALLOWED_UPDATE_COLUMNS
  sigue siendo efectiva.
- `src/lib/pipeline-db.test.ts > getOpportunity > returns null when
  the opportunity does not exist` cubre FIX-4.
- `src/lib/pipeline-kanban-bridge.test.ts > fullSync > advances stage
  when all linked tasks are done` cubre FIX-5 (usa `done` status).

El fix de timing-attack (FIX-1) es estructural: la nueva función
`constantTimeEqual` se invoca siempre en el path válido, eliminando el
side-channel.

---

## Conclusión

- **0 Critical, 0 High, 0 Medium** sin corregir.
- 4 Medium/Low corregidos en este PR.
- 1 Info corregido (type-safety de `STAGE_STATUS_MAP` y `getOpportunity`).
- 1 Info pendiente documentado (USER_AGENTS del scraper, fuera del repo
  AMC vía symlink).
- IDOR by-design documentado y aceptado.
