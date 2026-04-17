/**
 * OpenClaw agents detection - filesystem discovery + CLI enrichment
 *
 * OpenClaw 2026.3.x+ discovers agents from ~/.openclaw/agents/<id>/ directories.
 * The openclaw.json agents.list may be empty when using filesystem discovery.
 * This module scans the agents directory and enriches with CLI data when available.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { logActivity } from "@/lib/activity-logger";
import { OPENCLAW_DIR } from "@/lib/paths";
import {
  listProjects,
  createProject,
  createAgentIdentity,
  getAgentIdentity,
  updateAgentIdentity,
} from "@/lib/kanban-db";

export interface OpenClawAgentConfig {
  id: string;
  name?: string;
  workspace?: string;
  heartbeat?: {
    every?: string;
  };
}

export interface OpenClawConfig {
  agents?: {
    list?: OpenClawAgentConfig[];
  };
}

export interface AgentIdentity {
  role: string;
  personality: string | null;
  avatar: string | null;
  mission: string | null;
  domain: string | null;
}

export interface AgentInfo {
  id: string;
  name: string;
  workspace: string;
  role: string;
  personality: string | null;
  avatar: string | null;
  mission: string | null;
  domain: string | null;
  heartbeatInterval: number | null;
  hasIdentity: boolean;
  isDefault?: boolean;
}

// Cache CLI agent data for 60s to avoid repeated subprocess calls
let cliCache: { data: Map<string, Record<string, unknown>>; ts: number } | null = null;
const CLI_CACHE_TTL = 60_000;

function getCliAgentMap(): Map<string, Record<string, unknown>> {
  const now = Date.now();
  if (cliCache && now - cliCache.ts < CLI_CACHE_TTL) {
    return cliCache.data;
  }

  const map = new Map<string, Record<string, unknown>>();
  try {
    const cliOutput = execSync("openclaw agents list --json", {
      encoding: "utf-8",
      timeout: 5000,
      cwd: OPENCLAW_DIR,
    });
    const cliAgents = JSON.parse(cliOutput);
    if (Array.isArray(cliAgents)) {
      for (const a of cliAgents) {
        map.set(a.id as string, a);
      }
    }
  } catch {
    // CLI unavailable
  }

  cliCache = { data: map, ts: now };
  return map;
}

/**
 * Get list of agents from filesystem discovery, enriched with CLI data
 *
 * Strategy:
 * 1. Scan ~/.openclaw/agents/<id>/ for all agent directories
 * 2. Enrich each with CLI data (identityName, isDefault, model)
 * 3. Fall back to openclaw.json agents.list if no filesystem agents found
 */
export function getOpenClawAgents(): AgentInfo[] {
  // Method 1: Filesystem discovery (primary for modern OpenClaw)
  const agentsDir = path.join(OPENCLAW_DIR, "agents");
  if (fs.existsSync(agentsDir)) {
    try {
      const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
      const agentDirs = entries.filter(
        (e) => e.isDirectory() && !e.name.startsWith(".")
      );

      if (agentDirs.length > 0) {
        const cliAgentMap = getCliAgentMap();

        return agentDirs.map((dir) => {
          const id = dir.name;
          const cliData = cliAgentMap.get(id);

          // Determine workspace: prefer CLI, then workspace-<id> pattern, then default
          let workspaceDir = path.join(OPENCLAW_DIR, "workspace");
          if (cliData?.workspace) {
            workspaceDir = cliData.workspace as string;
          } else {
            const wsPath = path.join(OPENCLAW_DIR, `workspace-${id}`);
            if (fs.existsSync(wsPath)) {
              workspaceDir = wsPath;
            }
          }

          const identityPath = path.join(workspaceDir, "IDENTITY.md");

          let identity: AgentIdentity | null = null;
          let hasIdentity = false;

          if (fs.existsSync(identityPath)) {
            try {
              const identityContent = fs.readFileSync(identityPath, "utf-8");
              identity = parseIdentityMd(identityContent);
              hasIdentity = true;
            } catch {
              // ignore
            }
          }

          return {
            id,
            name: (cliData?.identityName as string) || id,
            workspace: workspaceDir,
            role: identity?.role ?? "general",
            personality: identity?.personality ?? null,
            avatar: identity?.avatar ?? null,
            mission: identity?.mission ?? null,
            domain: identity?.domain ?? null,
            heartbeatInterval: null,
            hasIdentity,
            isDefault: (cliData?.isDefault as boolean) ?? false,
          };
        });
      }
    } catch {
      // filesystem scan error, fall through
    }
  }

  // Method 2: openclaw.json agents.list (legacy fallback)
  const configPath = path.join(OPENCLAW_DIR, "openclaw.json");
  if (fs.existsSync(configPath)) {
    try {
      const configRaw = fs.readFileSync(configPath, "utf-8");
      const config: OpenClawConfig = JSON.parse(configRaw);
      const agents = config.agents?.list ?? [];

      if (agents.length > 0) {
        return agents.map((agent) => {
          const workspaceDir = agent.workspace || path.join(OPENCLAW_DIR, "workspace", "agents", agent.id);
          const identityPath = path.join(workspaceDir, "IDENTITY.md");

          let identity: AgentIdentity | null = null;
          let hasIdentity = false;

          if (fs.existsSync(identityPath)) {
            try {
              const identityContent = fs.readFileSync(identityPath, "utf-8");
              identity = parseIdentityMd(identityContent);
              hasIdentity = true;
            } catch {
              // ignore
            }
          }

          const heartbeatInterval = agent.heartbeat?.every
            ? parseHeartbeatInterval(agent.heartbeat.every)
            : null;

          return {
            id: agent.id,
            name: agent.name ?? agent.id,
            workspace: workspaceDir,
            role: identity?.role ?? "general",
            personality: identity?.personality ?? null,
            avatar: identity?.avatar ?? null,
            mission: identity?.mission ?? null,
            domain: identity?.domain ?? null,
            heartbeatInterval,
            hasIdentity,
          };
        });
      }
    } catch {
      // config parse error
    }
  }

  console.warn("[openclaw-agents] No agents found via any method");
  return [];
}

