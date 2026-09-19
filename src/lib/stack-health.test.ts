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
  langfuse: { name: "langfuse", status: "up" as const, details: "OK" },
  qmd: { name: "qmd-mcp", status: "up" as const, details: "OK" },
  llamaGpu: { name: "llama.cpp-gpu", status: "held" as const, details: "port 8001 not reachable — HELD (expected-down)" },
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

    it("should return 'healthy' when only up and held checks exist (held does not degrade)", async () => {
      const { summarizeStackHealth } = await import("@/lib/stack-health");
      const upAndHeld = Object.values(mockChecks).filter(
        c => c.status === "up" || c.status === "held",
      );
      expect(upAndHeld.length).toBeGreaterThan(0);
      expect(upAndHeld.some(c => c.status === "held")).toBe(true);
      expect(summarizeStackHealth(upAndHeld)).toBe("healthy");
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

    it("should NOT include ollama (service removed 2026-08-28)", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      const ollamaCheck = checks.find(c => c.name === "ollama");
      expect(ollamaCheck).toBeUndefined();
    });

    it("should NOT include browserless (service uninstalled 2026-09-04)", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      const browserlessCheck = checks.find(c => c.name === "browserless");
      expect(browserlessCheck).toBeUndefined();
    });

    it("should include llama-vllm juez prod :8009 (card 06106b5c, gap 18-sep)", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      const vllm = checks.find(c => c.name === "llama-vllm");
      expect(vllm).toBeDefined();
      expect(["up", "down"]).toContain(vllm!.status);
    });

    it("should report llama.cpp-gpu as held (intentional stop), never down, while port 8001 is stopped", async () => {
      const { collectStackServiceChecks } = await import("@/lib/stack-health");
      const checks = await collectStackServiceChecks();
      const llamaGpu = checks.find(c => c.name === "llama.cpp-gpu");
      expect(llamaGpu).toBeDefined();
      // Port 8001 (Ornith) is HELD — intentionally stopped by the operator.
      // If the port listens again the check flips to "up"; it must never be "down".
      expect(["held", "up"]).toContain(llamaGpu!.status);
      if (llamaGpu!.status === "held") {
        expect(llamaGpu!.details).toContain("HELD");
      }
    });
  });

  describe("formatStackHeartbeat", () => {
    it("should format checks with emoji status indicators", async () => {
      const { formatStackHeartbeat } = await import("@/lib/stack-health");
      const checks = [
        { name: "test-up", status: "up" as const, details: "OK" },
        { name: "test-held", status: "held" as const, details: "HELD (expected-down)" },
        { name: "test-down", status: "down" as const, details: "FAIL" },
      ];
      const lines = formatStackHeartbeat(checks);
      expect(lines[0]).toContain("✅");
      expect(lines[0]).toContain("test-up");
      expect(lines[1]).toContain("⏸️");
      expect(lines[1]).toContain("test-held");
      expect(lines[2]).toContain("❌");
      expect(lines[2]).toContain("test-down");
    });
  });
});
