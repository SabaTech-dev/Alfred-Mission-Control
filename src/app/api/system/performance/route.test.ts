import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth-helpers", () => ({
  requireAgentOrSessionAuth: vi.fn().mockResolvedValue({ authorized: true, authType: "session" }),
}));

// Mock system-stats module
vi.mock("@/lib/system-stats", () => ({
  cachedSystemStats: {
    get: vi.fn().mockResolvedValue({
      cpu: { load: 25, loadAvg1: 1.5, loadAvg5: 2.0, loadAvg15: 2.5 },
      memory: { total: 8.0, used: 4.5, free: 3.5 },
      activeAgents: 3,
      totalAgents: 5,
      tokensToday: 15000,
      uptime: "10d 5h 30m",
      vpnActive: true,
      firewallActive: true,
      activeServices: 4,
      totalServices: 4,
    }),
  },
}));

const mockRequest = new Request("http://localhost:3000/api/system/performance");

describe("GET /api/system/performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 OK", async () => {
    const response = await GET(mockRequest as any);
    expect(response.status).toBe(200);
  });

  it("should return JSON with timestamp", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe("string");
  });

  it("should include cpu metrics", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.cpu).toBeDefined();
    expect(typeof data.cpu.load).toBe("number");
    expect(typeof data.cpu.loadAvg1).toBe("number");
    expect(typeof data.cpu.loadAvg5).toBe("number");
    expect(typeof data.cpu.loadAvg15).toBe("number");
  });

  it("should include memory metrics", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.memory).toBeDefined();
    expect(typeof data.memory.total_gb).toBe("number");
    expect(typeof data.memory.used_gb).toBe("number");
    expect(typeof data.memory.free_gb).toBe("number");
    expect(typeof data.memory.usage_percent).toBe("number");
  });

  it("should include uptime as string", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.uptime).toBeDefined();
    expect(typeof data.uptime).toBe("string");
  });

  it("should include response_time_avg_ms", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.response_time_avg_ms).toBeDefined();
    expect(typeof data.response_time_avg_ms).toBe("number");
    expect(data.response_time_avg_ms).toBeGreaterThanOrEqual(0);
  });

  it("should include active and total agents", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(typeof data.active_agents).toBe("number");
    expect(typeof data.total_agents).toBe("number");
    expect(data.active_agents).toBeLessThanOrEqual(data.total_agents);
  });

  it("should include tokens_today as number", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(typeof data.tokens_today).toBe("number");
    expect(data.tokens_today).toBeGreaterThanOrEqual(0);
  });

  it("should include services status", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.services).toBeDefined();
    expect(typeof data.services.active).toBe("number");
    expect(typeof data.services.total).toBe("number");
  });

  it("should include vpn and firewall status", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(typeof data.vpn_active).toBe("boolean");
    expect(typeof data.firewall_active).toBe("boolean");
  });

  it("should have memory usage_percent between 0 and 100", async () => {
    const response = await GET(mockRequest as any);
    const data = await response.json();
    expect(data.memory.usage_percent).toBeGreaterThanOrEqual(0);
    expect(data.memory.usage_percent).toBeLessThanOrEqual(100);
  });

  it("should handle errors gracefully", async () => {
    const { cachedSystemStats } = await import("@/lib/system-stats");
    (cachedSystemStats.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Test error")
    );
    const response = await GET(mockRequest as any);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

describe("Auth middleware", () => {
  it("should return 401 when not authenticated", async () => {
    const { requireAgentOrSessionAuth } = await import("@/lib/auth-helpers");
    (requireAgentOrSessionAuth as any).mockResolvedValueOnce({
      authorized: false,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const response = await GET(mockRequest as any);
    expect(response.status).toBe(401);
  });
});