/**
 * Parse IDENTITY.md file for role, personality, mission, domain
 */
function parseIdentityMd(content: string): AgentIdentity {
  let role = "general";
  let personality: string | null = null;
  let avatar: string | null = null;
  let mission: string | null = null;
  let domain: string | null = null;

  const roleMatch = content.match(/(?:^|\n)\*?\*?Role:\*\*?\s*(.+?)(?:\n|$)/i);
  if (roleMatch) {
    role = roleMatch[1].trim();
  }

  const personalityMatch = content.match(/(?:^|\n)\*?\*?Personality:\*\*?\s*(.+?)(?:\n|$)/i);
  if (personalityMatch) {
    personality = personalityMatch[1].trim();
  }

  const avatarMatch = content.match(/(?:^|\n)\*?\*?Avatar:\*\*?\s*(.+?)(?:\n|$)/i);
  if (avatarMatch) {
    avatar = avatarMatch[1].trim();
  }

  const missionMatch = content.match(/(?:^|\n)\*?\*?Mission:\*\*?\s*(.+?)(?:\n|$)/i);
  if (missionMatch) {
    mission = missionMatch[1].trim();
  }

  const domainMatch = content.match(/(?:^|\n)\*?\*?Domain:\*\*?\s*(.+?)(?:\n|$)/i);
  if (domainMatch) {
    domain = domainMatch[1].trim();
  }

  return { role, personality, avatar, mission, domain };
}

/**
 * Parse heartbeat interval string to milliseconds
 */
function parseHeartbeatInterval(every: string): number | null {
  const match = every.match(/^(\d+)\s*(m|min|minute|minutes|h|hour|hours)$/i);
  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "m":
    case "min":
    case "minute":
    case "minutes":
      return value * 60 * 1000;
    case "h":
    case "hour":
    case "hours":
      return value * 60 * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Sync OpenClaw agents to Kanban projects
 */
export function syncAgentsToProjects(): { synced: number; created: number; agents: AgentInfo[] } {
  const agents = getOpenClawAgents();
  let synced = 0;
  let created = 0;

  for (const agent of agents) {
    const projects = listProjects();
    const existingProject = projects.find(
      (p) =>
        p.name.toLowerCase() === agent.name.toLowerCase() ||
        p.description?.includes(`agent:${agent.id}`)
    );

    if (!existingProject) {
      const project = createProject({
        name: agent.name,
        description: `Project for ${agent.name} agent (${agent.id})`,
        missionAlignment: agent.mission ?? undefined,
      });

      const existingIdentity = getAgentIdentity(agent.id);
      if (!existingIdentity) {
        createAgentIdentity({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          personality: agent.personality ?? undefined,
          avatar: agent.avatar ?? undefined,
          mission: agent.mission ?? undefined,
        });
      } else {
        updateAgentIdentity(agent.id, {
          name: agent.name,
          role: agent.role,
          personality: agent.personality ?? undefined,
          avatar: agent.avatar ?? undefined,
          mission: agent.mission ?? undefined,
        });
      }

      created++;
      logActivity("task", `Created project for agent ${agent.name}`, "success", {
        metadata: { agentId: agent.id, projectId: project.id },
      });
    } else {
      const existingIdentity = getAgentIdentity(agent.id);
      if (existingIdentity) {
        updateAgentIdentity(agent.id, {
          name: agent.name,
          role: agent.role,
          personality: agent.personality ?? undefined,
          avatar: agent.avatar ?? undefined,
          mission: agent.mission ?? undefined,
        });
      }
      synced++;
    }
  }

  logActivity("task", `Synced ${synced} agents, created ${created} new projects`, "success", {
    metadata: { synced, created },
  });

  return { synced, created, agents };
}
