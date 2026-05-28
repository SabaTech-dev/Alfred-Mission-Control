const { chromium } = require('playwright');
const { KEYWORDS, USER_AGENTS } = require('../config');
const { deduplicate, sendToPipeline } = require('../pipeline-client');

// ⚠️ TODO: Implementar login con credenciales (LINKEDIN_EMAIL, LINKEDIN_PASSWORD)
// LinkedIn requiere login para acceso completo.

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

module.exports = async function scrapeLinkedIn() {
  console.log('[LinkedIn] Iniciando scraping...');
  console.log('[LinkedIn] ⚠️ Requiere login para acceso completo. Intentando listings públicos...');
  const browser = await chromium.launch({ headless: true, timeout: 15000 });
  let context = await browser.newContext(CTX_OPTS());
  let page = await context.newPage();
  page.setDefaultTimeout(15000);

  async function recreateContext() {
    console.log('[LinkedIn] Recreando contexto (Target page closed)...');
    await context.close().catch(() => {});
    context = await browser.newContext(CTX_OPTS());
    page = await context.newPage();
    page.setDefaultTimeout(15000);
  }

  // Attempt login if credentials exist
  const email = process.env.LINKEDIN_EMAIL;
  const password = process.env.LINKEDIN_PASSWORD;

  if (email && password) {
    try {
      console.log('[LinkedIn] Intentando login...');
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await randomDelay();
      await page.fill('#username', email);
      await page.fill('#password', password);
      await page.click('[type="submit"]');
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await randomDelay();
      console.log('[LinkedIn] ✅ Login exitoso.');
    } catch (err) {
      console.log(`[LinkedIn] Login falló: ${err.message}. Usando modo público.`);
    }
  } else {
    console.log('[LinkedIn] Sin credenciales LINKEDIN_EMAIL/LINKEDIN_PASSWORD. Modo público.');
  }

  let sent = 0, dupes = 0, filtered = 0;
  const queries = ['AI agent developer', 'LLM engineer', 'chatbot inteligente', 'SaaS development', 'automatización IA'];

  try {
    for (const query of queries) {
      try {
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&sortBy=DD`;
        console.log(`[LinkedIn] Buscando: "${query}"`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(async (e) => {
          if (e.message.includes('closed') || e.message.includes('Target')) {
            await recreateContext();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          } else { throw e; }
        });
        await randomDelay();

        // Accept cookies
        try {
          const btn = await page.$("button[action-type='ACCEPT'], #onetrust-accept-btn-handler");
          if (btn) { await btn.click(); await randomDelay(); }
        } catch {}

        const jobs = await page.$$eval(
          '.job-search-card, .base-card, [class*="job-card"], li[class*="result-card"]',
          items => items.slice(0, 10).map(item => {
            const titleEl = item.querySelector('h3 a, .base-card__full-link, a[class*="job-title"]');
            const companyEl = item.querySelector('h4, [class*="company"], .base-search-card__subtitle');
            const locationEl = item.querySelector('[class*="location"], .job-search-card__location');
            return {
              title: titleEl?.textContent?.trim() || '',
              url: titleEl?.href || '',
              company: companyEl?.textContent?.trim() || 'LinkedIn Empresa',
              location: locationEl?.textContent?.trim() || '',
              description: '',
            };
          })
        ).catch(() => []);

        for (const job of jobs) {
          if (!job.title) continue;

          // Try to get description from detail page
          if (job.url && !job.description) {
            try {
              await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
              await randomDelay();
              job.description = await page.$eval(
                '.show-more-less-html__markup, .description__text, [class*="description"]',
                el => el.textContent?.trim()?.substring(0, 500) || ''
              ).catch(() => '');
            } catch {}
          }

          const text = `${job.title} ${job.description}`;
          if (!containsKeyword(text)) { filtered++; continue; }

          const isDup = await deduplicate(job.company, job.title);
          if (isDup) { dupes++; continue; }

          await sendToPipeline({
            company: job.company,
            title: job.title.substring(0, 200),
            description: job.description.substring(0, 1000),
            source: 'LinkedIn',
            probability: 90,
            notes: `URL: ${job.url}${job.location ? ` | Location: ${job.location}` : ''}`,
          });
          sent++;
        }
        await randomDelay();
      } catch (err) {
        console.error(`[LinkedIn] Error query "${query}": ${err.message}`);
        if (err.message.includes('closed') || err.message.includes('Target')) {
          await recreateContext();
        }
      }
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  console.log(`[LinkedIn] Done. Sent: ${sent}, Dupes: ${dupes}, Filtered: ${filtered}`);
  return { sent, dupes, filtered };
};
