/**
 * Lead Scraper Dashboard — Static HTML Dashboard
 * 
 * Served by the MCP HTTP server. Shows lead pipeline stats in real-time.
 */

export function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lead Scraper Dashboard — Sabatech</title>
<style>
  :root {
    --bg: #0f1117; --surface: #1a1d27; --border: #2a2d3a;
    --text: #e4e6eb; --muted: #8b8fa3; --accent: #6c5ce7;
    --green: #00b894; --red: #e74c3c; --yellow: #fdcb6e; --blue: #74b9ff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
  .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  h1 { font-size: 1.4rem; color: var(--text); }
  .subtitle { color: var(--muted); font-size: 0.85rem; margin-top: 2px; }
  .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
  .badge.healthy { background: rgba(0,184,148,0.15); color: var(--green); }
  .badge.degraded { background: rgba(253,203,110,0.15); color: var(--yellow); }
  .badge.down { background: rgba(231,76,60,0.15); color: var(--red); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .card h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 12px; }
  .metric { font-size: 2rem; font-weight: 700; }
  .metric-sub { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
  .bar-chart { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; }
  .bar-label { width: 120px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { flex: 1; height: 20px; background: var(--bg); border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
  .bar-value { width: 40px; text-align: right; font-weight: 600; }
  .prob-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .prob-box { text-align: center; padding: 12px; border-radius: 8px; background: var(--bg); }
  .prob-box .count { font-size: 1.8rem; font-weight: 700; }
  .prob-box .label { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
  .timeline { display: flex; gap: 4px; align-items: flex-end; height: 120px; padding: 8px 0; }
  .timeline-bar { flex: 1; min-width: 8px; border-radius: 3px 3px 0 0; transition: height 0.3s ease; }
  .timeline-date { font-size: 0.6rem; color: var(--muted); text-align: center; margin-top: 4px; writing-mode: vertical-rl; }
  .health-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .health-row:last-child { border-bottom: none; }
  .health-name { font-weight: 500; }
  .search-box { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 0.9rem; margin-bottom: 16px; }
  .search-box:focus { outline: none; border-color: var(--accent); }
  .lead-item { padding: 14px; border-bottom: 1px solid var(--border); }
  .lead-item:last-child { border-bottom: none; }
  .lead-title { font-weight: 600; margin-bottom: 4px; }
  .lead-meta { font-size: 0.8rem; color: var(--muted); display: flex; gap: 12px; }
  .lead-desc { font-size: 0.85rem; color: var(--muted); margin-top: 6px; }
  .refresh-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid var(--accent); background: transparent; color: var(--accent); cursor: pointer; font-size: 0.8rem; }
  .refresh-btn:hover { background: rgba(108,92,231,0.1); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } .prob-grid { grid-template-columns: repeat(2, 1fr); } }
  .loading { text-align: center; padding: 40px; color: var(--muted); }
  .error { color: var(--red); padding: 12px; border-radius: 8px; background: rgba(231,76,60,0.1); margin: 8px 0; }
</style>
</head>
<body>
<div class="container">
  <header>
    <div>
      <h1>Lead Scraper Dashboard</h1>
      <div class="subtitle">Sabatech · Real-time lead pipeline monitoring</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      <span id="last-update" class="subtitle"></span>
      <button class="refresh-btn" onclick="loadAll()">Refresh</button>
      <span id="health-badge" class="badge">Loading...</span>
    </div>
  </header>

  <div id="error-banner"></div>

  <!-- KPI Cards -->
  <div class="grid">
    <div class="card">
      <h3>Total Leads</h3>
      <div class="metric" id="total-leads">—</div>
      <div class="metric-sub">All sources combined</div>
    </div>
    <div class="card">
      <h3>Pipeline Value</h3>
      <div class="metric" id="pipeline-value">—</div>
      <div class="metric-sub">EUR (weighted probability)</div>
    </div>
    <div class="card">
      <h3>High Probability</h3>
      <div class="metric" id="high-prob" style="color:var(--green)">—</div>
      <div class="metric-sub">Probability ≥ 80%</div>
    </div>
    <div class="card">
      <h3>Active Sources</h3>
      <div class="metric" id="active-sources">—</div>
      <div class="metric-sub">Scraper platforms</div>
    </div>
  </div>

  <!-- Sources + Stage -->
  <div class="two-col" style="margin-bottom:24px;">
    <div class="card">
      <h3>Leads by Source</h3>
      <div id="by-source" class="bar-chart">Loading…</div>
    </div>
    <div class="card">
      <h3>Probability Distribution</h3>
      <div class="prob-grid">
        <div class="prob-box">
          <div class="count" id="prob-high" style="color:var(--green)">—</div>
          <div class="label">High (≥80%)</div>
        </div>
        <div class="prob-box">
          <div class="count" id="prob-med" style="color:var(--yellow)">—</div>
          <div class="label">Medium (50-79%)</div>
        </div>
        <div class="prob-box">
          <div class="count" id="prob-low" style="color:var(--blue)">—</div>
          <div class="label">Low (&lt;50%)</div>
        </div>
      </div>
      <div style="margin-top:16px;">
        <h3>Leads by Stage</h3>
        <div id="by-stage" class="bar-chart" style="margin-top:8px;">Loading…</div>
      </div>
    </div>
  </div>

  <!-- Timeline -->
  <div class="card" style="margin-bottom:24px;">
    <h3>Leads Over Time (Daily)</h3>
    <div id="timeline" class="timeline">Loading…</div>
  </div>

  <!-- System Health -->
  <div class="card" style="margin-bottom:24px;">
    <h3>System Health</h3>
    <div id="health-checks">Loading…</div>
  </div>

  <!-- Lead Search -->
  <div class="card">
    <h3>Search Leads</h3>
    <input type="text" class="search-box" id="search-input"
           placeholder="Search by keyword, company, source… (e.g. AI, chatbot, n8n)"
           onkeydown="if(event.key==='Enter')searchLeads()">
    <div id="search-results"></div>
  </div>
</div>

<script>
const colors = ['#6c5ce7','#00b894','#0984e3','#e17055','#fdcb6e','#e84393','#00cec9','#636e72','#a29bfe'];

async function fetchJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch(e) {
    return { error: e.message };
  }
}

function setError(msg) {
  const el = document.getElementById('error-banner');
  if (msg) {
    // Only show non-script errors (script errors are expected if ever-jobs is down)
    el.innerHTML = '<div class="error">⚠️ ' + msg + '</div>';
    setTimeout(() => el.innerHTML = '', 5000);
  } else {
    el.innerHTML = '';
  }
}

async function loadAll() {
  await Promise.all([loadStats(), loadHealth()]);
}

async function loadStats() {
  const data = await fetchJSON('/tool/get_lead_stats?refresh=true');
  if (data.error) { return; }

  document.getElementById('total-leads').textContent = data.total_leads;
  document.getElementById('pipeline-value').textContent = '€' + data.weighted_pipeline_value.toLocaleString();
  document.getElementById('active-sources').textContent = Object.keys(data.by_source).length;
  document.getElementById('high-prob').textContent = data.by_probability.high || 0;
  document.getElementById('prob-high').textContent = data.by_probability.high || 0;
  document.getElementById('prob-med').textContent = data.by_probability.medium || 0;
  document.getElementById('prob-low').textContent = data.by_probability.low || 0;
  document.getElementById('last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString('es-ES');

  // By source bar chart
  const sourceEntries = Object.entries(data.by_source || {}).sort((a,b) => b[1] - a[1]);
  const maxSource = sourceEntries[0]?.[1] || 1;
  const bySourceEl = document.getElementById('by-source');
  bySourceEl.innerHTML = sourceEntries.map(([src, count], i) => \`
    <div class="bar-row">
      <span class="bar-label" title="\${src}">\${src}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:\${(count/maxSource*100)}%;background:\${colors[i % colors.length]}"></div>
      </div>
      <span class="bar-value">\${count}</span>
    </div>
  \`).join('');

  // By stage
  const stageEntries = Object.entries(data.by_stage || {}).sort((a,b) => b[1] - a[1]);
  const maxStage = stageEntries[0]?.[1] || 1;
  const byStageEl = document.getElementById('by-stage');
  byStageEl.innerHTML = stageEntries.map(([stg, count], i) => \`
    <div class="bar-row">
      <span class="bar-label" title="\${stg}">\${stg}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:\${(count/maxStage*100)}%;background:\${colors[i % colors.length]}"></div>
      </div>
      <span class="bar-value">\${count}</span>
    </div>
  \`).join('');

  // Timeline
  const tlEntries = Object.entries(data.timeline || {}).sort((a,b) => a[0].localeCompare(b[0]));
  const maxTl = Math.max(1, ...tlEntries.map(([,v]) => v));
  const tlEl = document.getElementById('timeline');
  tlEl.style.flexDirection = 'row';
  tlEl.innerHTML = tlEntries.map(([day, count]) => \`
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:120px;">
      <div style="width:100%;max-width:40px;height:\${Math.max(4, (count/maxTl*100))}%;background:\${colors[(day.charCodeAt(8)) % colors.length]};border-radius:3px 3px 0 0;min-height:4px;" title="\${day}: \${count} leads"></div>
      <div style="font-size:0.55rem;color:var(--muted);writing-mode:vertical-rl;margin-top:4px;transform:rotate(180deg);">\${day.substring(5)}</div>
    </div>
  \`).join('');
}

async function loadHealth() {
  const data = await fetchJSON('/tool/get_scraper_health');
  const badge = document.getElementById('health-badge');

  if (data.error) {
    badge.className = 'badge down';
    badge.textContent = 'Offline';
    document.getElementById('health-checks').innerHTML = '<div class="error">MCP server unreachable: ' + data.error + '</div>';
    return;
  }

  const overall = data.overall_status || data.checks?.mcp_server?.status;
  badge.className = 'badge ' + (overall === 'healthy' ? 'healthy' : 'degraded');
  badge.textContent = overall === 'healthy' ? '● Healthy' : '● Degraded';

  // Show component checks
  const checks = data.checks || {};
  const entries = [
    ['Pipeline API', checkVal(checks.pipeline_api)],
    ['Jobs API (Ever Jobs)', checkVal(checks.jobs_api)],
    ['Scraper Scripts', checkVal(checks.scraper_scripts)],
    ['MCP Server', checkVal(checks.mcp_server)],
  ];

  document.getElementById('health-checks').innerHTML = entries.map(([name, info]) => \`
    <div class="health-row">
      <span class="health-name">\${name}</span>
      <span class="badge \${info.status === 'healthy' ? 'healthy' : info.status === 'warning' ? 'degraded' : 'down'}">\${info.status}</span>
    </div>
  \`).join('');
}

function checkVal(obj) {
  if (!obj) return { status: 'unknown' };
  return { status: obj.status || 'unknown' };
}

async function searchLeads() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const el = document.getElementById('search-results');
  el.innerHTML = '<div class="loading">Searching…</div>';

  const data = await fetchJSON('/tool/search_leads?q=' + encodeURIComponent(q) + '&limit=20');
  if (data.error) {
    el.innerHTML = '<div class="error">' + data.error + '</div>';
    return;
  }
  if (!data.results || data.results.length === 0) {
    el.innerHTML = '<div class="loading">No leads found for "' + q + '"</div>';
    return;
  }
  el.innerHTML = '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:8px;">' + data.total_matches + ' matches (of ' + data.total_available + ' total)</div>' +
    data.results.map(l => \`
      <div class="lead-item">
        <div class="lead-title">\${l.title || 'Untitled'}</div>
        <div class="lead-meta">
          <span>\${l.company || 'Unknown'}</span>
          <span>·</span>
          <span>\${l.source || '?'}</span>
          <span>·</span>
          <span>Prob: \${l.probability || 0}%</span>
          <span>·</span>
          <span>\${(l.created_at || '').substring(0, 10)}</span>
        </div>
        \${l.description ? '<div class="lead-desc">' + l.description.substring(0, 200) + '</div>' : ''}
      </div>
    \`).join('');
}

// Auto-refresh every 60 seconds
loadAll();
setInterval(loadAll, 60000);
</script>
</body>
</html>`;
}
