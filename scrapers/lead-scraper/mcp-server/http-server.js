/**
 * MCP HTTP Server Wrapper for Lead Scraper
 * 
 * Runs on port 8182. Provides HTTP API that wraps MCP tools.
 * Also hosts the lead scraper dashboard.
 * 
 * Endpoints:
 *   GET /health          — MCP server health
 *   POST /mcp            — MCP JSON-RPC endpoint
 *   GET /tool/:name      — Direct tool invocation (GET params)
 */

import express from "express";
import axios from "axios";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { getDashboardHTML } from "./dashboard.html.js";

const PORT = process.env.MCP_PORT || 8182;
const PIPELINE_URL = process.env.PIPELINE_URL || "http://localhost:3000/api/pipeline";
const AGENT_ID = process.env.AGENT_ID || "devops";
const AGENT_KEY = process.env.AGENT_KEY || "sk-devops-alfred-2026";
const JOBS_API_URL = process.env.JOBS_API_URL || "http://localhost:3001";

const AUTH_HEADERS = {
  "X-Agent-Id": AGENT_ID,
  "X-Agent-Key": AGENT_KEY,
};

const app = express();
app.use(express.json());

// Cache
let _leadsCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;
const _failureCounts = {};
const FAILURE_ALERT_THRESHOLD = 3;

async function fetchLeads(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _leadsCache && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _leadsCache;
  }
  try {
    const resp = await axios.get(PIPELINE_URL, {
      headers: AUTH_HEADERS,
      params: { limit: 500 },
      timeout: 10000,
    });
    _leadsCache = resp.data?.opportunities || resp.data?.items || resp.data?.data || [];
    _cacheTimestamp = now;
    return _leadsCache;
  } catch (err) {
    console.error(`[HTTP] Failed to fetch leads: ${err.message}`);
    return _leadsCache || [];
  }
}

