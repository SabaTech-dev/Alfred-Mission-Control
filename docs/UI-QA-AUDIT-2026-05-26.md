# AMC UI QA audit — 2026-05-26

Auditoría manual del AMC en vivo (`http://127.0.0.1:3000`) usando navegador real + navegación asistida + revisión de consola. Resultado corto: el panel principal es navegable y la mayoría de vistas cargan, pero **no está limpio para darlo por “sin fallos”** por dos regresiones claras: el dock muestra claves de i18n sin resolver en varias entradas y la vista `office` queda bloqueada en `Loading office...` por un `401` repetido contra `/api/sessions`.

## Quick path

1. El login funciona y redirige correctamente al dashboard.
2. Las **31 rutas visibles del dock** responden tras autenticación.
3. Se validaron tabs internas en `agents`, `cron`, `learning`, `reports`, `wiki`, `analytics`, `performance` y `settings`.
4. **Fallo crítico:** `office` nunca termina de cargar; la consola muestra `401 Unauthorized` contra `/api/sessions`.
5. **Fallo global de UI/i18n:** el dock renderiza claves crudas `dock.*` / `help.*` en varias entradas operativas.

## Cobertura ejecutada

| Área | Verificación |
|------|--------------|
| Login | OK — carga `/login`, acepta password y entra al dashboard |
| Rutas dock | OK — 31 rutas cargan |
| Consola general dashboard | Sin errores JS fatales reproducibles en el barrido normal |
| Tabs internas | OK en las vistas clave auditadas |
| Vista 3D `office` | FAIL — loading infinito + 401 repetido |

## Tabs verificadas

| Ruta | Estado | Tabs / secciones comprobadas |
|------|--------|------------------------------|
| `/agents` | OK | `Tarjetas de Agentes`, `Organigrama` |
| `/cron` | OK | `Todas`, `Tareas del sistema`, `Tareas del agente`, `Latido` |
| `/learning` | OK | `Errores`, `Feature Requests`, `PDCA`, `Tracker`, `Skills Audit`, `Tech Radar` + vista inicial por defecto |
| `/reports` | OK | `All Reports`, `Cierre & Agenda`, `AI & Social Digest` |
| `/wiki` | OK | `Wiki Explorer`, `Hindsight Memory`, `Graph / Grafo` |
| `/analytics` | OK | `Resumen`, `Costos` |
| `/performance` | OK | `Vista General`, `Alertas`, `Historial` |
| `/settings` | OK | `Sistema`, `Config`, `Precios`, `Acerca de` |

## Hallazgos confirmados

| Severidad | Área | Evidencia | Impacto |
|-----------|------|-----------|---------|
| Alta | Dock i18n | Se ven claves como `dock.activity`, `help.activity.title`, `dock.cron`, `dock.journal`, `dock.notepad`, `dock.sessions`, `dock.wiki`, `dock.workflows` | Rompe percepción de calidad y hace que partes del dock parezcan sin traducir o sin terminar |
| Alta | `office` | Tras 10s sigue en `Loading office...`; consola con `Failed to load resource: 401 (Unauthorized)` | La vista 3D no llega a estado usable |
| Media | `office` | Request fallido identificado: `GET /api/sessions` → `401` | El polling del office depende de una API que no está entrando autenticada/permitida en ese contexto |
| Baja | Login / navegación | Warnings de fuentes preload no usadas (`woff2 preload but not used`) | Ruido en DevTools; no bloquea uso |
| Baja | `office` | Warnings deprecados de Three.js (`THREE.Clock`, `PCFSoftShadowMap`) | Deuda técnica; no parece la causa principal del loading infinito |

## Detalle técnico útil

- El `Dock` declara entradas para `activity`, `cron`, `journal`, `notepad`, `sessions`, `wiki` y `workflows` usando claves `dock.*` / `help.*`.
- En `src/i18n/messages/{en,es}.json`, el bloque `dock` / `help` sí cubre muchas entradas, pero **no todas las que usa el Dock actual**, por eso esas claves se renderizan literalmente.
- `office` se monta desde `src/app/office/page.tsx`, pero el polling cliente pasa por `src/hooks/useOfficePolling.ts`.
- En esa hook, `fetchWithTimeout("/api/sessions")` forma parte del refresco de estado/visitantes; durante la auditoría esa request devolvió `401` y la vista no salió del loading.

## Qué no conté como bug del producto

- Los `net::ERR_ABORTED` sobre rutas `?_rsc=...` que aparecieron durante el barrido automático rápido se consideran **artefactos del propio recorrido acelerado entre páginas**, no fallo funcional del usuario final.
- No se detectaron errores JS fatales reproducibles en las rutas dashboard normales fuera de `office`.

## Checklist de salida

- [x] Login validado
- [x] Navegación principal recorrida
- [x] Tabs internas críticas comprobadas
- [x] Consola revisada
- [x] Fallos reales aislados con evidencia

## Next step

1. Completar claves faltantes de `dock` y `help` en `src/i18n/messages/en.json` y `src/i18n/messages/es.json`.
2. Corregir la auth/allowlist de `/api/sessions` para el flujo de `office` o adaptar `useOfficePolling.ts` a una fuente permitida en ese contexto.
3. Repetir esta auditoría después del fix, con especial foco en `office` y el dock lateral.
