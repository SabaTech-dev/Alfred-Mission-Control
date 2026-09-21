import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/safe-exec", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/safe-exec")>();
  return { ...actual, safeExecFile: vi.fn() };
});

import { POST, PUT } from "./route";
import { safeExecFile } from "@/lib/safe-exec";

const mockExec = vi.mocked(safeExecFile);

function createRequest(
  url: string,
  options?: { method?: string; body?: unknown }
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), {
    method: options?.method ?? "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { "Content-Type": "application/json" } : {},
  });
}

function execArgs(): string[] {
  expect(mockExec).toHaveBeenCalled();
  return mockExec.mock.calls[mockExec.mock.calls.length - 1][1];
}

describe("/api/cron POST", () => {
  beforeEach(() => {
    mockExec.mockReset();
    mockExec.mockReturnValue({ stdout: '{"id":"job-1"}', stderr: "", status: 0 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a job and echoes CLI JSON on success", async () => {
    const res = await POST(
      createRequest("/api/cron", {
        method: "POST",
        body: { name: "Test job", schedule: "*/5 * * * *", timezone: "Europe/Madrid" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.job).toEqual({ id: "job-1" });
    // Route-level regression guard for hotfix 39b650d: notification path
    // must survive a successful create (validation.data.name reference).
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("sends --tz when creating a cron-expression job with timezone", async () => {
    await POST(
      createRequest("/api/cron", {
        method: "POST",
        body: { name: "Cron job", schedule: "0 9 * * *", timezone: "Europe/Madrid" },
      })
    );

    expect(execArgs()).toContain("--tz");
    expect(execArgs()).toEqual(
      expect.arrayContaining(["--tz", "Europe/Madrid"])
    );
  });

  it("omits --tz when creating an every-based job", async () => {
    await POST(
      createRequest("/api/cron", {
        method: "POST",
        body: { name: "Every job", every: "5m", timezone: "Europe/Madrid" },
      })
    );

    expect(execArgs()).not.toContain("--tz");
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(
      createRequest("/api/cron", {
        method: "POST",
        body: { schedule: "*/5 * * * *" },
      })
    );

    expect(res.status).toBe(400);
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("returns 500 when the CLI fails", async () => {
    mockExec.mockReturnValue({ stdout: "", stderr: "boom", status: 1 });

    const res = await POST(
      createRequest("/api/cron", {
        method: "POST",
        body: { name: "Test job", schedule: "*/5 * * * *" },
      })
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe("/api/cron PUT", () => {
  beforeEach(() => {
    mockExec.mockReset();
    mockExec.mockReturnValue({ stdout: '{"id":"job-1"}', stderr: "", status: 0 });
  });

  it("sends --tz when editing a cron-expression job with timezone", async () => {
    const res = await PUT(
      createRequest("/api/cron", {
        method: "PUT",
        body: { id: "job-1", schedule: "0 9 * * *", timezone: "Europe/Madrid" },
      })
    );

    expect(res.status).toBe(200);
    expect(execArgs()).toEqual(
      expect.arrayContaining(["cron", "edit", "job-1", "--cron", "0 9 * * *", "--tz", "Europe/Madrid"])
    );
  });

  it("omits --tz when editing an every-based job with timezone", async () => {
    const res = await PUT(
      createRequest("/api/cron", {
        method: "PUT",
        body: { id: "job-1", every: "5m", timezone: "Europe/Madrid" },
      })
    );

    expect(res.status).toBe(200);
    expect(execArgs()).toContain("--every");
    expect(execArgs()).not.toContain("--tz");
  });

  it("omits --tz when the at value already carries an explicit offset", async () => {
    await PUT(
      createRequest("/api/cron", {
        method: "PUT",
        body: { id: "job-1", at: "2026-09-22T09:00:00+02:00", timezone: "Europe/Madrid" },
      })
    );

    expect(execArgs()).toContain("--at");
    expect(execArgs()).not.toContain("--tz");
  });

  it("runs cron enable for an enable-only update", async () => {
    const res = await PUT(
      createRequest("/api/cron", {
        method: "PUT",
        body: { id: "job-1", enabled: true },
      })
    );

    expect(res.status).toBe(200);
    expect(execArgs()).toEqual(["cron", "enable", "job-1", "--json"]);
  });

  it("returns 400 for an invalid job id", async () => {
    const res = await PUT(
      createRequest("/api/cron", {
        method: "PUT",
        body: { id: "../etc/passwd", name: "nope" },
      })
    );

    expect(res.status).toBe(400);
    expect(mockExec).not.toHaveBeenCalled();
  });
});
