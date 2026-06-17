import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE = process.env.WORKSPACE_PATH || path.join(process.env.HOME || "/home/ubuntu", ".openclaw/workspace");
const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "feature-tracker-state.json");

export interface TrackedFeature {
  id: string;
  source: "feature_requests" | "autoresearch_ideas";
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "open" | "in-progress" | "done" | "rejected";
  date: string;
  tags: string[];
  outcome?: string;
  complexity?: string;
  metricGoal?: string;
  stateOverride?: {
    status?: string;
    updatedAt?: string;
  };
}

interface StateMap {
  [id: string]: { status: string; updatedAt: string };
}

// ── Persistence ──────────────────────────────────────────────────────────

function loadState(): StateMap {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch { /* empty */ }
  return {};
}

function saveState(state: StateMap) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Parsers ──────────────────────────────────────────────────────────────

function parseFeatureRequests(content: string): TrackedFeature[] {
  const features: TrackedFeature[] = [];
  const entryRegex = /###\s+\[([^\]]+)\]\s+(.+)/g;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const id = match[1];
    const title = match[2].trim();

    // Extract the body until next ### or end of "## Entradas" section
    const bodyStart = match.index + match[0].length;
    const nextEntry = content.indexOf("### [", bodyStart);
    const sectionEnd = content.indexOf("## ", bodyStart);
    const bodyEnd = nextEntry > 0 ? nextEntry : (sectionEnd > 0 ? sectionEnd : content.length);
    const body = content.slice(bodyStart, bodyEnd).trim();

    // Parse fields
    const priorityMatch = body.match(/\*\*Priority:\*\*\s*(\w+)/i);
    const statusMatch = body.match(/\*\*Status:\*\*\s*(\w[\w-]*)/i);
    const resolvedMatch = body.match(/Resolved:\*\*\s*([\d-]+)/);
    const loggedMatch = body.match(/Logged:\*\*\s*([\d-]+)/);

    const rawPriority = (priorityMatch?.[1] || "medium").toLowerCase();
    const rawStatus = (statusMatch?.[1] || "open").toLowerCase().replace(/\s+/g, "-");

    // Normalize status
    let status: TrackedFeature["status"] = "open";
    if (["done", "completed"].includes(rawStatus)) status = "done";
    else if (["in-progress", "in_progress"].includes(rawStatus)) status = "in-progress";
    else if (["pending", "open"].includes(rawStatus)) status = "open";
    else if (["backlog"].includes(rawStatus)) status = "open";
    else if (["rejected", "discarded"].includes(rawStatus)) status = "rejected";

    const priority: TrackedFeature["priority"] = ["high", "medium", "low"].includes(rawPriority)
      ? (rawPriority as "high" | "medium" | "low") : "medium";

    const date = resolvedMatch?.[1] || loggedMatch?.[1] || id.replace(/^FEAT-/, "").replace(/-.+$/, "") || "unknown";

    // Extract description (first line after metadata)
    const descLines = body.split("\n").filter(l => l.trim() && !l.startsWith("- **"));
    const description = descLines.join(" ").trim().replace(/^-\s*/, "");

    // Detect category from title/description
    const category = detectCategory(title + " " + description);

    features.push({
      id,
      source: "feature_requests",
      title: title.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      description,
      category,
      priority,
      status,
      date,
      tags: extractTags(title + " " + description),
    });
  }
  return features;
}

function parseAutoresearchIdeas(content: string): TrackedFeature[] {
  const features: TrackedFeature[] = [];
  const entryRegex = /^##\s+\[(\w+)\]\s+(.+)$/gm;
  let match;

  while ((match = entryRegex.exec(content)) !== null) {
    const rawStatus = match[1].toLowerCase();
    const title = match[2].trim();

    const bodyStart = match.index + match[0].length;
    const nextEntry = content.indexOf("\n## [", bodyStart);
    const lastLine = content.indexOf("\n**Última", bodyStart);
    let bodyEnd = nextEntry > 0 ? nextEntry : content.length;
    if (lastLine > 0 && lastLine < bodyEnd) bodyEnd = lastLine;
    const body = content.slice(bodyStart, bodyEnd).trim();

    // Parse fields
    const priorityMatch = body.match(/Prioridad:\*\*\s*(.+)/i);
    const complexityMatch = body.match(/Complejidad:\*\*\s*(.+)/i);
    const metricMatch = body.match(/Métrica objetivo:\*\*\s*(.+)/i);
    const resultMatch = body.match(/Resultado:\*\*\s*(.+)/i);
    const dateMatch = body.match(/completado:\*\*\s*([\d-]+)/i) || body.match(/descarte:\*\*\s*([\d-]+)/i);

    const rawPriority = (priorityMatch?.[1] || "medium").trim().toLowerCase();
    const priority: TrackedFeature["priority"] = ["alta", "high"].includes(rawPriority) ? "high"
      : ["baja", "low"].includes(rawPriority) ? "low" : "medium";

    let status: TrackedFeature["status"] = "open";
    if (["done"].includes(rawStatus)) status = "done";
    else if (["discarded"].includes(rawStatus)) status = "rejected";
    else if (["pending"].includes(rawStatus)) status = "open";
    else if (["in-progress"].includes(rawStatus)) status = "in-progress";

    const date = dateMatch?.[1] || "unknown";
    const description = body.split("\n").find(l => l.match(/^- \*\*Idea:\*\*/))?.replace(/^- \*\*Idea:\*\*\s*/, "") || title;
    const outcome = resultMatch?.[1] || undefined;

    const category = detectCategory(title + " " + description);

    const id = `AR-${title.replace(/\s+/g, "-").slice(0, 40).replace(/[^a-zA-Z0-9-]/g, "")}`;

    features.push({
      id,
      source: "autoresearch_ideas",
      title,
      description,
      category,
      priority,
      status,
      date,
      tags: extractTags(title + " " + description),
      outcome,
      complexity: complexityMatch?.[1]?.trim() || undefined,
      metricGoal: metricMatch?.[1]?.trim() || undefined,
    });
  }
  return features;
}

