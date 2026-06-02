const axios = require('axios');
const { PIPELINE_ENDPOINT, AGENT_ID, AGENT_KEY, SCORING_CONFIG } = require('./config');
const { scoreLead } = require('./scoring/index');
const { filterByIcp } = require('./scoring/icp-filter');
const { sendTelegramAlert } = require('./scoring/telegram-alerts');

const AUTH_HEADERS = {
  'X-Agent-Id': AGENT_ID,
  'X-Agent-Key': AGENT_KEY,
};

let _existingCache = null;

/**
 * Valida que una URL pertenezca al origin esperado.
 * @param {string} href - URL href del DOM
 * @param {string} baseUrl - URL base del sitio (ej: "https://www.freelancer.com")
 * @returns {string|null} - URL resuelta o null si es inválida/externa
 */
function validateUrlOrigin(href, baseUrl) {
  if (!href || typeof href !== 'string') return null;
  try {
    const resolved = new URL(href, baseUrl);
    if (!resolved.protocol.startsWith('http')) return null;
    if (resolved.origin !== new URL(baseUrl).origin) {
      console.warn(`[validateUrlOrigin] Origin mismatch: ${resolved.origin} !== ${new URL(baseUrl).origin}`);
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Sanitiza texto para prevenir XSS.
 * Elimina tags HTML y escapa caracteres especiales.
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * F-003: Deduplicación paginada con Set O(1) lookup.
 * Carga oportunidades en lotes con paginación y construye un Set
 * de "company|title" para deduplicación eficiente.
 * NO carga todos los registros de golpe.
 */
async function fetchExistingKeys() {
  const seen = new Set();
  let cursor = null;
  let pageCount = 0;
  const MAX_PAGES = 100;

  do {
    try {
      const params = { limit: 100 };
      if (cursor) params.cursor = cursor;
      const resp = await axios.get(PIPELINE_ENDPOINT, {
        headers: AUTH_HEADERS,
        params,
      });
      const opportunities = resp.data.opportunities || resp.data.items || resp.data.data || [];
      for (const opp of opportunities) {
        if (opp.company && opp.title) {
          const key = `${opp.company.trim().toLowerCase()}|${opp.title.trim().toLowerCase()}`;
          seen.add(key);
        }
      }
      cursor = resp.data.next_cursor || resp.data.nextCursor || null;
      pageCount++;
      console.log(`[PipelineClient] Página ${pageCount}: ${opportunities.length} ops (total keys: ${seen.size})`);
    } catch (err) {
      console.error(`[PipelineClient] fetchExistingKeys page ${pageCount + 1} error: ${err.message}`);
      break;
    }
  } while (cursor && pageCount < MAX_PAGES);

  console.log(`[PipelineClient] Deduplicación: ${seen.size} claves únicas de ${pageCount} páginas.`);
  return seen;
}

async function deduplicate(company, title) {
  try {
    if (!_existingCache) {
      _existingCache = await fetchExistingKeys();
    }
    const key = `${company.trim().toLowerCase()}|${title.trim().toLowerCase()}`;
    return _existingCache.has(key);
  } catch (err) {
    console.error('[PipelineClient] deduplicate error:', err.message);
    return false;
  }
}

async function deduplicateByUrl(url) {
  try {
    // F-005: Fetch separado para URLs — el cache es Set de strings (company|title)
    const seen = new Set();
    let cursor = null;
    let pageCount = 0;
    const MAX_PAGES = 100;

    do {
      try {
        const params = { limit: 100 };
        if (cursor) params.cursor = cursor;
        const resp = await axios.get(PIPELINE_ENDPOINT, {
          headers: AUTH_HEADERS,
          params,
        });
        const opportunities = resp.data.opportunities || resp.data.items || resp.data.data || [];
        for (const opp of opportunities) {
          if (opp.url) {
            const normalized = opp.url.trim().toLowerCase().replace(/\/+$/, '');
            seen.add(normalized);
          }
        }
        cursor = resp.data.next_cursor || resp.data.nextCursor || null;
        pageCount++;
        console.log(`[PipelineClient] deduplicateByUrl Página ${pageCount}: ${opportunities.length} ops (URLs: ${seen.size})`);
      } catch (err) {
        console.error(`[PipelineClient] deduplicateByUrl page ${pageCount + 1} error: ${err.message}`);
        break;
      }
    } while (cursor && pageCount < MAX_PAGES);

    const normalizedUrl = url.trim().toLowerCase().replace(/\/+$/, '');
    return seen.has(normalizedUrl);
  } catch (err) {
    console.error('[PipelineClient] deduplicateByUrl error:', err.message);
    return false;
  }
}

async function sendToPipeline(lead) {
  const payload = {
    company: sanitizeText(lead.company),
    title: sanitizeText(lead.title),
    description: sanitizeText(lead.description || ''),
    value: lead.value || 0,
    currency: lead.currency || 'EUR',
    source: lead.source || 'lead-scraper',
    stage: lead.stage || 'lead',
    probability: lead.probability || 90,
    notes: sanitizeText(lead.notes || ''),
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.post(PIPELINE_ENDPOINT, payload, {
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADERS },
      });
      console.log(`[PipelineClient] ✅ Enviado: "${payload.title}" (${payload.company})`);
      return response.data;
    } catch (error) {
      console.error(`[PipelineClient] POST intent ${attempt + 1}/3 falló: ${error.message}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  console.error(`[PipelineClient] ❌ Falló tras 3 intentos: "${payload.title}"`);
  return null;
}

/**
 * Procesa un lead completo: scoring → ICP filter → pipeline send → alerta.
 * Este es el punto de integración después de dedup.
 *
 * @param {object} lead - Lead normalizado
 * @param {string} source - Fuente del lead (malt, upwork, etc.)
 * @param {object} [options] - Opciones
 * @param {boolean} [options.alertOnHighScore] - Enviar alerta Telegram si score es alto (default: true)
 * @returns {Promise<{sent, passedIcp, score, enriched, reasons?, alertSent?, error?}>}
 */
async function processLead(lead, source, options = {}) {
  try {
    if (!source) {
      return { sent: false, passedIcp: false, score: 0, enriched: {}, error: 'No source provided' };
    }

    // 1. Score the lead
    const scoreResult = scoreLead({ ...lead, source });

    // 2. Check ICP filter
    const icpResult = filterByIcp(scoreResult);

    if (!icpResult.passed) {
      console.log(`[PipelineClient] ⛔ ICP blocked: "${lead.title}" — ${icpResult.reasons.join('; ')}`);
      return {
        sent: false,
        passedIcp: false,
        score: scoreResult.score,
        enriched: scoreResult.enriched,
        reasons: icpResult.reasons,
      };
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

function resetCache() { _existingCache = null; }

module.exports = { deduplicate, deduplicateByUrl, sendToPipeline, resetCache, processLead, validateUrlOrigin };
