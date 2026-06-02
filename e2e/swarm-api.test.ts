/**
 * E2E Tests — Agent Swarm Integration (API Level)
 *
 * Tests direct Swarm server endpoints via API context.
 * AMC proxy tests are covered in swarm-ui.test.ts (authenticated browser tests).
 */

import { test, expect } from "@playwright/test";

const SWARM_URL = "http://localhost:3013";
const SWARM_API_KEY = process.env.SWARM_API_KEY || "";

function swarmHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (SWARM_API_KEY) {
    h["Authorization"] = `Bearer ${SWARM_API_KEY}`;
  }
  return h;
}

// ─────────────────────────────────────────────────────
// Swarm Server — Direct API
// ─────────────────────────────────────────────────────

test.describe("Swarm Server Direct API", () => {

  test("GET /health → 200 + status ok", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/health`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("version");
    expect(typeof body.version).toBe("string");
  });

  test("GET /health → contains version string", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/health`);
    const body = await res.json();
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("GET /api/agents → 200 + agents array", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/api/agents`, {
      headers: swarmHeaders(),
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const agents = Array.isArray(body) ? body : body.agents;
    expect(agents).toBeDefined();
    expect(Array.isArray(agents)).toBe(true);
  });

  test("GET /api/tasks → 200 + tasks array", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/api/tasks`, {
      headers: swarmHeaders(),
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const tasks = Array.isArray(body) ? body : body.tasks;
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
  });

  test("GET /api/tasks → each task has required fields", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/api/tasks`, {
      headers: swarmHeaders(),
    });
    const body = await res.json();
    const tasks = Array.isArray(body) ? body : body.tasks;

    expect(tasks.length).toBeGreaterThan(0);

    for (const task of tasks) {
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("status");
      expect(task).toHaveProperty("task");
      expect(typeof task.id).toBe("string");
      expect(typeof task.status).toBe("string");
    }
  });

  test("GET /api/tasks returns valid task structure", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/api/tasks`, {
      headers: swarmHeaders(),
    });
    const body = await res.json();
    const tasks = Array.isArray(body) ? body : body.tasks;

    if (tasks.length > 0) {
      const first = tasks[0];
      // Check common fields
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("status");
      expect(typeof first.id).toBe("string");
      expect(first.id.length).toBeGreaterThan(0);
    }
  });

  test("GET /api/tasks?status=pending → filtered results", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/api/tasks?status=pending`, {
      headers: swarmHeaders(),
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const tasks = Array.isArray(body) ? body : body.tasks;
    expect(Array.isArray(tasks)).toBe(true);

    for (const task of tasks) {
      expect(task.status).toBe("pending");
    }
  });

  test("GET /api/tasks → response has total or is array", async ({ request }) => {
    const res = await request.get(`${SWARM_URL}/api/tasks`, {
      headers: swarmHeaders(),
    });
    const body = await res.json();

    // Swarm may return array or { tasks, total }
    if (Array.isArray(body)) {
      expect(body.length).toBeGreaterThanOrEqual(0);
    } else {
      expect(body).toHaveProperty("tasks");
      if (body.total !== undefined) {
        expect(typeof body.total).toBe("number");
        expect(body.total).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─────────────────────────────────────────────────────
// AMC Swarm Proxy — Health (public endpoint)
// ─────────────────────────────────────────────────────

test.describe("AMC Swarm Proxy API", () => {

  test("GET /api/swarm/health → responds (200, 307, 302, or 401)", async ({ request }) => {
    // Health endpoint may redirect to login (307) or return 200
    const res = await request.get("http://localhost:3000/api/swarm/health", {
      // Don't follow redirects so we can check status
      maxRedirects: 0,
    });
    expect([200, 307, 302, 401]).toContain(res.status());
  });

  test("GET /api/swarm/health without redirects → 200 when accessible", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/swarm/health", {
      maxRedirects: 0,
    });

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("connected");
      expect(body).toHaveProperty("timestamp");
    } else {
      // Redirect to login is acceptable
      expect([307, 302, 401]).toContain(res.status());
    }
  });
});

// ─────────────────────────────────────────────────────
// Performance & Resilience
// ─────────────────────────────────────────────────────

test.describe("Performance & Resilience", () => {

  test("Swarm direct health is fast (< 1s)", async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${SWARM_URL}/health`);
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(1000);
  });

  test("Swarm /api/tasks responds within 3s", async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${SWARM_URL}/api/tasks`, {
      headers: swarmHeaders(),
    });
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    expect(elapsed).toBeLessThan(3000);
  });

  test("Swarm concurrent requests don't fail", async ({ request }) => {
    const requests = Array.from({ length: 5 }, () =>
      request.get(`${SWARM_URL}/health`)
    );

    const responses = await Promise.all(requests);

    for (const res of responses) {
      expect(res.status()).toBe(200);
    }
  });
});
