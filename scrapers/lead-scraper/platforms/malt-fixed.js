const { chromium } = require('playwright');
const { KEYWORDS, USER_AGENTS } = require('../config');
const { deduplicate, sendToPipeline } = require('../pipeline-client');

function containsKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function randomDelay() {
  return new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));
}

module.exports = async function scrapeMalt() {
  console.log('[Malt] Iniciando scraping...');
  const browser = await chromium.launch({ headless: true, timeout: 15000 });
  const context = await browser.newContext({ userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)], viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  let sent = 0, dupes = 0, filtered = 0;
  const queries = ['intelligence artificielle', 'AI agent', 'LLM', 'chatbot', 'développement SaaS'];

  try {
    for (const query of queries) {
      let page = context.pages()[0] || await context.newPage();
      
      try {
        const url = `https://www.malt.fr/profiles?query=${encodeURIComponent(query)}&sort=recent`;
        console.log(`[Malt] Buscando: "${query}"`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(async (e) => {
          console.log(`[Malt] Error cargando URL: ${e.message}`);
          if (e.message.includes('closed')) {
            await context.close().catch(() => {});
            const newCtx = await browser.newContext({ userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)], viewport: { width: 1920, height: 1080 } });
            page = await newCtx.newPage();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          } else {
            throw e;
          }
        });
        await randomDelay();

        const items = await page.$$eval(
          '.search-result, .mission-card, [class*="mission"], [class*="project"]',
          els => els.slice(0, 10).map(el => {
            const titleEl = el.querySelector('h2, h3, .title, [class*="title"]');
            const descEl = el.querySelector('p, .description, [class*="description"]');
            const companyEl = el.querySelector('.company, [class*="company"], [class*="client"]');
            return {
              title: titleEl?.textContent?.trim() || '',
              description: descEl?.textContent?.trim()?.substring(0, 500) || '',
              company: companyEl?.textContent?.trim() || 'Malt Client',
              url: '',
            };
          })
        ).catch(() => []);

        for (const item of items) {
          if (!item.title) continue;
          const text = `${item.title} ${item.description}`;
          if (!containsKeyword(text)) { filtered++; continue; }

          const isDup = await deduplicate(item.company, item.title);
          if (isDup) { dupes++; continue; }

          await sendToPipeline({
            company: item.company,
            title: item.title.substring(0, 200),
            description: item.description.substring(0, 1000),
            source: 'Malt',
            probability: 90,
            notes: `URL: ${item.url || 'N/A'}`,
          });
          sent++;
        }
        await randomDelay();
      } catch (err) {
        console.error(`[Malt] Error query "${query}": ${err.message}`);
      }
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  console.log(`[Malt] Done. Sent: ${sent}, Dupes: ${dupes}, Filtered: ${filtered}`);
  return { sent, dupes, filtered };
};