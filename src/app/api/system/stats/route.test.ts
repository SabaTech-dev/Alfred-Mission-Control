import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/system-stats", () => ({
  cachedSystemStats: {
    get: vi.fn(),
    invalidate: vi.fn(),
  },
}));

const mockedStats = vi.hoisted(() => ({
  cachedSystemStats: {
    get: vi.fn(),
    invalidate: vi.fn(),
  },
}));

vi.mock("@/lib/system-stats", () => mockedStats);

describe("System Stats API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/system/stats", () => {
    it("returns 200 OK", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      expect(response.status).toBe(200);
    });

    it("returns all required performance metrics", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(json).toEqual(
        expect.objectContaining({
          cpu: expect.objectContaining({
            load: expect.any(Number),
            loadAvg1: expect.any(Number),
            loadAvg5: expect.any(Number),
            loadAvg15: expect.any(Number),
          }),
          memory: expect.objectContaining({
            total: expect.any(Number),
            used: expect.any(Number),
            free: expect.any(Number),
          }),
          uptime: expect.any(String),
        })
      );
    });

    it("cpu field contains correct types (numeric, float)", async () => {
      const mockStats = {
        cpu: { load: 25.5, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(typeof json.cpu.load).toBe("number");
      expect(typeof json.cpu.loadAvg1).toBe("number");
      expect(typeof json.cpu.loadAvg5).toBe("number");
      expect(typeof json.cpu.loadAvg15).toBe("number");

      expect(Number.isFinite(json.cpu.load)).toBe(true);
      expect(Number.isFinite(json.cpu.loadAvg1)).toBe(true);
      expect(Number.isFinite(json.cpu.loadAvg5)).toBe(true);
      expect(Number.isFinite(json.cpu.loadAvg15)).toBe(true);
    });

    it("memory field contains correct types (numeric, float, GB)", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16.5, used: 8.25, free: 8.25 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(typeof json.memory.total).toBe("number");
      expect(typeof json.memory.used).toBe("number");
      expect(typeof json.memory.free).toBe("number");

      expect(Number.isFinite(json.memory.total)).toBe(true);
      expect(Number.isFinite(json.memory.used)).toBe(true);
      expect(Number.isFinite(json.memory.free)).toBe(true);

      expect(json.memory.total).toBeGreaterThan(0);
    });

    it("memory usage does not exceed 100%", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 12, free: 4 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      const usagePercentage = (json.memory.used / json.memory.total) * 100;
      expect(usagePercentage).toBeLessThanOrEqual(100);
      expect(usagePercentage).toBeGreaterThanOrEqual(0);
    });

    it("uptime is a valid formatted string (0-24h)", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(typeof json.uptime).toBe("string");
      expect(json.uptime.length).toBeGreaterThan(0);

      // Uptime format validation: should contain d/h/m/s
      const hasTimeComponent = /[dhms]/.test(json.uptime);
      expect(hasTimeComponent).toBe(true);
    });

    it("uptime represents reasonable system uptime (can exceed 24h)", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      // Uptime format: Xd Yh Zm or just Yh Zm etc.
      // Parse to check it's within reasonable bounds
      const daysMatch = json.uptime.match(/(\d+)d/);
      const hoursMatch = json.uptime.match(/(\d+)h/);
      const minutesMatch = json.uptime.match(/(\d+)m/);

      const days = daysMatch ? parseInt(daysMatch[1]) : 0;
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

      const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
      const maxMinutes = 365 * 24 * 60; // 365 days in minutes — uptime can exceed 24h

      expect(totalMinutes).toBeGreaterThanOrEqual(0);
      expect(totalMinutes).toBeLessThanOrEqual(maxMinutes);
    });

    it("returns 500 when stats collection fails", async () => {
      mockedStats.cachedSystemStats.get.mockRejectedValue(
        new Error("Failed to fetch system stats")
      );

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toHaveProperty("error");
      expect(json.error).toBe("Failed to fetch system stats");
    });

    it("delegates to cachedSystemStats.get()", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      await GET();

      expect(mockedStats.cachedSystemStats.get).toHaveBeenCalledTimes(1);
    });

    it("returns all additional system fields (disk, agents, services)", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(json).toEqual(
        expect.objectContaining({
          disk: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
          }),
          activeAgents: expect.any(Number),
          totalAgents: expect.any(Number),
          tokensToday: expect.any(Number),
          vpnActive: expect.any(Boolean),
          firewallActive: expect.any(Boolean),
          activeServices: expect.any(Number),
          totalServices: expect.any(Number),
        })
      );
    });

    it("additional fields have correct types (numeric, int, boolean)", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 3,
        totalAgents: 5,
        tokensToday: 1000,
        uptime: "1d 2h 30m",
        vpnActive: true,
        firewallActive: true,
        activeServices: 3,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(typeof json.activeAgents).toBe("number");
      expect(typeof json.totalAgents).toBe("number");
      expect(typeof json.tokensToday).toBe("number");
      expect(typeof json.vpnActive).toBe("boolean");
      expect(typeof json.firewallActive).toBe("boolean");
      expect(typeof json.activeServices).toBe("number");
      expect(typeof json.totalServices).toBe("number");

      expect(Number.isInteger(json.activeAgents)).toBe(true);
      expect(Number.isInteger(json.totalAgents)).toBe(true);
      expect(Number.isInteger(json.tokensToday)).toBe(true);
      expect(Number.isInteger(json.activeServices)).toBe(true);
      expect(Number.isInteger(json.totalServices)).toBe(true);
    });

    it("agents and services counts are non-negative", async () => {
      const mockStats = {
        cpu: { load: 25, loadAvg1: 1.0, loadAvg5: 1.2, loadAvg15: 1.5 },
        memory: { total: 16, used: 8, free: 8 },
        disk: { used: 45, total: 100 },
        activeAgents: 0,
        totalAgents: 0,
        tokensToday: 0,
        uptime: "0m",
        vpnActive: false,
        firewallActive: false,
        activeServices: 0,
        totalServices: 4,
      };

      mockedStats.cachedSystemStats.get.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(json.activeAgents).toBeGreaterThanOrEqual(0);
      expect(json.totalAgents).toBeGreaterThanOrEqual(0);
      expect(json.activeServices).toBeGreaterThanOrEqual(0);
      expect(json.totalServices).toBeGreaterThanOrEqual(0);
    });
  });
});
