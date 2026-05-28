const scrapeFreelancer = require('./platforms/freelancer');
const scrapeMalt = require('./platforms/malt');
const scrapeUpwork = require('./platforms/upwork');
const scrapeInfoJobs = require('./platforms/infojobs');
const scrapeWorkana = require('./platforms/workana');
const scrapeIndeed = require('./platforms/indeed');
const scrapeLinkedIn = require('./platforms/linkedin');
const { resetCache } = require('./pipeline-client');

async function main() {
  const startTime = Date.now();
  console.log('[LEAD-SCRAPER] 🚀 === Lead Scraper para Mission Control Pipeline ===');
  console.log(`[LEAD-SCRAPER] 📅 Inicio: ${new Date().toISOString()}`);

  const platforms = [
    { name: 'Freelancer', fn: scrapeFreelancer },
    { name: 'Malt', fn: scrapeMalt },
    { name: 'Upwork', fn: scrapeUpwork },
    { name: 'InfoJobs', fn: scrapeInfoJobs },
    { name: 'Workana', fn: scrapeWorkana },
    { name: 'Indeed', fn: scrapeIndeed },
    { name: 'LinkedIn', fn: scrapeLinkedIn },
  ];

  // Reset dedup cache at start of each run
  resetCache();

  const results = [];
  let totalSent = 0, totalDupes = 0, totalFiltered = 0;

  for (const platform of platforms) {
    console.log(`[LEAD-SCRAPER] ▶ Scraping ${platform.name}...`);
    try {
      const result = await platform.fn();
      results.push({ name: platform.name, ...result });
      totalSent += result.sent || 0;
      totalDupes += result.dupes || 0;
      totalFiltered += result.filtered || 0;
    } catch (error) {
      console.error(`[LEAD-SCRAPER] ❌ Error scraping ${platform.name}: ${error.message}`);
      results.push({ name: platform.name, error: error.message, sent: 0, dupes: 0, filtered: 0 });
    }
    // Random delay between platforms (2-5s)
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[LEAD-SCRAPER] ══════════════════════════════════════════════════');
  console.log('[LEAD-SCRAPER] 📋 RESUMEN FINAL');
  console.log('[LEAD-SCRAPER] ══════════════════════════════════════════════════');
  for (const r of results) {
    const status = r.error ? '❌' : '✅';
    console.log(`  ${status} ${r.name}: ${r.sent || 0} sent, ${r.dupes || 0} dupes, ${r.filtered || 0} filtered${r.error ? ` — ${r.error}` : ''}`);
  }
  console.log('[LEAD-SCRAPER] ──────────────────────────────────────────────────');
  console.log(`  Total enviados: ${totalSent} | Duplicados: ${totalDupes} | Filtrados: ${totalFiltered}`);
  console.log(`  Duración total: ${duration}s`);
  console.log('[LEAD-SCRAPER] ══════════════════════════════════════════════════');
  console.log(`[LEAD-SCRAPER] 🏁 Fin: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('[LEAD-SCRAPER] 💥 Error fatal:', err.message);
  process.exit(1);
});
