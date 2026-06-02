import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";
import { jwtUtils } from "@/lib/jwt-utils";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME || "/root", ".openclaw");
const CONFIG_PATH = path.join(OPENCLAW_DIR, "openclaw.json");

/** Agent IDs that are considered admin-level (full config access). */
const ADMIN_AGENT_IDS = new Set(["main"]);

interface ConfigSection {
  editable: boolean;
  data: Record<string, unknown>;
}

interface ConfigResponse {
  sections: {
    meta: ConfigSection;
    env?: ConfigSection;
    auth?: ConfigSection;
    models?: ConfigSection;
    wizard?: ConfigSection;
  };
  raw?: string;
}

interface SanitizedConfigResponse {
  sections: {
    meta: ConfigSection;
  };
}

function maskSensitive(key: string, value: string): string {
  const sensitivePatterns = [
    /key$/i,
    /secret$/i,
    /password$/i,
    /token$/i,
    /credential$/i,
  ];

  const isSensitive = sensitivePatterns.some((p) => p.test(key));

  if (isSensitive && typeof value === "string" && value.length > 4) {
    return "••••••••" + value.slice(-4);
  }
  return value;
}

function maskObject(obj: Record<string, unknown>, parentKey = ""): Record<string, unknown> {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof value === "string") {
      result[key] = maskSensitive(key, value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskObject(value as Record<string, unknown>, fullKey);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function maskRawJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const masked = maskObject(parsed);
    return JSON.stringify(masked, null, 2);
  } catch {
    return raw;
  }
}

/**
 * Extract a safe list of agent IDs and names from the config.
 * Strips workspace paths, heartbeat config, and other details.
 */
function extractAgentNames(config: Record<string, unknown>): Array<{ id: string; name: string }> {
  const agents: Array<{ id: string; name: string }> = [];

  // From agents.list
  const list = config.agents as Record<string, unknown> | undefined;
  if (list?.list && Array.isArray(list.list)) {
    for (const agent of list.list as Array<Record<string, unknown>>) {
      if (agent.id && agent.name) {
        agents.push({ id: String(agent.id), name: String(agent.name) });
      }
    }
  }

  // From agents.defaults
  const defaults = list?.defaults as Record<string, unknown> | undefined;
  if (defaults?.id && defaults?.name && !agents.some((a) => a.id === defaults.id)) {
    agents.push({ id: String(defaults.id), name: String(defaults.name) });
  }

  return agents;
}

/**
 * Build a sanitized response for non-admin callers.
 * Only includes: openclaw version, agent names/IDs, workspace paths.
 * Excludes: providers, apiKeys, models, costs, plugins, skills, cron.
 */
function buildSanitizedResponse(config: Record<string, unknown>): SanitizedConfigResponse {
  const meta = (config.meta as Record<string, unknown>) || {};

  return {
    sections: {
      meta: {
        editable: false,
        data: {
          version: meta.version || null,
          openclawVersion: meta.openclawVersion || null,
          agents: extractAgentNames(config),
        },
      },
    },
  };
}

/**
 * Determine if the caller is an admin (agent "main" or session with role "admin").
 */
async function isCallerAdmin(request: NextRequest): Promise<boolean> {
  const authResult = await requireAgentOrSessionAuth(request);

  if (!authResult.authorized) {
    return false;
  }

  // Agent auth: check if agent ID is in admin set
  if (authResult.authType === "agent" && authResult.agentId) {
    return ADMIN_AGENT_IDS.has(authResult.agentId);
  }

  // Session auth: check JWT role
  if (authResult.authType === "session") {
    const token = jwtUtils.getTokenFromRequest(request);
    if (!token) return false;
    const payload = await jwtUtils.verifyToken(token);
    return payload?.role === "admin";
  }

  return false;
}

