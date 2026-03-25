# 📊 Informe de Análisis — Alfred Mission Control

**Fecha:** 2026-03-25  
**Autor:** Alfred  
**Scope:** Análisis exhaustivo de docs, scripts y funcionalidades del fork SuperBotijo → Alfred Mission Control

---

## 🏗️ Resumen Ejecutivo

El repositorio SuperBotijo (de Carlos Azaustre) es un **dashboard extremadamente completo** con ~100 componentes React, ~90+ endpoints API, 3 bases de datos SQLite, y un sistema de eventos en tiempo real. Tras el fork, hemos hecho branding, auth middleware y fixes puntuales, pero **hay funcionalidades significativas que no estamos explotando**.

---

## 📋 Hallazgos por Categoría

### 1. 🟢 Funcionalidades YA Implementadas y Operativas

| Feature | Estado | Notas |
|---------|--------|-------|
| Auth middleware | ✅ | Acabamos de implementarlo — todas las rutas protegidas |
| Chat con gateway | ✅ | Fix: HTTP /health en vez de WebSocket |
| Kanban board | ✅ | 32 tareas (26 backlog, 3 done, 2 review, 1 in_progress) |
| Heartbeat de especialistas | ✅ | 5 agentes con heartbeat.target="last" cada 30m |
| OpenClaw cron jobs | ✅ | 18 jobs activos (morning brief, daily digest, cleanup, etc.) |
| Icons/branding | ✅ | Logo Alfred en todos los tamaños |
| 90+ API endpoints | ✅ | Todos existentes en código |
| i18n (en/es) | ✅ | Provider + translations listas |
| Runtime Event Bridge | ✅ | Sistema de eventos desacoplado entre componentes |
| Real-time SSE | ✅ | /api/realtime con heartbeat cada 30s |

### 2. 🟡 Funcionalidades Implementadas pero NO Usadas

#### 2.1 Cost Tracking (USAGE TRACKING)
- **Existe:** `scripts/collect-usage.ts`, `data/usage-tracking.db`, `/api/costs/*`
- **Problema:** La DB tiene **0 registros**. Nunca se ha ejecutado.
- **Flujo esperado:** Cron horario → `collect-usage.ts` → lee `openclaw status --json` → calcula costes → guarda en SQLite
- **Pricing:** Definido en `src/lib/pricing.ts` pero con modelos de pago (Opus, Sonnet, Haiku). **Nuestros modelos (glm-5, kimi, minimax) NO están en la tabla de precios.**
- **Acción necesaria:**
  1. Añadir nuestros modelos a `pricing.ts` (coste = 0 para free models)
  2. Crear cron job horario que ejecute `npx tsx scripts/collect-usage.ts`
  3. Verificar que `openclaw status --json` devuelve datos de tokens

#### 2.2 Activities Sync (Sincronización de Actividades)
- **Existe:** `scripts/sync-openclaw-sessions.sh`, `data/activities.db`, `/api/activities/*`
- **Problema:** DB tiene solo 97 registros (del 22-25 Mar). El script **NO está en cron**.
- **Flujo esperado:** Cron cada 5 min → lee `~/.openclaw/agents/*/sessions/*.jsonl` → inserta en activities.db
- **Script roto:** El script todavía referencia `/root/.openclaw` y `SUPERBOTIJO_DB` en vez de nuestras rutas
- **Acción necesaria:**
  1. Fix rutas en `sync-openclaw-sessions.sh` (ya están parcialmente arregladas con sed, pero el shebang tiene paths hardcodeados)
  2. Añadir a system cron: `*/5 * * * * ubuntu /path/to/sync-openclaw-sessions.sh`
  3. Ejecutar manualmente para verificar

#### 2.3 Kanban Comments API
- **Existe:** `/api/kanban/tasks/[id]/comments` y `/api/kanban/agent/tasks/[id]/comments`
- **Problema:** En la sesión anterior vimos que el endpoint no aceptaba credenciales de agente correctamente
- **Acción:** Testear con nuestros agent keys actuales

#### 2.4 Projects en Kanban
- **Existe:** Tabla `projects` en kanban.db, `/api/projects`
- **Problema:** No hemos creado ningún proyecto. Todas las tareas están sin proyecto.
- **Acción:** Crear al menos los proyectos principales (qa-framework, openclaw, osint-nexus)

