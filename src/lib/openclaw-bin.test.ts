import { describe, it, expect, afterEach, vi } from "vitest";

import { OPENCLAW_BIN } from "./openclaw-bin";

const original = process.env.OPENCLAW_BIN;

afterEach(() => {
  if (original === undefined) {
    delete process.env.OPENCLAW_BIN;
  } else {
    process.env.OPENCLAW_BIN = original;
  }
  vi.resetModules();
});

describe("OPENCLAW_BIN resolution", () => {
  it("falls back to 'openclaw' (PATH lookup) when env is not set", async () => {
    delete process.env.OPENCLAW_BIN;
    vi.resetModules();
    const mod = await import("./openclaw-bin");
    expect(mod.OPENCLAW_BIN).toBe("openclaw");
  });

  it("picks up OPENCLAW_BIN from environment when set", async () => {
    process.env.OPENCLAW_BIN = "/usr/local/bin/openclaw";
    vi.resetModules();
    const mod = await import("./openclaw-bin");
    expect(mod.OPENCLAW_BIN).toBe("/usr/local/bin/openclaw");
  });

  it("default export resolves without env var", () => {
    expect(typeof OPENCLAW_BIN).toBe("string");
    expect(OPENCLAW_BIN.length).toBeGreaterThan(0);
  });
});
