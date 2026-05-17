# Informe de Análisis: Alfred Mission Control (upstream)

**Fecha:** 2026-03-25  
**Autor:** Alfred (CEO Agent)  
**Propósito:** Análisis profundo del repositorio base original para identificar mejoras en nuestro flujo actual

---

## 1. Resumen Ejecutivo

Tras analizar los 20+ documentos del repositorio, comparar el ROADMAP (15 fases, 100% completado según el autor original) con nuestro estado actual, y revisar el código fuente real, aquí están las conclusiones:

**Lo que TENEMOS funcional:**
- ✅ 26 páginas de dashboard (23 en dashboard + login + office)
- ✅ ~120 API endpoints implementados
- ✅ Kanban completo con drag & drop, projects, comments, claim/unclaim
- ✅ Heartbeat system con autonomy mode (suggest + auto-execute)
- ✅ Cron unificado (System + OpenClaw + Heartbeat)
- ✅ Chat con gateway (arreglado: HTTP health check en vez de WebSocket)
- ✅ Activities sync desde OpenClaw sessions
- ✅ Cost tracking con SQLite
- ✅ Office 3D con multi-floor building
- ✅ i18n (en/es), auth middleware, SSE realtime
- ✅ Runtime Event Bridge para comunicación entre componentes

**Lo que NOS FALTA o está SUB-OPTIMIZADO:**
- 🔴 Activities Sync NO se ejecuta automáticamente (cron del original no configurado)
- 🔴 Cost Tracking NO recopila datos automáticamente (script existe pero no hay cron)
- 🔴 Pricing table desactualizada (solo modelos de pago: Opus, Sonnet, Haiku)
- 🟡 Pestaña de Servicios propuesta por Joker (no existe en el original)
- 🟡 Operaciones Journal sin auto-generación desde activities
- 🟡 Reverse Prompting Engine sin integración real con Suggestions Engine
- 🟡 Heartbeat autonomy mode sin configurar para nuestros agentes

---

## 2. Hallazgos por Documento

### 2.1 HEARTBEAT-SETUP.md — **CRÍTICO para nuestro flujo**

**Lo que describe:** Sistema completo de heartbeat polling para agentes autónomos.

**Hallazgos clave:**

1. **Nuestro heartbeat actual es INEFICIENTE.** El original define 6 templates de HEARTBEAT.md por rol (COO, Developer, Research, Content Extractor, Knowledge Base, Specialized). Nuestro HEARTBEAT.md es un mega-archivo monolítico de ~500 líneas con TODOS los eventos (morning brief, daily digest, day wrap, cleanup, bootstrap optimization, etc.) mezclados.

2. **El original separa heartbeat de cron.** Nuestro HEARTBEAT.md mezcla heartbeat checks con cron events. El doc `CRON-SYSTEMS.md` define claramente:
   - **Heartbeat** → Batch monitoring, context-aware, smart suppression
   - **OpenClaw Cron** → Exact timing, isolated sessions, different models
   - **System Cron** → Scripts sin AI, system maintenance

3. **Claim semantics están bien definidas:**
   - `claimedBy === null` → Agent can claim
   - `claimedBy === me` → Continue work
   - `claimedBy !== me` → Skip
   - Esto ya funciona en nuestra API `/api/heartbeat/tasks`

**Recomendación:** Simplificar HEARTBEAT.md del main a checks ligeros (Kanban, SESSION-STATE, servicios). Mover eventos pesados (daily digest, morning brief, etc.) a cron jobs isolated.

---

### 2.2 CRON-SYSTEMS.md — **MUY RELEVANTE**

**Lo que describe:** Guía de decisión entre los 3 sistemas de scheduling.

**Hallazgos clave:**

1. **El original recomienda combinar los 3 sistemas:**
   ```
   System Cron → Backups, sync, maintenance (sin AI)
   OpenClaw Cron → Daily briefing, weekly review, reminders (con AI)
   Heartbeat → Email monitoring, calendar awareness, project health (batch)
   ```

2. **Nuestra configuración actual usa CRON para TODO** (15+ cron jobs). El original sugiere que heartbeat sería más eficiente para checks periódicos que no necesitan timing exacto.

3. **Main session vs Isolated session:**
   - Main → Cuando el agente necesita contexto completo
   - Isolated → Clean slate, diferente modelo, announce directo a canal

**Recomendación:** Mover algunos cron jobs a heartbeat checks (self-healing, kanban review) y otros a system cron (cleanup, backup, log rotation).

---

### 2.3 TECH-DESIGN-kanban-heartbeat.md — **IMPLEMENTACIÓN COMPLETA**

**Lo que describe:** Diseño técnico del sistema heartbeat + kanban.

**Hallazgos clave:**

1. **El sistema ya está 100% implementado en nuestro código:**
   - `kanban-db.ts` → `claimTask()`, `releaseTask()`, `getAgentWorkload()`
   - `dependency-resolver.ts` → `isExecutable`, `blockedReason`
   - `/api/heartbeat/tasks` → Devuelve tareas asignadas al agente
   - `/api/heartbeat/autonomy` → Settings de autonomía