#### 2.5 Heartbeat: Coder y Security con ERROR
- **Estado:** Los heartbeats de coder y security muestran `error` en la última ejecución
- **Causa probable:** Los agentes se ejecutan como `isolated` pero puede que no tengan acceso al workspace correcto o el prompt del heartbeat sea demasiado largo (nuestro HEARTBEAT.md es enorme)
- **Acción:** Investigar los logs de los jobs con error

### 3. 🔴 Funcionalidades que Nos Faltan / No Tenemos

#### 3.1 Pestaña de Servicios (Services Tab)
- **Lo que existe:** `/api/system/services` y `/api/system/monitor` ya existen
- **Lo que falta:** **No hay una página dedicada** para ver el estado de servicios como Joker pidió
- **Servicios que deberíamos monitorear:**
  | Servicio | Check | Puerto/Endpoint |
  |----------|-------|----------------|
  | OpenClaw Gateway | HTTP /health | 127.0.0.1:18789 |
  | PostgreSQL | pg_isready | 5432 |
  | Hindsight API | HTTP /health | 127.0.0.1:9077 |
  | Mission Control | Puerto 3000 | 3000 |
  | n8n | Puerto 5678 | 5678 |
  | Docker | docker ps | - |
  | Tailscale | tailscale status | - |
- **Acción:** Crear página `/services` que consuma `/api/system/monitor` y añada checks específicos

#### 3.2 Dependency Resolution en Kanban
- **Existe en código:** `depends_on`, `blocked_by` en la tabla, `dependency-resolver.ts`
- **No usado:** No estamos asignando dependencias entre tareas
- **Valor:** Si la tarea B depende de A, no se puede claim hasta que A esté done
- **Acción:** Empezar a usar `depends_on` en tareas que tienen prerequisitos

#### 3.3 Workflow Designer
- **Existe:** `/api/workflows`, `/workflows` (React Flow visual editor)
- **No usado:** No hemos creado ningún workflow visual
- **Valor:** Prototipado visual de flujos de automatización antes de implementarlos en OpenProse/cron
- **Acción:** Explorar la UI de workflows para ver si es útil

#### 3.4 Playground (Model Comparison)
- **Existe:** `/api/playground/*`, `/playground` (side-by-side model testing)
- **No usado:** Nunca hemos probado la comparación de modelos
- **Valor:** Testear prompts específicos en varios modelos y comparar outputs
- **Acción:** Probar con nuestros modelos (glm-5, kimi, minimax)

#### 3.5 Terminal Web
- **Existe:** `/api/terminal`, `/terminal` con allowlist de comandos
- **No usado:** Podríamos ejecutar comandos desde el navegador
- **Riesgo:** Comandos peligrosos bloqueados por allowlist
- **Acción:** Verificar qué comandos están permitidos y si es útil

#### 3.6 Reports con Share Links
- **Existe:** `/api/reports/*` con generación, PDF export, y share tokens
- **No usado:** Nunca hemos generado un reporte desde Mission Control
- **Valor:** Generar reportes compartibles (ej: resumen semanal para compartir con alguien)
- **Acción:** Explorar

#### 3.7 Office 3D
- **Existe:** `/office` con React Three Fiber, avatares GLB, multi-floor building
- **Estado:** Originalmente pública, ahora protegida por middleware
- **Acción:** Decidir si la queremos pública o privada. Es más una demo que una herramienta útil.

### 4. 🔵 Mejoras al Flujo Actual

#### 4.1 HEARTBEAT.md es Demasiado Grande
- **Problema:** Nuestro HEARTBEAT.md tiene ~500+ líneas con todos los protocolos detallados
- **Impacto:** Cada heartbeat consume muchos tokens porque el agente tiene que leer todo
- **Solución original del repo:** Templates de HEARTBEAT.md por rol (COO, Developer, Research, etc.) de ~30 líneas cada uno
- **Nuestra situación:** Tenemos UN solo HEARTBEAT.md compartido con TODO
- **Recomendación:** Separar:
  - `HEARTBEAT.md` (main) → Solo checklist de monitoreo ligero (~30 líneas)
  - Cada especialista ya tiene su propio workspace → Podrían tener su propio HEARTBEAT.md más corto
  - Los detalles de protocolos (morning brief, day wrap, etc.) → Moverlos a cron jobs con systemEvents en vez de en el heartbeat