function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (/api|endpoint|rest|route|server/.test(t)) return "backend";
  if (/ui|dashboard|visual|graf|chart|viewer|tab/.test(t)) return "ui";
  if (/test|qa|e2e|benchmark/.test(t)) return "testing";
  if (/deploy|docker|dns|subdomain|infra/.test(t)) return "infra";
  if (/memory|hindsight|embedding|vector|graph/.test(t)) return "memory";
  if (/mcp|skill|plugin|integration/.test(t)) return "integration";
  if (/security|audit|osint/.test(t)) return "security";
  if(/research|autoresearch|gepa|dspy|optim/.test(t)) return "research";
  if (/n8n|workflow|orchest|pipeline|cron/.test(t)) return "automation";
  if (/agent|llm|model|routing|prompt/.test(t)) return "ai";
  return "other";
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  const t = text.toLowerCase();
  const tagMap: Record<string, string> = {
    "docker": "docker", "mcp": "mcp", "dspy": "dspy", "gepa": "gepa",
    "memory-core": "memory-core", "n8n": "n8n", "huawei": "huawei",
    "android": "android", "playwright": "playwright", "benchmark": "benchmark",
    "ontology": "ontology", "graph": "graph", "recall": "recall",
    "openclaw": "openclaw", "skill": "skill", "cron": "cron",
  };
  for (const [keyword, tag] of Object.entries(tagMap)) {
    if (t.includes(keyword)) tags.push(tag);
  }
  return tags;
}

// ── GET Handler ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const frPath = path.join(WORKSPACE, ".learnings", "FEATURE_REQUESTS.md");
    const arPath = path.join(WORKSPACE, ".learnings", "AUTORESEARCH_IDEAS.md");

    const frContent = fs.existsSync(frPath) ? fs.readFileSync(frPath, "utf-8") : "";
    const arContent = fs.existsSync(arPath) ? fs.readFileSync(arPath, "utf-8") : "";

    let allFeatures: TrackedFeature[] = [
      ...parseFeatureRequests(frContent),
      ...parseAutoresearchIdeas(arContent),
    ];

    // Apply state overrides
    const state = loadState();
    allFeatures = allFeatures.map(f => {
      const override = state[f.id];
      if (override) {
        return {
          ...f,
          status: (override.status as TrackedFeature["status"]) || f.status,
          stateOverride: { status: override.status, updatedAt: override.updatedAt },
        };
      }
      return f;
    });

    // Stats
    const stats = {
      total: allFeatures.length,
      byStatus: {
        open: allFeatures.filter(f => f.status === "open").length,
        "in-progress": allFeatures.filter(f => f.status === "in-progress").length,
        done: allFeatures.filter(f => f.status === "done").length,
        rejected: allFeatures.filter(f => f.status === "rejected").length,
      },
      byPriority: {
        high: allFeatures.filter(f => f.priority === "high").length,
        medium: allFeatures.filter(f => f.priority === "medium").length,
        low: allFeatures.filter(f => f.priority === "low").length,
      },
      bySource: {
        feature_requests: allFeatures.filter(f => f.source === "feature_requests").length,
        autoresearch_ideas: allFeatures.filter(f => f.source === "autoresearch_ideas").length,
      },
      byCategory: allFeatures.reduce<Record<string, number>>((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({ features: allFeatures, stats });
  } catch (error) {
    console.error("Feature Tracker API error:", error);
    return NextResponse.json(
      { features: [], stats: { total: 0, byStatus: {}, byPriority: {}, bySource: {}, byCategory: {} } },
      { status: 500 }
    );
  }
}

// ── PATCH Handler (update status) ────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body as { id: string; status: string };

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    const validStatuses = ["open", "in-progress", "done", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const state = loadState();
    state[id] = { status, updatedAt: new Date().toISOString() };
    saveState(state);

    return NextResponse.json({ success: true, id, status, updatedAt: state[id].updatedAt });
  } catch (error) {
    console.error("Feature Tracker PATCH error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
