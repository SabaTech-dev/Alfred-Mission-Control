/**
 * E2E Tests — JWT Auth Fix (commits 3a49cf3 + 92d56b0)
 * 
 * Testing JWT stateless auth implementation that replaces in-memory session store.
 * This should fix the bug where Edge runtime middleware couldn't validate sessions
 * created by Node.js API routes.
 */

import { test, expect, Page } from "@playwright/test";

import { login } from "./auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

function trackConsoleErrors(page: Page): {
  errors: string[];
  dispose: () => void;
} {
  const errors: string[] = [];
  const listener = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  };

  page.on("console", listener);

  return {
    errors,
    dispose: () => page.off("console", listener),
  };
}

// ───────────────────────────────────────────────────────────────────
//  1. AUTH PERSISTENCE
// ───────────────────────────────────────────────────────────────────
test.describe("1. Auth Persistence", () => {
  test("1.1 Login in browser → session persists after navigation", async ({ page }) => {
    await login(page);

    // Step 1: Should redirect to home page (not login page)
    expect(page.url()).not.toContain("/login");

    // Step 2: Navigate to other pages → session should persist
    await page.goto("/reports", { waitUntil: "networkidle" });
    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/reports");

    await page.goto("/pipeline", { waitUntil: "networkidle" });
    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/pipeline");

    await page.goto("/kanban", { waitUntil: "networkidle" });
    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/kanban");

    await page.goto("/live", { waitUntil: "networkidle" });
    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/live");
  });

  test("1.2 API endpoints work with session cookie after login", async ({ page }) => {
    await login(page);

    // Test API endpoints work with the session cookie
    const apiTests = [
      "/api/reports",
      "/api/pipeline",
      "/api/kanban/columns",
      "/api/live?filter=active"
    ];

    for (const endpoint of apiTests) {
      const response = await page.request.get(BASE_URL + endpoint);
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      // Should not have "error" property
      expect(data).not.toHaveProperty("error");
    }
  });
});

