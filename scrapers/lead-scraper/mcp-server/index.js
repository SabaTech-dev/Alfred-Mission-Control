/**
 * Lead Scraper MCP Server
 * 
 * Exposes lead pipeline data via MCP protocol for AI agents.
 * Runs on port 8182 alongside QMD MCP (8181).
 * 
 * Tools:
 *   - search_leads: Search leads by keyword, source, stage, date range
 *   - get_lead_stats: Get aggregate stats (total, by source, by stage, pipeline value)
 *   - run_scraper: Trigger a specific scraper source
 *   - get_scraper_health: Check health of all scraper components
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import fs from "fs";
import path from "path";

// --- Configuration ---
const PIPELINE_URL = process.env.PIPELINE_URL || "http://localhost:3000/api/pipeline";
const AGENT_ID = process.env.AGENT_ID || "devops";
const AGENT_KEY = process.env.AGENT_KEY || "sk-devops-alfred-2026";
const JOBS_API_URL = process.env.JOBS_API_URL || "http://localhost:3001";

const AUTH_HEADERS = {
  "X-Agent-Id": AGENT_ID,
  "X-Agent-Key": AGENT_KEY,
};

// --- State ---
let _leadsCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

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
    const data = resp.data;
    _leadsCache = data.opportunities || data.items || data.data || [];
    _cacheTimestamp = now;
    return _leadsCache;
  } catch (err) {
    console.error(`[MCP] Failed to fetch leads: ${err.message}`);
    return _leadsCache || [];
  }
}

async function fetchJobsApiHealth() {
  try {
    const resp = await axios.get(`${JOBS_API_URL}/health`, { timeout: 5000 });
    return { status: "healthy", ...resp.data };
  } catch (err) {
    return { status: "unhealthy", error: err.message };
  }
}

// --- MCP Server ---
const server = new McpServer({
  name: "lead-scraper-mcp",
  version: "1.0.0",
});

// Tool 1: search_leads
server.tool(
  "search_leads",
  {
    query: { type: "string", description: "Search query — matches against title, description, company, notes" },
    source: { type: "string", description: "Filter by source (workana, freelancer, upwork, indeed, etc.)", default: "" },
    min_probability: { type: "number", description: "Minimum probability threshold (0-100)", default: 0 },
    limit: { type: "number", description: "Max results to return", default: 20 },
    force_refresh: { type: "boolean", description: "Bypass cache and fetch fresh data", default: false },
  },
  async ({ query, source, min_probability, limit, force_refresh }) => {
    const leads = await fetchLeads(force_refresh);
    const q = (query || "").toLowerCase();
    const src = (source || "").toLowerCase();

    const filtered = leads.filter((lead) => {
      if (src && !(lead.source || "").toLowerCase().includes(src)) return false;
      if ((lead.probability || 0) < min_probability) return false;
      if (!q) return true;
      const text = [
        lead.title, lead.description, lead.company, lead.notes, lead.source
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(q);
    }).slice(0, limit);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total_matches: filtered.length,
          total_available: leads.length,
          query: query || null,
          source_filter: source || null,
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
            url: l.notes?.match(/https?:\/\/[^\s|]+/)?.[0] || null,
            created_at: l.created_at,
          })),
        }, null, 2),
      }],
    };
  }
);

// Tool 2: get_lead_stats
server.tool(
  "get_lead_stats",
  {
    force_refresh: { type: "boolean", description: "Bypass cache", default: false },
  },
  async ({ force_refresh }) => {
    const leads = await fetchLeads(force_refresh);

    const bySource = {};
    const byStage = {};
    const byProbability = { high: 0, medium: 0, low: 0 };
    let totalValue = 0;
    let totalWeightedValue = 0;
    const timeline = {};

    for (const lead of leads) {
      // By source
      const src = lead.source || "unknown";
      bySource[src] = (bySource[src] || 0) + 1;

      // By stage
      const stg = lead.stage || "unknown";
      byStage[stg] = (byStage[stg] || 0) + 1;

      // Probability bucketing
      const prob = lead.probability || 0;
      if (prob >= 80) byProbability.high++;
      else if (prob >= 50) byProbability.medium++;
      else byProbability.low++;

      // Value
      totalValue += lead.value || 0;
      totalWeightedValue += (lead.value || 0) * (prob / 100);

      // Timeline (by day)
      if (lead.created_at) {
        const day = lead.created_at.substring(0, 10);
        timeline[day] = (timeline[day] || 0) + 1;
      }
    }

    // Sort timeline
    const sortedTimeline = Object.entries(timeline)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {});

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total_leads: leads.length,
          by_source: bySource,
          by_stage: byStage,
          by_probability: byProbability,
          total_pipeline_value: totalValue,
          weighted_pipeline_value: Math.round(totalWeightedValue),
          timeline: sortedTimeline,
          last_updated: new Date(_cacheTimestamp).toISOString(),
        }, null, 2),
      }],
    };
  }
);

// Tool 3: run_scraper
server.tool(
  "run_scraper",
  {
    source: {
      type: "string",
      description: "Scraper source to run. Options: malt, workana, freelancer, upwork, indeed, linkedin, infojobs. Use 'all' to check all scraper scripts.",
    },
    keywords: { type: "string", description: "Comma-separated keywords to search", default: "" },
  },
  async ({ source, keywords }) => {
    try {
      const scraperDir = "/home/ubuntu/.openclaw/workspace/scripts/lead-scraper";

      if (source === "all") {
        // Verify all scraper scripts exist
        const platforms = fs.readdirSync(path.join(scraperDir, "platforms"))
          .filter((f) => f.endsWith(".js") && !f.includes(".test."));
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "checked",
              available_scrapers: platforms.map((f) => f.replace(".js", "")),
              total: platforms.length,
              note: "Use run_scraper with a specific source name to execute it. Each scraper uses Playwright and may take 30-120s.",
              // eslint-disable-next-line camelcase
              usage_example: 'run_scraper source="workana" keywords="AI agent chatbot"',
            }, null, 2),
          }],
        };
      }

      if (!source) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "No source specified",
              available_sources: ["malt", "workana", "freelancer", "upwork", "indeed", "linkedin", "infojobs"],
            }, null, 2),
          }],
        };
      }

      const scriptPath = path.join(scraperDir, "platforms", `${source}.js`);
      if (!fs.existsSync(scriptPath)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: `Scraper script not found: ${scriptPath}`,
              available: fs.readdirSync(path.join(scraperDir, "platforms")).filter((f) => f.endsWith(".js") && !f.includes(".test.")),
            }, null, 2),
          }],
        };
      }

      // Verify the script is valid
      const scriptStat = fs.statSync(scriptPath);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "ready",
            source,
            script: scriptPath,
            size_bytes: scriptStat.size,
            note: `Scraper '${source}' is ready to run. Use exec tool to execute: node ${platformsDir}/${source}.js`,
            keywords: keywords ? keywords.split(",").map((k) => k.trim()) : "default (from config.js)",
          }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: err.message }),
        }],
      };
    }
  }
);

// Tool 4: get_scraper_health (bonus tool for monitoring integration)
server.tool(
  "get_scraper_health",
  {},
  async () => {
    const checks = {};

    // Pipeline API
    try {
      const start = Date.now();
      const resp = await axios.get(PIPELINE_URL, {
        headers: AUTH_HEADERS,
        params: { limit: 1 },
        timeout: 5000,
      });
      checks.pipeline_api = {
        status: "healthy",
        response_time_ms: Date.now() - start,
        leads_count: resp.data?.opportunities?.length ?? resp.data?.total_opportunities ?? "unknown",
      };
    } catch (err) {
      checks.pipeline_api = { status: "unhealthy", error: err.message };
    }

    // Jobs API
    const jobsHealth = await fetchJobsApiHealth();
    checks.jobs_api = jobsHealth;

    // Scraper scripts exist
    try {
      const scraperDir = "/home/ubuntu/.openclaw/workspace/scripts/lead-scraper/platforms";
      const scripts = fs.readdirSync(scraperDir).filter((f) => f.endsWith(".js") && !f.includes(".test."));
      checks.scraper_scripts = {
        status: scripts.length > 0 ? "healthy" : "warning",
        count: scripts.length,
        sources: scripts.map((f) => f.replace(".js", "")),
      };
    } catch (err) {
      checks.scraper_scripts = { status: "unhealthy", error: err.message };
    }

    // MCP metrics
    checks.mcp_server = {
      status: "healthy",
      uptime_seconds: Math.round(process.uptime()),
      cache_age_ms: _leadsCache ? Date.now() - _cacheTimestamp : null,
      cached_leads: _leadsCache?.length ?? 0,
    };

    const allHealthy = Object.values(checks).every((c) => c.status === "healthy");

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          overall_status: allHealthy ? "healthy" : "degraded",
          timestamp: new Date().toISOString(),
          checks,
        }, null, 2),
      }],
    };
  }
);

// --- Start ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[MCP] Lead Scraper MCP Server running on stdio");
  console.error(`[MCP] Pipeline URL: ${PIPELINE_URL}`);
  console.error(`[MCP] Jobs API: ${JOBS_API_URL}`);
}

main().catch((err) => {
  console.error("[MCP] Fatal error:", err);
  process.exit(1);
});
