import { test, expect } from "@playwright/test";
import { login } from "./auth";

test.describe("Dashboard", () => {
  test("should load after login", async ({ page }) => {
    await login(page);

    // Wait for main content to appear
    await page.waitForSelector("body", { timeout: 10000 });

    // Check page has content (any text at all)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test("should show Alfred Mission Control branding", async ({ page }) => {
    await login(page);

    // Look for Alfred Mission Control heading specifically
    const heading = page.locator('h1:has-text("Alfred")').first();
    await heading.waitFor({ timeout: 10000 });

    expect(await heading.isVisible()).toBe(true);
  });
});
