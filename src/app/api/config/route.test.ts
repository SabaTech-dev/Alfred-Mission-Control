import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import { NextRequest } from "next/server";

import { GET } from "./route";
import { resetAgentKeysCache } from "@/lib/agent-auth";
import { jwtUtils } from "@/lib/jwt-utils";

// Sample openclaw.json structure
const SAMPLE_CONFIG = {
  meta: {
    version: "2.0.0",
    openclawVersion: "1.5.0",
  },
  agents: {
    list: [
      { id: "main", name: "Main Agent", workspace: "workspace" },
      { id: "coder", name: "Coder", workspace: "workspace-coder" },
    ],
    defaults: {
      id: "main",
      name: "Main Agent",
      heartbeat: { every: "15m" },
    },
  },
  providers: {
    anthropic: { apiKey: "sk-ant-super-secret-key", baseUrl: "https://api.anthropic.com" },
    openai: { apiKey: "sk-openai-secret-key" },
  },
  models: {
    default: "anthropic/claude-sonnet-4",
    costTracking: { enabled: true },
  },
  env: {
    vars: { NODE_ENV: "production", LOG_LEVEL: "info" },
  },
  auth: {
    profiles: { admin: { provider: "local", mode: "password" } },
  },
  wizard: {
    completed: true,
  },
  plugins: {
    enabled: ["plugin-a", "plugin-b"],
  },
  skills: {
    custom: ["skill-x"],
  },
  cron: {
    tasks: [{ id: "cleanup", schedule: "0 2 * * *" }],
  },
};

const CONFIG_JSON = JSON.stringify(SAMPLE_CONFIG, null, 2);

function createAgentRequest(agentId: string, agentKey: string): NextRequest {
  return new NextRequest(new URL("http://localhost/api/config"), {
    headers: {
      "X-Agent-Id": agentId,
      "X-Agent-Key": agentKey,
    },
  });
}

function createSessionRequest(role: string): NextRequest {
  // Simulate an authenticated session via cookie
  const req = new NextRequest(new URL("http://localhost/api/config"));
  // Override cookies to simulate auth_token
  Object.defineProperty(req.cookies, "get", {
    value: (name: string) => {
      if (name === "auth_token") return { value: "mock-session-token" };
      return undefined;
    },
    configurable: true,
  });
  // Store role in a custom header so the mock can read it
  req.headers.set("X-Test-Role", role);
  return req;
}

describe("/api/config GET sanitization", () => {
  const previousAgentKeys = process.env.OPENCLAW_AGENT_KEYS;

  beforeEach(() => {
    process.env.OPENCLAW_AGENT_KEYS = "main:key-main,coder:key-coder,security:key-sec";
    resetAgentKeysCache();

    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(CONFIG_JSON);

    // Default: mock JWT as valid for session tests
    vi.spyOn(jwtUtils, "isValidToken").mockResolvedValue(true);
    vi.spyOn(jwtUtils, "getTokenFromRequest").mockReturnValue("mock-session-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetAgentKeysCache();

    if (previousAgentKeys === undefined) {
      delete process.env.OPENCLAW_AGENT_KEYS;
    } else {
      process.env.OPENCLAW_AGENT_KEYS = previousAgentKeys;
    }
  });

  describe("admin agent (main)", () => {
    it("returns full config sections", async () => {
      const response = await GET(createAgentRequest("main", "key-main"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections.meta).toBeDefined();
      expect(data.sections.models).toBeDefined();
      expect(data.sections.auth).toBeDefined();
      expect(data.sections.env).toBeDefined();
      expect(data.sections.wizard).toBeDefined();
      expect(data.raw).toBeDefined();
    });

    it("includes models section with data for admin", async () => {
      const response = await GET(createAgentRequest("main", "key-main"));
      const data = await response.json();

      expect(data.sections.models.data).toBeDefined();
      expect(data.sections.models.data.default).toBe("anthropic/claude-sonnet-4");
    });
  });

  describe("non-admin agent (coder, security, etc.)", () => {
    it("returns sanitized config without sensitive sections", async () => {
      const response = await GET(createAgentRequest("coder", "key-coder"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections).toBeDefined();
      expect(data.sections.meta).toBeDefined();
      // Should NOT have sensitive sections
      expect(data.sections.models).toBeUndefined();
      expect(data.sections.auth).toBeUndefined();
      expect(data.sections.env).toBeUndefined();
      expect(data.sections.wizard).toBeUndefined();
      expect(data.raw).toBeUndefined();
    });

    it("includes only version and agent names in metadata", async () => {
      const response = await GET(createAgentRequest("coder", "key-coder"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections.meta.data.version).toBe("2.0.0");
      expect(data.sections.meta.data.openclawVersion).toBe("1.5.0");
      expect(data.sections.meta.data.agents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "main", name: "Main Agent" }),
          expect.objectContaining({ id: "coder", name: "Coder" }),
        ])
      );
    });

    it("does NOT include provider apiKeys or secrets", async () => {
      const response = await GET(createAgentRequest("security", "key-sec"));
      const data = await response.json();

      expect(response.status).toBe(200);
      const raw = JSON.stringify(data);
      expect(raw).not.toContain("sk-ant-super-secret");
      expect(raw).not.toContain("sk-openai-secret");
      expect(data.providers).toBeUndefined();
      expect(data.raw).toBeUndefined();
    });

    it("does NOT include plugins, skills, cron config", async () => {
      const response = await GET(createAgentRequest("coder", "key-coder"));
      const data = await response.json();

      expect(response.status).toBe(200);
      const raw = JSON.stringify(data);
      expect(raw).not.toContain("plugin-a");
      expect(raw).not.toContain("skill-x");
      expect(raw).not.toContain("cleanup");
    });
  });

  describe("session auth (browser user)", () => {
    it("returns full config for admin session", async () => {
      vi.spyOn(jwtUtils, "verifyToken").mockResolvedValue({
        sub: "admin",
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const response = await GET(createSessionRequest("admin"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections.models).toBeDefined();
      expect(data.sections.auth).toBeDefined();
      expect(data.raw).toBeDefined();
    });

    it("returns sanitized config for non-admin session", async () => {
      vi.spyOn(jwtUtils, "verifyToken").mockResolvedValue({
        sub: "viewer",
        role: "user",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const response = await GET(createSessionRequest("user"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections.models).toBeUndefined();
      expect(data.sections.auth).toBeUndefined();
      expect(data.raw).toBeUndefined();
      expect(data.sections.meta).toBeDefined();
      expect(data.sections.meta.data.agents).toBeDefined();
    });
  });
});
