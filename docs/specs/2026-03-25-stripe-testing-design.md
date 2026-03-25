# Stripe Integration Testing - Design Doc

**Fecha:** 2026-03-25
**Autor:** coder agent
**Task ID:** 8fcf3665-3018-4a3d-8655-1b149722c2d8
**Estado:** DRAFT - Pendiente aprobación

---

## 1. Goal

Implementar suite de tests E2E para flujos de pago con Stripe en Mission Control.

---

## 2. Supuestos (REQUIEREN VALIDACIÓN)

> ⚠️ **IMPORTANTE:** Estos supuestos deben ser validados antes de implementar.

1. **No existe integración Stripe activa** - Crearemos mock/stub para testing
2. **Proyecto target:** `mission-control-alfred-mission-control`
3. **Stack:** Next.js App Router + TypeScript
4. **Testing framework:** Jest + Playwright (E2E)
5. **Stripe mode:** Test mode con tarjetas mock de Stripe

---

## 3. Arquitectura Propuesta

### 3.1 Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    E2E Tests (Playwright)                    │
├─────────────────────────────────────────────────────────────┤
│  - checkout.flow.spec.ts    → Flujo completo de checkout    │
│  - subscription.spec.ts     → Tests de suscripciones        │
│  - webhook.spec.ts          → Tests de webhooks             │
│  - refund.spec.ts           → Tests de reembolsos           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Stripe Test Helpers                          │
├─────────────────────────────────────────────────────────────┤
│  - stripe-mock.ts           → Simulador de respuestas       │
│  - test-cards.ts            → Tarjetas de prueba Stripe     │
│  - webhook-helper.ts        → Helper para webhooks          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Future Stripe Integration)          │
├─────────────────────────────────────────────────────────────┤
│  - /api/stripe/checkout     → Crear sesión checkout         │
│  - /api/stripe/webhook      → Recibir webhooks              │
│  - /api/stripe/subscription → Gestionar suscripciones       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Flujos a Testear

| Flujo | Descripción | Prioridad |
|-------|-------------|-----------|
| Checkout básico | Pago único con tarjeta de prueba | HIGH |
| Checkout con cupón | Aplicar descuento | MEDIUM |
| Suscripción mensual | Crear y cancelar suscripción | HIGH |
| Webhook handling | Procesar eventos de Stripe | HIGH |
| Fallos de pago | Tarjeta rechazada, fondos insuficientes | MEDIUM |
| Reembolso | Procesar devolución | LOW |

---

## 4. Tech Stack

- **Stripe SDK:** `stripe` (Node.js)
- **E2E Testing:** `@playwright/test`
- **Unit Testing:** `jest` + `@testing-library/react`
- **Mocking:** `stripe-mock` (oficial de Stripe) o MSW

---

## 5. Tasks Breakdown

### Fase 1: Setup (2h)
- [ ] Instalar dependencias (`stripe`, `@playwright/test`)
- [ ] Configurar variables de entorno para Stripe test mode
- [ ] Crear estructura de carpetas

### Fase 2: Test Helpers (2h)
- [ ] Crear `stripe-mock.ts` con respuestas simuladas
- [ ] Crear `test-cards.ts` con tarjetas de prueba
- [ ] Crear `webhook-helper.ts`

### Fase 3: E2E Tests (4h)
- [ ] Test: Checkout básico exitoso
- [ ] Test: Checkout con tarjeta rechazada
- [ ] Test: Suscripción creación
- [ ] Test: Webhook payment_intent.succeeded

### Fase 4: Integración CI (1h)
- [ ] Añadir tests a GitHub Actions
- [ ] Configurar secrets para Stripe test keys

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| No hay API Stripe real | Crear mocks que sigan la interfaz real |
| API keys expuestas | Usar solo test keys, nunca live keys |
| Tests flaky por red | Usar stripe-mock local, no API real |

---

## 7. Criterio de Aceptación (DoD)

- [ ] Tests E2E ejecutables con `pnpm test:e2e`
- [ ] Coverage mínimo 80% en flujos de pago
- [ ] Tests corren en CI sin secrets expuestos
- [ ] Documentación de cómo añadir nuevos tests

---

## 8. Alternativas Consideradas

### Opción A: Stripe Test Mode (Recomendada)
- **Pros:** Usar API real de Stripe en modo test, más realista
- **Contras:** Requiere API key válida, más lento

### Opción B: stripe-mock (Local)
- **Pros:** No requiere API key, muy rápido
- **Contras:** No cubre todos los edge cases

### Opción C: MSW + fixtures
- **Pros:** Control total, sin dependencias externas
- **Contras:** Mucho setup, puede desincronizarse de API real

**Recomendación:** Opción A para CI, Opción B para desarrollo local.

---

## 9. Próximos Pasos

1. **Validar supuestos** con Alfred/main
2. Aprobar diseño
3. Pasar a `coder-writing-plans` para plan detallado
4. Implementar siguiendo `coder-tdd`

---

**PENDIENTE:** Aprobación de este diseño antes de continuar.