// --- Health check ---
app.get("/health", async (req, res) => {
  const checks = {};

  // Pipeline
  try {
    const start = Date.now();
    await axios.get(PIPELINE_URL, { headers: AUTH_HEADERS, params: { limit: 1 }, timeout: 5000 });
    checks.pipeline_api = { status: "up", response_ms: Date.now() - start };
  } catch (e) {
    checks.pipeline_api = { status: "down", error: e.message };
  }

  // Jobs API
  try {
    await axios.get(`${JOBS_API_URL}/health`, { timeout: 5000 });
    checks.jobs_api = { status: "up" };
  } catch (e) {
    checks.jobs_api = { status: "down", error: e.message };
  }

  // MCP
  checks.mcp = {
    status: "up",
    uptime_s: Math.round(process.uptime()),
    cached_leads: _leadsCache?.length ?? 0,
  };

  const allUp = Object.values(checks).every((c) => c.status === "up");
  res.status(allUp ? 200 : 503).json({
    status: allUp ? "healthy" : "degraded",
    port: PORT,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// --- Tool: search_leads ---
app.get("/tool/search_leads", async (req, res) => {
  try {
    const { q, source, min_prob, limit } = req.query;
    const leads = await fetchLeads(q === "__refresh__");

    const src = (source || "").toLowerCase();
    const minProb = parseInt(min_prob) || 0;
    const lim = Math.min(parseInt(limit) || 20, 100);
    const query = (q || "").toLowerCase();

    const filtered = leads.filter((lead) => {
      if (src && !(lead.source || "").toLowerCase().includes(src)) return false;
      if ((lead.probability || 0) < minProb) return false;
      if (!query || query === "__refresh__") return true;
      const text = [lead.title, lead.description, lead.company, lead.notes, lead.source]
        .filter(Boolean).join(" ").toLowerCase();
      return text.includes(query);
    }).slice(0, lim);

    res.json({
      total_matches: filtered.length,
      total_available: leads.length,
      results: filtered.map((l) => ({
        id: l.id,
        title: l.title,
        company: l.company,
        source: l.source,
        stage: l.stage,
        probability: l.probability,
        value: l.value,
        currency: l.currency,
        description: (l.description || "").substring(0, 200),
        notes: (l.notes || "").substring(0, 150),
        created_at: l.created_at,
      })),
    });
  } catch (err) {
    recordFailure("search_leads");
    res.status(500).json({ error: err.message });
  }
});

// --- Tool: get_lead_stats ---
app.get("/tool/get_lead_stats", async (req, res) => {
  try {
    const leads = await fetchLeads(req.query.refresh === "true");

    const bySource = {};
    const byStage = {};
    const byProbability = { high: 0, medium: 0, low: 0 };
    let totalValue = 0;
    let totalWeightedValue = 0;
    const timeline = {};

    for (const lead of leads) {
      const src = lead.source || "unknown";
      bySource[src] = (bySource[src] || 0) + 1;
      const stg = lead.stage || "unknown";
      byStage[stg] = (byStage[stg] || 0) + 1;
      const prob = lead.probability || 0;
      if (prob >= 80) byProbability.high++;
      else if (prob >= 50) byProbability.medium++;
      else byProbability.low++;
      totalValue += lead.value || 0;
      totalWeightedValue += (lead.value || 0) * (prob / 100);
      if (lead.created_at) {
        const day = lead.created_at.substring(0, 10);
        timeline[day] = (timeline[day] || 0) + 1;
      }
    }

    res.json({
      total_leads: leads.length,
      by_source: Object.fromEntries(
        Object.entries(bySource).sort(([, a], [, b]) => b - a)
      ),
      by_stage: byStage,
      by_probability: byProbability,
      total_pipeline_value: totalValue,
      weighted_pipeline_value: Math.round(totalWeightedValue),
      timeline: Object.fromEntries(
        Object.entries(timeline).sort(([a], [b]) => a.localeCompare(b))
      ),
      last_updated: new Date(_cacheTimestamp).toISOString(),
    });
  } catch (err) {
    recordFailure("get_lead_stats");
    res.status(500).json({ error: err.message });
  }
});

// --- Tool: run_scraper ---
app.get("/tool/run_scraper", async (req, res) => {
  const { source, keywords } = req.query;
  const scraperDir = "/home/ubuntu/.openclaw/workspace/scripts/lead-scraper/platforms";

  try {
    if (!source || source === "all") {
      const scripts = fs.readdirSync(scraperDir)
        .filter((f) => f.endsWith(".js") && !f.includes(".test."));
      res.json({
        available_scrapers: scripts.map((f) => f.replace(".js", "")),
        total: scripts.length,
      });
      return;
    }

    const scriptPath = path.join(scraperDir, `${source}.js`);
    if (!fs.existsSync(scriptPath)) {
      res.status(404).json({
        error: `Scraper not found: ${source}`,
        available: fs.readdirSync(scraperDir)
          .filter((f) => f.endsWith(".js") && !f.includes(".test."))
          .map((f) => f.replace(".js", "")),
      });
      return;
    }

    res.json({
      status: "ready",
      source,
      script: scriptPath,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : "default",
      note: "Use exec to run: node scripts/lead-scraper/platforms/<source>.js",
    });
  } catch (err) {
    recordFailure("run_scraper");
    res.status(500).json({ error: err.message });
  }
});

// --- Tool: get_scraper_health ---
app.get("/tool/get_scraper_health", async (req, res) => {
  const checks = {};
  let allHealthy = true;

  // Pipeline
  try {
    const start = Date.now();
    await axios.get(PIPELINE_URL, { headers: AUTH_HEADERS, params: { limit: 1 }, timeout: 5000 });
    checks.pipeline_api = { status: "healthy", response_ms: Date.now() - start };
  } catch (e) {
    checks.pipeline_api = { status: "unhealthy", error: e.message };
    allHealthy = false;
  }

  // Jobs API
  try {
    const start = Date.now();
    await axios.get(`${JOBS_API_URL}/health`, { timeout: 5000 });
    checks.jobs_api = { status: "healthy", response_ms: Date.now() - start };
  } catch (e) {
    checks.jobs_api = { status: "unhealthy", error: e.message };
    allHealthy = false;
  }

  // Scraper scripts
  try {
    const scripts = fs.readdirSync("/home/ubuntu/.openclaw/workspace/scripts/lead-scraper/platforms")
      .filter((f) => f.endsWith(".js") && !f.includes(".test."));
    checks.scraper_scripts = {
      status: scripts.length > 0 ? "healthy" : "warning",
      count: scripts.length,
      sources: scripts.map((f) => f.replace(".js", "")),
    };
  } catch (e) {
    checks.scraper_scripts = { status: "unhealthy", error: e.message };
    allHealthy = false;
  }

  // MCP server
  checks.mcp_server = {
    status: "healthy",
    uptime_s: Math.round(process.uptime()),
    cache_age_ms: _leadsCache ? Date.now() - _cacheTimestamp : null,
    cached_leads: _leadsCache?.length ?? 0,
  };

  // Failure tracking
  checks.failure_counts = _failureCounts;

  res.status(allHealthy ? 200 : 503).json({
    overall_status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    checks,
  });
});

// --- Failure tracking ---
function recordFailure(tool) {
  _failureCounts[tool] = (_failureCounts[tool] || 0) + 1;
  if (_failureCounts[tool] >= FAILURE_ALERT_THRESHOLD) {
    console.error(`[ALERT] Tool '${tool}' has failed ${_failureCounts[tool]} times consecutively!`);
  }
}

// Reset failure count on success (called via middleware)
app.use((req, res, next) => {
  const jsonSend = res.json;
  res.json = function (data) {
    if (res.statusCode < 400 && req.path.startsWith("/tool/")) {
      const tool = req.path.replace("/tool/", "");
      if (tool && tool !== "get_scraper_health") {
        delete _failureCounts[tool];
      }
    }
    return jsonSend.call(this, data);
  };
  next();
});

// --- MCP JSON-RPC endpoint (standard MCP) ---
app.post("/mcp", async (req, res) => {
  const { method, params, id } = req.body;

  try {
    let result;
    switch (method) {
      case "tools/list":
        result = {
          tools: [
            { name: "search_leads", description: "Search leads by query, source, probability", inputSchema: { type: "object", properties: { query: { type: "string" }, source: { type: "string" }, min_probability: { type: "number" }, limit: { type: "number" } } } },
            { name: "get_lead_stats", description: "Get aggregate lead statistics", inputSchema: { type: "object", properties: {} } },
            { name: "run_scraper", description: "Get scraper status or trigger a specific source", inputSchema: { type: "object", properties: { source: { type: "string" }, keywords: { type: "string" } } } },
            { name: "get_scraper_health", description: "Check health of all scraper components", inputSchema: { type: "object", properties: {} } },
          ],
        };
        break;
      case "tools/call":
        const toolName = params?.name;
        const args = params?.arguments || {};
        if (toolName === "search_leads") {
          const resp = await fetchLeads(args.force_refresh);
          // Reuse the same logic...
          result = { content: [{ type: "text", text: `Use GET /tool/search_leads?q=${args.query || ""}&source=${args.source || ""}` }] };
        } else if (toolName === "get_lead_stats") {
          result = { content: [{ type: "text", text: `Use GET /tool/get_lead_stats` }] };
        } else {
          result = { error: `Unknown tool: ${toolName}` };
        }
        break;
      default:
        result = { error: `Unknown method: ${method}` };
    }
    res.json({ jsonrpc: "2.0", id, result });
  } catch (err) {
    res.json({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message } });
  }
});

// --- Dashboard (served at root) ---
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(getDashboardHTML());
});

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[MCP-HTTP] Lead Scraper MCP+Dashboard server running on port ${PORT}`);
  console.log(`[MCP-HTTP] Health:       http://localhost:${PORT}/health`);
  console.log(`[MCP-HTTP] Search Leads:  http://localhost:${PORT}/tool/search_leads?q=AI&source=workana`);
  console.log(`[MCP-HTTP] Stats:        http://localhost:${PORT}/tool/get_lead_stats`);
  console.log(`[MCP-HTTP] Run Scraper:  http://localhost:${PORT}/tool/run_scraper?source=all`);
  console.log(`[MCP-HTTP] MCP JSON-RPC: http://localhost:${PORT}/mcp`);
});

// Graceful shutdown
process.on("SIGTERM", () => { console.log("[MCP-HTTP] Shutting down..."); process.exit(0); });
process.on("SIGINT", () => { console.log("[MCP-HTTP] Shutting down..."); process.exit(0); });
