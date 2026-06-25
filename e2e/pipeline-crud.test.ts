import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * E2E test for the Pipeline CRUD flow.
 *
 * Verifies:
 *   1. Login on /login with the admin password.
 *   2. The /pipeline dashboard renders without console errors.
 *   3. An opportunity created via the API (with agent headers) appears
 *      in the dashboard list.
 *   4. PATCHing the opportunity changes its stage.
 *   5. The opportunity is cleaned up afterwards.
 *
 * Credentials come from (in order):
 *   - process.env.E2E_ADMIN_PASSWORD / process.env.PIPELINE_AGENT_KEY (preferred)
 *   - ADMIN_PASSWORD / KANBAN_AGENT_KEYS parsed from .env.local (fallback)
 *
 * The test is self-contained and does NOT require the operator to pass
 * anything explicitly when running from the project root, because it
 * parses .env.local automatically.
 */

function loadEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  let content: string;
  try {
    content = fs.readFileSync(file, "utf-8");
  } catch {
    return out;
  }
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const ENV_FILE = loadEnvFile(path.resolve(__dirname, "..", ".env.local"));

function getAdminPassword(): string {
  const pw = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || ENV_FILE.ADMIN_PASSWORD;
  if (!pw) {
    throw new Error(
      "Admin password not found. Set E2E_ADMIN_PASSWORD or ADMIN_PASSWORD in .env.local."
    );
  }
  return pw;
}

interface AgentCreds {
  agentId: string;
  agentKey: string;
}

function getAgentCreds(): AgentCreds {
  // Parse KANBAN_AGENT_KEYS / OPENCLAW_AGENT_KEYS and pick "main" if present
  // (this is the canonical agent identity used by the pipeline API).
  // .env.local takes priority because the surrounding shell may carry
  // placeholder values like "sk-mai…2026" (with an ellipsis) that are not
  // real credentials.
  const raw =
    ENV_FILE.KANBAN_AGENT_KEYS ||
    ENV_FILE.OPENCLAW_AGENT_KEYS ||
    process.env.KANBAN_AGENT_KEYS ||
    process.env.OPENCLAW_AGENT_KEYS ||
    "";
  let first: AgentCreds | null = null;
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const id = trimmed.slice(0, idx).trim();
    const key = trimmed.slice(idx + 1).trim();
    if (!id || !key) continue;
    // Reject obvious placeholders (non-ASCII or ellipsis) so we never send
    // an invalid header value to the server.
    if (!/^[A-Za-z0-9_-]+$/.test(id)) continue;
    if (!/^[A-Za-z0-9_.\-]+$/.test(key)) continue;
    if (!first) first = { agentId: id, agentKey: key };
    if (id === "main") return { agentId: id, agentKey: key };
  }
  if (first) return first;

  // Last-resort fallback to explicit scraper env vars.
  const scraperId = process.env.PIPELINE_AGENT_ID || ENV_FILE.PIPELINE_AGENT_ID;
  const scraperKey = process.env.PIPELINE_AGENT_KEY || ENV_FILE.PIPELINE_AGENT_KEY;
  if (scraperId && scraperKey) return { agentId: scraperId, agentKey: scraperKey };

  throw new Error(
    "No agent credentials found. Set KANBAN_AGENT_KEYS (with main:<key>) in .env.local."
  );
}

const ADMIN_PASSWORD = getAdminPassword();
const AGENT = getAgentCreds();

// Marker is unique per test run so we can identify our opp and clean up.
const MARKER = `E2E-${Date.now()}`;
const COMPANY = `E2E Test Corp ${MARKER}`;
const TITLE = `E2E QA Framework ${MARKER}`;

async function loginFlow(page: Page): Promise<void> {
  await page.goto("/login");
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Iniciar sesión"), button:has-text("Sign In")');
  await page.waitForFunction(
    () => !window.location.pathname.includes("/login"),
    { timeout: 20000 }
  );
}

