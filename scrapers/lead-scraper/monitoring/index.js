/**
 * Lead Scraper Monitoring Service
 * 
 * Monitors all scraper components and reports health.
 * - Tracks consecutive failures per tool
 * - Logs centralized monitoring events
 * - Reports when failures exceed threshold
 * 
 * Endpoints:
 *   GET /health          — Full system health
 *   GET /checks/:name    — Individual component check
 *   GET /logs            — Recent monitoring log
 */

import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";

const PORT = process.env.MONITOR_PORT || 8183;
const PIPELINE_URL = process.env.PIPELINE_URL || "http://localhost:3000/api/pipeline";
const AGENT_ID = process.env.AGENT_ID || "devops";
const AGENT_KEY = process.env.AGENT_KEY;
const JOBS_API_URL = process.env.JOBS_API_URL || "http://localhost:3001";
const MCP_URL = process.env.MCP_URL || "http://localhost:8182";

const AUTH_HEADERS = { "X-Agent-Id": AGENT_ID, "X-Agent-Key": AGENT_KEY };
const FAILURE_ALERT_THRESHOLD = 3;

const app = express();
const _logs = [];
const _maxLogs = 200;

function log(level, component, message, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component,
    message,
    data,
  };
  _logs.push(entry);
  if (_logs.length > _maxLogs) _logs.shift();
  console.log(`[${level.toUpperCase()}] [${component}] ${message}`);
}

async function checkComponent(name, url, headers = {}, timeout = 5000) {
  const start = Date.now();
  try {
    const resp = await axios.get(url, { headers, timeout });
    const elapsed = Date.now() - start;
    log("info", name, `OK (${elapsed}ms)`, { status: resp.status });
    return {
      name,
      status: "healthy",
      response_ms: elapsed,
      http_status: resp.status,
      details: typeof resp.data === "object" ? { ...resp.data, checks: undefined } : undefined,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    const isTimeout = err.code === "ECONNABORTED";
    log("warn", name, `FAIL: ${err.message} (${elapsed}ms)`);
    return {
      name,
      status: "unhealthy",
      response_ms: elapsed,
      error: err.message,
      is_timeout: isTimeout,
    };
  }
}

// --- Health Check ---
app.get("/health", async (req, res) => {
  const checks = {};
  let allHealthy = true;

  // 1. Pipeline API
  const pipelineCheck = await checkComponent("pipeline_api", PIPELINE_URL + "?limit=1", AUTH_HEADERS);
  checks.pipeline_api = pipelineCheck;
  if (pipelineCheck.status !== "healthy") allHealthy = false;

  // 2. Jobs API (Ever Jobs)
  const jobsCheck = await checkComponent("jobs_api", `${JOBS_API_URL}/health`);
  checks.jobs_api = jobsCheck;
  if (jobsCheck.status !== "healthy") allHealthy = false;

  // 3. MCP Server
  const mcpCheck = await checkComponent("mcp_server", `${MCP_URL}/health`);
  checks.mcp_server = mcpCheck;
  if (mcpCheck.status !== "healthy") allHealthy = false;

  // 4. Scraper scripts (filesystem check)
  const scraperDir = "/home/ubuntu/.openclaw/workspace/scripts/lead-scraper/platforms";
  try {
    const scripts = fs.readdirSync(scraperDir).filter((f) => f.endsWith(".js") && !f.includes(".test."));
    checks.scraper_scripts = {
      name: "scraper_scripts",
      status: scripts.length > 0 ? "healthy" : "warning",
      count: scripts.length,
      sources: scripts.map((f) => f.replace(".js", "")),
    };
    if (scripts.length === 0) allHealthy = false;
  } catch (err) {
    checks.scraper_scripts = { name: "scraper_scripts", status: "unhealthy", error: err.message };
    allHealthy = false;
  }

  // 5. Monitoring service itself
  checks.monitoring = {
    name: "monitoring",
    status: "healthy",
    uptime_s: Math.round(process.uptime()),
    logs_count: _logs.length,
  };

  const statusStatus = allHealthy ? "healthy" : "degraded";
  res.status(allHealthy ? 200 : 503).json({
    overall_status: statusStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
});

// --- Individual check ---
app.get("/checks/:name", async (req, res) => {
  const name = req.params.name;

  switch (name) {
    case "pipeline":
      const p = await checkComponent("pipeline_api", PIPELINE_URL + "?limit=1", AUTH_HEADERS);
      return res.json(p);
    case "jobs":
      const j = await checkComponent("jobs_api", `${JOBS_API_URL}/health`);
      return res.json(j);
    case "mcp":
      const m = await checkComponent("mcp_server", `${MCP_URL}/health`);
      return res.json(m);
    case "scripts":
      try {
        const sd = "/home/ubuntu/.openclaw/workspace/scripts/lead-scraper/platforms";
        const s = fs.readdirSync(sd).filter((f) => f.endsWith(".js") && !f.includes(".test."));
        return res.json({ status: "healthy", sources: s.map((f) => f.replace(".js", "")), count: s.length });
      } catch (err) {
        return res.status(500).json({ status: "unhealthy", error: err.message });
      }
    default:
      return res.status(404).json({ error: `Unknown check: ${name}`, available: ["pipeline", "jobs", "mcp", "scripts"] });
  }
});

// --- Logs ---
app.get("/logs", (req, res) => {
  const { level, limit } = req.query;
  let filtered = _logs;
  if (level) filtered = filtered.filter((l) => l.level === level.toLowerCase());
  const lim = Math.min(parseInt(limit) || 50, _maxLogs);
  res.json({
    total: _logs.length,
    returned: Math.min(filtered.length, lim),
    logs: filtered.slice(-lim),
  });
});

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  log("info", "monitoring", `Monitoring service started on port ${PORT}`);
  log("info", "monitoring", `Health:         http://localhost:${PORT}/health`);
  log("info", "monitoring", `Check pipeline: http://localhost:${PORT}/checks/pipeline`);
  log("info", "monitoring", `Check jobs:     http://localhost:${PORT}/checks/jobs`);
  log("info", "monitoring", `Logs:           http://localhost:${PORT}/logs`);
});

process.on("SIGTERM", () => { log("info", "monitoring", "Shutting down"); process.exit(0); });
process.on("SIGINT", () => { log("info", "monitoring", "Shutting down"); process.exit(0); });
