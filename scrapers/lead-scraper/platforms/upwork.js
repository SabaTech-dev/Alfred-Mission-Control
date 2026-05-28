const { chromium } = require('playwright');
const { KEYWORDS, USER_AGENTS } = require('../config');
const { deduplicate, sendToPipeline } = require('../pipeline-client');

// ⚠️ TODO: Implementar login con credenciales (UPWORK_EMAIL, UPWORK_PASSWORD)
// Upwork requiere login para ver jobs completos.
// Este scraper intenta listings públicos. Si falla, necesitará login.

function containsKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function randomDelay() {
  return new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
}

function pickUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const CTX_OPTS = () => ({ userAgent: pickUA(), viewport: { width: 1920, height: 1080 } });

module.exports = async function scrapeUpwork() {
  console.log('[Upwork] Iniciando scraping...');
  console.log('[Upwork] ⚠️ Requiere login para acceso completo. Intentando listings públicos...');
  const browser = await chromium.launch({ headless: true, timeout: 15000 });
  let context = await browser.newContext(CTX_OPTS());
  let page = await context.newPage();
  page.setDefaultTimeout(15000);

  let sent = 0, dupes = 0, filtered = 0;
  const queries = ['AI agent development', 'LLM chatbot', 'SaaS automation', 'langchain development', 'AI assistant'];

  async function recreateContext() {
    console.log('[Upwork] Recreando contexto (Target page closed)...');
    await context.close().catch(() => {});
    context = await browser.newContext(CTX_OPTS());
    page = await context.newPage();
    page.setDefaultTimeout(15000);
  }

  try {
    for (const query of queries) {
      try {
        const url = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(query)}&sort=recency`;
        console.log(`[Upwork] Buscando: "${query}"`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(async (e) => {
          if (e.message.includes('closed') || e.message.includes('Target')) {
            await recreateContext();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          } else { throw e; }
        });
        await randomDelay();

        // Check if login required
        const loginWall = await page.$('[class*="login"], [class*="sign-in"]').catch(() => null);
        if (loginWall) {
          console.log(`[Upwork] ⚠️ Login requerido para "${query}". Saltando.`);
          continue;
        }

        const jobs = await page.$$eval(
          "[class*='job-tile'], [class*='job-card'], article",
          items => items.slice(0, 10).map(item => {
            const titleEl = item.querySelector('h2 a, h3 a, [class*="title"] a');
            const descEl = item.querySelector('p, [class*="description"], [class*="snippet"]');
            const budgetEl = item.querySelector('[class*="budget"], [class*="amount"]');
            return {
              title: titleEl?.textContent?.trim() || '',
              url: titleEl?.href || '',
              description: descEl?.textContent?.trim()?.substring(0, 500) || '',
              budget: budgetEl?.textContent?.trim() || '',
              company: 'Upwork Client',
            };
          })
        ).catch(() => []);

        for (const job of jobs) {
          if (!job.title) continue;
          const text = `${job.title} ${job.description}`;
          if (!containsKeyword(text)) { filtered++; continue; }

          const isDup = await deduplicate(job.company, job.title);
          if (isDup) { dupes++; continue; }

          await sendToPipeline({
            company: job.company,
            title: job.title.substring(0, 200),
            description: job.description.substring(0, 1000),
            source: 'Upwork',
            currency: 'USD',
            probability: 90,
            notes: `URL: ${job.url}${job.budget ? ` | Budget: ${job.budget}` : ''}`,
          });
          sent++;
        }
        await randomDelay();
      } catch (err) {
        console.error(`[Upwork] Error query "${query}": ${err.message}`);
        if (err.message.includes('closed') || err.message.includes('Target')) {
          await recreateContext();
        }
      }
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  console.log(`[Upwork] Done. Sent: ${sent}, Dupes: ${dupes}, Filtered: ${filtered}`);
  return { sent, dupes, filtered };
};
