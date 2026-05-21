# Lead Scraper para Mission Control Pipeline — Design Document

**Fecha:** 2026-05-20
**Autor:** Coder Agent
**Estado:** ✅ Approved
**Enfoque:** Monolito Modular

---

## 🎯 Goal

Crear un sistema de scraping de leads automatizado que extraiga oportunidades de 7 plataformas freelance (Freelancer, Malt, Upwork, InfoJobs, Workana, Indeed, LinkedIn Jobs), filtre por keywords de IA/Agentes, calcule probabilidad (90% rule) y envíe a Mission Control Pipeline via HTTP POST.

---

## 🏗️ Architecture Overview

**Patrón:** Monolito Modular con clases abstractas
**Orquestación:** Script principal (index.ts) que ejecuta cada plataforma secuencialmente
**Persistencia:** HTTP POST a Mission Control API (localhost:3000/api/pipeline)
**Deduplicación:** Opcional por company + title exacto (pipeline-db `findOpportunityByCompanyTitle()`)

```
Cron (08:45 AM Madrid)
  ↓
index.ts (orquestador)
  ↓
platforms/[name].ts (clases abstractas)
  ↓
pipeline-client.ts (HTTP POST)
  ↓
Mission Control API
  ↓
SQLite (kanban.db)
```

---

## 📊 Data Flow

1. **Cron Trigger** → Ejecuta `scripts/lead-scraper/index.ts` a las 08:45 AM
2. **Scraping** → Cada plataforma extrae leads raw
3. **Filtrado** → Keywords de IA/Agentes (case-insensitive)
4. **Cálculo de probabilidad** → 90%+ si tiene keywords, 0% si no
5. **Deduplicación** → Check si ya existe (company + title)
6. **Envío** → POST a Mission Control API
7. **Log** → Estadísticas: extraídos, filtrados, deduplicados, enviados, errores

---

## 🧩 Key Components

### 1. `index.ts` — Orquestador Principal
- Ejecuta cada plataforma secuencialmente
- Manejo de errores por plataforma (continue on fail)
- Agregación de estadísticas
- Log final con resumen

### 2. `config.ts` — Configuración Centralizada
- Keywords de IA/Agentes (array)
- User-Agents rotatorios (array ~10)
- Delays (min/max en ms)
- Mission Control API endpoint
- Toggle de deduplicación

### 3. `types.ts` — Tipos TypeScript
- `Lead`: Interfaz de lead raw
- `ScrapedLead`: Lead procesado con probabilidad
- `ScrapeResult`: Resultado de scraping por plataforma
- `PipelineOpportunity`: Tipo para POST a Mission Control

### 4. `platforms/base.ts` — Clase Abstracta Base
```typescript
abstract class BasePlatformScraper {
  abstract platformName: string;
  abstract async scrape(): Promise<Lead[]>;
  protected delay(): Promise<void>; // Delay aleatorio
  protected getRandomUserAgent(): string; // User-Agent rotation
  protected filterByKeywords(leads: Lead[]): Lead[]; // Filtro IA/Agentes
  protected calculateProbability(lead: Lead): number; // 90% rule
}
```

### 5. `platforms/[name].ts` — Scrapers por Plataforma
- Heredan de `BasePlatformScraper`
- Implementan `scrape()` específico
- Usan Playwright para navegación
- Extraen: company, title, description, source, URL

### 6. `pipeline-client.ts` — Cliente HTTP Mission Control
- `sendToPipeline(opportunity: PipelineOpportunity): Promise<void>`
- `checkDuplicate(company: string, title: string): Promise<boolean>` (GET /api/pipeline + búsqueda en memoria)
- Retry logic (3 intentos con exponential backoff)

### 7. `deduplicator.ts` — Detección de Duplicados
- **Nota:** `findOpportunityByCompanyTitle()` ya existe en pipeline-db
- Para deduplicación, necesitamos un endpoint GET en Mission Control que reciba company + title y retorne true/false
- Opción: Usar `GET /api/pipeline` (ya retorna todas las oportunidades) y filtrar en memoria

### 8. `utils.ts` — Utilidades
- `randomDelay(min: number, max: number): Promise<void>`
- `getRandomUserAgent(): string`
- `containsKeyword(text: string, keywords: string[]): boolean`

