const { SCORING_CONFIG, KEYWORDS } = require('../config');

const KNOWN_SKILLS = [
  'python', 'javascript', 'typescript', 'java', 'c#', 'c++', 'ruby', 'go', 'rust',
  'react', 'vue', 'angular', 'node.js', 'nodejs', 'express', 'django', 'flask',
  'selenium', 'playwright', 'cypress', 'puppeteer',
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
  'aws', 'gcp', 'azure', 'cloud',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'langchain', 'crewai', 'autogen', 'llm', 'rag', 'openai', 'gpt',
  'n8n', 'zapier', 'make.com', 'make',
  'agile', 'scrum', 'devops', 'ci/cd', 'jenkins', 'github actions',
  'rest', 'graphql', 'grpc', 'api',
  'html', 'css', 'sass', 'tailwind',
  'next.js', 'nextjs', 'nuxt', 'svelte',
  'fastapi', 'spring boot', 'nestjs',
];

/**
 * Escapa caracteres especiales de regex en un string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrae metadata enriquecida de un lead usando regex sobre la description.
 * No modifica el normalizer ni los scrapers — esto es auto-contenido.
 */
function extractMetadata(lead) {
  const desc = (lead.description || '').toLowerCase();
  const title = (lead.title || '').toLowerCase();
  const combined = `${title} ${desc}`;

  // --- Timeframe ---
  let timeframe = 'unknown';
  if (/\binmediato\b|\bimmediate\b|\bstart asap\b|\burgen[te]\b|\basap\b/i.test(desc)) {
    timeframe = 'immediate';
  } else if (/próximas semanas|próximo mes|en breve|corto plazo|next month/i.test(desc)) {
    timeframe = 'soon';
  } else if (/flexible|cuando puedas|sin fecha|open deadline|no rush/i.test(desc)) {
    timeframe = 'flexible';
  }

  // --- Duration ---
  let duration = 'unknown';
  if (/\b(3\s*(meses|months|m)\b|\b6\s*(meses|months|m)\b|long.term|largo plazo|proyecto largo|varios meses)/i.test(desc)) {
    duration = 'long';
  } else if (/\b(1\s*(mes|month|m)\b|short|curto|corto)/i.test(desc)) {
    duration = 'short';
  }

  // --- Remote type ---
  let remote_type = 'unknown';
  if (/\b(100%\s*remoto|full\s*remote|completamente\s*remoto|totalmente\s*remoto|remote\s*(only|first|position))\b/i.test(desc)) {
    remote_type = 'full';
  } else if (/híbrido|hybrid|presencial\s*\+\s*remoto|mixto/i.test(desc)) {
    remote_type = 'hybrid';
  } else if (/presencial|on.?site|oficina/i.test(desc)) {
    remote_type = 'onsite';
  } else if (lead.remote === true) {
    remote_type = 'full';
  }

  // --- Budget ---
  let budget = null;
  if (lead.budget_min != null || lead.budget_max != null) {
    budget = {
      min: lead.budget_min != null ? lead.budget_min : 0,
      max: lead.budget_max != null ? lead.budget_max : 0,
      currency: lead.currency || 'EUR',
      source: 'field',
    };
  } else {
    const budgetRegex = /(?:presupuesto|budget|precio|coste|costo|pago|€|eur)\s*:?\s*(\d[\d.]*(?:,\d{3})*(?:\.\d+)?)\s*(?:€|eur)?/i;
    const match = desc.match(budgetRegex);
    if (match) {
      const amount = parseFloat(match[1].replace(/\./g, '').replace(/,/g, ''));
      if (!isNaN(amount)) {
        budget = { min: amount, max: amount, currency: 'EUR', source: 'description' };
      }
    }
  }

  // --- Skills ---
  const escapedSkills = KNOWN_SKILLS.map(s => escapeRegex(s));
  const skillRegex = new RegExp(`\\b(${escapedSkills.join('|')})\\b`, 'gi');
  const extractedMatches = combined.match(skillRegex) || [];
  const extractedSkills = [...new Set(extractedMatches.map(s => s.toLowerCase()))];
  const existingSkills = (lead.skills || []).map(s => s.trim().toLowerCase());
  const mergedSkills = [...new Set([...existingSkills, ...extractedSkills])];

  return { timeframe, duration, remote_type, budget, skills: mergedSkills };
}

/**
 * Computa el score 0-100 basado en los pesos configurables.
 */
function computeScore(lead, enriched, weights) {
  const w = weights || SCORING_CONFIG.weights;
  const breakdown = {};
  const desc = (lead.description || '').toLowerCase();
  const title = (lead.title || '').toLowerCase();
  const combined = `${title} ${desc}`;

  // Relevance: keyword match density
  const matchedKeywords = KEYWORDS.filter(kw => combined.includes(kw.toLowerCase()));
  const relevanceRaw = Math.min(1, matchedKeywords.length / Math.max(1, KEYWORDS.length * 0.3));
  breakdown.relevance = Math.round(relevanceRaw * 100);

  // Budget: has budget defined with positive value
  const hasBudget = enriched.budget !== null && (enriched.budget.min > 0 || enriched.budget.max > 0);
  const budgetScore = hasBudget ? 1 : 0;
  breakdown.budget = budgetScore * 100;

  // Remote
  const remoteScore = enriched.remote_type === 'full' ? 1 : enriched.remote_type === 'hybrid' ? 0.5 : 0;
  breakdown.remote = Math.round(remoteScore * 100);

  // Skills
  const hasSkills = enriched.skills.length > 0;
  const skillsScore = hasSkills ? Math.min(1, enriched.skills.length / 5) : 0;
  breakdown.skills = Math.round(skillsScore * 100);

  // Recency
  let recencyScore = 0.5;
  if (lead.published_at) {
    const daysOld = (Date.now() - new Date(lead.published_at).getTime()) / 86400000;
    recencyScore = Math.max(0, 1 - daysOld / 30);
  }
  breakdown.recency = Math.round(recencyScore * 100);

  // Completeness
  const descLen = (lead.description || '').length;
  const completenessScore = Math.min(1, descLen / 500);
  breakdown.completeness = Math.round(completenessScore * 100);

  const score =
    relevanceRaw * w.relevance * 100 +
    budgetScore * w.budget * 100 +
    remoteScore * w.remote * 100 +
    skillsScore * w.skills * 100 +
    recencyScore * w.recency * 100 +
    completenessScore * w.completeness * 100;

  return { score: Math.round(score), breakdown };
}

/**
 * Punto de entrada: enriquece un lead con metadata y computa su score.
 *
 * @param {object} lead - Lead normalizado (con title, description, etc.)
 * @param {object} [options] - Opciones opcionales
 * @param {object} [options.weights] - Pesos personalizados (default: SCORING_CONFIG.weights)
 * @returns {{ lead, enriched, score, breakdown, error? }}
 */
function scoreLead(lead, options = {}) {
  if (!lead || typeof lead !== 'object') {
    return { lead: {}, enriched: {}, score: 0, breakdown: {}, error: 'Invalid lead' };
  }

  const weights = options.weights || SCORING_CONFIG.weights;
  const enriched = extractMetadata(lead);
  const { score, breakdown } = computeScore(lead, enriched, weights);

  return { lead, enriched, score, breakdown };
}

module.exports = { scoreLead, extractMetadata, computeScore };