2. **Auth por query parameter vs headers:**
   - El original usa `?agentName=X` para heartbeat (simple)
   - La API de kanban agent usa `X-Agent-Id` + `X-Agent-Key` (seguro)
   - Ambos enfoques coexisten y funcionan

3. **Mejora pendiente:** El doc menciona "Phase 2" con:
   - Explicit claim/release API endpoints
   - Heartbeat history tracking per agent
   - WebSocket push (en vez de polling)
   - Security hardening (rate limiting, IP allowlisting)

---

### 2.4 activities-sync.md — **NO CONFIGURADO**

**Lo que describe:** Script que sincroniza mensajes de sesiones OpenClaw al dashboard de activities.

**Hallazgos clave:**

1. **El script EXISTE:** `scripts/sync-openclaw-sessions.sh`
2. **El cron NO está configurado:** El original recomienda `*/5 * * * *` (cada 5 min)
3. **Sin este sync, el dashboard de Activities muestra datos vacíos o antiguos**

**Recomendación:** Configurar el cron job o mover a OpenClaw cron isolated.

---

### 2.5 COST-TRACKING.md — **NO CONFIGURADO**

**Lo que describe:** Sistema de tracking de costos por modelo.

**Hallazgos clave:**

1. **Script existe:** `scripts/collect-usage.ts` + `scripts/collect-usage.sh`
2. **DB existe:** `data/usage-tracking.db` (28KB, tiene datos)
3. **Cron NO está configurado:** El original recomienda cada hora
4. **PRICING DESACTUALIZADO:** Solo tiene modelos de pago (Opus $75/M, Sonnet $15/M). Nosotros usamos modelos gratuitos (glm-5, kimi-k2.5, minimax-m2.5:free). La tabla de precios en `pricing.ts` no refleja nuestros modelos.

**Recomendación:** 
1. Actualizar `pricing.ts` con nuestros modelos (coste = 0 para free)
2. Configurar cron de recolección horaria
3. Actualizar `COST-TRACKING.md` con nuestros modelos

---

### 2.6 runtime-event-bridge.md — **PATRÓN INTERESANTE**

**Lo que describe:** Sistema de eventos desacoplado para comunicación entre componentes.

**Hallazgos clave:**

1. **Ya implementado:** `src/lib/runtime-events.ts` + `src/hooks/useEventBridge.ts`
2. **Event types definidos:** session:create, session:change, activity:update, gateway:status, etc.
3. **Patrón producer → bridge → consumer:** Componentes emiten eventos sin saber quién los consume

**Estado:** Funcional, bien implementado. Los componentes del dashboard lo usan para reactividad.

---

### 2.7 agent-integration.md + AGENT_KANBAN_API.md — **API COMPLETA**

**Lo que describen:** Guía de integración de agentes con el Kanban.

**Hallazgos clave:**

1. **Auth funciona:** `X-Agent-Id` + `X-Agent-Key` headers validados contra `OPENCLAW_AGENT_KEYS` en `.env.local`
2. **Endpoints completos:** CRUD de tasks + claim/unclaim + comments
3. **Authorization rules implementadas:** Creator/Assignee/Claimer pueden actualizar

**Estado:** Funcional. Nuestros agentes especializados pueden usar la API.

---

### 2.8 ARCHITECTURE.md — **REFERENCIA COMPLETA**

**Lo que describe:** Arquitectura completa del sistema (90+ páginas de docs).

**Hallazgos clave:**

1. **26 páginas de dashboard** vs 21 documentadas → Tenemos 5 páginas extra (chat, costs-alerts, handoffs, live, morning, notepad)
2. **~120 API endpoints** vs ~90 documentados → Tenemos 30+ endpoints extra
3. **3 bases de datos SQLite:** activities.db, kanban.db, usage-tracking.db
4. **Security model completo:** Auth middleware, rate limiting, path sanitization, command allowlist

**Pages documentadas que NO existen en nuestro código:**
- `/about` → No existe (tenemos `/settings` con info del agente)
- `/playground` → No existe (model comparison)
- `/journal` → Existe parcialmente

**Pages nuestras que NO están documentadas:**
- `/chat` → Chat con agentes (nuestra adición)
- `/morning` → Morning brief (nuestra adición)
- `/handoffs` → Handoffs entre agentes (nuestra adición)
- `/notepad` → Notepad (nuestra adición)
- `/costs-alerts` → Cost alerts config (nuestra adición)
- `/live` → Live activity stream (nuestra adición)

---

### 2.9 ROADMAP.md — **MAPA COMPLETO DE LO QUE EXISTE**

**Lo que describe:** 15 fases de desarrollo, todas marcadas como 100% completado.

**Hallazgos clave:**

1. **Fases 1-13:** Funcionalidades core (activities, memory, cron, analytics, communication, config, realtime, office 3D, agent intelligence, sub-agents, advanced viz, collaboration)
2. **Fase 14 (Mission Control Layer):** Mission statement, reverse prompting, projects, agent identities, heartbeat autonomy, operations journal
3. **Fase 15 (Future Work):** Plugins, webhooks, GitHub issues sync, command palette, auto-categorization, daily standup

