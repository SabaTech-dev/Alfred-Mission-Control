const { ICP_RULES } = require('../config');

/**
 * Filtra un lead contra las reglas ICP (Ideal Customer Profile).
 *
 * @param {object} scoreResult - Resultado de scoreLead: { score, enriched, lead }
 * @param {object} [rules] - Reglas ICP (default: ICP_RULES de config)
 * @returns {{ passed: boolean, reasons: string[] }}
 */
function filterByIcp(scoreResult, rules = ICP_RULES) {
  if (!rules) rules = ICP_RULES;
  const reasons = [];
  const lead = (scoreResult && scoreResult.lead) || {};
  const enriched = (scoreResult && scoreResult.enriched) || {};
  const score = (scoreResult && scoreResult.score) || 0;

  // Score threshold
  if (score < rules.min_score) {
    reasons.push(`Score too low: ${score} < ${rules.min_score}`);
  }

  // Blocked keywords in title + description
  const titleDesc = `${(lead.title || '')} ${(lead.description || '')}`.toLowerCase();
  for (const kw of (rules.blocked_keywords || [])) {
    if (titleDesc.includes(kw.toLowerCase())) {
      reasons.push(`Blocked keyword found: "${kw}"`);
    }
  }

  // Required skills
  if (rules.required_skills && rules.required_skills.length > 0) {
    const hasRequired = rules.required_skills.some(s =>
      enriched.skills && enriched.skills.includes(s.toLowerCase())
    );
    if (!hasRequired) {
      reasons.push(`Required skills not found: ${rules.required_skills.join(', ')}`);
    }
  }

  // Min budget
  if (rules.min_budget > 0 && enriched.budget) {
    if (enriched.budget.max < rules.min_budget) {
      reasons.push(`Budget too low: max ${enriched.budget.max} < ${rules.min_budget}`);
    }
  }

  // Remote preference (warning, not block)
  const warnings = [];
  if (rules.prefer_remote && enriched.remote_type) {
    if (enriched.remote_type !== 'full' && enriched.remote_type !== 'unknown') {
      warnings.push(`Non-remote lead (${enriched.remote_type})`);
    }
  }

  return {
    passed: reasons.length === 0,
    reasons: [...reasons, ...warnings],
  };
}

module.exports = { filterByIcp };
