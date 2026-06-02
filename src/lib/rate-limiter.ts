/**
 * Rate Limiter — Simple in-memory per-IP rate limiter
 *
 * Sufficient for a personal dashboard — no external dependency needed.
 * Resets on server restart (no persistence).
 */

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000; // 15 minute lockout after max attempts

interface AttemptRecord {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

/**
 * In-memory rate limiter
 */
export class RateLimiter {
  private attempts = new Map<string, AttemptRecord>();

  constructor(
    private maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
    private windowMs: number = DEFAULT_WINDOW_MS,
    private lockoutMs: number = DEFAULT_LOCKOUT_MS,
  ) {}

  /**
   * Check if a request from the given key (e.g. IP) is allowed.
   */
  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return { allowed: true };
    }

    // Still locked out?
    if (record.lockedUntil && now < record.lockedUntil) {
      return { allowed: false, retryAfterMs: record.lockedUntil - now };
    }

    // Window expired — reset
    if (now - record.windowStart > this.windowMs) {
      this.attempts.delete(key);
      return { allowed: true };
    }

    // Within window, check count
    if (record.count >= this.maxAttempts) {
      // Lock out
      record.lockedUntil = now + this.lockoutMs;
      this.attempts.set(key, record);
      return { allowed: false, retryAfterMs: this.lockoutMs };
    }

    return { allowed: true };
  }

  /**
   * Record a failed attempt for the given key.
   */
  recordFailure(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now - record.windowStart > this.windowMs) {
      this.attempts.set(key, { count: 1, windowStart: now });
    } else {
      record.count += 1;
      this.attempts.set(key, record);
    }
  }

  /**
   * Clear all attempts for the given key (e.g. on successful login).
   */
  clear(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Get the option bag for creating a 429 response (for the Retry-After header).
   */
  getRetryAfterSeconds(retryAfterMs?: number): number {
    return Math.ceil((retryAfterMs ?? this.lockoutMs) / 1000);
  }

  /**
   * Compatibility method used by notifications route.
   * Returns remaining attempts and reset time alongside allowed state.
   */
  isAllowed(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return { allowed: true, remaining: this.maxAttempts, resetIn: 0 };
    }

    // Still locked out?
    if (record.lockedUntil && now < record.lockedUntil) {
      const resetIn = record.lockedUntil - now;
      return { allowed: false, remaining: 0, resetIn };
    }

    // Window expired — reset
    if (now - record.windowStart > this.windowMs) {
      this.attempts.delete(key);
      return { allowed: true, remaining: this.maxAttempts, resetIn: 0 };
    }

    const remaining = this.maxAttempts - record.count;
    const resetIn = this.windowMs - (now - record.windowStart);

    if (remaining <= 0) {
      record.lockedUntil = now + this.lockoutMs;
      this.attempts.set(key, record);
      return { allowed: false, remaining: 0, resetIn: this.lockoutMs };
    }

    return { allowed: true, remaining, resetIn };
  }
}

/**
 * Singleton login rate limiter — stricter: 5 attempts per 15 min
 */
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000, 15 * 60 * 1000);

/**
 * Generic API rate limiter for shared use across routes (e.g. notifications).
 */
export const rateLimiter = new RateLimiter();

/**
 * Extract client IP from a Next.js request (handles proxies).
 */
import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
