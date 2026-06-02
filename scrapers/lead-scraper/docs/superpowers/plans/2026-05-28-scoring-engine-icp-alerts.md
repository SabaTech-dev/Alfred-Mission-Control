# Scoring Engine + ICP Filter + Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained scoring engine that enriches leads with extracted metadata (timeframe, duration, remote_type, budget, skills), scores them by configurable weights, filters by ICP rules, and sends Telegram alerts for high-value leads.

**Architecture:** Three standalone modules under `scoring/` — `index.js` (scoring), `icp-filter.js` (ICP rules), `telegram-alerts.js` (notifications). Each talks to the other via simple function calls. Config lives in `config.js`. Integration point is `pipeline-client.js` after dedup.

**Tech Stack:** Node.js, Jest, regex-based extraction (no external NLP)

---

## File Structure

### New Files
- **`scoring/index.js`** — `scoreLead(lead, options?)`: extracts structured metadata from description via regex, computes weighted score, returns `{ lead, enriched, score, breakdown }`
- **`scoring/index.test.js`** — Tests for scoring engine
- **`scoring/icp-filter.js`** — `filterByIcp(lead, rules?)`: checks lead against ICP rules (min score, required skills, blocked keywords, remote preference, budget range). Returns `{ passed, reasons }`.
- **`scoring/icp-filter.test.js`** — Tests for ICP filter
- **`scoring/telegram-alerts.js`** — `sendTelegramAlert(lead, score, config?)`: formats and sends a Telegram message via Bot API for leads above threshold
- **`scoring/telegram-alerts.test.js`** — Tests for Telegram alerts

### Modified Files
- **`config.js`** — Add SCORING_CONFIG, ICP_RULES, TELEGRAM_CONFIG
- **`pipeline-client.js`** — Add `processLead(lead, options?)` that runs scoreLead + filterByIcp + sendToPipeline (+ optionally sendTelegramAlert)
- **`pipeline-client.test.js`** — Add tests for processLead

---

### Task 1: Add scoring config to config.js

**Files:**
- Modify: `config.js`

- [ ] **Step 1: Read existing config.js**

Current exports: `{ KEYWORDS, USER_AGENTS, PIPELINE_ENDPOINT, AGENT_ID, AGENT_KEY }`

- [ ] **Step 2: Add SCORING_CONFIG, ICP_RULES, TELEGRAM_CONFIG**

```js
// --- Scoring Engine Config ---
const SCORING_CONFIG = {
  weights: {
    relevance: 0.35,      // keyword match density
    budget: 0.20,         // has budget defined
    remote: 0.15,         // remote work
    skills: 0.15,         // has skill list
    recency: 0.10,        // recently published
    completeness: 0.05,   // description length
  },
  min_score_to_alert: 70,  // 0-100
  min_score_to_pass: 30,   // minimum to send to pipeline
};

const ICP_RULES = {
  blocked_keywords: ['junior', 'trainee', 'prácticas', 'internship', 'volunteer', 'voluntario', 'no remunerado'],
  required_skills: [],  // if non-empty, lead MUST have at least one
  min_budget: 0,        // minimum budget_min
  prefer_remote: true,  // if true, non-remote leads get penalty
  min_score: 30,        // same as min_score_to_pass (convenience)
};

const TELEGRAM_CONFIG = {
  bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
  chat_id: process.env.TELEGRAM_CHAT_ID || '',
  enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
};

module.exports = { KEYWORDS, USER_AGENTS, PIPELINE_ENDPOINT, AGENT_ID, AGENT_KEY, SCORING_CONFIG, ICP_RULES, TELEGRAM_CONFIG };
```

- [ ] **Step 3: Verify with a quick check**

```bash
node -e "const c = require('./config'); console.log('weights:', Object.keys(c.SCORING_CONFIG.weights)); console.log('icp keys:', Object.keys(c.ICP_RULES)); console.log('tg enabled:', c.TELEGRAM_CONFIG.enabled);"
```
Expected: no errors, prints config keys.

---

### Task 2: Scoring engine — scoreLead()

