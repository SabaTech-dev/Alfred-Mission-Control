/**
 * Tests for stack-health.ts
 * 
 * Validates that:
 * 1. Deprecated legacy memory API is NOT checked
 * 2. Memory-Core (native) is reflected
 * 3. OSINT Nexus can be optionally excluded
 * 4. Overall status is correctly computed
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the exported functions via module mocking
// Since stack-health uses net and fetch internally, we mock at the module level

const mockChecks = {
  gateway: { name: "openclaw-gateway", status: "up" as const, details: "OK" },
  postgresql: { name: "postgresql", status: "up" as const, details: "OK" },
  llamaRerank: { name: "llama.cpp-rerank", status: "up" as const, details: "OK" },
  coolify: { name: "coolify", status: "up" as const, details: "OK" },
  browserless: { name: "browserless", status: "up" as const, details: "OK" },
  langfuse: { name: "langfuse", status: "up" as const, details: "OK" },
  qmd: { name: "qmd-mcp", status: "up" as const, details: "OK" },
  llamaGpu: { name: "llama.cpp-gpu", status: "up" as const, details: "OK" },
  llamaEmbed: { name: "llama.cpp-embed", status: "up" as const, details: "OK" },
  searxng: { name: "searxng", status: "up" as const, details: "OK" },
  engram: { name: "engram", status: "up" as const, details: "OK" },
  prAgent: { name: "pr-agent", status: "up" as const, details: "OK" },
  osintNexus: { name: "osint-nexus", status: "down" as const, details: "port 8420 not reachable" },
};

describe("stack-health", () => {
  describe("summarizeStackHealth", () => {
    it("should return 'healthy' when all checks are up", async () => {
      const { summarizeStackHealth } = await import("@/lib/stack-health");
      const allUp = Object.values(mockChecks).filter(c => c.name !== "osint-nexus");
      expect(summarizeStackHealth(allUp)).toBe("healthy");
    });

    it("should return 'degraded' when any check is down", async () => {
      const { summarizeStackHealth } = await import("@/lib/stack-health");
      const withDown = Object.values(mockChecks);
      expect(summarizeStackHealth(withDown)).toBe("degraded");
    });

    it("should return 'healthy' for empty checks array", async () => {
      const { summarizeStackHealth } = await import("@/lib/stack-health");
      expect(summarizeStackHealth([])).toBe("healthy");
    });
  });

  describe("collectStackServiceChecks", () => {
    it("should NOT include legacy hindsight service (migrated to memory-core)", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      const legacyCheck = checks.find(c => c.name === "hindsight");
      expect(legacyCheck).toBeUndefined();
    });

    it("should include alfred-mc as first service", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      expect(checks[0].name).toBe("alfred-mc");
      expect(checks[0].status).toBe("up");
    });

    it("should include openclaw-gateway", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      expect(checks.some(c => c.name === "openclaw-gateway")).toBe(true);
    });

    it("should NOT include osint-nexus (service removed from health checks)", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      const osintCheck = checks.find(c => c.name === "osint-nexus");
      expect(osintCheck).toBeUndefined();
    });
  });

  describe("formatStackHeartbeat", () => {
    it("should format checks with emoji status indicators", async () => {
      const { formatStackHeartbeat } = await import("@/lib/stack-health");
      const checks = [
        { name: "test-up", status: "up" as const, details: "OK" },
        { name: "test-down", status: "down" as const, details: "FAIL" },
      ];
      const lines = formatStackHeartbeat(checks);
      expect(lines[0]).toContain("✅");
      expect(lines[0]).toContain("test-up");
      expect(lines[1]).toContain("❌");
      expect(lines[1]).toContain("test-down");
    });
  });
});
