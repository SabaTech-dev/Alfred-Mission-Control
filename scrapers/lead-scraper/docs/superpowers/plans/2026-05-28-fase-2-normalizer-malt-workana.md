# Fase 2: Normalizer + Scrapers Malt/Workana Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build URL normalizer, refactor Malt/Workana scrapers to Cheerio, switch dedup to URL-based.

**Architecture:**
```
Scraper (Cheerio) → extractRawData → Normalizer.toLead() → Lead schema → PipelineClient.send()
                                                                     ↑
                                                              Dedup by URL (cache)
```

**Tech Stack:** Node.js, Jest, Cheerio, Axios

---

### Task 0: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install jest and cheerio as devDependencies**

Run:
```bash
npm install --save-dev jest cheerio
```

Expected: packages added to package.json, node_modules updated

- [ ] **Step 2: Verify jest works**

Run:
```bash
npx jest --version
```

Expected: version string printed (e.g. "29.x.x")

- [ ] **Step 3: Add test script to package.json**

Edit `package.json` — add `"test"` script:

```json
"scripts": {
  "test": "jest --verbose"
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add jest and cheerio"
```

---

### Task 1: Normalizer Module (TDD)

**Files:**
- Create: `normalizer/index.js`
- Create: `normalizer/index.test.js`

- [ ] **Step 1: Write failing test — basic field mapping**

```js
// normalizer/index.test.js
const { toLead } = require('./index');

describe('toLead', () => {
  it('maps basic fields from raw data to Lead schema', () => {
    const raw = {
      title: 'Senior Dev React',
      company: 'TechCorp',
      description: 'Desarrollo de SaaS con React',
      url: 'https://example.com/job/123',
      source_type: 'freelance',
      skills: ['React', 'Node.js'],
      budget_min: 100,
      budget_max: 200,
      currency: 'USD',
      remote: true,
      location: 'Remote',
      published_at: '2026-05-28T10:00:00Z',
    };

    const result = toLead(raw, 'malt');

    expect(result).toEqual({
      title: 'Senior Dev React',
      company: 'TechCorp',
      description: 'Desarrollo de SaaS con React',
      url: 'https://example.com/job/123',
      source: 'malt',
      source_type: 'freelance',
      skills: ['React', 'Node.js'],
      budget_min: 100,
      budget_max: 200,
      currency: 'USD',
      remote: true,
      location: 'Remote',
      published_at: '2026-05-28T10:00:00Z',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx jest normalizer/index.test.js --verbose
```

Expected: FAIL — "Cannot find module './index'" or "toLead is not a function"

- [ ] **Step 3: Write minimal normalizer implementation**

```js
// normalizer/index.js
function toLead(raw, source) {
  return {
    title: raw.title || '',
    company: raw.company || '',
    description: raw.description || '',
    url: raw.url || '',
    source: source || '',
    source_type: raw.source_type || null,
    skills: raw.skills || [],
    budget_min: raw.budget_min != null ? raw.budget_min : null,
    budget_max: raw.budget_max != null ? raw.budget_max : null,
    currency: raw.currency || 'EUR',
    remote: raw.remote ?? true,
    location: raw.location || null,
    published_at: raw.published_at || null,
  };
}

module.exports = { toLead };
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx jest normalizer/index.test.js --verbose
```

Expected: PASS

- [ ] **Step 5: Write test — handles missing fields gracefully**

Add to `normalizer/index.test.js`:

