const axios = require('axios');
jest.mock('axios');

const { sendTelegramAlert } = require('./telegram-alerts');

describe('sendTelegramAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when telegram is not configured', async () => {
    const config = { enabled: false, bot_token: '', chat_id: '' };
    const result = await sendTelegramAlert({ title: 'Test' }, 85, config);
    expect(result).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('sends a formatted message to Telegram when configured', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });
    const config = { enabled: true, bot_token: 'test-token', chat_id: 'test-chat' };

    const lead = {
      title: 'SaaS Developer',
      company: 'TechCorp',
      url: 'https://example.com/job/1',
      source: 'malt',
      description: 'Cool project',
    };
    const result = await sendTelegramAlert(lead, 85, config);

    expect(result).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);

    const call = axios.post.mock.calls[0];
    expect(call[0]).toContain('test-token');
    const payload = call[1];
    expect(payload.chat_id).toBe('test-chat');
    expect(payload.text).toContain('SaaS Developer');
    expect(payload.text).toContain('TechCorp');
    expect(payload.text).toContain('85');
    expect(payload.parse_mode).toBe('HTML');
  });

  it('returns false on API error', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));
    const config = { enabled: true, bot_token: 'test-token', chat_id: 'test-chat' };
    const result = await sendTelegramAlert({ title: 'Test' }, 85, config);
    expect(result).toBe(false);
  });

  it('includes enriched metadata in message when available via _enriched', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });
    const config = { enabled: true, bot_token: 'test-token', chat_id: 'test-chat' };

    const lead = {
      title: 'Python AI Dev',
      _enriched: {
        timeframe: 'immediate',
        remote_type: 'full',
        skills: ['python', 'ai'],
        budget: { min: 100, max: 200, currency: 'EUR' },
      },
    };
    const result = await sendTelegramAlert(lead, 92, config);

    expect(result).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.text).toContain('immediate');
    expect(payload.text).toContain('100-200');
    expect(payload.text).toContain('92');
  });

  it('formats message with HTML escaping', async () => {
    axios.post.mockResolvedValue({ data: { ok: true } });
    const config = { enabled: true, bot_token: 'test-token', chat_id: 'test-chat' };

    const lead = { title: 'Dev <script>alert("xss")</script>', company: 'Corp & Co' };
    const result = await sendTelegramAlert(lead, 50, config);

    expect(result).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.text).not.toContain('<script>');
    expect(payload.text).toContain('&lt;script&gt;');
    expect(payload.text).toContain('&amp;');
  });
});