function buildConfigResponse(config: Record<string, unknown>, rawContent: string): ConfigResponse {
  return {
    sections: {
      meta: {
        editable: false,
        data: maskObject((config.meta as Record<string, unknown>) || {}),
      },
      env: {
        editable: true,
        data: maskObject((config.env as Record<string, unknown>) || {}),
      },
      auth: {
        editable: true,
        data: maskObject((config.auth as Record<string, unknown>) || {}),
      },
      models: {
        editable: true,
        data: maskObject((config.models as Record<string, unknown>) || {}),
      },
      wizard: {
        editable: false,
        data: maskObject((config.wizard as Record<string, unknown>) || {}),
      },
    },
    raw: maskRawJson(rawContent),
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate: agent OR session required
    const authResult = await requireAgentOrSessionAuth(request);

    if (!authResult.authorized) {
      return authResult.error || NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    if (!fs.existsSync(CONFIG_PATH)) {
      return NextResponse.json(
        {
          error: "Config file not found",
          sections: null,
          raw: null,
        },
        { status: 404 }
      );
    }

    const rawContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(rawContent);

    // Admin (main agent or admin session) gets full config
    const admin = await isCallerAdmin(request);

    if (admin) {
      const response = buildConfigResponse(config, rawContent);
      return NextResponse.json(response);
    }

    // Non-admin: sanitized subset
    const sanitized = buildSanitizedResponse(config);
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Failed to read config:", error);
    return NextResponse.json(
      {
        error: "Failed to read configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

interface ConfigUpdateRequest {
  section: "env" | "auth" | "models";
  updates: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateEnvUpdates(updates: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (updates.vars && typeof updates.vars === "object") {
    for (const key of Object.keys(updates.vars as Record<string, unknown>)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        errors.push(`Invalid env var name: ${key}`);
      }
    }
  }

  return errors;
}

function validateAuthUpdates(updates: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (updates.profiles && typeof updates.profiles === "object") {
    for (const [name, profile] of Object.entries(updates.profiles as Record<string, unknown>)) {
      const p = profile as Record<string, unknown>;
      if (!p.provider || !p.mode) {
        errors.push(`Profile '${name}' missing required fields (provider, mode)`);
      }
    }
  }

  return errors;
}

function validateModelsUpdates(updates: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (updates.providers && typeof updates.providers === "object") {
    for (const [name, provider] of Object.entries(updates.providers as Record<string, unknown>)) {
      const p = provider as Record<string, unknown>;
      if (p.baseUrl !== undefined && typeof p.baseUrl !== "string") {
        errors.push(`Provider '${name}' baseUrl must be a string`);
      }
      if (p.api !== undefined && typeof p.api !== "string") {
        errors.push(`Provider '${name}' api must be a string`);
      }
    }
  }

  return errors;
}

function validateUpdates(section: string, updates: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  switch (section) {
    case "env":
      errors.push(...validateEnvUpdates(updates));
      break;
    case "auth":
      errors.push(...validateAuthUpdates(updates));
      break;
    case "models":
      errors.push(...validateModelsUpdates(updates));
      break;
  }

  return { valid: errors.length === 0, errors };
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result as T;
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as ConfigUpdateRequest;
    const { section, updates } = body;

    const editableSections = ["env", "auth", "models"];
    if (!section || !editableSections.includes(section)) {
      return NextResponse.json(
        {
          error: `Section '${section}' is not editable`,
          editableSections,
        },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        {
          error: "Updates object is required",
        },
        { status: 400 }
      );
    }

    if (!fs.existsSync(CONFIG_PATH)) {
      return NextResponse.json(
        {
          error: "Config file not found",
        },
        { status: 404 }
      );
    }

    const rawContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(rawContent) as Record<string, unknown>;

    const backupPath = CONFIG_PATH + ".backup";
    fs.writeFileSync(backupPath, rawContent);

    const validation = validateUpdates(section, updates);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    config[section] = deepMerge((config[section] as Record<string, unknown>) || {}, updates);

    const newRawContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_PATH, newRawContent);

    console.log(`[${new Date().toISOString()}] Config section '${section}' updated`);

    const response = buildConfigResponse(config, newRawContent);

    return NextResponse.json({
      success: true,
      message: "Configuration updated successfully",
      backupPath,
      updatedSection: section,
      config: response,
    });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json(
      {
        error: "Failed to update configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
