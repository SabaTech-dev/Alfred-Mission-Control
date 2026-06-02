import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// ─── Types ─────────────────────────────────────────────────────────
interface AgentInfo {
  name: string;
  id: string;
  agentDir: string;
  model: { primary: string; fallbacks: string[] };
  isDefault: boolean;
  status: "active" | "inactive";
  heartbeatEvery?: string;
}

interface SkillInfo {
  name: string;
  source: "system" | "workspace" | "plugin" | "agent";
  location: string;
  hasSKILL: boolean;
}

interface InventoryData {
  agents: AgentInfo[];
  skills: {
    system: SkillInfo[];
    workspace: SkillInfo[];
    plugin: SkillInfo[];
    total: number;
  };
  models: {
    available: { id: string; alias?: string }[];
    default: string;
  };
  mcps: { name: string; configured: boolean; source?: string }[];
  timestamp: string;
}

// ─── Paths ─────────────────────────────────────────────────────────
const OPENCLAW_ROOT = "/home/joker/.openclaw";
const OPENCLAW_JSON = path.join(OPENCLAW_ROOT, "openclaw.json");
const SYSTEM_SKILLS_DIR =
  "/home/ubuntu/.npm-global/lib/node_modules/openclaw/skills";
const WORKSPACE_SKILLS_DIR = path.join(OPENCLAW_ROOT, "skills");
const PLUGIN_SKILLS_DIR = path.join(OPENCLAW_ROOT, "plugin-skills");

// ─── Helpers ───────────────────────────────────────────────────────
function listSkills(dir: string, source: SkillInfo["source"]): SkillInfo[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => ({
      name: d.name,
      source,
      location: path.join(dir, d.name),
      hasSKILL: fs.existsSync(path.join(dir, d.name, "SKILL.md")),
    }));
}

// ─── GET handler ───────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Read openclaw.json
    const raw = fs.readFileSync(OPENCLAW_JSON, "utf-8");
    const config = JSON.parse(raw);

    // 2. Extract agents
    const agentsList = config.agents?.list ?? [];
    const defaults = config.agents?.defaults ?? {};
    const agents: AgentInfo[] = agentsList.map((a: Record<string, unknown>) => {
      const name = (a.name as string) || "unknown";
      const agentDir = (a.agentDir as string) || "";
      const id = path.basename(path.dirname(agentDir));
      const model = a.model as { primary?: string; fallbacks?: string[] } | undefined;
      const heartbeat = a.heartbeat as { every?: string } | undefined;
      return {
        name,
        id,
        agentDir,
        model: {
          primary: model?.primary || defaults?.model?.primary || "unknown",
          fallbacks: model?.fallbacks || defaults?.model?.fallbacks || [],
        },
        isDefault: !!a.default,
        status: "active" as const,
        heartbeatEvery: heartbeat?.every,
      };
    });

    // 3. Extract models
    const modelsMap = defaults?.models || {};
    const available = Object.entries(modelsMap).map(
      ([id, val]: [string, unknown]) => ({
        id,
        alias: (val as Record<string, string>)?.alias || undefined,
      })
    );

    // 4. Collect skills
    const system = listSkills(SYSTEM_SKILLS_DIR, "system");
    const workspace = listSkills(WORKSPACE_SKILLS_DIR, "workspace");
    const plugin = listSkills(PLUGIN_SKILLS_DIR, "plugin");

    // 5. MCPs - check smithery config
    const smitheryPath = path.join(OPENCLAW_ROOT, "config", "smithery.json");
    const mcps: InventoryData["mcps"] = [];
    if (fs.existsSync(smitheryPath)) {
      mcps.push({ name: "Smithery", configured: true, source: "smithery.json" });
    }
    const mcporterPath = path.join(OPENCLAW_ROOT, "config", "mcporter.json");
    if (fs.existsSync(mcporterPath)) {
      mcps.push({ name: "MCPorter", configured: true, source: "mcporter.json" });
    }
    // Check for any MCP server configs in smithery cache
    if (fs.existsSync(smitheryPath)) {
      try {
        const sc = JSON.parse(fs.readFileSync(smitheryPath, "utf-8"));
        const cached = sc?.cache?.servers || {};
        for (const [name] of Object.entries(cached)) {
          mcps.push({ name: `Smithery: ${name}`, configured: true, source: "smithery cache" });
        }
      } catch {
        // ignore
      }
    }

    const data: InventoryData = {
      agents,
      skills: {
        system,
        workspace,
        plugin,
        total: system.length + workspace.length + plugin.length,
      },
      models: {
        available,
        default: defaults?.model?.primary || "unknown",
      },
      mcps,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
