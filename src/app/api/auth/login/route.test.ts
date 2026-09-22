import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";
import { loginRateLimiter } from "@/lib/rate-limiter";

// F-E: N failed login attempts must trigger 429 lockout
describe("POST /api/auth/login rate limiting", () => {
  const prevHash = process.env.ADMIN_PASSWORD_HASH;
  const prevPlain = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    // No password configured => every attempt resolves to 401 (no bcrypt needed)
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD;
  });

  afterEach(() => {
    if (prevHash !== undefined) process.env.ADMIN_PASSWORD_HASH = prevHash;
    else delete process.env.ADMIN_PASSWORD_HASH;
    if (prevPlain !== undefined) process.env.ADMIN_PASSWORD = prevPlain;
    else delete process.env.ADMIN_PASSWORD;
  });

  function makeRequest(body: unknown, ip = "203.0.113.50") {
    return new NextRequest(new URL("http://localhost/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    });
  }

  it("returns 429 after max failed attempts for the same IP", async () => {
    const ip = "203.0.113.51";
    loginRateLimiter.clear(ip);

    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ password: "wrong" }, ip));
      expect(res.status, `attempt ${i + 1}`).toBe(401);
    }

    const blocked = await POST(makeRequest({ password: "wrong" }, ip));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);

    const body = await blocked.json();
    expect(body.success).toBe(false);

    loginRateLimiter.clear(ip);
  });

  it("does not lock out other IPs (per-IP isolation)", async () => {
    const attacker = "203.0.113.52";
    const bystander = "203.0.113.53";
    loginRateLimiter.clear(attacker);
    loginRateLimiter.clear(bystander);

    for (let i = 0; i < 6; i++) {
      await POST(makeRequest({ password: "wrong" }, attacker));
    }

    const bystanderRes = await POST(makeRequest({ password: "wrong" }, bystander));
    expect(bystanderRes.status).toBe(401);

    loginRateLimiter.clear(attacker);
    loginRateLimiter.clear(bystander);
  });
});