**Lo que falta de Fase 15:**
- Command Palette → Tenemos `useCommandPalette.ts` hook pero no está claro si la UI está completa
- Daily Standup automático → Parcialmente cubierto por nuestro morning brief cron
- GitHub Issues Sync → No existe
- Quality Gates → No existe

---

### 2.10 AGENT_TASKS_KANBAN_ISSUES.md — **PLAN DE MEJORA KANBAN**

**Lo que describe:** Plan detallado para mejorar el sistema Kanban.

**Hallazgos clave:**

1. **`created_by` column:** ¿Existe en nuestro DB? Necesitamos verificar.
2. **Agent filter dropdowns:** Para filtrar tareas por creador/assignee en la UI
3. **Agent API endpoints:** Ya implementados (`/api/kanban/agent/tasks`)

---

## 3. Mejoras Prioritarias

### 🔴 CRÍTICO (Esta semana)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | **Configurar Activities Sync** (cron cada 5 min) | 10 min | Activities dashboard con datos reales |
| 2 | **Configurar Usage Collection** (cron cada hora) | 10 min | Cost tracking con datos reales |
| 3 | **Actualizar pricing.ts** con nuestros modelos (glm-5, kimi-k2.5, etc.) | 30 min | Cost tracking refleja realidad |
| 4 | **Simplificar HEARTBEAT.md** del main | 1 hora | Menos tokens por heartbeat, más eficiente |

### 🟡 IMPORTANTE (Próxima semana)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 5 | **Pestaña Servicios** (n8n, Docker, PostgreSQL, Hindsight, Tailscale) | 3-4 horas | Visibilidad de infraestructura |
| 6 | **Configurar heartbeat autonomy** para especialistas | 1 hora | Agentes trabajan autónomamente del Kanban |
| 7 | **Operations Journal auto-generation** desde activities | 2 horas | Diario narrativo automático |
| 8 | **Verificar `created_by` column** en kanban.db | 15 min | Trazabilidad de quién creó cada tarea |

### 🟢 OPCIONAL (Cuando toque)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 9 | Command Palette (Cmd+K) | 3 horas | Quick actions |
| 10 | GitHub Issues Sync como Kanban tasks | 4 horas | Integración con repos |
| 11 | WebSocket push para heartbeat (en vez de polling) | 5 horas | Latencia reducida |
| 12 | Playground (model comparison) | 3 horas | Comparar modelos lado a lado |

---

## 4. Flujo Recomendado vs Flujo Actual

### Flujo Actual (Nuestro)
```
15+ cron jobs (todo via OpenClaw cron) 
  → Cada job es una sesión aislada 
  → HEARTBEAT.md monolítico (500+ líneas)
  → Activities sync manual
  → Cost tracking manual
```

### Flujo Recomendado (Basado en docs del original)
```
System Cron (3-4 jobs):
  → PostgreSQL backup (02:00 UTC)
  → Hindsight log rotation (00:00 UTC)
  → Cleanup diario (03:00 UTC)
  → Activities sync (*/5 * * * *)

OpenClaw Cron Isolated (5-7 jobs):
  → Morning Brief (08:00 Madrid, modelo glm-4.7)
  → Daily AI Digest (13:00 Madrid, modelo kimi-k2.5)
  → Daily Learning (00:00 Madrid, modelo glm-4.7)
  → Day Wrap (17:50 Madrid, modelo glm-4.7)
  → Weekly Review (Lunes 09:30 Madrid, modelo glm-5)
  → System Update Check (10:00 Madrid)
  → Usage Collection (cada hora)

Heartbeat (main session, 30 min):
  → Kanban review (tareas bloqueadas >24h)
  → SESSION-STATE.md check
  → Servicios críticos health check
  → HEARTBEAT_OK si todo OK

Heartbeat (especialistas, 30 min):
  → GET /api/heartbeat/tasks?agentName=<id>
  → Claim + process tareas asignadas
  → Update status
  → HEARTBEAT_OK si no hay tareas
```

**Beneficio estimado:** Reducción de ~50% en tokens de heartbeat, datos reales en dashboard, agentes más autónomos.

---

## 5. Conclusión

El repositorio original es un proyecto **extremadamente completo** con 15 fases de desarrollo implementadas. Nuestro fork tiene todo el código funcional, pero hay **4 cosas críticas que no están configuradas**:

1. **Activities sync no corre automáticamente** → Dashboard vacío
2. **Usage collection no corre automáticamente** → Cost tracking sin datos
3. **Pricing table no refleja nuestros modelos gratuitos** → Costos incorrectos
4. **HEARTBEAT.md es demasiado pesado** → Tokens desperdiciados

Además, la **pestaña de Servicios** que propuso Joker no existe en el original — es una mejora nuestra que deberíamos implementar.

El **Runtime Event Bridge** es un patrón excelente que ya funciona y deberíamos aprovechar más.

---

**Siguiente paso:** Ejecutar las 4 mejoras críticas + crear la pestaña de Servicios.