test.describe("Pipeline CRUD — end to end", () => {
  // Holds the opportunity id created during the single test run; cleaned up
  // in afterEach. We keep the test self-contained in a single `test()` block
  // so the dashboard flow and the API flow share one browser session.
  let createdId: string | null = null;

  test.afterEach(async ({ request }) => {
    if (!createdId) return;
    try {
      await request.delete(`/api/pipeline/${createdId}`, {
        headers: {
          "X-Agent-Id": AGENT.agentId,
          "X-Agent-Key": AGENT.agentKey,
        },
      });
    } catch {
      // Best-effort cleanup; ignore network errors.
    }
    createdId = null;
  });

  test("login, view pipeline, see created opportunity, update stage", async ({
    page,
    request,
  }) => {
    // Sanity-check that the parsed credentials produce valid header values.
    // Playwright rejects header values with control characters, so we
    // surface a clear failure here instead of an opaque HTTP error later.
    expect(AGENT.agentId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(AGENT.agentKey).toMatch(/^[A-Za-z0-9_.\-]+$/);

    // Capture any console error during the whole flow.
    //
    // We only fail on errors that originate from the pipeline feature itself.
    // The dashboard shell (layout) loads other widgets — system monitor,
    // notifications, telemetry — whose backing APIs may time out or 5xx in
    // the test environment; their "Failed to fetch..." messages are network
    // failures, not application defects of the pipeline under test. We
    // still capture uncaught pageerrors (real React/runtime crashes) because
    // those are regressions regardless of source.
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      // Ignore benign resource warnings.
      if (/favicon|preload|Failed to load resource/i.test(text)) return;
      // Ignore network-layer fetch failures from unrelated shell widgets.
      if (
        /^Failed to fetch/i.test(text) ||
        /Failed to (load|fetch) (telemetry|system monitor|notifications)/i.test(text)
      ) {
        return;
      }
      consoleErrors.push(text);
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`pageerror: ${err.message}`);
    });

    // 1) Login
    await loginFlow(page);
    expect(page.url()).not.toContain("/login");

    // 2) Create the opportunity via the API (agent headers).
    const createRes = await request.post("/api/pipeline", {
      data: {
        company: COMPANY,
        title: TITLE,
        description: "Created by E2E pipeline-crud test",
        value: 12500,
        currency: "EUR",
        service_type: "consultoria_audit",
        stage: "lead",
        source: "e2e-test",
        source_type: "business_opportunity",
      },
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Id": AGENT.agentId,
        "X-Agent-Key": AGENT.agentKey,
      },
    });
    expect(createRes.status(), "POST /api/pipeline should return 201").toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeTruthy();
    expect(created.company).toBe(COMPANY);
    createdId = created.id;

    // 3) Navigate to /pipeline and confirm it renders.
    //    First navigation after login can be slow due to module compilation,
    //    so allow generous headroom.
    await page.goto("/pipeline", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForFunction(
      () => /Pipeline|Ventas|Oportunidades/i.test(document.body.innerText || ""),
      { timeout: 25000 }
    );

    // 4) The created opportunity must appear. Switching to list view gives
    //    the most reliable text match across pipeline/list layouts.
    const listToggle = page.locator(
      'button:has-text("Lista"), button:has-text("List")'
    );
    if (await listToggle.first().isVisible().catch(() => false)) {
      await listToggle.first().click();
    }

    await expect
      .poll(
        async () => {
          const body = (await page.locator("body").innerText()) || "";
          return body.includes(COMPANY);
        },
        { timeout: 25000, intervals: [1_000, 2_000] }
      )
      .toBeTruthy();

    // 5) Update the opportunity's stage via the API and assert the change.
    const patchRes = await request.patch(`/api/pipeline/${createdId}`, {
      data: { stage: "qualifying", value: 15000 },
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Id": AGENT.agentId,
        "X-Agent-Key": AGENT.agentKey,
      },
    });
    expect(patchRes.status(), "PATCH should return 200").toBe(200);
    const patched = await patchRes.json();
    expect(patched.stage).toBe("qualifying");
    expect(patched.value).toBe(15000);

    // 6) Console must be clean (no app-level errors).
    expect(consoleErrors, `Console errors: ${consoleErrors.join("\n")}`).toEqual([]);
  });
});