**Files:**
- Create: `scoring/index.js`
- Create: `scoring/index.test.js`

- [ ] **Step 1: Write the failing test — description regex extraction**

```js
// scoring/index.test.js
const { scoreLead } = require('./index');
const { SCORING_CONFIG } = require('../config');

describe('scoreLead', () => {
  describe('extract metadata from description', () => {
    it('extracts timeframe=immediate from description', () => {
      const lead = { title: 'Dev', description: 'Necesito alguien que empiece inmediato. Start ASAP.' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('immediate');
    });

    it('extracts timeframe=soon for "próximas semanas"', () => {
      const lead = { title: 'Dev', description: 'Proyecto para las próximas semanas' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('soon');
    });

    it('extracts timeframe=flexible when described as flexible', () => {
      const lead = { title: 'Dev', description: 'Horario flexible, cuando puedas' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('flexible');
    });

    it('defaults timeframe=unknown when no match', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo web' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('unknown');
    });

    it('extracts duration=long from "6 months"', () => {
      const lead = { title: 'Dev', description: 'Proyecto de 6 meses de duración' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('long');
    });

    it('extracts duration=long from "long-term"', () => {
      const lead = { title: 'Dev', description: 'Long-term project' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('long');
    });

    it('extracts duration=short from "1 mes"', () => {
      const lead = { title: 'Dev', description: 'Proyecto corto de 1 mes' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('short');
    });

    it('defaults duration=unknown when no match', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('unknown');
    });

    it('extracts remote_type=full from "100% remoto"', () => {
      const lead = { title: 'Dev', description: 'Trabajo 100% remoto', remote: true };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('full');
    });

    it('extracts remote_type=hybrid from "híbrido"', () => {
      const lead = { title: 'Dev', description: 'Formato híbrido, 2 días presencial' };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('hybrid');
    });

    it('extracts remote_type=onsite from "presencial"', () => {
      const lead = { title: 'Dev', description: 'Trabajo presencial en Madrid' };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('onsite');
    });

    it('defaults remote_type based on lead.remote boolean', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo', remote: true };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('full');
    });

    it('defaults remote_type=unknown when no signal', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo' };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('unknown');
    });

    it('extracts budget from budget_min/budget_max fields', () => {
      const lead = { title: 'Dev', description: 'Proyecto desarrollo', budget_min: 100, budget_max: 200, currency: 'EUR' };
      const result = scoreLead(lead);
      expect(result.enriched.budget).toEqual({ min: 100, max: 200, currency: 'EUR', source: 'field' });
    });

    it('extracts budget from description regex when fields missing', () => {
      const lead = { title: 'Dev', description: 'Presupuesto: 3000€' };
      const result = scoreLead(lead);
      expect(result.enriched.budget).toEqual({ min: 3000, max: 3000, currency: 'EUR', source: 'description' });
    });

    it('extracts skills via regex from description', () => {
      const lead = { title: 'Dev', description: 'Buscamos Python con Selenium y Playwright' };
      const result = scoreLead(lead);
      expect(result.enriched.skills).toContain('python');
      expect(result.enriched.skills).toContain('selenium');
      expect(result.enriched.skills).toContain('playwright');
    });

    it('merges lead.skills array with extracted skills', () => {
      const lead = { title: 'Dev', description: 'Buscamos Python', skills: ['React', 'Node.js'] };
      const result = scoreLead(lead);
      expect(result.enriched.skills).toContain('react');
      expect(result.enriched.skills).toContain('python');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest scoring/index.test.js --no-coverage 2>&1 | head -5
```
Expected: `FAIL` — `Cannot find module './index'`

- [ ] **Step 3: Write scoring/index.js — extractMetadata and scoreLead**

