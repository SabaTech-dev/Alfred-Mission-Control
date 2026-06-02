const { toLead } = require('./index');

describe('toLead', () => {
  it('maps basic fields from raw data to Lead schema', () => {
    const raw = {
      title: 'Senior Dev React',
      company: 'TechCorp',
      description: 'Desarrollo de SaaS con React',
      url: 'https://example.com/job/123',
      source_type: 'freelance',
      skills: ['React', 'Node.js'],
      budget_min: 100,
      budget_max: 200,
      currency: 'USD',
      remote: true,
      location: 'Remote',
      published_at: '2026-05-28T10:00:00Z',
    };

    const result = toLead(raw, 'malt');

    expect(result).toEqual({
      title: 'Senior Dev React',
      company: 'TechCorp',
      description: 'Desarrollo de SaaS con React',
      url: 'https://example.com/job/123',
      source: 'malt',
      source_type: 'freelance',
      skills: ['React', 'Node.js'],
      budget_min: 100,
      budget_max: 200,
      currency: 'USD',
      remote: true,
      location: 'Remote',
      published_at: '2026-05-28T10:00:00Z',
    });
  });

  it('fills missing fields with defaults', () => {
    const result = toLead({}, 'workana');

    expect(result).toEqual({
      title: '',
      company: '',
      description: '',
      url: '',
      source: 'workana',
      source_type: null,
      skills: [],
      budget_min: null,
      budget_max: null,
      currency: 'EUR',
      remote: true,
      location: null,
      published_at: null,
    });
  });

  it('preserves null for undefined numeric fields', () => {
    const result = toLead({ budget_min: 0, budget_max: null }, 'malt');

    expect(result.budget_min).toBe(0);
    expect(result.budget_max).toBeNull();
  });
});
