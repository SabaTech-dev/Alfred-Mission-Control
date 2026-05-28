const KEYWORDS = [
  'SaaS', 'API', 'integración', 'automatizar', 'desarrollo', 'software',
  'asistente de ia', 'agente de ia', 'langchain', 'crewai', 'autogen',
  'llm', 'rag', 'chatbot inteligente', 'openai', 'automatizacion'
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
];

const PIPELINE_ENDPOINT = 'http://localhost:3000/api/pipeline';

// Pipeline auth — from env vars with defaults for local dev
const AGENT_ID = process.env.PIPELINE_AGENT_ID || 'main';
const AGENT_KEY = process.env.PIPELINE_AGENT_KEY || 'sk-mai…2026';

// --- Scoring Engine Config ---
const SCORING_CONFIG = {
  weights: {
    relevance: 0.35,
    budget: 0.20,
    remote: 0.15,
    skills: 0.15,
    recency: 0.10,
    completeness: 0.05,
  },
  min_score_to_alert: 70,
  min_score_to_pass: 30,
};

const ICP_RULES = {
  blocked_keywords: [
    'junior', 'trainee', 'prácticas', 'internship',
    'volunteer', 'voluntario', 'no remunerado',
  ],
  required_skills: [],
  min_budget: 0,
  prefer_remote: true,
  min_score: 30,
};

const TELEGRAM_CONFIG = {
  bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
  chat_id: process.env.TELEGRAM_CHAT_ID || '',
  enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
};

module.exports = { KEYWORDS, USER_AGENTS, PIPELINE_ENDPOINT, AGENT_ID, AGENT_KEY, SCORING_CONFIG, ICP_RULES, TELEGRAM_CONFIG };