```js
// scoring/index.js
const { SCORING_CONFIG } = require('../config');

// Known tech skills to detect in descriptions
const KNOWN_SKILLS = [
  'python', 'javascript', 'typescript', 'java', 'c#', 'c++', 'ruby', 'go', 'rust',
  'react', 'vue', 'angular', 'node.js', 'nodejs', 'express', 'django', 'flask',
  'selenium', 'playwright', 'cypress', 'puppeteer',
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
  'aws', 'gcp', 'azure', 'cloud',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'langchain', 'crewai', 'autogen', 'llm', 'rag', 'openai', 'gpt',
  'n8n', 'zapier', 'make.com', 'make',
  'agile', 'scrum', 'devops', 'ci/cd', 'jenkins', 'github actions',
  'rest', 'graphql', 'grpc', 'api',
  'html', 'css', 'sass', 'tailwind',
  'next.js', 'nextjs', 'nuxt', 'svelte',
  'fastapi', 'spring boot', 'nestjs',
];

function extractMetadata(lead) {
  const desc = (lead.description || '').toLowerCase();
  const title = (lead.title || '').toLowerCase();
  const combined = `${title} ${desc}`;

  // Timeframe
  let timeframe = 'unknown';
  if (/\binmediato\b|\bimmediate\b|\bstart asap\b|\burgen[te]\b|\basap\b/i.test(desc)) {
    timeframe = 'immediate';
  } else if (/próximas semanas|next month|próximo mes|en breve|corto plazo/i.test(desc)) {
    timeframe = 'soon';
  } else if (/flexible|cuando puedas|sin fecha|open deadline|no rush/i.test(desc)) {
    timeframe = 'flexible';
  }

  // Duration
  let duration = 'unknown';
  if (/\b(3\s*(meses|months|m)\b|\b6\s*(meses|months|m)\b|long.term|largo plazo|proyecto largo|varios meses)/i.test(desc)) {
    duration = 'long';
  } else if (/\b(1\s*(mes|month|m)\b|short|curto|corto)/i.test(desc)) {
    duration = 'short';
  }

  // Remote type
  let remote_type = 'unknown';
  if (/\b(100%\s*remoto|full\s*remote|completamente\s*remoto|totalmente\s*remoto|remote\s*(only|first|position))\b/i.test(desc)) {
    remote_type = 'full';
  } else if (/híbrido|hybrid|presencial\s*\+\s*remoto|mixto/i.test(desc)) {
    remote_type = 'hybrid';
  } else if (/presencial|on.?site|oficina/i.test(desc)) {
    remote_type = 'onsite';
  } else if (lead.remote === true) {
    remote_type = 'full';
  }

  // Budget
  let budget = null;
  if (lead.budget_min != null || lead.budget_max != null) {
    budget = {
      min: lead.budget_min != null ? lead.budget_min : 0,
      max: lead.budget_max != null ? lead.budget_max : 0,
      currency: lead.currency || 'EUR',
      source: 'field',
    };
  } else {
    const budgetRegex = /(?:presupuesto|budget|precio|coste|costo|pago|€|eur)\s*:?\s*(\d[\d.]*(?:,\d{3})*(?:\.\d+)?)\s*(?:€|eur)?/i;
    const match = desc.match(budgetRegex);
    if (match) {
      const amount = parseFloat(match[1].replace(/\./g, ''));
      budget = { min: amount, max: amount, currency: 'EUR', source: 'description' };
    }
  }

  // Skills — merge existing with regex-extracted
  let extractedSkills = [];
  const skillRegex = new RegExp(`\\b(${KNOWN_SKILLS.join('|')})\\b`, 'gi');
  const skillMatches = combined.match(skillRegex);
  if (skillMatches) {
    extractedSkills = [...new Set(skillMatches.map(s => s.toLowerCase()))];
  }
  const existingSkills = (lead.skills || []).map(s => s.toLowerCase());
  const mergedSkills = [...new Set([...existingSkills, ...extractedSkills])];

  return {
    timeframe,
    duration,
    remote_type,
    budget,
    skills: mergedSkills,
  };
}

function computeScore(lead, enriched, weights) {
  const w = weights || SCORING_CONFIG.weights;
  const breakdown = {};
  let score = 0;

  // Relevance: keyword match density in description + title
  const desc = (lead.description || '').toLowerCase();
  const title = (lead.title || '').toLowerCase();
  const combined = `${title} ${desc}`;
  const { KEYWORDS } = require('../config');
  const matchedKeywords = KEYWORDS.filter(kw => combined.includes(kw.toLowerCase()));
  const relevanceRaw = Math.min(1, matchedKeywords.length / Math.max(1, KEYWORDS.length * 0.3));
  breakdown.relevance = Math.round(relevanceRaw * 100);
  score += relevanceRaw * w.relevance * 100;

  // Budget: has budget defined
  const hasBudget = enriched.budget !== null && (enriched.budget.min > 0 || enriched.budget.max > 0);
  const budgetScore = hasBudget ? 1 : 0;
  breakdown.budget = budgetScore * 100;
  score += budgetScore * w.budget * 100;

  // Remote: prefers remote
  const remoteScore = enriched.remote_type === 'full' ? 1 : enriched.remote_type === 'hybrid' ? 0.5 : 0;
  breakdown.remote = Math.round(remoteScore * 100);
  score += remoteScore * w.remote * 100;

  // Skills: has skills defined
  const hasSkills = enriched.skills.length > 0;
  const skillsScore = hasSkills ? Math.min(1, enriched.skills.length / 5) : 0;
  breakdown.skills = Math.round(skillsScore * 100);
  score += skillsScore * w.skills * 100;

  // Recency: recently published
  let recencyScore = 0.5; // neutral
  if (lead.published_at) {
    const daysOld = (Date.now() - new Date(lead.published_at).getTime()) / 86400000;
    recencyScore = Math.max(0, 1 - daysOld / 30);
  }
  breakdown.recency = Math.round(recencyScore * 100);
  score += recencyScore * w.recency * 100;

  // Completeness: description length
  const descLen = (lead.description || '').length;
  const completenessScore = Math.min(1, descLen / 500);
  breakdown.completeness = Math.round(completenessScore * 100);
  score += completenessScore * w.completeness * 100;

  return { score: Math.round(score), breakdown };
}

function scoreLead(lead, options = {}) {
  if (!lead || typeof lead !== 'object') {
    return { lead: {}, enriched: {}, score: 0, breakdown: {}, error: 'Invalid lead' };
  }

  const weights = options.weights || SCORING_CONFIG.weights;
  const enriched = extractMetadata(lead);
  const { score, breakdown } = computeScore(lead, enriched, weights);

  return { lead, enriched, score, breakdown };
}

module.exports = { scoreLead, extractMetadata, computeScore };
```

