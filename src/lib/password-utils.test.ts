/**
 * Tests for password-utils (bcrypt password verification)
 */
import { describe, it, expect } from "vitest";
import { verifyPassword, getPasswordHash } from "./password-utils";

describe("password-utils", () => {
  describe("verifyPassword", () => {
    it("returns true for matching password with pre-computed hash", async () => {
      const hash = await getPasswordHash("Alfred-2026-MC!");
      const result = await verifyPassword("Alfred-2026-MC!", hash);
      expect(result).toBe(true);
    });

    it("returns false for wrong password", async () => {
      const hash = await getPasswordHash("Alfred-2026-MC!");
      const result = await verifyPassword("wrong-password", hash);
      expect(result).toBe(false);
    });

    it("returns false for empty password against hash", async () => {
      const hash = await getPasswordHash("somepass");
      const result = await verifyPassword("", hash);
      expect(result).toBe(false);
    });

    it("returns false when hash is empty", async () => {
      const result = await verifyPassword("anything", "");
      expect(result).toBe(false);
    });
  });

  describe("getPasswordHash", () => {
    it("produces a bcrypt hash starting with $2a$ or $2b$", async () => {
      const hash = await getPasswordHash("test-password");
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });

    it("produces different hashes for different passwords", async () => {
      const [hash1, hash2] = await Promise.all([
        getPasswordHash("password1"),
        getPasswordHash("password2"),
      ]);
      expect(hash1).not.toBe(hash2);
    });
  });
});
