import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const mocked = vi.hoisted(() => ({
  getSystemStatus: vi.fn(),
}));

vi.mock("@/lib/system-status", () => mocked);

describe("System Status API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with hostname and uptime", async () => {
    mocked.getSystemStatus.mockReturnValue({
      hostname: "jokerserver",
      uptime: "6d",
      uptimeSeconds: 518400,
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({
      hostname: "jokerserver",
      uptime: "6d",
      uptimeSeconds: 518400,
    });
  });

  it("returns 500 when status collection fails", async () => {
    mocked.getSystemStatus.mockImplementation(() => {
      throw new Error("boom");
    });

    const response = await GET();
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json).toHaveProperty("error");
  });
});
