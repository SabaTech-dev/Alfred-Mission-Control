const { chromium } = require('playwright');
const { KEYWORDS, USER_AGENTS } = require('../config');
const { deduplicate, sendToPipeline, validateUrlOrigin } = require('../pipeline-client');

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

module.exports = async function scrapeFreelancer() {
  console.log('[Freelancer] Iniciando scraping...');
  const browser = await chromium.launch({ headless: true, timeout: 15000 });
  let context = await browser.newContext(CTX_OPTS());
  let page = await context.newPage();
  page.setDefaultTimeout(15000);

  let sent = 0, dupes = 0, filtered = 0;
  const queries = ['AI agent', 'chatbot', 'LLM', 'automatization', 'SaaS development'];

  async function recreateContext() {
    console.log('[Freelancer] Recreando contexto (Target page closed)...');
    await context.close().catch(() => {});
    context = await browser.newContext(CTX_OPTS());
    page = await context.newPage();
    page.setDefaultTimeout(15000);
  }

  try {
    for (const query of queries) {
      try {
        const url = `https://www.freelancer.com/search/projects?query=${encodeURIComponent(query)}&sort=latest`;
        console.log(`[Freelancer] Buscando: "${query}"`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(async (e) => {
          if (e.message.includes('closed') || e.message.includes('Target')) {
            await recreateContext();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          } else { throw e; }
        });
        await randomDelay();

        const projects = await page.$$eval(
          '.project-details, .search-result-item, [data-project-id]',
          items => items.slice(0, 10).map(item => {
            const titleEl = item.querySelector('a.project-title, .title a, h2 a, a[href*="/projects/"]');
            const descEl = item.querySelector('.description, .project-description, p');
            const budgetEl = item.querySelector('.budget, .project-budget, [class*="budget"]');
            return {
              title: titleEl?.textContent?.trim() || '',
              url: titleEl?.href || '',
              description: descEl?.textContent?.trim()?.substring(0, 500) || '',
              budget: budgetEl?.textContent?.trim() || '',
              company: 'Freelancer Client',
            };
          })
        ).catch(() => []);

        for (const p of projects) {
          if (!p.title) continue;
          const text = `${p.title} ${p.description}`;
          if (!containsKeyword(text)) { filtered++; continue; }

          const isDup = await deduplicate(p.company, p.title);
          if (isDup) { dupes++; continue; }

          await sendToPipeline({
            company: p.company,
            title: p.title.substring(0, 200),
            description: p.description.substring(0, 1000),
            source: 'Freelancer',
            probability: 90,
            notes: `URL: ${p.url}${p.budget ? ` | Budget: ${p.budget}` : ''}`,
          });
          sent++;
        }
        await randomDelay();
      } catch (err) {
        console.error(`[Freelancer] Error query "${query}": ${err.message}`);
        if (err.message.includes('closed') || err.message.includes('Target')) {
          await recreateContext();
        }
      }
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  console.log(`[Freelancer] Done. Sent: ${sent}, Dupes: ${dupes}, Filtered: ${filtered}`);
  return { sent, dupes, filtered };
};
