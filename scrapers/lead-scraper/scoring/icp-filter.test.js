const { filterByIcp } = require('./icp-filter');

describe('filterByIcp', () => {
  it('passes a lead meeting all ICP rules', () => {
    const result = filterByIcp({
      score: 80,
      enriched: { skills: ['python', 'react'], remote_type: 'full', budget: { min: 100, max: 200 } },
    });
    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('blocks a lead below min score', () => {
    const result = filterByIcp({ score: 10, enriched: {} });
    expect(result.passed).toBe(false);
    expect(result.reasons).toContain('Score too low: 10 < 30');
  });

  it('blocks a lead with blocked keywords in title', () => {
    const result = filterByIcp({
      score: 80, enriched: {},
      lead: { title: 'Junior Developer', description: '' },
    });
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('junior'))).toBe(true);
  });

  it('blocks a lead with blocked keywords in description', () => {
    const result = filterByIcp({
      score: 80, enriched: {},
      lead: { title: 'Dev', description: 'Prácticas en empresa' },
    });
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('prácticas'))).toBe(true);
  });

  it('applies remote preference warning', () => {
    const rules = { ...require('../config').ICP_RULES, prefer_remote: true };
    const result = filterByIcp({
      score: 80, enriched: { remote_type: 'onsite' },
      lead: { title: 'Dev', description: '' },
    }, rules);
    expect(result.passed).toBe(true);
    expect(result.reasons).toContain('Non-remote lead (onsite)');
  });

  it('requires at least one skill when required_skills is set', () => {
    const rules = { ...require('../config').ICP_RULES, required_skills: ['python', 'react'] };
    const result = filterByIcp({
      score: 80, enriched: { skills: ['java'] },
      lead: { title: 'Dev', description: '' },
    }, rules);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => r.includes('Required skills'))).toBe(true);
  });

  it('passes when lead has a required skill', () => {
    const rules = { ...require('../config').ICP_RULES, required_skills: ['python', 'react'] };
    const result = filterByIcp({
      score: 80, enriched: { skills: ['python', 'java'] },
      lead: { title: 'Dev', description: '' },
    }, rules);
    expect(result.passed).toBe(true);
  });

  it('applies min budget filter', () => {
    const rules = { ...require('../config').ICP_RULES, min_budget: 500 };
    const result = filterByIcp({
      score: 80, enriched: { budget: { min: 100, max: 200 } },
      lead: { title: 'Dev', description: '' },
    }, rules);
    expect(result.passed).toBe(false);
    expect(result.reasons.some(r => /budget/i.test(r))).toBe(true);
  });

  it('passes when no budget but min_budget is 0', () => {
    const result = filterByIcp({
      score: 80, enriched: { budget: null },
      lead: { title: 'Dev', description: '' },
    });
    expect(result.passed).toBe(true);
  });

  it('uses custom rules when provided', () => {
    const customRules = {
      blocked_keywords: ['test'], required_skills: [],
      min_budget: 0, prefer_remote: false, min_score: 0,
    };
    const result = filterByIcp({ score: 5, enriched: {} }, customRules);
    expect(result.passed).toBe(true);
  });

  it('handles missing enriched data gracefully', () => {
    const result = filterByIcp({ score: 80 });
    expect(result.passed).toBe(true);
  });

  it('handles null rules gracefully', () => {
    const result = filterByIcp({ score: 80, enriched: {} }, null);
    expect(result.passed).toBe(true);
  });
});
