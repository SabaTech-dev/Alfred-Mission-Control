import { test, expect } from "@playwright/test";
import { getAdminPassword } from "./auth";

test.describe("Login Flow", () => {
  test("should login successfully", async ({ page }) => {
    // Go to login page
    await page.goto("/login");

    // Wait for form to be visible
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Fill password and submit
    await page.fill('input[type="password"]', getAdminPassword());
    await page.click('button:has-text("Iniciar sesión"), button:has-text("Sign In")');

    // Wait for navigation (check URL changed from /login)
    await page.waitForFunction(
      () => !window.location.pathname.includes("/login"),
      { timeout: 15000 }
    );

    // Verify we're not on login page anymore
    expect(page.url()).not.toContain("/login");
  });

  test("should show error with wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Fill wrong password
    await page.fill('input[type="password"]', "wrong-password");
    await page.click('button:has-text("Iniciar sesión"), button:has-text("Sign In")');

    // Wait for error message
    // Wait for error message (ES: "Contraseña incorrecta", EN: "Incorrect password")
    await page.waitForSelector("text=/incorrecta|incorrect/i", { timeout: 10000 });

    // Should still be on login page
    expect(page.url()).toContain("/login");
  });
});