---

## 🔌 API Surface / Interfaces

### `BasePlatformScraper` (Abstract Class)
```typescript
export abstract class BasePlatformScraper {
  abstract platformName: string;
  abstract async scrape(): Promise<Lead[]>;

  protected delay(min: number = 2000, max: number = 5000): Promise<void>;
  protected getRandomUserAgent(): string;
  protected filterByKeywords(leads: Lead[]): Lead[];
  protected calculateProbability(lead: Lead): number;
  protected async sendToPipeline(leads: ScrapedLead[]): Promise<SendResult[]>;
}
```

### `PipelineClient` (HTTP Client)
```typescript
export class PipelineClient {
  constructor(private apiUrl: string = "http://localhost:3000/api/pipeline");

  async checkDuplicate(company: string, title: string): Promise<boolean>;
  async sendToPipeline(opportunity: PipelineOpportunity): Promise<void>;
}

export interface PipelineOpportunity {
  company: string;
  title: string;
  description?: string;
  value?: number;
  currency?: string;
  source?: string;
  stage?: "lead" | "contacted" | "qualifying" | "proposal" | "negotiation" | "won" | "lost";
  probability?: number;
  notes?: string;
  // Campos opcionales: contact_name, contact_email, contact_linkedin, service_type, next_action, next_action_date
}
```

### `ScrapeResult` (Output por plataforma)
```typescript
export interface ScrapeResult {
  platform: string;
  extracted: number;
  filtered: number;
  duplicates: number;
  sent: number;
  errors: number;
  durationMs: number;
}
```

---

## 🛡️ Error Handling Strategy

### 1. Error por Plataforma
- Si una plataforma falla → Log error, continuar con siguiente
- NO detener todo el proceso por una plataforma caída

### 2. Error por Lead
- Si un lead falla al enviar → Log warning, continuar con siguiente
- No bloquear envío de otros leads

### 3. Retry Logic (HTTP POST)
- 3 intentos con exponential backoff (1s, 2s, 4s)
- Después de 3 fallos → Log error y descartar lead

### 4. Playwright Timeout
- Timeout default: 30s por página
- Si timeout → Log error, continuar con siguiente lead

### 5. Logging
- ERROR: Platform completa falló
- WARN: Lead individual falló
- INFO: Progreso normal (extracted, filtered, sent)
- DEBUG: Detalle de delays, user-agents

---

## 🔤 Tech Stack

- **Runtime:** Node.js (ya instalado)
- **Language:** TypeScript
- **Browser Automation:** Playwright (ya instalado)
- **HTTP Client:** native `fetch` (Node.js 18+)
- **Package Manager:** npm
- **Cron:** System cron job (crontab)

**Dependencies a instalar:**
- `@types/node` (dev)
- `typescript` (dev)
- `ts-node` (dev) - para ejecutar TypeScript directamente
- `zod` (opcional, para validación de schemas)

---

## 📝 Keywords de IA/Agentes (Configuración)

```typescript
const AI_KEYWORDS = [
  "SaaS", "API", "integración", "automatizar", "desarrollo", "software",
  "asistente de ia", "asistente virtual", "agente de ia", "agente agentico",
  "flujos de trabajo ia", "automatizacion ia", "openai", "langchain",
  "crewai", "autogen", "llm", "rag", "chatbot inteligente"
];
```

**Lógica de filtrado:**
- Case-insensitive matching
- Si ANY keyword está en title OR description → pasa el filtro
- Si NO hay keywords → descarta (probabilidad = 0)

---

## 📊 Cálculo de Probabilidad (90% Rule)

```typescript
calculateProbability(lead: Lead): number {
  const hasAIKeywords = this.containsKeyword(lead.title + " " + lead.description, AI_KEYWORDS);
  const hasBudget = lead.budget && lead.budget > 0;
  const hasClearRequirement = lead.description && lead.description.length > 50;

  if (hasAIKeywords) {
    return 90; // Base 90% + keywords de IA
  }

  if (hasBudget && hasClearRequirement) {
    return 50; // 50% si tiene presupuesto + requerimiento claro
  }

  return 0; // Descartar si no cumple criterios
}
```

**Rule:** Solo enviar leads con probability >= 50%

