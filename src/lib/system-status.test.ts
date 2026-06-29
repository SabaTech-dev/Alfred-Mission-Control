import { describe, expect, it } from "vitest";

import { formatUptime, getSystemStatus } from "./system-status";

describe("formatUptime", () => {
  it("returns days when uptime is at least one day", () => {
    expect(formatUptime(6 * 86400)).toBe("6d");
  });

  it("returns days and hours for multi-day, multi-hour uptime", () => {
    expect(formatUptime(6 * 86400 + 4 * 3600)).toBe("6d 4h");
  });

  it("returns hours when under a day but over an hour", () => {
    expect(formatUptime(5 * 3600 + 30 * 60)).toBe("5h 30m");
  });

  it("returns minutes for short uptimes", () => {
    expect(formatUptime(12 * 60)).toBe("12m");
  });

  it("returns a sub-minute fallback for fresh boots", () => {
    expect(formatUptime(30)).toBe("<1m");
  });

  it("handles zero", () => {
    expect(formatUptime(0)).toBe("<1m");
  });
});

describe("getSystemStatus", () => {
  it("returns a hostname and a non-empty uptime string", () => {
    const status = getSystemStatus();
    expect(typeof status.hostname).toBe("string");
    expect(status.hostname.length).toBeGreaterThan(0);
    expect(typeof status.uptime).toBe("string");
    expect(status.uptime.length).toBeGreaterThan(0);
  });

  it("exposes a numeric uptimeSeconds field", () => {
    const status = getSystemStatus();
    expect(typeof status.uptimeSeconds).toBe("number");
    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
