import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { sessionStore } from "@/lib/session-store";

let authToken = "";
const previousAuthSecret = process.env.AUTH_SECRET;

function createMockRequest(
  url: string,
  options?: { method?: string; headers?: Record<string, string> }
): NextRequest {
  const fullUrl = new URL(url, "http://localhost");
  return new NextRequest(fullUrl, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(options?.headers ?? {}),
    },
  });
}

function createParams(key: string): Promise<{ key: string }> {
  return Promise.resolve({ key });
}

describe("/api/sessions/[key]/transcript", () => {
  beforeEach(async () => {
    process.env.AUTH_SECRET = "test-secret-123456789012345678901234567890";
    authToken = await sessionStore.generateToken();
  });

  afterEach(() => {
    sessionStore.clearRevoked();
    if (previousAuthSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = previousAuthSecret;
    }
  });

  describe("GET - Authentication", () => {
    it("returns 401 when not authenticated", async () => {
      const request = new NextRequest(new URL("/api/sessions/test/transcript", "http://localhost"), {
        method: "GET",
      });

      const response = await GET(request, { params: createParams("agent:main:main") });
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when token is invalid", async () => {
      const request = new NextRequest(new URL("/api/sessions/test/transcript", "http://localhost"), {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      const response = await GET(request, { params: createParams("agent:main:main") });
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET - Input Validation", () => {
    it("returns 400 for path traversal attempt", async () => {
      const request = createMockRequest("/api/sessions/../etc/passwd/transcript");
      
      const response = await GET(request, { params: createParams("../etc/passwd") });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid session key");
    });

    it("returns 400 for null byte injection attempt", async () => {
      const request = createMockRequest("/api/sessions/agent:main:main%00/transcript");
      
      const response = await GET(request, { params: createParams("agent:main:main\0") });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid session key");
    });

    it("returns 400 for invalid session key format (missing prefix)", async () => {
      const request = createMockRequest("/api/sessions/invalid-key/transcript");
      
      const response = await GET(request, { params: createParams("invalid-key") });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid session key");
    });

    it("returns 400 for empty session key", async () => {
      const request = createMockRequest("/api/sessions//transcript");
      
      const response = await GET(request, { params: createParams("") });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid session key");
    });

    it("returns 400 for excessively long session key", async () => {
      const longKey = "agent:main:" + "a".repeat(300);
      const request = createMockRequest(`/api/sessions/${longKey}/transcript`);
      
      const response = await GET(request, { params: createParams(longKey) });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid session key");
    });
  });

  describe("GET - Valid Session Keys", () => {
    it("accepts valid session key format (agent:main:main)", async () => {
      // This test verifies the key format validation passes
      // The actual file read will fail with 404 since the session doesn't exist
      const request = createMockRequest("/api/sessions/agent:main:main/transcript");
      
      const response = await GET(request, { params: createParams("agent:main:main") });
      // Either 404 (session not found) or 200 (found) - both are valid
      expect([200, 404, 500]).toContain(response.status);
    });

    it("accepts valid cron session key format", async () => {
      const request = createMockRequest("/api/sessions/agent:main:cron:test-job-id/transcript");
      
      const response = await GET(request, { params: createParams("agent:main:cron:test-job-id") });
      expect([200, 404, 500]).toContain(response.status);
    });

    it("accepts valid subagent session key format", async () => {
      const request = createMockRequest("/api/sessions/agent:main:subagent:abc123/transcript");
      
      const response = await GET(request, { params: createParams("agent:main:subagent:abc123") });
      expect([200, 404, 500]).toContain(response.status);
    });

    it("accepts valid direct chat session key format", async () => {
      const request = createMockRequest("/api/sessions/agent:main:telegram:123456/transcript");
      
      const response = await GET(request, { params: createParams("agent:main:telegram:123456") });
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
