import { describe, it, expect } from "vitest";

import { GET } from "./route";

// F-B: /api/health must not disclose the 14-service detail publicly
describe("GET /api/health (minimal public surface)", () => {
  it("returns only status without service checks, uptime or timestamp", async () => {
    const response = await GET();
    const body = await response.json();

    expect(Object.keys(body)).toEqual(["status"]);
    expect(typeof body.status).toBe("string");
    expect(body).not.toHaveProperty("checks");
    expect(body).not.toHaveProperty("uptime");
    expect(body).not.toHaveProperty("timestamp");
  });
});