---

## 📋 Tasks Breakdown

### Fase 1: Setup y Configuración
1. Crear estructura de directorios
2. Inicializar package.json
3. Instalar dependencies
4. Crear tsconfig.json

### Fase 2: Core (Types, Config, Utils, PipelineClient)
5. Crear types.ts
6. Crear config.ts
7. Crear utils.ts
8. Crear pipeline-client.ts

### Fase 3: Base Scraper
9. Crear platforms/base.ts (clase abstracta)
10. Tests de BasePlatformScraper

### Fase 4: Scrapers por Plataforma
11. Crear platforms/freelancer.ts
12. Crear platforms/malt.ts
13. Crear platforms/upwork.ts
14. Crear platforms/infojobs.ts
15. Crear platforms/workana.ts
16. Crear platforms/indeed.ts
17. Crear platforms/linkedin.ts
18. Tests de scrapers (mockeados, no real scraping)

### Fase 5: Orquestador
19. Crear index.ts (orquestador principal)
20. Test de orquestador

### Fase 6: Integración y Testing
21. Test manual de un scraper (ej: Freelancer)
22. Test manual de orquestador completo
23. Test de deduplicación

### Fase 7: Cron Job
24. Configurar crontab para 08:45 AM Madrid
25. Test de cron job (ejecutar manualmente)

### Fase 8: Documentación
26. Crear README.md con uso y configuración
27. Actualizar TOOLS.md (si aplica)

---

## ⚠️ Risks

### 1. Bloqueos Anti-Bot
- **Probabilidad:** Alta (Freelancer, Upwork tienen measures fuertes)
- **Mitigación:** User-Agent rotation, delays aleatorios, retries
- **Fallback:** Si bloquea → log error, continuar con otras plataformas

### 2. Login Requerido
- **Probabilidad:** Alta (LinkedIn, Upwork requieren login)
- **Mitigación:** Dejar marcado como "TODO: Implementar login con {credenciales}"
- **Fallback:** No implementar en primera versión

### 3. Rate Limiting
- **Probabilidad:** Media (API endpoints pueden limitar)
- **Mitigación:** Retries con exponential backoff
- **Fallback:** Log error, continuar con siguiente lead

### 4. Schema Changes en Mission Control
- **Probabilidad:** Baja (endpoint estable)
- **Mitigación:** Usar validación Zod en pipeline-client
- **Fallback:** Log error de validación

### 5. Cron Job No Ejecuta
- **Probabilidad:** Media (timezone issues, permisos)
- **Mitigación:** Usar timezone: Europe/Madrid, test manual antes
- **Fallback:** Log de cron en /var/log/syslog

---

## 🎯 Success Criteria

- [ ] Script modular en Node.js + Playwright en `scripts/lead-scraper/`
- [ ] Cada plataforma en módulo separado
- [ ] Validación de keywords de IA/Agentes
- [ ] Cálculo de probabilidad (90% rule)
- [ ] Envío POST a http://localhost:3000/api/pipeline con JSON correcto
- [ ] Anti-bot measures implementados (user-agent rotation, delays)
- [ ] Cron job configurado a las 08:45 AM Madrid
- [ ] Documentación de uso y configuración
- [ ] Test de ejecución manual exitoso
- [ ] Deduplicación por company + title exacto

---

## 📝 Notes

1. **Playwright config:** Usar modo headless para producción
2. **Deduplicación:** Necesitamos endpoint GET para check duplicates, o filtrar en memoria tras GET /api/pipeline
3. **Login credentials:** No hardcodear; usar variables de entorno o secrets manager (Infisical)
4. **Logging:** Usar console.log con prefijos: [LEAD-SCRAPER], [Freelancer], [PipelineClient], etc.

---

## 🔄 Future Improvements (Post-MVP)

1. Paralelización de scrapers (Promise.all)
2. Webhook notification cuando se detectan leads de alta probabilidad
3. Dashboard de estadísticas (leads por plataforma, tiempo de ejecución)
4. Auto-detectar cambios en HTML de plataformas y alertar
5. Implementar login con credenciales (Infisical)
6. Exportar leads a CSV/JSON para backup
7. Integración con Slack/Telegram para notificaciones

---

**Fin del Design Document**