#### 4.2 Kanban + Heartbeat: El Flujo Completo
- **Lo que el repo diseñó:**
  1. Alfred crea tarea en Kanban → status: backlog, assignee: coder
  2. El heartbeat del coder ve la tarea (API devuelve backlog + in_progress)
  3. El coder claim la tarea → status: in_progress, claimedBy: coder
  4. El coder trabaja y actualiza comentarios
  5. El coder marca review → Alfred revisa en su heartbeat
  6. Alfred marca done
  
- **Lo que tenemos hoy:**
  - ✅ Kanban funciona
  - ✅ Heartbeat de especialistas funciona
  - ❌ El heartbeat devuelve backlog + in_progress (fix aplicado hoy)
  - ❌ No estamos usando claim/unclaim
  - ❌ No estamos usando comentarios para comunicación entre agentes
  - ❌ No hay proyectos

- **Recomendación:** Implementar el flujo completo:
  1. Cuando Alfred delega → Crear tarea en Kanban con assignee
  2. El especialista claim al procesar (en su heartbeat)
  3. Comentar progreso
  4. Mover a review al terminar
  5. Alfred revisar y marcar done

#### 4.3 Activities Sync Automático
- **Valor:** Si activamos el sync cada 5 min, la pestaña Activity mostrará actividad REAL de los agentes en tiempo real
- **Actualmente:** Solo 97 registros (3 días), probablemente de uso manual de la UI
- **Recomendación:** Activar el cron job de sync

#### 4.4 Cost Tracking con Nuestros Modelos
- **Valor:** Ver costes (incluso si son 0 para free models) para trackear consumo de tokens
- **Recomendación:** Añadir nuestros modelos a pricing.ts con coste 0, activar cron horario

#### 4.5 Kanban Domains y Labels
- **Existe:** Tabla de domains (work, general, finance, personal) y labels con colores
- **No usado:** Todas las tareas están sin domain ni labels
- **Recomendación:** Asignar domains y labels a las tareas existentes

---

## 📊 Tabla Resumen de Acciones

| # | Acción | Prioridad | Esfuerzo | Impacto |
|---|--------|-----------|----------|---------|
| 1 | **Crear pestaña Servicios** | 🔴 Alta | Medio | Joker lo pidió explícitamente |
| 2 | **Activar Activities Sync** | 🟡 Media | Bajo | 97→miles de registros reales |
| 3 | **Fix Cost Tracking** (añadir modelos, activar cron) | 🟡 Media | Bajo | Tracking de tokens real |
| 4 | **Crear proyectos en Kanban** | 🟡 Media | Bajo | Organización visual |
| 5 | **Implementar flujo claim/unclaim** | 🟡 Media | Medio | Comunicación entre agentes |
| 6 | **Reducir HEARTBEAT.md** (mover detalles a docs) | 🟡 Media | Medio | Ahorro de tokens |
| 7 | **Investigar heartbeat errors** (coder, security) | 🟡 Media | Bajo | Fiabilidad |
| 8 | **Explorar Playground** | 🟢 Baja | Ninguno | Experimentación |
| 9 | **Explorar Workflows** | 🟢 Baja | Ninguno | Prototipado visual |
| 10 | **Decidir sobre Office 3D** (pública o privada) | 🟢 Baja | Ninguno | Cosmético |

---

## 🎯 Conclusión

Tenemos un **tesoro funcional** debajo de la superficie. El repo SuperBotijo es mucho más que un dashboard — es un sistema de gestión completo con:

- **90+ API endpoints** (la mayoría sin usar)
- **3 bases de datos** (kanban, activities, usage-tracking — solo 1 realmente activa)
- **Sistema de eventos en tiempo real** (SSE + Event Bridge)
- **Workflow designer visual** (React Flow)
- **Model playground** (comparación side-by-side)
- **Activities sync automático** (sin activar)
- **Cost tracking** (sin configurar)
- **Comentarios entre agentes** (sin usar)

**Las 3 acciones de mayor impacto inmediato:**
1. **Pestaña de Servicios** → Joker lo pidió
2. **Activar Activities Sync** → Dashboard vivo con datos reales
3. **Reducir HEARTBEAT.md** → Ahorro de tokens + heartbeat más fiable

---

**Generado por:** Alfred 🦇  
**Versión:** 1.0
