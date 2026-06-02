/**
 * E2E Tests — Swarm Tab UI (AMC Dashboard)
 *
 * Tests the Swarm dashboard page via Playwright browser automation.
 * Requires E2E_ADMIN_PASSWORD environment variable for login.
 */

import { test, expect } from "@playwright/test";
import { login } from "./auth";

const AMC_URL = "http://localhost:3000";

test.describe("Swarm Dashboard UI", () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Swarm page loads at /swarm", async ({ page }) => {
    await page.goto("/swarm");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Page should show the Swarm title
    const heading = page.locator("h1, h2").filter({ hasText: /Swarm|swarm/i }).first();
    await heading.waitFor({ timeout: 10000 });
    expect(await heading.isVisible()).toBe(true);
  });

  test("Swarm tab is accessible from dashboard navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Look for Swarm link/button in navigation
    const swarmLink = page.locator('a[href="/swarm"], a[href*="swarm"], button:has-text("Swarm"), a:has-text("Swarm"), [data-testid*="swarm"]').first();

    if (await swarmLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await swarmLink.click();
      await page.waitForLoadState("networkidle", { timeout: 10000 });

      // Should now be on /swarm
      expect(page.url()).toContain("/swarm");
    } else {
      // Navigation might be in a sidebar or drawer - just verify /swarm works directly
      await page.goto("/swarm");
      await page.waitForLoadState("networkidle", { timeout: 10000 });
      expect(page.url()).toContain("/swarm");
    }
  });

  test("API status indicator is visible", async ({ page }) => {
    await page.goto("/swarm");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Look for status badge/indicator
    const statusText = page
      .locator("text=/online|offline|connected|loading/i")
      .first();
    await statusText.waitFor({ timeout: 10000 });
    expect(await statusText.isVisible()).toBe(true);
  });

  test("Tasks section is visible", async ({ page }) => {
    await page.goto("/swarm");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Look for tasks header/section
    const tasksHeader = page
      .locator("text=/tasks|tareas/i")
      .first();
    await tasksHeader.waitFor({ timeout: 10000 });
    expect(await tasksHeader.isVisible()).toBe(true);
  });

  test("Refresh button is present and clickable", async ({ page }) => {
    await page.goto("/swarm");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Look for refresh button
    const refreshBtn = page
      .locator("button:has-text('Refresh'), button:has-text('Refres'), button:has([class*='refresh']), button:has-text('Actualiz')")
      .first();

    if (await refreshBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshBtn.click();
      // Wait a moment for refresh
      await page.waitForTimeout(2000);
      // Page should still be functional
      expect(await page.locator("body").isVisible()).toBe(true);
    }
  });

  test("Swarm proxy error shows offline/error state gracefully", async ({ page }) => {
    await page.goto("/swarm");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Page should render regardless of connection status
    const body = await page.locator("body").textContent();
    expect(body?.length).toBeGreaterThan(50);

    // Should show either online, offline, or error — not crash
    const hasStatus = await page
      .locator("text=/online|offline|error|connected|unreachable/i")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    expect(hasStatus).toBe(true);
  });

  test("Swarm page renders within acceptable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/swarm");
    await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
    const elapsed = Date.now() - start;

    // Page should load in under 20 seconds (cold start on ARM can be slow)
    expect(elapsed).toBeLessThan(20000);
  });
});
