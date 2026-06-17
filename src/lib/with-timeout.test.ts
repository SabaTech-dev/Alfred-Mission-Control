/**
 * Tests for with-timeout.ts
 *
 * Validates that:
 * 1. A fast promise resolves with its value (no timeout triggered)
 * 2. A slow promise rejects with a TimeoutError after the configured ms
 * 3. The timeout rejection carries a label for observability
 * 4. settleWithTimeout wraps a fulfilled value vs. a rejection marker
 * 5. The slow promise is not left dangling (no unhandled rejection)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withTimeout,
  settleWithTimeout,
  TimeoutError,
} from "@/lib/with-timeout";

describe("with-timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("withTimeout", () => {
    it("resolves with the value when the promise is faster than the timeout", async () => {
      const fast = Promise.resolve("ok");

      const result = await withTimeout(fast, 5000, "fast-probe");

      expect(result).toBe("ok");
    });

    it("rejects with TimeoutError when the promise exceeds the timeout", async () => {
      // Promise that never resolves on its own
      const slow = new Promise<string>(() => {});

      const pending = withTimeout(slow, 1000, "slow-probe");
      // Observe rejection eagerly so it doesn't surface as unhandled while the
      // fake timer fires (handler would otherwise attach one tick too late).
      const assertion = pending.catch((e: unknown) => e);
      // Advance past the timeout window
      await vi.advanceTimersByTimeAsync(1500);

      const error = await assertion;
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as TimeoutError).label).toBe("slow-probe");
    });

    it("propagates the original rejection when the promise rejects before the timeout", async () => {
      const failing = Promise.reject(new Error("boom"));

      await expect(withTimeout(failing, 5000, "failing-probe")).rejects.toThrow(
        "boom",
      );
    });

    it("TimeoutError message includes the label", async () => {
      const slow = new Promise<string>(() => {});
      const pending = withTimeout(slow, 500, "tailscale-status");
      const assertion = pending.catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(800);

      const error = await assertion;
      expect(error).toBeInstanceOf(TimeoutError);
      expect((error as Error).message).toMatch(/tailscale-status/);
    });
  });

  describe("settleWithTimeout", () => {
    it("returns {ok, value} when the promise resolves in time", async () => {
      const result = await settleWithTimeout(Promise.resolve(42), 5000, "r");

      expect(result).toEqual({ ok: true, value: 42 });
    });

    it("returns {ok:false, error} when the promise times out", async () => {
      const slow = new Promise<number>(() => {});
      const pending = settleWithTimeout(slow, 1000, "slow");
      await vi.advanceTimersByTimeAsync(1500);

      const result = await pending;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(TimeoutError);
        expect(result.label).toBe("slow");
      }
    });

    it("returns {ok:false, error} when the promise rejects", async () => {
      const result = await settleWithTimeout(
        Promise.reject(new Error("nope")),
        5000,
        "r",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect((result.error as Error).message).toBe("nope");
      }
    });
  });
});
