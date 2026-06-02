import { describe, it, expect } from "vitest";
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
  it("allows first request", () => {
    const limiter = new RateLimiter(3, 60000, 60000);
    expect(limiter.check("test-ip").allowed).toBe(true);
  });

  it("records failure and allows within limit", () => {
    const limiter = new RateLimiter(3, 60000, 60000);
    limiter.recordFailure("test-ip");
    limiter.recordFailure("test-ip");
    expect(limiter.check("test-ip").allowed).toBe(true);
  });

  it("blocks after max attempts", () => {
    const limiter = new RateLimiter(3, 60000, 60000);
    limiter.recordFailure("test-ip");
    limiter.recordFailure("test-ip");
    limiter.recordFailure("test-ip");
    const result = limiter.check("test-ip");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("clears attempts on clear()", () => {
    const limiter = new RateLimiter(3, 60000, 60000);
    limiter.recordFailure("test-ip");
    limiter.recordFailure("test-ip");
    limiter.recordFailure("test-ip");
    limiter.clear("test-ip");
    expect(limiter.check("test-ip").allowed).toBe(true);
  });

  it("separates keys independently", () => {
    const limiter = new RateLimiter(1, 60000, 60000);
    limiter.recordFailure("ip-a");
    expect(limiter.check("ip-a").allowed).toBe(false);
    expect(limiter.check("ip-b").allowed).toBe(true);
  });

  it("returns retryAfter from lockout duration", () => {
    const limiter = new RateLimiter(1, 60000, 5000);
    limiter.recordFailure("test-ip");
    const result = limiter.check("test-ip");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(5000);
  });

  it("provides retry-after seconds via method", () => {
    const limiter = new RateLimiter(3, 60000, 15000);
    expect(limiter.getRetryAfterSeconds()).toBe(15);
    expect(limiter.getRetryAfterSeconds(5000)).toBe(5);
  });
});
