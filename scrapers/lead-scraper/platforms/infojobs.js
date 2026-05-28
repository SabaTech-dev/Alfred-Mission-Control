const { chromium } = require('playwright');
const { KEYWORDS, USER_AGENTS } = require('../config');
const { deduplicate, sendToPipeline } = require('../pipeline-client');

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

module.exports = async function scrapeInfoJobs() {
  console.log('[InfoJobs] Iniciando scraping...');
  const browser = await chromium.launch({ headless: true, timeout: 15000 });
  let context = await browser.newContext(CTX_OPTS());
  let page = await context.newPage();
  page.setDefaultTimeout(15000);

  let sent = 0, dupes = 0, filtered = 0;
  const queries = ['inteligencia artificial', 'desarrollo software IA', 'chatbot', 'automatización', 'SaaS API'];

  async function recreateContext() {
    console.log('[InfoJobs] Recreando contexto (Target page closed)...');
    await context.close().catch(() => {});
    context = await browser.newContext(CTX_OPTS());
    page = await context.newPage();
    page.setDefaultTimeout(15000);
  }

  try {
    for (const query of queries) {
      try {
        const url = `https://www.infojobs.net/ofertas-trabajo?palabra=${encodeURIComponent(query)}`;
        console.log(`[InfoJobs] Buscando: "${query}"`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(async (e) => {
          if (e.message.includes('closed') || e.message.includes('Target')) {
            await recreateContext();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          } else { throw e; }
        });
        await randomDelay();

        // Accept cookies
        try {
          const btn = await page.$('button#didomi-notice-agree-button, button[class*="accept"]');
          if (btn) { await btn.click(); await randomDelay(); }
        } catch {}

        const jobs = await page.$$eval(
          "[class*='jobCard'], [class*='offer-item'], [class*='vacancy'], .ij-Offer",
          items => items.slice(0, 15).map(item => {
            const titleEl = item.querySelector('h2 a, h3 a, [class*="title"] a, a[href*="/oferta-"]');
            const descEl = item.querySelector('p, [class*="description"], [class*="snippet"]');
            const companyEl = item.querySelector('[class*="company"], [class*="empresa"], a[href*="/empresa/"]');
            const salaryEl = item.querySelector('[class*="salary"], [class*="salario"]');
            return {
              title: titleEl?.textContent?.trim() || '',
              url: titleEl?.href || '',
              description: descEl?.textContent?.trim()?.substring(0, 500) || '',
              company: companyEl?.textContent?.trim() || 'InfoJobs Empresa',
              salary: salaryEl?.textContent?.trim() || '',
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
            source: 'InfoJobs',
            probability: 90,
            notes: `URL: ${job.url}${job.salary ? ` | Salario: ${job.salary}` : ''}`,
          });
          sent++;
        }
        await randomDelay();
      } catch (err) {
        console.error(`[InfoJobs] Error query "${query}": ${err.message}`);
        if (err.message.includes('closed') || err.message.includes('Target')) {
          await recreateContext();
        }
      }
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  console.log(`[InfoJobs] Done. Sent: ${sent}, Dupes: ${dupes}, Filtered: ${filtered}`);
  return { sent, dupes, filtered };
};
