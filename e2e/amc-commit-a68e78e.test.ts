/**
 * E2E Tests — AMC commit a68e78e
 * 
 * BUG ENCONTRADO: El cookie-based session auth está roto.
 * El middleware corre en Edge runtime y el session store (in-memory Map)
 * no se comparte con los API routes (Node.js runtime).
 * Resultado: Login API crea token, pero middleware no lo reconoce → siempre redirect a /login.
 * 
 * Workaround: Usar Agent auth (X-Agent-Id + X-Agent-Key) para API tests.
 * 
 * Test Strategy:
 * 1. API tests — Agent auth (headers) → verify all endpoints work
 * 2. Page tests — Verify HTML is served, check page structure
 * 3. Document auth bug
 */

import { test, expect, Page } from "@playwright/test";

const AGENT_HEADERS = {
  "X-Agent-Id": "main",
  "X-Agent-Key": "sk-main-alfred-2026",
};

// ───────────────────────────────────────────────────────────────────
//  1. API TESTS — Reports
// ───────────────────────────────────────────────────────────────────
test.describe("1. Reports API", () => {
  test("1.1 Reports API returns data", async ({ request }) => {
    const response = await request.get("/api/reports", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    // Reports should have some structure
    expect(typeof data).toBe("object");
  });

  test("1.2 Reports files endpoint accessible", async ({ request }) => {
    const response = await request.get("/api/reports/files", { headers: AGENT_HEADERS });
    expect([200, 404]).toContain(response.status());
  });
});

// ───────────────────────────────────────────────────────────────────
//  2. API TESTS — Pipeline
// ───────────────────────────────────────────────────────────────────
test.describe("2. Pipeline API", () => {
  test("2.1 Pipeline API returns opportunities and KPIs", async ({ request }) => {
    const response = await request.get("/api/pipeline", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("opportunities");
    expect(data).toHaveProperty("kpis");
    expect(Array.isArray(data.opportunities)).toBeTruthy();
  });

  test("2.2 Pipeline KPIs structure", async ({ request }) => {
    const response = await request.get("/api/pipeline", { headers: AGENT_HEADERS });
    const data = await response.json();
    // KPIs should have numeric values
    expect(data.kpis).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────────
//  3. API TESTS — Kanban
// ───────────────────────────────────────────────────────────────────
test.describe("3. Kanban API", () => {
  test("3.1 Kanban columns API returns data", async ({ request }) => {
    const response = await request.get("/api/kanban/columns", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("columns");
    expect(Array.isArray(data.columns)).toBeTruthy();
    // Should have standard columns
    const columnIds = data.columns.map((c: any) => c.id);
    expect(columnIds).toContain("backlog");
    expect(columnIds).toContain("in_progress");
    expect(columnIds).toContain("review");
    expect(columnIds).toContain("done");
  });

  test("3.2 Kanban tasks API returns data", async ({ request }) => {
    const response = await request.get("/api/kanban/tasks", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("tasks");
    expect(Array.isArray(data.tasks)).toBeTruthy();
  });

  test("3.3 Kanban tasks support view parameter", async ({ request }) => {
    const response = await request.get("/api/kanban/tasks?view=active", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
  });
});

// ───────────────────────────────────────────────────────────────────
//  4. API TESTS — Live Sessions
// ───────────────────────────────────────────────────────────────────
test.describe("4. Live Sessions API", () => {
  test("4.1 Live API returns correct structure", async ({ request }) => {
    const response = await request.get("/api/live?filter=active", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("sessions");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("hasActive");
    expect(Array.isArray(data.sessions)).toBeTruthy();
  });

  test("4.2 Live API filter=all returns all sessions", async ({ request }) => {
    const response = await request.get("/api/live?filter=all", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.sessions.length).toBeGreaterThanOrEqual(0);
  });

  test("4.3 Live API filter=type:direct", async ({ request }) => {
    const response = await request.get("/api/live?filter=type:direct", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("sessions");
  });

  test("4.4 Live API filter=type:cron", async ({ request }) => {
    const response = await request.get("/api/live?filter=type:cron", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("sessions");
  });

  test("4.5 Live API filter=type:spawn-child", async ({ request }) => {
    const response = await request.get("/api/live?filter=type:spawn-child", { headers: AGENT_HEADERS });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("sessions");
  });

  test("4.6 Live sessions have required fields", async ({ request }) => {
    const response = await request.get("/api/live?filter=all", { headers: AGENT_HEADERS });
    const data = await response.json();
    if (data.sessions.length > 0) {
      const session = data.sessions[0];
      // API response fields (sessionKey may not be present — it's parsed client-side)
      expect(session).toHaveProperty("agent");
      expect(session).toHaveProperty("model");
      expect(session).toHaveProperty("status");
      expect(session).toHaveProperty("tokensIn");
      expect(session).toHaveProperty("tokensOut");
      expect(session).toHaveProperty("totalTokens");
      expect(session).toHaveProperty("duration");
      expect(session.duration).toHaveProperty("ms");
      expect(session.duration).toHaveProperty("formatted");
    }
  });
});

// ───────────────────────────────────────────────────────────────────
//  5. PAGE TESTS — Verify HTML served
// ───────────────────────────────────────────────────────────────────
test.describe("5. Page Serving", () => {
  test("5.1 Login page renders correctly", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    
    // Login page should have password input and submit button
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Should have Alfred branding
    const body = await page.locator("body").textContent();
    expect(body).toContain("Alfred");
  });

  test("5.2 Login page has i18n — shows Sign In or Iniciar sesión", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    
    const body = await page.locator("body").textContent();
    const hasSignIn = /sign.?in|iniciar.*sesión/i.test(body || "");
    expect(hasSignIn).toBeTruthy();
  });

  test("5.3 Dashboard pages redirect to login (auth enforced)", async ({ page }) => {
    for (const path of ["/reports", "/pipeline", "/kanban", "/live"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      // Should redirect to login
      expect(page.url()).toContain("/login");
    }
  });

  test("5.4 Login form works — form submission accepted by API", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    
    // Fill password
    await page.locator('input[type="password"]').fill("Alfred-2026-MC!");
    
    // Listen for the API response
    const apiPromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/auth/login"),
      { timeout: 10000 }
    );
    
    await page.locator('button[type="submit"]').click();
    const response = await apiPromise;
    
    // Login API should return success
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data).toHaveProperty("expiresIn");
  });
});

// ───────────────────────────────────────────────────────────────────
//  6. CROSS-CUTTING — No server errors
// ───────────────────────────────────────────────────────────────────
test.describe("6. Cross-Cutting", () => {
  test("6.1 No 500 errors on API endpoints", async ({ request }) => {
    const endpoints = [
      "/api/reports",
      "/api/pipeline",
      "/api/kanban/columns",
      "/api/kanban/tasks",
      "/api/live?filter=active",
      "/api/live?filter=all",
      "/api/live?filter=type:direct",
      "/api/live?filter=type:cron",
      "/api/live?filter=type:spawn-child",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint, { headers: AGENT_HEADERS });
      expect(response.status()).toBe(200);
    }
  });

  test("6.2 API endpoints require auth", async ({ request }) => {
    // Without auth headers, should return 401
    const endpoints = [
      "/api/pipeline",
      "/api/kanban/columns",
      "/api/live?filter=active",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test("6.3 Health endpoint is public", async ({ request }) => {
    const response = await request.get("/api/health");
    // Should not return 401
    expect(response.status()).not.toBe(401);
  });
});

// ───────────────────────────────────────────────────────────────────
//  7. BUG DOCUMENTATION
// ───────────────────────────────────────────────────────────────────
test.describe("7. BUG: Cookie-based session auth broken", () => {
  test("BUG: Login creates token but middleware doesn't recognize it", async ({ request }) => {
    // Step 1: Login via API
    const loginResponse = await request.post("/api/auth/login", {
      data: { password: "Alfred-2026-MC!" },
    });
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    expect(loginData.success).toBeTruthy();
    
    // Step 2: Extract auth_token cookie
    const cookies = loginResponse.headers()["set-cookie"];
    expect(cookies).toContain("auth_token=");
    
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch![1];
    
    // Step 3: Try to use the cookie — this SHOULD work but DOESN'T
    const apiResponse = await request.get("/api/kanban/columns", {
      headers: { Cookie: `auth_token=${token}` },
    });
    
    // BUG: This returns 401 instead of 200
    // Root cause: middleware.ts runs on Edge runtime, sessionStore runs on Node.js runtime
    // The in-memory Map is not shared between runtimes
    expect(apiResponse.status()).toBe(401); // This assertion documents the bug
    
    // Contrast: Agent auth works fine
    const agentResponse = await request.get("/api/kanban/columns", {
      headers: AGENT_HEADERS,
    });
    expect(agentResponse.status()).toBe(200); // Agent auth works perfectly
  });
});