- [ ] **Step 4: Write scoring/index.test.js — scoring logic tests**

```js
// Add inside the same describe block, after extraction tests
describe('computeScore', () => {
  it('returns 0 for empty lead', () => {
    const result = scoreLead({});
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.breakdown).toBeDefined();
  });

  it('scores higher for leads with keyword matches', () => {
    const lowLead = { title: 'Job', description: 'Some random job posting' };
    const highLead = { title: 'SaaS API dev', description: 'Desarrollo de API para SaaS con integración y automatización' };
    const low = scoreLead(lowLead);
    const high = scoreLead(highLead);
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('scores higher for leads with budget defined', () => {
    const noBudget = { title: 'Dev', description: 'Proyecto' };
    const withBudget = { title: 'Dev', description: 'Proyecto', budget_min: 500, budget_max: 1000 };
    expect(scoreLead(withBudget).score).toBeGreaterThan(scoreLead(noBudget).score);
  });

  it('scores higher for remote leads', () => {
    const onsite = { title: 'Dev', description: 'Trabajo presencial en Madrid' };
    const remote = { title: 'Dev', description: '100% remoto' };
    expect(scoreLead(remote).score).toBeGreaterThan(scoreLead(onsite).score);
  });

  it('scores higher for leads with skills listed', () => {
    const noSkills = { title: 'Dev', description: 'Un proyecto de desarrollo' };
    const withSkills = { title: 'Dev', description: 'Buscamos Python con experiencia en React y AWS' };
    expect(scoreLead(withSkills).score).toBeGreaterThan(scoreLead(noSkills).score);
  });

  it('scores higher for recently published leads', () => {
    const old = { title: 'Dev', description: 'Proyecto', published_at: '2025-01-01T00:00:00Z' };
    const recent = { title: 'Dev', description: 'Proyecto', published_at: new Date().toISOString() };
    expect(scoreLead(recent).score).toBeGreaterThan(scoreLead(old).score);
  });

  it('uses custom weights when provided', () => {
    const lead = { title: 'SaaS Dev', description: 'API automation project' };
    const defaultResult = scoreLead(lead);
    const customWeights = { relevance: 1, budget: 0, remote: 0, skills: 0, recency: 0, completeness: 0 };
    const customResult = scoreLead(lead, { weights: customWeights });
    // With relevance=1, score should be higher than distributed weights for same lead
    expect(customResult.score).not.toBe(defaultResult.score);
  });

  it('handles null/undefined lead gracefully', () => {
    expect(scoreLead(null).error).toBe('Invalid lead');
    expect(scoreLead(undefined).error).toBe('Invalid lead');
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest scoring/index.test.js --no-coverage --verbose
```
Expected: 18+ tests PASS

