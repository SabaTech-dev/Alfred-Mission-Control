const axios = require('axios');
const { TELEGRAM_CONFIG } = require('../config');

const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Escapa HTML para Telegram (escape básico de 5 caracteres).
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formatea un mensaje HTML para Telegram con los datos del lead.
 *
 * @param {object} lead - Lead con title, company, url, source, description
 * @param {number} score - Score 0-100
 * @param {object} [enriched] - Metadata enriquecida con timeframe, remote_type, skills, budget
 * @returns {string} Mensaje formateado en HTML
 */
function formatTelegramMessage(lead, score, enriched) {
  const e = (v) => escapeHtml(v);
  const title = e(lead.title || 'Untitled');
  const company = e(lead.company || 'Unknown');
  const url = lead.url || '';
  const source = e(lead.source || 'unknown');
  const desc = e((lead.description || '').substring(0, 200));

  const enr = enriched || lead._enriched || {};
  const timeframe = enr.timeframe || 'unknown';
  const remoteType = enr.remote_type || 'unknown';
  const skills = (enr.skills || []).join(', ') || 'none';

  let budgetLine = '';
  if (enr.budget) {
    budgetLine = `💰 <b>Budget:</b> ${enr.budget.min}-${enr.budget.max} ${enr.budget.currency}\n`;
  }

  let msg = `🔔 <b>NEW HIGH-SCORING LEAD</b>\n\n`;
  msg += `📊 <b>Score:</b> ${score}/100\n`;
  msg += `🏢 <b>Company:</b> ${company}\n`;
  msg += `📋 <b>Title:</b> ${title}\n`;
  msg += `📁 <b>Source:</b> ${source}\n`;
  msg += `⏱ <b>Timeframe:</b> ${timeframe}\n`;
  msg += `🏠 <b>Remote:</b> ${remoteType}\n`;
  msg += `${budgetLine}`;
  msg += `🔧 <b>Skills:</b> ${skills}\n`;
  if (desc) msg += `\n📝 <b>Description:</b>\n${desc}\n`;
  if (url) msg += `\n🔗 <a href="${e(url)}">View Lead</a>`;

  return msg;
}

/**
 * Envía una alerta a Telegram para leads de alto scoring.
 *
 * @param {object} lead - Lead data (puede incluir _enriched para metadata extra)
 * @param {number} score - Score del lead 0-100
 * @param {object} [config] - Config de Telegram (default: TELEGRAM_CONFIG)
 * @returns {Promise<boolean>} true si se envió OK
 */
async function sendTelegramAlert(lead, score, config = TELEGRAM_CONFIG) {
  if (!config.enabled || !config.bot_token || !config.chat_id) {
    return false;
  }

  try {
    const enriched = lead._enriched || {};
    const text = formatTelegramMessage(lead, score, enriched);

    const response = await axios.post(
      `${TELEGRAM_API}${config.bot_token}/sendMessage`,
      {
        chat_id: config.chat_id,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
      { timeout: 10000 }
    );

    return response.data && response.data.ok === true;
  } catch (err) {
    console.error(`[TelegramAlert] Error sending alert: ${err.message}`);
    return false;
  }
}

module.exports = { sendTelegramAlert, formatTelegramMessage };
