import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth-helpers", () => ({
  requireAgentOrSessionAuth: vi.fn().mockResolvedValue({ authorized: true, authType: "session" }),
}));

const mockRequest = new NextRequest(new URL("http://localhost/api/system/uptime"));

describe("System Uptime API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/system/uptime", () => {
    it("returns 200 OK", async () => {
      const response = await GET(mockRequest);
      expect(response.status).toBe(200);
    });

    it("returns JSON response", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toBeDefined();
      expect(typeof json).toBe("object");
    });

    it("returns uptimePercentage field", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toHaveProperty("uptimePercentage");
      expect(typeof json.uptimePercentage).toBe("number");
      expect(Number.isFinite(json.uptimePercentage)).toBe(true);
    });

    it("uptimePercentage is between 0 and 100", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json.uptimePercentage).toBeGreaterThanOrEqual(0);
      expect(json.uptimePercentage).toBeLessThanOrEqual(100);
    });

    it("uptimePercentage defaults to 100 when no logs", async () => {
      // If heartbeat logs don't exist or are empty, uptime is 100%
      const response = await GET(mockRequest);
      const json = await response.json();

      // With no logs, the endpoint returns default uptime of 100%
      expect(json.uptimePercentage).toBe(100);
    });

    it("returns lastHeartbeat field", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toHaveProperty("lastHeartbeat");
      expect(json.lastHeartbeat === null || typeof json.lastHeartbeat === "string").toBe(true);
    });

    it("returns totalChecks field", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toHaveProperty("totalChecks");
      expect(typeof json.totalChecks).toBe("number");
      expect(Number.isInteger(json.totalChecks)).toBe(true);
    });

    it("totalChecks is non-negative", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json.totalChecks).toBeGreaterThanOrEqual(0);
    });

    it("returns successfulChecks field", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toHaveProperty("successfulChecks");
      expect(typeof json.successfulChecks).toBe("number");
      expect(Number.isInteger(json.successfulChecks)).toBe(true);
    });

    it("returns failedChecks field", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toHaveProperty("failedChecks");
      expect(typeof json.failedChecks).toBe("number");
      expect(Number.isInteger(json.failedChecks)).toBe(true);
    });

    it("returns downtimeEvents field", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toHaveProperty("downtimeEvents");
      expect(typeof json.downtimeEvents).toBe("number");
      expect(Number.isInteger(json.downtimeEvents)).toBe(true);
    });

    it("downtimeEvents is non-negative", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json.downtimeEvents).toBeGreaterThanOrEqual(0);
    });

    it("returns period field", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json).toHaveProperty("period");
      expect(json.period).toHaveProperty("start");
      expect(json.period).toHaveProperty("end");
    });

    it("period.start and period.end are valid ISO strings", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(typeof json.period.start).toBe("string");
      expect(typeof json.period.end).toBe("string");

      const startDate = new Date(json.period.start);
      const endDate = new Date(json.period.end);

      expect(startDate.getTime()).not.toBeNaN();
      expect(endDate.getTime()).not.toBeNaN();
    });

    it("period represents reasonable time window (30 days back)", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      const startDate = new Date(json.period.start);
      const endDate = new Date(json.period.end);
      const now = new Date();

      // Start should be approximately 30 days before end
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.abs(daysDiff - 30)).toBeLessThan(1); // Within 1 day of 30 days

      // End should be close to now (within 1 minute)
      expect(Math.abs(endDate.getTime() - now.getTime())).toBeLessThan(60000);
    });

    it("successfulChecks + failedChecks = totalChecks", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      expect(json.successfulChecks + json.failedChecks).toBe(json.totalChecks);
    });

    it("uptimePercentage = (successfulChecks / totalChecks) * 100 when totalChecks > 0", async () => {
      const response = await GET(mockRequest);
      const json = await response.json();

      if (json.totalChecks > 0) {
        const calculatedUptime = Math.round((json.successfulChecks / json.totalChecks) * 100);
        expect(json.uptimePercentage).toBe(calculatedUptime);
      }
    });
  });
});