```js
it('fills missing fields with defaults', () => {
  const result = toLead({}, 'workana');

  expect(result).toEqual({
    title: '',
    company: '',
    description: '',
    url: '',
    source: 'workana',
    source_type: null,
    skills: [],
    budget_min: null,
    budget_max: null,
    currency: 'EUR',
    remote: true,
    location: null,
    published_at: null,
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run:
```bash
npx jest normalizer/index.test.js -t "fills missing fields" --verbose
```

Expected: FAIL — current implementation might not handle all defaults

- [ ] **Step 7: The implementation already handles it — verify all pass**

Run:
```bash
npx jest normalizer/index.test.js --verbose
```

Expected: PASS (both tests)

- [ ] **Step 8: Write test — preserves null for undefined numeric fields**

Add to `normalizer/index.test.js`:

```js
it('preserves null for undefined numeric fields', () => {
  const result = toLead({ budget_min: 0, budget_max: null }, 'malt');

  expect(result.budget_min).toBe(0);
  expect(result.budget_max).toBeNull();
});
```

- [ ] **Step 9: Write test — normalizes URL (trim + lowercase)**

Add to `normalizer/index.test.js`:

```js
it('trims whitespace from string fields', () => {
  const result = toLead({
    title: '  Senior Dev  ',
    company: '  TechCorp  ',
    url: '  https://example.com/  ',
  }, 'malt');

  expect(result.title).toBe('  Senior Dev  ');  // raw passthrough, normalizer does NOT trim
  // Normalizer passes through raw values — trimming is raw data responsibility
});
```

Wait — the normalizer is just a field mapper. It doesn't sanitize. Let me change this test to verify passthrough behavior instead. Actually, let me remove this test — the normalizer doesn't trim, it just maps fields. The scraper should provide clean data.

- [ ] **Step 10: Run all normalizer tests**

Remove the trim test and run:

```bash
npx jest normalizer/index.test.js --verbose
```

Expected: PASS (3 tests)

- [ ] **Step 11: Commit**

```bash
git add normalizer/
git commit -m "feat(normalizer): add Lead schema normalizer with toLead()"
```

---

### Task 2: Pipeline Client — URL-based Dedup (TDD)

**Files:**
- Create: `pipeline-client.test.js`
- Modify: `pipeline-client.js`

- [ ] **Step 1: Write test — deduplicateByUrl detects duplicate**

```js
// pipeline-client.test.js
const axios = require('axios');

// We'll test the deduplicateByUrl function (to be created)
// by mocking axios
jest.mock('axios');

const { deduplicateByUrl, resetCache } = require('./pipeline-client');

