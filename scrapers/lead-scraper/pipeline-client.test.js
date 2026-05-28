const axios = require('axios');
jest.mock('axios');

const { deduplicateByUrl, resetCache, processLead } = require('./pipeline-client');

describe('processLead', () => {
  beforeEach(() => {
    resetCache();
    jest.clearAllMocks();
  });

  it('scores, filters, and sends a passing lead', async () => {
    axios.get.mockResolvedValue({ data: { opportunities: [] } });
    axios.post.mockResolvedValue({ data: { id: '123' } });

    const lead = {
      title: 'SaaS API Developer',
      company: 'TechCorp',
      description: 'Desarrollo de API para SaaS con Python y React. 100% remoto. Presupuesto 5000€. Inmediato.',
    };
    const result = await processLead(lead, 'malt');

    expect(result.sent).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.passedIcp).toBe(true);
    expect(result.enriched).toBeDefined();
    expect(result.enriched.timeframe).toBe('immediate');
  });

  it('does not send a low-scoring lead', async () => {
    axios.get.mockResolvedValue({ data: { opportunities: [] } });
    axios.post.mockResolvedValue({ data: { id: '123' } });

    const lead = {
      title: 'Junior position',
      company: 'Corp',
      description: 'Prácticas no remuneradas',
    };
    const result = await processLead(lead, 'malt');

    expect(result.sent).toBe(false);
    expect(result.passedIcp).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('returns error when no source is provided', async () => {
    const result = await processLead({ title: 'Test' });
    expect(result.error).toBeDefined();
    expect(result.sent).toBe(false);
  });

  it('optionally sends telegram alert for high-scoring leads', async () => {
    axios.get.mockResolvedValue({ data: { opportunities: [] } });
    axios.post.mockResolvedValue({ data: { id: '123' } });

    const lead = {
      title: 'SaaS API Developer',
      company: 'TechCorp',
      description: 'Desarrollo de API para SaaS con Python y React. 100% remoto. Presupuesto 5000€. Inmediato.',
    };
    const result = await processLead(lead, 'malt', { alertOnHighScore: true });

    expect(result.sent).toBe(true);
  });
});

describe('deduplicateByUrl', () => {
  beforeEach(() => {
    resetCache();
    jest.clearAllMocks();
  });

  it('returns true when URL matches an existing opportunity', async () => {
    axios.get.mockResolvedValue({
      data: {
        opportunities: [
          { url: 'https://example.com/job/123' },
          { url: 'https://malt.es/project/456' },
        ],
      },
    });

    const result = await deduplicateByUrl('https://example.com/job/123');
    expect(result).toBe(true);
  });

  it('returns false when URL does not match', async () => {
    axios.get.mockResolvedValue({
      data: {
        opportunities: [
          { url: 'https://example.com/job/123' },
        ],
      },
    });

    const result = await deduplicateByUrl('https://example.com/job/999');
    expect(result).toBe(false);
  });

  it('normalizes URL (lowercase, trim, trailing slash removed)', async () => {
    axios.get.mockResolvedValue({
      data: {
        opportunities: [
          { url: 'https://Example.com/Job/123/' },
        ],
      },
    });

    const result = await deduplicateByUrl('  https://example.com/job/123  ');
    expect(result).toBe(true);
  });

  it('returns false when existing opportunities have no url', async () => {
    axios.get.mockResolvedValue({
      data: {
        opportunities: [
          { company: 'Foo', title: 'Bar' },
        ],
      },
    });

    const result = await deduplicateByUrl('https://example.com/job/123');
    expect(result).toBe(false);
  });
});
