#!/usr/bin/env node
/**
 * Lead Scraper v2 — Web search approach (no Playwright needed)
 * Uses web search + fetch to find leads, no CSS selector dependency
 */
const https = require('https');
const http = require('http');

const KEYWORDS = [
  // IA / Agentes
  'SaaS', 'API', 'integración', 'automatizar', 'desarrollo', 'software',
  'asistente de ia', 'agente de ia', 'langchain', 'crewai', 'autogen',
  'llm', 'rag', 'chatbot inteligente', 'openai', 'automatizacion',
  'agente agentico', 'flujos de trabajo ia', 'asistente virtual',
  'voice ai', 'voicebot', 'n8n', 'make.com', 'zapier',
  'bot development', 'telegram bot', 'whatsapp bot',
  'mcp server', 'model context protocol',
  // QA / DevSecOps (diferencial SabaTech)
  'qa automation', 'testing automation', 'security audit',
  'devops', 'ci/cd pipeline',
];

const PIPELINE_ENDPOINT = 'http://localhost:3000/api/pipeline';
const PIPELINE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Agent-Id': 'main',
  'X-Agent-Key': 'sk-main-alfred-2026',
};
const SEARCH_QUERIES = [
  // Freelancer platforms
  'site:freelancer.com AI agent chatbot development',
  'site:freelancer.com SaaS LLM automation',
  'site:freelancer.com n8n automation workflow',
  'site:malt.fr IA agent chatbot développement',
  'site:upwork.com AI agent chatbot SaaS',
  'site:upwork.com n8n automation zapier',
  'site:infojobs.es inteligencia artificial desarrollo software',
  'site:infojobs.es QA automation testing',
  'site:workana.com IA chatbot automatización desarrollo',
  'site:workana.com bot telegram whatsapp desarrollo',
  'site:indeed.com AI agent developer chatbot',
  'site:indeed.com QA automation DevSecOps',
  // Generic searches
  'freelance AI agent development project 2026',
  'contratar desarrollador IA chatbot España',
  'desarrollo asistente virtual agente ia freelance',
  'security audit automated testing freelance project',
  'MCP server development freelance',
];

const EXCLUDED_DOMAINS = [
  'wikipedia.org', 'scribd.com', 'youtube.com', 'reddit.com',
  'medium.com', 'dev.to', 'github.com', 'gitlab.com',
];

function countKeywords(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return KEYWORDS.filter(kw => lower.includes(kw.toLowerCase())).length;
}

function calculateProbability(keywordCount) {
  // Base probability 60% + 10% per keyword, capped at 95%
  return Math.min(95, 60 + (keywordCount * 10));
}

