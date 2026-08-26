/**
 * Tests for jwt-utils (JWT rotation with kid)
 * Uses node environment because jose v6 requires Web Crypto API
 * which isn't fully available in jsdom.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  delete process.env.JWT_SECRET;
  delete process.env.JWT_SECRETS;
  delete process.env.JWT_CURRENT_KID;
});

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe("jwt-utils (JWT rotation)", () => {
  describe("single secret (backward compat)", () => {
    it("signs and verifies a token with JWT_SECRET", async () => {
      process.env.JWT_SECRET = "test-secret-thats-long-enough-for-jose-32chars";
      const { jwtUtils } = await import("./jwt-utils");

      const token = await jwtUtils.createSessionToken(3600000, { role: "admin" });
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const isValid = await jwtUtils.isValidToken(token);
      expect(isValid).toBe(true);
    });

    it("rejects token signed with different secret", async () => {
      process.env.JWT_SECRET = "first-secret-thats-long-enough-for-jose-32";
      const mod1 = await import("./jwt-utils");
      const token = await mod1.jwtUtils.createSessionToken(3600000, { role: "admin" });

      process.env.JWT_SECRET = "second-secret-different-from-first-one!!!";
      vi.resetModules();
      const mod2 = await import("./jwt-utils");

      const isValid = await mod2.jwtUtils.isValidToken(token);
      expect(isValid).toBe(false);
    });
  });

  describe("multi-secret rotation", () => {
    it("signs with current kid and verifies with matching kid", async () => {
      process.env.JWT_SECRETS = JSON.stringify([
        { kid: "key1", secret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        { kid: "key2", secret: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      ]);
      process.env.JWT_CURRENT_KID = "key2";
      const { jwtUtils } = await import("./jwt-utils");

      const token = await jwtUtils.createSessionToken(3600000, { role: "admin" });

      // Decode header to check kid
      const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
      expect(header.kid).toBe("key2");

      const isValid = await jwtUtils.isValidToken(token);
      expect(isValid).toBe(true);
    });

    it("verifies tokens signed by older keys", async () => {
      process.env.JWT_SECRETS = JSON.stringify([
        { kid: "key1", secret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        { kid: "key2", secret: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      ]);
      process.env.JWT_CURRENT_KID = "key1";
      const mod1 = await import("./jwt-utils");
      const oldToken = await mod1.jwtUtils.createSessionToken(3600000, { role: "admin" });

      // Rotate to key2
      process.env.JWT_CURRENT_KID = "key2";
      vi.resetModules();
      const mod2 = await import("./jwt-utils");

      const isValid = await mod2.jwtUtils.isValidToken(oldToken);
      expect(isValid).toBe(true);
    });

    it("rejects token signed by a key no longer in the list", async () => {
      process.env.JWT_SECRETS = JSON.stringify([
        { kid: "key1", secret: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      ]);
      process.env.JWT_CURRENT_KID = "key1";
      const mod1 = await import("./jwt-utils");
      const oldToken = await mod1.jwtUtils.createSessionToken(3600000, { role: "admin" });

      // Rotate to completely different keys
      process.env.JWT_SECRETS = JSON.stringify([
        { kid: "key2", secret: "cccccccccccccccccccccccccccccccc" },
      ]);
      process.env.JWT_CURRENT_KID = "key2";
      vi.resetModules();
      const mod2 = await import("./jwt-utils");

      const isValid = await mod2.jwtUtils.isValidToken(oldToken);
      expect(isValid).toBe(false);
    });
  });

  describe("token validation edge cases", () => {
    it("returns false for malformed token", async () => {
      process.env.JWT_SECRET = "test-secret-thats-long-enough-for-jose-32chars";
      const { jwtUtils } = await import("./jwt-utils");

      expect(await jwtUtils.isValidToken("not-a-jwt-token")).toBe(false);
    });

    it("returns false for empty token", async () => {
      process.env.JWT_SECRET = "test-secret-thats-long-enough-for-jose-32chars";
      const { jwtUtils } = await import("./jwt-utils");

      expect(await jwtUtils.isValidToken("")).toBe(false);
    });
  });

  describe("legacy JWT_SECRET fallback", () => {
    it("works with only JWT_SECRET set", async () => {
      process.env.JWT_SECRET = "legacy-secret-thats-long-enough-for-jose-32";
      const { jwtUtils } = await import("./jwt-utils");

      const token = await jwtUtils.createSessionToken(3600000, { role: "admin" });
      const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
      expect(header.kid).toBe("legacy");

      expect(await jwtUtils.isValidToken(token)).toBe(true);
    });
  });

  describe("build-time import safety (Next.js page-data collection)", () => {
    // `next build` imports route modules to collect page data while runtime
    // secrets are absent (Docker/CI builds have no .env.local). A module-level
    // loadKeys() used to throw during import and kill the whole build
    // ("Failed to collect page data for /api/...").
    it("does not throw at import time when no JWT env is set", async () => {
      await expect(import("./jwt-utils")).resolves.toBeTruthy();
    });

    it("fails fast on first token operation when no JWT env is set", async () => {
      const { jwtUtils } = await import("./jwt-utils");
      await expect(jwtUtils.createSessionToken()).rejects.toThrow(/JWT_SECRET/);
    });

    it("still validates eagerly-enough: secret configured after import is used", async () => {
      // Lazy cache must initialize on first use, not at import, so setting
      // the env after import (e.g. Next loading .env.local) still works.
      const mod = await import("./jwt-utils");
      process.env.JWT_SECRET = "lazy-loaded-secret-thats-long-enough!!";
      const token = await mod.jwtUtils.createSessionToken(3600000, { role: "admin" });
      expect(await mod.jwtUtils.isValidToken(token)).toBe(true);
    });
  });
});