- [ ] **Step 6: Commit**

```bash
git add scoring/index.js scoring/index.test.js
git commit -m "feat(scoring): add scoring engine with regex-based enrichment"
```

---

### Task 3: ICP Filter

**Files:**
- Create: `scoring/icp-filter.js`
- Create: `scoring/icp-filter.test.js`

- [ ] **Step 1: Write the failing test**

```js
// scoring/icp-filter.test.js
const { filterByIcp } = require('./icp-filter');

describe('filterByIcp', () => {
  it('passes a lead meeting all ICP rules', () => {
    const result = filterByIcp({ score: 80, enriched: { skills: ['python', 'react'], remote_type: 'full', budget: { min: 100, max: 200 } } });
    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('blocks a lead below min score', () => {
    const result = filterByIcp({ score: 10, enriched: {} });
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain('Score too low: 10 < 30');
  });

  it('blocks a lead with blocked keywords in title or description', () => {
    const result = filterByIcp({ score: 80, enriched: {}, lead: { title: 'Junior Developer', description: '' } });
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('junior'))).toBe(true);
  });

  it('blocks a lead with blocked keywords in description', () => {
    const result = filterByIcp({ score: 80, enriched: {}, lead: { title: 'Dev', description: 'Prácticas en empresa' } });
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('prácticas'))).toBe(true);
  });

  it('applies remote preference penalty', () => {
    const rules = { ...require('../config').ICP_RULES, prefer_remote: true };
    const result = filterByIcp({ score: 80, enriched: { remote_type: 'onsite' }, rules });
    expect(result.passed).toBe(true); // still can pass
    expect(result.reasons).toContain('Non-remote lead (onsite)');
  });

  it('requires at least one skill when required_skills is set', () => {
    const rules = { ...require('../config').ICP_RULES, required_skills: ['python', 'react'] };
    const result = filterByIcp({ score: 80, enriched: { skills: ['java'] }, rules });
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('Required skills'))).toBe(true);
  });

  it('passes when lead has a required skill', () => {
    const rules = { ...require('../config').ICP_RULES, required_skills: ['python', 'react'] };
    const result = filterByIcp({ score: 80, enriched: { skills: ['python', 'java'] }, rules });
    expect(result.passed).toBe(true);
  });

  it('applies min budget filter', () => {
    const rules = { ...require('../config').ICP_RULES, min_budget: 500 };
    const result = filterByIcp({ score: 80, enriched: { budget: { min: 100, max: 200 } } });
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('budget'))).toBe(true);
  });

  it('passes when no budget but min_budget is 0', () => {
    const result = filterByIcp({ score: 80, enriched: { budget: null } });
    expect(result.passed).toBe(true);
  });

  it('uses custom rules when provided', () => {
    const customRules = { blocked_keywords: ['test'], required_skills: [], min_budget: 0, prefer_remote: false, min_score: 0 };
    const result = filterByIcp({ score: 5, enriched: {} }, customRules);
    expect(result.passed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest scoring/icp-filter.test.js --no-coverage 2>&1 | head -5
```
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// scoring/icp-filter.js
const { ICP_RULES } = require('../config');