async function sendToPipeline(lead) {
  return new Promise((resolve) => {
    const data = JSON.stringify(lead);
    const url = new URL(PIPELINE_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { ...PIPELINE_HEADERS, 'Content-Length': Buffer.byteLength(data) },
      timeout: 10000,
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', (e) => { console.error(`Pipeline error: ${e.message}`); resolve(null); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(data);
    req.end();
  });
}

async function getExistingLeads() {
  return new Promise((resolve) => {
    http.get(PIPELINE_ENDPOINT, { headers: { 'X-Agent-Id': 'main', 'X-Agent-Key': 'sk-main-alfred-2026' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.opportunities || []);
        } catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

function isDuplicate(existing, company, title) {
  return existing.some(o =>
    o.company?.toLowerCase() === company?.toLowerCase() &&
    o.title?.toLowerCase() === title?.toLowerCase()
  );
}

async function main() {
  const startTime = Date.now();
  console.log('[LEAD-SCRAPER-v2] 🚀 === Lead Scraper v2 (Search-based) ===');
  console.log(`[LEAD-SCRAPER-v2] 📅 Inicio: ${new Date().toISOString()}`);

  // Get existing leads for dedup
  const existing = await getExistingLeads();
  console.log(`[LEAD-SCRAPER-v2] 📋 Existing leads in pipeline: ${existing.length}`);

  // Use SearXNG for search (self-hosted)
  const SEARXNG = 'http://localhost:8888/search';
  
  let totalSent = 0, totalDupes = 0, totalFiltered = 0;
  const results = [];

  for (const query of SEARCH_QUERIES) {
    console.log(`[LEAD-SCRAPER-v2] 🔍 Searching: "${query}"`);
    
    try {
      const url = `${SEARXNG}?q=${encodeURIComponent(query)}&format=json&categories=general&language=es`;
      
      const searchResults = await new Promise((resolve, reject) => {
        http.get(url, { timeout: 15000 }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { resolve({ results: [] }); }
          });
        }).on('error', reject)
         .on('timeout', () => { resolve({ results: [] }); });
      });

      const items = searchResults.results || [];
      console.log(`[LEAD-SCRAPER-v2]   Found ${items.length} results`);

      for (const item of items.slice(0, 10)) {
        const text = `${item.title} ${item.content || ''}`;
        
        // Check excluded domains first
        const url = item.url || '';
        let hostname = 'unknown';
        try { hostname = new URL(url).hostname.replace('www.', ''); } catch {}
        if (EXCLUDED_DOMAINS.some(ex => hostname.includes(ex))) {
          totalFiltered++;
          continue;
        }
        
        // Count keywords and calculate probability
        const keywordCount = countKeywords(text);
        if (keywordCount === 0) {
          totalFiltered++;
          continue;
        }
        
        const probability = calculateProbability(keywordCount);
        if (probability < 70) {
          totalFiltered++;
          continue;
        }

        // Extract platform from URL
        let platform = 'Unknown';
        if (item.url?.includes('freelancer')) platform = 'Freelancer';
        else if (item.url?.includes('malt')) platform = 'Malt';
        else if (item.url?.includes('upwork')) platform = 'Upwork';
        else if (item.url?.includes('infojobs')) platform = 'InfoJobs';
        else if (item.url?.includes('workana')) platform = 'Workana';
        else if (item.url?.includes('indeed')) platform = 'Indeed';
        else if (item.url?.includes('linkedin')) platform = 'LinkedIn';
        else platform = new URL(item.url).hostname.replace('www.', '');

        const company = platform + ' Client';
        const title = (item.title || '').substring(0, 200);

        if (isDuplicate(existing, company, title)) {
          totalDupes++;
          continue;
        }

        const lead = {
          company,
          title,
          description: (item.content || '').substring(0, 1000),
          value: 0,
          currency: 'EUR',
          source: platform,
          stage: 'lead',
          probability,
          notes: `URL: ${url} | Keywords: ${keywordCount} | Query: ${query}`,
        };

        const result = await sendToPipeline(lead);
        if (result?.status === 201) {
          totalSent++;
          console.log(`[LEAD-SCRAPER-v2]   ✅ Sent: "${title.substring(0, 60)}..."`);
        } else {
          console.log(`[LEAD-SCRAPER-v2]   ⚠️ Pipeline returned ${result?.status}: ${title.substring(0, 40)}...`);
        }
      }
    } catch (err) {
      console.error(`[LEAD-SCRAPER-v2] ❌ Error searching "${query}": ${err.message}`);
    }

    // Random delay 2-5s
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[LEAD-SCRAPER-v2] ══════════════════════════════════════════');
  console.log('[LEAD-SCRAPER-v2] 📋 RESUMEN FINAL');
  console.log('[LEAD-SCRAPER-v2] ══════════════════════════════════════════');
  console.log(`  Total enviados: ${totalSent} | Duplicados: ${totalDupes} | Filtrados: ${totalFiltered}`);
  console.log(`  Duración total: ${duration}s`);
  console.log('[LEAD-SCRAPER-v2] ══════════════════════════════════════════');
  console.log(`[LEAD-SCRAPER-v2] 🏁 Fin: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('[LEAD-SCRAPER-v2] Fatal error:', err);
  process.exit(1);
});
