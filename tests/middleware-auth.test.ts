import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "../middleware";
import { resetAgentKeysCache } from "@/lib/agent-auth";
import { jwtUtils } from "@/lib/jwt-utils";

const previousAgentKeys = process.env.OPENCLAW_AGENT_KEYS;
const AUTH_TOKEN = "browser-session-token";

describe("middleware dashboard auth", () => {
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
      "/api/logs/stream?service=alfred",
    ];

    for (const route of routes) {
      const request = new NextRequest(new URL(`http://localhost${route}`), {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      });

      const response = await middleware(request);
      expect(response.status, route).toBe(200);
    }
  });

  it("keeps /api/heartbeat/tasks restricted to authenticated agents", async () => {
    const sessionRequest = new NextRequest(new URL("http://localhost/api/heartbeat/tasks"), {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const sessionResponse = await middleware(sessionRequest);
    expect(sessionResponse.status).toBe(401);

    const agentRequest = new NextRequest(new URL("http://localhost/api/heartbeat/tasks"), {
      headers: {
        "X-Agent-Id": "agent-a",
        "X-Agent-Key": "key-agent-a",
      },
    });

    const agentResponse = await middleware(agentRequest);
    expect(agentResponse.status).toBe(200);
  });
});
