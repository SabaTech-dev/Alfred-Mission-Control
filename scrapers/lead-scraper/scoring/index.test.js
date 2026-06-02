const { scoreLead } = require('./index');
const { SCORING_CONFIG } = require('../config');

describe('scoreLead', () => {
  describe('extract metadata from description', () => {
    it('extracts timeframe=immediate from description', () => {
      const lead = { title: 'Dev', description: 'Necesito alguien que empiece inmediato. Start ASAP.' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('immediate');
    });

    it('extracts timeframe=soon for "próximas semanas"', () => {
      const lead = { title: 'Dev', description: 'Proyecto para las próximas semanas' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('soon');
    });

    it('extracts timeframe=flexible when described as flexible', () => {
      const lead = { title: 'Dev', description: 'Horario flexible, cuando puedas' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('flexible');
    });

    it('defaults timeframe=unknown when no match', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo web' };
      const result = scoreLead(lead);
      expect(result.enriched.timeframe).toBe('unknown');
    });

    it('extracts duration=long from "6 months"', () => {
      const lead = { title: 'Dev', description: 'Proyecto de 6 meses de duración' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('long');
    });

    it('extracts duration=long from "long-term"', () => {
      const lead = { title: 'Dev', description: 'Long-term project' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('long');
    });

    it('extracts duration=short from "1 mes"', () => {
      const lead = { title: 'Dev', description: 'Proyecto corto de 1 mes' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('short');
    });

    it('defaults duration=unknown when no match', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo' };
      const result = scoreLead(lead);
      expect(result.enriched.duration).toBe('unknown');
    });

    it('extracts remote_type=full from "100% remoto"', () => {
      const lead = { title: 'Dev', description: 'Trabajo 100% remoto', remote: true };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('full');
    });

    it('extracts remote_type=hybrid from "híbrido"', () => {
      const lead = { title: 'Dev', description: 'Formato híbrido, 2 días presencial' };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('hybrid');
    });

    it('extracts remote_type=onsite from "presencial"', () => {
      const lead = { title: 'Dev', description: 'Trabajo presencial en Madrid' };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('onsite');
    });

    it('defaults remote_type based on lead.remote boolean', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo', remote: true };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('full');
    });

    it('defaults remote_type=unknown when no signal', () => {
      const lead = { title: 'Dev', description: 'Proyecto de desarrollo' };
      const result = scoreLead(lead);
      expect(result.enriched.remote_type).toBe('unknown');
    });

    it('extracts budget from budget_min/budget_max fields', () => {
      const lead = { title: 'Dev', description: 'Proyecto desarrollo', budget_min: 100, budget_max: 200, currency: 'EUR' };
      const result = scoreLead(lead);
      expect(result.enriched.budget).toEqual({ min: 100, max: 200, currency: 'EUR', source: 'field' });
    });

    it('extracts budget from description regex when fields missing', () => {
      const lead = { title: 'Dev', description: 'Presupuesto: 3000€' };
      const result = scoreLead(lead);
      expect(result.enriched.budget).toEqual({ min: 3000, max: 3000, currency: 'EUR', source: 'description' });
    });

    it('extracts skills via regex from description', () => {
      const lead = { title: 'Dev', description: 'Buscamos Python con Selenium y Playwright' };
      const result = scoreLead(lead);
      expect(result.enriched.skills).toContain('python');
      expect(result.enriched.skills).toContain('selenium');
      expect(result.enriched.skills).toContain('playwright');
    });

    it('merges lead.skills array with extracted skills', () => {
      const lead = { title: 'Dev', description: 'Buscamos Python', skills: ['React', 'Node.js'] };
      const result = scoreLead(lead);
      expect(result.enriched.skills).toContain('react');
      expect(result.enriched.skills).toContain('node.js');
      expect(result.enriched.skills).toContain('python');
    });
  });

  describe('computeScore', () => {
    it('returns a score for empty lead', () => {
      const result = scoreLead({});
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.breakdown).toBeDefined();
    });

    it('scores higher for leads with keyword matches', () => {
      const lowLead = { title: 'Job', description: 'Some random job posting' };
      const highLead = { title: 'SaaS API dev', description: 'Desarrollo de API para SaaS con integración y automatización' };
      const low = scoreLead(lowLead);
      const high = scoreLead(highLead);
      expect(high.score).toBeGreaterThan(low.score);
    });

    it('scores higher for leads with budget defined', () => {
      const noBudget = { title: 'Dev', description: 'Proyecto' };
      const withBudget = { title: 'Dev', description: 'Proyecto', budget_min: 500, budget_max: 1000 };
      expect(scoreLead(withBudget).score).toBeGreaterThan(scoreLead(noBudget).score);
    });

    it('scores higher for remote leads', () => {
      const onsite = { title: 'Dev', description: 'Trabajo presencial en Madrid' };
      const remote = { title: 'Dev', description: '100% remoto' };
      expect(scoreLead(remote).score).toBeGreaterThan(scoreLead(onsite).score);
    });

    it('scores higher for leads with skills listed', () => {
      const noSkills = { title: 'Dev', description: 'Un proyecto de desarrollo' };
      const withSkills = { title: 'Dev', description: 'Buscamos Python con experiencia en React y AWS' };
      expect(scoreLead(withSkills).score).toBeGreaterThan(scoreLead(noSkills).score);
    });

    it('scores higher for recently published leads', () => {
      const old = { title: 'Dev', description: 'Proyecto', published_at: '2025-01-01T00:00:00Z' };
      const recent = { title: 'Dev', description: 'Proyecto', published_at: new Date().toISOString() };
      expect(scoreLead(recent).score).toBeGreaterThan(scoreLead(old).score);
    });

    it('uses custom weights when provided', () => {
      const lead = { title: 'SaaS Dev', description: 'API automation project' };
      const defaultResult = scoreLead(lead);
      const customWeights = { relevance: 1, budget: 0, remote: 0, skills: 0, recency: 0, completeness: 0 };
      const customResult = scoreLead(lead, { weights: customWeights });
      expect(customResult.score).not.toBe(defaultResult.score);
    });

    it('handles null/undefined lead gracefully', () => {
      expect(scoreLead(null).error).toBe('Invalid lead');
      expect(scoreLead(undefined).error).toBe('Invalid lead');
    });

    it('returns lead data in the result', () => {
      const lead = { title: 'Test', company: 'Corp' };
      const result = scoreLead(lead);
      expect(result.lead).toEqual(lead);
    });
  });
});