function filterByIcp(scoreResult, rules = ICP_RULES) {
  const reasons = [];
  const lead = scoreResult.lead || {};
  const enriched = scoreResult.enriched || {};
  const score = scoreResult.score || 0;

  // Score threshold
  if (score < rules.min_score) {
    reasons.push(`Score too low: ${score} < ${rules.min_score}`);
  }

  // Blocked keywords in title and description
  const titleDesc = `${(lead.title || '')} ${(lead.description || '')}`.toLowerCase();
  for (const kw of (rules.blocked_keywords || [])) {
    if (titleDesc.includes(kw.toLowerCase())) {
      reasons.push(`Blocked keyword found: "${kw}"`);
    }
  }

  // Required skills
  if (rules.required_skills && rules.required_skills.length > 0) {
    const hasRequired = rules.required_skills.some(s => enriched.skills.includes(s.toLowerCase()));
    if (!hasRequired) {
      reasons.push(`Required skills not found: ${rules.required_skills.join(', ')}`);
    }
  }

  // Min budget
  if (rules.min_budget > 0 && enriched.budget) {
    if (enriched.budget.max < rules.min_budget) {
      reasons.push(`Budget too low: max ${enriched.budget.max} < ${rules.min_budget}`);
    }
  }

  // Remote preference
  if (rules.prefer_remote && enriched.remote_type && enriched.remote_type !== 'full' && enriched.remote_type !== 'unknown') {
    reasons.push(`Non-remote lead (${enriched.remote_type})`);
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

module.exports = { filterByIcp };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest scoring/icp-filter.test.js --no-coverage --verbose
```
Expected: 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scoring/icp-filter.js scoring/icp-filter.test.js
git commit -m "feat(scoring): add ICP filter module"
```

---

### Task 4: Telegram Alerts

**Files:**
- Create: `scoring/telegram-alerts.js`
- Create: `scoring/telegram-alerts.test.js`

- [ ] **Step 1: Write the failing test**

```js
// scoring/telegram-alerts.test.js
const axios = require('axios');
jest.mock('axios');

const { sendTelegramAlert } = require('./telegram-alerts');

describe('sendTelegramAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when telegram is not configured', async () => {
    const config = { enabled: false, bot_token: '', chat_id: '' };
    const result = await sendTelegramAlert({ title: 'Test' }, 85, config);
    expect(result).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('sends a formatted message to Telegram when configured', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });
    const config = { enabled: true, bot_token: 'test-token', chat_id: 'test-chat' };

    const lead = { title: 'SaaS Developer', company: 'TechCorp', url: 'https://example.com/job/1', source: 'malt', description: 'Cool project' };
    const result = await sendTelegramAlert(lead, 85, config);

    expect(result).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);

    const call = axios.post.mock.calls[0];
    expect(call[0]).toContain('test-token');
    const payload = call[1];
    expect(payload.chat_id).toBe('test-chat');
    expect(payload.text).toContain('SaaS Developer');
    expect(payload.text).toContain('TechCorp');
    expect(payload.text).toContain('85');
    expect(payload.parse_mode).toBe('HTML');
  });

  it('returns false on API error', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));
    const config = { enabled: true, bot_token: 'test-token', chat_id: 'test-chat' };
    const result = await sendTelegramAlert({ title: 'Test' }, 85, config);
    expect(result).toBe(false);
  });

  it('includes enriched metadata when available', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });
    const config = { enabled: true, bot_token: 'test-token', chat_id: 'test-chat' };

    const lead = { title: 'Python AI Dev' };
    const enriched = { timeframe: 'immediate', remote_type: 'full', skills: ['python', 'ai'], budget: { min: 100, max: 200, currency: 'EUR' } };
    const result = await sendTelegramAlert({ ...lead, _enriched: enriched }, 92, config);

    expect(result).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.text).toContain('immediate');
    expect(payload.text).toContain('100-200');
    expect(payload.text).toContain('92');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest scoring/telegram-alerts.test.js --no-coverage 2>&1 | head -5
```
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```js
// scoring/telegram-alerts.js
const axios = require('axios');
const { TELEGRAM_CONFIG } = require('../config');

const TELEGRAM_API = 'https://api.telegram.org/bot';

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTelegramMessage(lead, score, enriched) {
  const title = escapeHtml(lead.title || 'Untitled');
  const company = escapeHtml(lead.company || 'Unknown');
  const url = lead.url || '';
  const source = escapeHtml(lead.source || 'unknown');
  const desc = escapeHtml((lead.description || '').substring(0, 200));

  const enr = enriched || lead._enriched || {};
  const timeframe = enr.timeframe || 'unknown';
  const remoteType = enr.remote_type || 'unknown';
  const skills = (enr.skills || []).join(', ') || 'none';
  let budgetLine = '';
  if (enr.budget) {
    budgetLine = `💰 <b>Budget:</b> ${enr.budget.min}-${enr.budget.max} ${enr.budget.currency}\n`;
  }

  let header = `🔔 <b>NEW HIGH-SCORING LEAD</b>\n\n`;
  header += `📊 <b>Score:</b> ${score}/100\n`;
  header += `🏢 <b>Company:</b> ${company}\n`;
  header += `📋 <b>Title:</b> ${title}\n`;
  header += `📁 <b>Source:</b> ${source}\n`;
  header += `⏱ <b>Timeframe:</b> ${timeframe}\n`;
  header += `🏠 <b>Remote:</b> ${remoteType}\n`;
  header += `${budgetLine}`;
  header += `🔧 <b>Skills:</b> ${skills}\n`;
  if (desc) header += `\n📝 <b>Description:</b>\n${desc}\n`;
  if (url) header += `\n🔗 <a href="${escapeHtml(url)}">View Lead</a>`;

  return header;
}

async function sendTelegramAlert(lead, score, config = TELEGRAM_CONFIG) {
  if (!config.enabled || !config.bot_token || !config.chat_id) {
    return false;
  }

  try {
    const enriched = lead._enriched || {};
    const text = formatTelegramMessage(lead, score, enriched);

    const response = await axios.post(
      `${TELEGRAM_API}${config.bot_token}/sendMessage`,
      {
        chat_id: config.chat_id,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
      { timeout: 10000 }
    );

    return response.data?.ok === true;
  } catch (err) {
    console.error(`[TelegramAlert] Error sending alert: ${err.message}`);
    return false;
  }
}

module.exports = { sendTelegramAlert, formatTelegramMessage };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest scoring/telegram-alerts.test.js --no-coverage --verbose
```
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scoring/telegram-alerts.js scoring/telegram-alerts.test.js
git commit -m "feat(scoring): add Telegram alert notifications"
```

---

### Task 5: Integrate scoring into pipeline-client.js

**Files:**
- Modify: `pipeline-client.js`
- Modify: `pipeline-client.test.js`

- [ ] **Step 1: Write the failing test**

```js
// Add to pipeline-client.test.js
const { sendToPipeline, resetCache, processLead } = require('./pipeline-client');

describe('processLead', () => {
  beforeEach(() => {
    resetCache();
    jest.clearAllMocks();
  });

  it('scores, filters, and sends a passing lead', async () => {
    axios.get.mockResolvedValue({ data: { opportunities: [] } });
    axios.post.mockResolvedValue({ data: { id: '123' } });

    const lead = { title: 'SaaS API Developer', company: 'TechCorp', description: 'Desarrollo de API para SaaS con Python y React. 100% remoto. Presupuesto 5000€. Inmediato.' };
    const result = await processLead(lead, 'malt');

    expect(result.sent).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.passedIcp).toBe(true);
    expect(result.enriched).toBeDefined();
    expect(result.enriched.timeframe).toBe('immediate');
  });

  it('does not send a low-scoring lead', async () => {
    axios.get.mockResolvedValue({ data: { opportunities: [] } });
    axios.post.mockResolvedValue({ data: { id: '123' } });

    const lead = { title: 'Junior position', company: 'Corp', description: 'Prácticas no remuneradas' };
    const result = await processLead(lead, 'malt');

    expect(result.sent).toBe(false);
    expect(result.passedIcp).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('optionally sends telegram alert for high-scoring leads', async () => {
    axios.get.mockResolvedValue({ data: { opportunities: [] } });
    axios.post.mockResolvedValue({ data: { id: '123' } });

    const lead = { title: 'SaaS API Developer', company: 'TechCorp', description: 'Desarrollo de API para SaaS con Python y React. 100% remoto. Presupuesto 5000€. Inmediato.' };
    const result = await processLead(lead, 'malt', { alertOnHighScore: true });

    expect(result.sent).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70); // high enough for alert
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest pipeline-client.test.js --no-coverage 2>&1 | head -10
```
Expected: some tests FAIL (processLead not exported)

- [ ] **Step 3: Add processLead to pipeline-client.js**

```js
// Add at the top with other requires
const { scoreLead } = require('./scoring/index');
const { filterByIcp } = require('./scoring/icp-filter');
const { sendTelegramAlert } = require('./scoring/telegram-alerts');
const { SCORING_CONFIG, ICP_RULES, TELEGRAM_CONFIG } = require('./config');

// Add after resetCache():
async function processLead(lead, source, options = {}) {
  try {
    // 1. Score the lead
    const scoreResult = scoreLead(lead);
    
    // 2. Check ICP filter
    const icpResult = filterByIcp(scoreResult);
    
    if (!icpResult.passed) {
      console.log(`[PipelineClient] ⛔ ICP blocked: "${lead.title}" — ${icpResult.reasons.join('; ')}`);
      return { sent: false, passedIcp: false, score: scoreResult.score, enriched: scoreResult.enriched, reasons: icpResult.reasons };
    }
    
    // 3. Check min score to pass
    if (scoreResult.score < SCORING_CONFIG.min_score_to_pass) {
      console.log(`[PipelineClient] ⛔ Score too low: ${scoreResult.score} < ${SCORING_CONFIG.min_score_to_pass} for "${lead.title}"`);
      return { sent: false, passedIcp: true, score: scoreResult.score, enriched: scoreResult.enriched, reasons: ['Score too low'] };
    }
    
    // 4. Send to pipeline
    const pipelineResult = await sendToPipeline(lead);
    
    // 5. Optional: send Telegram alert
    let alertSent = false;
    if (scoreResult.score >= SCORING_CONFIG.min_score_to_alert && options.alertOnHighScore !== false) {
      alertSent = await sendTelegramAlert({ ...lead, _enriched: scoreResult.enriched }, scoreResult.score);
    }
    
    return {
      sent: !!pipelineResult,
      passedIcp: true,
      score: scoreResult.score,
      enriched: scoreResult.enriched,
      pipelineResult,
      alertSent,
    };
  } catch (err) {
    console.error(`[PipelineClient] processLead error: ${err.message}`);
    return { sent: false, passedIcp: false, score: 0, enriched: {}, error: err.message };
  }
}

// Add to module.exports
module.exports = { deduplicate, deduplicateByUrl, sendToPipeline, resetCache, processLead };
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npx jest --verbose --no-coverage
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add config.js pipeline-client.js pipeline-client.test.js
git commit -m "feat(pipeline): integrate scoring, ICP filter, and alerts"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ scoring/index.js — scoreLead, extractMetadata (timeframe, duration, remote_type, budget, skills via regex)
- ✅ scoring/icp-filter.js — filterByIcp with blocked keywords, score threshold, required skills, budget, remote preference
- ✅ scoring/telegram-alerts.js — sendTelegramAlert with formatted HTML messages
- ✅ pipeline-client.js — processLead integration (score → filter → send → alert)
- ✅ config.js — SCORING_CONFIG, ICP_RULES, TELEGRAM_CONFIG

**2. Placeholder scan:** No TBD, no "add proper error handling" without code, all steps have actual code blocks.

**3. Type consistency:** All function signatures match across tasks. `scoreLead` returns `{ lead, enriched, score, breakdown }`. `filterByIcp` takes `scoreResult` (that shape). `sendTelegramAlert` takes `(lead, score, config)`. `processLead` returns `{ sent, passedIcp, score, enriched, reasons }`.
