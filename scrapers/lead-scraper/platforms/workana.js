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
    const url = (() => {
      if (!href) return null;
      try {
        const resolved = new URL(href, baseUrl);
        if (!resolved.protocol.startsWith('http')) return null;
        if (resolved.origin !== new URL(baseUrl).origin) {
          console.warn(`[Workana] URL origin mismatch: ${resolved.origin} !== ${new URL(baseUrl).origin}, skipping`);
          return null;
        }
        return resolved.href;
      } catch {
        return null;
      }
    })();

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
        if (!item.title || !item.url) continue;
        const text = `${item.title} ${item.description}`;
        if (!containsKeyword(text)) { filtered++; continue; }

        const isDup = await deduplicateByUrl(item.url);
        if (isDup) { dupes++; continue; }

        const lead = toLead(item, 'workana');
        await sendToPipeline({
          ...lead,
          title: lead.title.substring(0, 200),
          description: lead.description.substring(0, 1000),
          source: 'Workana',
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