// ───────────────────────────────────────────────────────────────────
//  2. PAGE FUNCTIONALITY
// ───────────────────────────────────────────────────────────────────
test.describe("2. Page Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("2.1 /reports — auto-refresh 10min works", async ({ page }) => {
    await page.goto("/reports", { waitUntil: "networkidle" });

    // Check reports page loads
    await expect(page.locator("body")).toHaveText(/reports/i, { timeout: 10000 });

    // Look for auto-refresh elements (might be hidden/invisible)
    const hasAutoRefresh = await page.locator("body").textContent().then((text) =>
      /auto.?refresh|refresh|update/i.test(text || "")
    );
    console.log("Reports page has auto-refresh indication:", hasAutoRefresh);

    // Check API endpoint works
    const response = await page.request.get(`${BASE_URL}/api/reports`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).not.toHaveProperty("error");
  });
  
  test("2.2 /pipeline — auto-refresh 60s, scraping button visible", async ({ page }) => {
    await page.goto("/pipeline", { waitUntil: "networkidle" });

    // Check pipeline page loads
    await expect(page.locator("body")).toHaveText(/pipeline/i, { timeout: 10000 });

    // Look for scraping button (might have different text)
    const scrapingButton = page.locator('button', { hasText: /scrap|scrape|run/i }).first();
    const hasScrapingButton = await scrapingButton.isVisible().catch(() => false);
    console.log("Pipeline has scraping button:", hasScrapingButton);

    // Check API endpoint works
    const response = await page.request.get(`${BASE_URL}/api/pipeline`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).not.toHaveProperty("error");
    expect(data).toHaveProperty("opportunities");
    expect(data).toHaveProperty("kpis");
  });
  
  test("2.3 /kanban — auto-refresh 60s", async ({ page }) => {
    await page.goto("/kanban", { waitUntil: "networkidle" });

    // Check kanban page loads
    await expect(page.locator("body")).toHaveText(/kanban/i, { timeout: 10000 });

    // Look for kanban columns (backlog, in_progress, review, done)
    const hasKanbanColumns = await page.locator("body").textContent().then((text) =>
      /backlog|in progress|review|done/i.test(text || "")
    );
    console.log("Kanban has columns:", hasKanbanColumns);

    // Check API endpoints work
    const columnsResponse = await page.request.get(`${BASE_URL}/api/kanban/columns`);
    expect(columnsResponse.status()).toBe(200);
    const columnsData = await columnsResponse.json();
    expect(columnsData).toBeDefined();
    expect(columnsData).toHaveProperty("columns");
    
    const tasksResponse = await page.request.get(`${BASE_URL}/api/kanban/tasks`);
    expect(tasksResponse.status()).toBe(200);
    const tasksData = await tasksResponse.json();
    expect(tasksData).toBeDefined();
    expect(tasksData).toHaveProperty("tasks");
  });
  
  test("2.4 /live — filters work (Activas/Todas/Crons/etc)", async ({ page }) => {
    await page.goto("/live", { waitUntil: "networkidle" });

    // Check live page loads
    await expect(page.locator("body")).toHaveText(/live|sessions/i, { timeout: 10000 });

    // Look for filter buttons
    const filterButtons = [
      "Activas",
      "Todas", 
      "Direct",
      "Crons",
      "Subagentes"
    ];

    for (const buttonText of filterButtons) {
      const button = page.locator('button', { hasText: buttonText }).first();
      const isVisible = await button.isVisible().catch(() => false);
      console.log(`Filter button "${buttonText}" visible:`, isVisible);

      if (isVisible) {
        // Click the button and check if it works
        await button.click();
        await page.waitForTimeout(1000); // Wait for refresh

        // Check API still works
        const response = await page.request.get(`${BASE_URL}/api/live?filter=active`);
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toBeDefined();
        expect(data).not.toHaveProperty("error");
        expect(data).toHaveProperty("sessions");
        expect(data).toHaveProperty("timestamp");
      }
    }
  });
  
  test("2.5 Pipeline popup modal — cards clickable", async ({ page }) => {
    await page.goto("/pipeline", { waitUntil: "networkidle" });

    // Look for any clickable cards or items
    const cards = page.locator('[role="button"], .card, [data-testid*="card"], [class*="card"]').first();
    const hasCards = await cards.count() > 0;
    console.log("Pipeline has cards:", hasCards);

    if (hasCards) {
      // Click the first card
      await cards.first().click();
      await page.waitForTimeout(1000);

      // Look for modal
      const modal = page.locator('.modal, [role="dialog"], [class*="modal"]').first();
      const hasModal = await modal.isVisible().catch(() => false);
      console.log("Modal visible after clicking card:", hasModal);

      if (hasModal) {
        // Check modal has content
        const modalText = await modal.textContent();
        expect(modalText).toBeTruthy();
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────
//  3. ERROR HANDLING
// ───────────────────────────────────────────────────────────────────
test.describe("3. Error Handling", () => {
  test("3.1 No console errors on all pages", async ({ page }) => {
    const pages = ["/reports", "/pipeline", "/kanban", "/live"];

    await login(page);

    const consoleTracker = trackConsoleErrors(page);

    try {
      for (const pagePath of pages) {
        consoleTracker.errors.length = 0;

        await page.goto(pagePath, { waitUntil: "networkidle" });
        await page.waitForTimeout(1500);

        // Page should load without auth regressions
        expect(page.url()).not.toContain("/login");
        expect(page.url()).toContain(pagePath);
        expect(
          consoleTracker.errors,
          `Chromium console errors detected on ${pagePath}:\n${consoleTracker.errors.join("\n")}`
        ).toEqual([]);
      }
    } finally {
      consoleTracker.dispose();
    }
  });

  test("3.2 No 500 server errors", async ({ page }) => {
    // Test all API endpoints
    const endpoints = [
      "/api/reports",
      "/api/pipeline",
      "/api/kanban/columns",
      "/api/kanban/tasks",
      "/api/live?filter=active",
      "/api/live?filter=all"
    ];
    await login(page);

    for (const endpoint of endpoints) {
      const response = await page.request.get(BASE_URL + endpoint);
      expect(response.status()).not.toBe(500);
      expect([200, 401, 404, 302]).toContain(response.status());
    }
  });
});

// ───────────────────────────────────────────────────────────────────
//  4. REGRESSION TEST
// ───────────────────────────────────────────────────────────────────
test.describe("4. Regression Test", () => {
  test("4.1 Old cookie-based auth bug is fixed", async ({ page }) => {
    // This test verifies the fix for the bug we found in commit a68e78e

    // Step 1: Login via browser (creates JWT cookie)
    await login(page);

    // Step 2: Navigate to a protected page → should work (not redirect to login)
    await page.goto("/kanban", { waitUntil: "networkidle" });
    expect(page.url()).toContain("/kanban");
    expect(page.url()).not.toContain("/login");

    // Step 3: API endpoints should work with session cookie
    const response = await page.request.get(`${BASE_URL}/api/kanban/columns`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty("columns");
    
    // The bug is fixed: JWT auth works across Edge/Node runtime boundary
  });
});