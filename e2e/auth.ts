import { Page } from "@playwright/test";

/**
 * Admin password for E2E tests.
 * MUST be set via E2E_ADMIN_PASSWORD environment variable.
 * Falls back to a placeholder that will fail tests if not set.
 */
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("ERROR: E2E_ADMIN_PASSWORD environment variable is not set!");
  console.error("Set it before running tests: E2E_ADMIN_PASSWORD=your_password npm run test:e2e");
}

/**
 * Perform login on the login page
 */
export async function login(page: Page): Promise<void> {
  if (!ADMIN_PASSWORD) {
    throw new Error("E2E_ADMIN_PASSWORD environment variable must be set");
  }

  await page.goto("/login");
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Iniciar sesión"), button:has-text("Sign In")');
  await page.waitForFunction(
    () => !window.location.pathname.includes("/login"),
    { timeout: 15000 }
  );
}

/**
 * Get admin password (throws if not set)
 */
export function getAdminPassword(): string {
  if (!ADMIN_PASSWORD) {
    throw new Error("E2E_ADMIN_PASSWORD environment variable must be set");
  }
  return ADMIN_PASSWORD;
}
