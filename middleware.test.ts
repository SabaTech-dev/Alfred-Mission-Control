import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "./middleware";
import { resetAgentKeysCache } from "@/lib/agent-auth";
import { jwtUtils } from "@/lib/jwt-utils";

const previousAgentKeys = process.env.OPENCLAW_AGENT_KEYS;
const AUTH_TOKEN = "browser-session-token";

describe("middleware auth policy", () => {
  beforeEach(() => {
    process.env.OPENCLAW_AGENT_KEYS = "agent-a:key-agent-a";
    resetAgentKeysCache();
    vi.spyOn(jwtUtils, "isValidToken").mockResolvedValue(true);
  });

  afterEach(() => {
    if (previousAgentKeys === undefined) {
      delete process.env.OPENCLAW_AGENT_KEYS;
    } else {
      process.env.OPENCLAW_AGENT_KEYS = previousAgentKeys;
    }

    resetAgentKeysCache();
    vi.restoreAllMocks();
  });

  it("allows public auth routes", async () => {
    const request = new NextRequest(new URL("http://localhost/api/auth/login"));
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("blocks non-whitelisted auth-like routes", async () => {
    const request = new NextRequest(new URL("http://localhost/api/auth/internal"));
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  it("blocks protected API routes without session", async () => {
    const request = new NextRequest(new URL("http://localhost/api/git"));
    const response = await middleware(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("allows protected API routes with valid session", async () => {
    const request = new NextRequest(new URL("http://localhost/api/git"), {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it("blocks agent routes when agent credentials are missing", async () => {
    const request = new NextRequest(new URL("http://localhost/api/heartbeat/tasks"));
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });

  it("allows authenticated browser sessions on dashboard operational APIs", async () => {
    const routes = [
      "/api/sessions",
      "/api/config",
      "/api/cron",
      "/api/heartbeat",
      "/api/subagents",
      "/api/handoffs",
      "/api/terminal",
      "/api/collect-usage",
    ];

    for (const route of routes) {
      const request = new NextRequest(new URL(`http://localhost${route}`), {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });

      const response = await middleware(request);
      expect(response.status, route).toBe(200);
    }
  });

  it("allows agent routes with valid agent credentials", async () => {
    const request = new NextRequest(new URL("http://localhost/api/heartbeat/tasks"), {
      headers: {
        "X-Agent-Id": "agent-a",
        "X-Agent-Key": "key-agent-a",
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it("does not allow session-only access to heartbeat agent route", async () => {
    const request = new NextRequest(new URL("http://localhost/api/heartbeat/tasks"), {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const response = await middleware(request);
    expect(response.status).toBe(401);
  });

  it("allows session access to kanban agent routes", async () => {
    const request = new NextRequest(new URL("http://localhost/api/kanban/agent/tasks"), {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});