describe('deduplicateByUrl', () => {
  beforeEach(() => {
    resetCache();
    jest.clearAllMocks();
  });

  it('returns true when URL matches an existing opportunity', async () => {
    axios.get.mockResolvedValue({
      data: {
        opportunities: [
          { url: 'https://example.com/job/123' },
          { url: 'https://malt.es/project/456' },
        ],
      },
    });

    const result = await deduplicateByUrl('https://example.com/job/123');
    expect(result).toBe(true);
  });

  it('returns false when URL does not match', async () => {
    axios.get.mockResolvedValue({
      data: {
        opportunities: [
          { url: 'https://example.com/job/123' },
        ],
      },
    });

    const result = await deduplicateByUrl('https://example.com/job/999');
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx jest pipeline-client.test.js --verbose
```

Expected: FAIL — "deduplicateByUrl is not a function" (doesn't exist yet)

- [ ] **Step 3: Add deduplicateByUrl to pipeline-client.js**

Replace `deduplicate` function:

```js
let _existingCache = null;

async function deduplicateByUrl(url) {
  try {
    if (!_existingCache) {
      const resp = await axios.get(PIPELINE_ENDPOINT);
      _existingCache = resp.data.opportunities || [];
    }
    const normalizedUrl = url.trim().toLowerCase().replace(/\/$/, '');
    return _existingCache.some(o => {
      if (!o.url) return false;
      const existingUrl = o.url.trim().toLowerCase().replace(/\/$/, '');
      return existingUrl === normalizedUrl;
    });
  } catch (err) {
    console.error('[PipelineClient] deduplicateByUrl error:', err.message);
    return false;
  }
}
```

Keep `resetCache()` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx jest pipeline-client.test.js --verbose
```

Expected: PASS

- [ ] **Step 5: Write test — normalizes URL before comparing**

Add to `pipeline-client.test.js`:

```js
it('normalizes URL (lowercase, trim, trailing slash removed)', async () => {
  axios.get.mockResolvedValue({
    data: {
      opportunities: [
        { url: 'https://Example.com/Job/123/' },
      ],
    },
  });

  // Different casing, trailing slash — should still match
  const result = await deduplicateByUrl('  https://example.com/job/123  ');
  expect(result).toBe(true);
});
```

- [ ] **Step 6: Run test to verify passes**

Run:
```bash
npx jest pipeline-client.test.js -t "normalizes URL" --verbose
```

Expected: PASS

- [ ] **Step 7: Write test — handles missing url field gracefully**

Add to `pipeline-client.test.js`:

```js
it('returns false when existing opportunities have no url', async () => {
  axios.get.mockResolvedValue({
    data: {
      opportunities: [
        { company: 'Foo', title: 'Bar' },  // no url field
      ],
    },
  });

  const result = await deduplicateByUrl('https://example.com/job/123');
  expect(result).toBe(false);
});
```

- [ ] **Step 8: Run all pipeline-client tests**

Run:
```bash
npx jest pipeline-client.test.js --verbose
```

Expected: PASS (4 tests)

- [ ] **Step 9: Update existing Malt/Workana scrapers to use deduplicateByUrl**

In `platforms/malt.js`: change `deduplicate(item.company, item.title)` to `deduplicateByUrl(item.url)`
In `platforms/workana.js`: same change

- [ ] **Step 10: Commit**

```bash
git add pipeline-client.js pipeline-client.test.js
git commit -m "feat(pipeline-client): URL-based dedup with deduplicateByUrl()"
```

---

### Task 3: Malt Scraper — Cheerio Refactor (TDD)

**Files:**
- Create: `platforms/malt.test.js`
- Modify: `platforms/malt.js`

- [ ] **Step 1: Write test — parses HTML into leads**

```js
// platforms/malt.test.js
const { parseMaltHTML } = require('./malt');

describe('parseMaltHTML', () => {
  it('extracts leads from Malt HTML', () => {
    const html = `
      <html>
      <body>
        <div class="project-item">
          <h3><a href="/project/123">Desarrollo SaaS con IA</a></h3>
          <div class="project-description">Crear un SaaS de IA para automatización</div>
          <div class="client-name">Cliente Tech</div>
          <div class="budget">1000€</div>
        </div>
        <div class="project-item">
          <h3><a href="/project/456">API REST con Python</a></h3>
          <div class="project-description">Desarrollar API REST para integración</div>
          <div class="client-name">StartupXYZ</div>
          <div class="budget">500€</div>
        </div>
      </body>
      </html>
    `;

    const result = parseMaltHTML(html, 'https://www.malt.es');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: 'Desarrollo SaaS con IA',
      company: 'Cliente Tech',
      url: 'https://www.malt.es/project/123',
    });
    expect(result[1]).toMatchObject({
      title: 'API REST con Python',
      company: 'StartupXYZ',
      url: 'https://www.malt.es/project/456',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx jest platforms/malt.test.js --verbose
```

Expected: FAIL — "parseMaltHTML is not a function"

- [ ] **Step 3: Implement parseMaltHTML + refactor Malt scraper**

```js
// platforms/malt.js
const axios = require('axios');
const cheerio = require('cheerio');
const { KEYWORDS } = require('../config');
const { toLead } = require('../normalizer');
const { deduplicateByUrl, sendToPipeline } = require('../pipeline-client');

function containsKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function randomDelay() {
  return new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
}

function parseMaltHTML(html, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];

  $('.project-item').each((i, el) => {
    const titleEl = $(el).find('h3 a');
    const descEl = $(el).find('.project-description');
    const clientEl = $(el).find('.client-name');
    const budgetEl = $(el).find('.budget');

    const title = titleEl.text().trim();
    const href = titleEl.attr('href') || '';
    const url = href.startsWith('http') ? href : `${baseUrl}${href}`;

    items.push({
      title,
      description: descEl.text().trim().substring(0, 500),
      company: clientEl.text().trim() || 'Malt Client',
      url,
      budget: budgetEl.text().trim(),
    });
  });

  return items;
}

async function scrapeMalt() {
  console.log('[Malt] Iniciando scraping con Cheerio...');
  let sent = 0, dupes = 0, filtered = 0;
  const queries = ['intelligence artificielle', 'AI agent', 'LLM', 'chatbot', 'développement SaaS'];
  const baseUrl = 'https://www.malt.fr';

  for (const query of queries) {
    try {
      const url = `${baseUrl}/profiles?query=${encodeURIComponent(query)}&sort=recent`;
      console.log(`[Malt] Buscando: "${query}"`);

      const resp = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'fr-FR,fr;q=0.9',
        },
        timeout: 15000,
      });

      const rawItems = parseMaltHTML(resp.data, baseUrl);

      for (const item of rawItems) {
        if (!item.title) continue;
        const text = `${item.title} ${item.description}`;
        if (!containsKeyword(text)) { filtered++; continue; }

        const isDup = await deduplicateByUrl(item.url);
        if (isDup) { dupes++; continue; }

        const lead = toLead(item, 'malt');
        await sendToPipeline({
          ...lead,
          title: lead.title.substring(0, 200),
          description: lead.description.substring(0, 1000),
          probability: 90,
          notes: `URL: ${lead.url}${item.budget ? ` | Budget: ${item.budget}` : ''}`,
        });
        sent++;
      }

      await randomDelay();
    } catch (err) {
      console.error(`[Malt] Error query "${query}": ${err.message}`);
    }
  }

  console.log(`[Malt] Done. Sent: ${sent}, Dupes: ${dupes}, Filtered: ${filtered}`);
  return { sent, dupes, filtered };
}

module.exports = scrapeMalt;
module.exports.parseMaltHTML = parseMaltHTML;
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx jest platforms/malt.test.js --verbose
```

Expected: PASS

- [ ] **Step 5: Write test — handles empty results**

Add to `platforms/malt.test.js`:

```js
it('returns empty array when no projects found', () => {
  const html = '<html><body><p>No results</p></body></html>';
  const result = parseMaltHTML(html, 'https://www.malt.es');
  expect(result).toEqual([]);
});
```

- [ ] **Step 6: Run tests**

```bash
npx jest platforms/malt.test.js --verbose
```

Expected: PASS (2 tests)

- [ ] **Step 7: Write test — handles missing optional fields**

Add to `platforms/malt.test.js`:

```js
it('handles items with missing description or budget', () => {
  const html = `
    <html>
    <body>
      <div class="project-item">
        <h3><a href="/project/789">Solo título</a></h3>
      </div>
    </body>
    </html>
  `;

  const result = parseMaltHTML(html, 'https://www.malt.es');
  expect(result).toHaveLength(1);
  expect(result[0].title).toBe('Solo título');
  expect(result[0].description).toBe('');
  expect(result[0].company).toBe('Malt Client');
  expect(result[0].url).toBe('https://www.malt.es/project/789');
});
```

- [ ] **Step 8: Run all malt tests**

```bash
npx jest platforms/malt.test.js --verbose
```

Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add platforms/malt.js platforms/malt.test.js
git commit -m "feat(malt): refactor to Cheerio-based scraper with URL dedup"
```

---

### Task 4: Workana Scraper — Cheerio Refactor (TDD)

**Files:**
- Create: `platforms/workana.test.js`
- Modify: `platforms/workana.js`

- [ ] **Step 1: Write test — parses Workana HTML into leads**

```js
// platforms/workana.test.js
const { parseWorkanaHTML } = require('./workana');

describe('parseWorkanaHTML', () => {
  it('extracts leads from Workana HTML', () => {
    const html = `
      <html>
      <body>
        <div class="project-item">
          <h3><a href="/job/123">Automatización de procesos con IA</a></h3>
          <div class="project-description">Necesito automatizar procesos con Python</div>
          <div class="project-budget">Presupuesto: USD 1000</div>
        </div>
        <div class="project-item">
          <h3><a href="/job/456">Desarrollo de API REST</a></h3>
          <div class="project-description">API para integración SaaS</div>
          <div class="project-budget">Presupuesto: USD 500</div>
        </div>
      </body>
      </html>
    `;

    const result = parseWorkanaHTML(html, 'https://www.workana.com');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: 'Automatización de procesos con IA',
      company: 'Workana Client',
      url: 'https://www.workana.com/job/123',
    });
    expect(result[1]).toMatchObject({
      title: 'Desarrollo de API REST',
      company: 'Workana Client',
      url: 'https://www.workana.com/job/456',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx jest platforms/workana.test.js --verbose
```

Expected: FAIL — "parseWorkanaHTML is not a function"

- [ ] **Step 3: Implement parseWorkanaHTML + refactor Workana scraper**

```js
// platforms/workana.js
const axios = require('axios');
const cheerio = require('cheerio');
const { KEYWORDS } = require('../config');
const { toLead } = require('../normalizer');
const { deduplicateByUrl, sendToPipeline } = require('../pipeline-client');

function containsKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function randomDelay() {
  return new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
}

function parseWorkanaHTML(html, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];

  $('.project-item').each((i, el) => {
    const titleEl = $(el).find('h3 a');
    const descEl = $(el).find('.project-description');
    const budgetEl = $(el).find('.project-budget');

    const title = titleEl.text().trim();
    const href = titleEl.attr('href') || '';
    const url = href.startsWith('http') ? href : `${baseUrl}${href}`;

    items.push({
      title,
      description: descEl.text().trim().substring(0, 500),
      company: 'Workana Client',
      url,
      budget: budgetEl.text().trim(),
    });
  });

  return items;
}

async function scrapeWorkana() {
  console.log('[Workana] Iniciando scraping con Cheerio...');
  let sent = 0, dupes = 0, filtered = 0;
  const queries = ['inteligencia artificial', 'chatbot IA', 'automatización software', 'desarrollo SaaS API', 'agente IA'];
  const baseUrl = 'https://www.workana.com';

  for (const query of queries) {
    try {
      const url = `${baseUrl}/jobs?query=${encodeURIComponent(query)}&language=es`;
      console.log(`[Workana] Buscando: "${query}"`);

      const resp = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
        timeout: 15000,
      });

      const rawItems = parseWorkanaHTML(resp.data, baseUrl);

      for (const item of rawItems) {
        if (!item.title) continue;
        const text = `${item.title} ${item.description}`;
        if (!containsKeyword(text)) { filtered++; continue; }

        const isDup = await deduplicateByUrl(item.url);
        if (isDup) { dupes++; continue; }

        const lead = toLead(item, 'workana');
        await sendToPipeline({
          ...lead,
          title: lead.title.substring(0, 200),
          description: lead.description.substring(0, 1000),
          currency: 'USD',
          probability: 90,
          notes: `URL: ${lead.url}${item.budget ? ` | Budget: ${item.budget}` : ''}`,
        });
        sent++;
      }

      await randomDelay();
    } catch (err) {
      console.error(`[Workana] Error query "${query}": ${err.message}`);
    }
  }

  console.log(`[Workana] Done. Sent: ${sent}, Dupes: ${dupes}, Filtered: ${filtered}`);
  return { sent, dupes, filtered };
}

module.exports = scrapeWorkana;
module.exports.parseWorkanaHTML = parseWorkanaHTML;
```

- [ ] **Step 4: Run tests**

```bash
npx jest platforms/workana.test.js --verbose
```

Expected: PASS

- [ ] **Step 5: Write test — handles empty results**

Add to `platforms/workana.test.js`:

```js
it('returns empty array when no projects found', () => {
  const html = '<html><body><div class="no-results">No hay proyectos</div></body></html>';
  const result = parseWorkanaHTML(html, 'https://www.workana.com');
  expect(result).toEqual([]);
});
```

- [ ] **Step 6: Run all workana tests**

```bash
npx jest platforms/workana.test.js --verbose
```

Expected: PASS (2 tests)

- [ ] **Step 7: Write test — handles missing fields**

Add to `platforms/workana.test.js`:

```js
it('handles items with missing description', () => {
  const html = `
    <html>
    <body>
      <div class="project-item">
        <h3><a href="/job/999">Solo título</a></h3>
      </div>
    </body>
    </html>
  `;

  const result = parseWorkanaHTML(html, 'https://www.workana.com');
  expect(result).toHaveLength(1);
  expect(result[0].title).toBe('Solo título');
  expect(result[0].description).toBe('');
  expect(result[0].company).toBe('Workana Client');
});
```

- [ ] **Step 8: Run all workana tests**

```bash
npx jest platforms/workana.test.js --verbose
```

Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add platforms/workana.js platforms/workana.test.js
git commit -m "feat(workana): refactor to Cheerio-based scraper with URL dedup"
```

---

### Task 5: Final Test Suite + Report

- [ ] **Step 1: Run full test suite**

```bash
npx jest --verbose
```

Expected: ALL PASS (normalizer: 3, pipeline-client: 4, malt: 3, workana: 3 = 13 tests)

- [ ] **Step 2: Final review — check exports are correct for index.js**

Verify `index.js` imports still work: Malt and Workana still export a single async function (`scrapeMalt`, `scrapeWorkana`).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete Fase 2 — normalizer, Cheerio scrapers, URL dedup"
```
