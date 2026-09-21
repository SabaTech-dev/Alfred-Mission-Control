/**
 * Tests for /reports/[token] page
 *
 * Regression for the audit finding (A2): an unresolvable share token must
 * produce an elegant 404 via notFound() instead of crashing to the error
 * boundary (the old client page threw "useI18n must be used within
 * I18nProvider" because no provider wraps this route).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { GeneratedReport } from "@/lib/report-generator";

vi.mock("@/lib/report-generator", () => ({
  getReportByShareToken: vi.fn(),
}));

import { getReportByShareToken } from "@/lib/report-generator";
import Page from "./page";

const fakeReport = {
  id: "report-1",
  name: "Weekly Report",
  type: "weekly" as const,
  period: { start: "2026-09-14", end: "2026-09-21" },
  shareToken: "good-token",
  createdAt: "2026-09-21T00:00:00.000Z",
  data: {
    period: { start: "2026-09-14", end: "2026-09-21" },
    type: "weekly" as const,
    stats: {
      totalActivities: 42,
      successRate: 95,
      totalTokens: 2_000_000,
      totalCost: 12.34,
      topModels: [{ name: "zai/glm-5.3", count: 10, cost: 5 }],
      topAgents: [{ name: "main", count: 20 }],
    },
    highlights: ["Shipped the office fix"],
    generatedAt: "2026-09-21T00:00:00.000Z",
  },
} satisfies GeneratedReport;

function callPage(token: string) {
  return Page({ params: Promise.resolve({ token }) });
}

describe("/reports/[token] page", () => {
  beforeEach(() => {
    vi.mocked(getReportByShareToken).mockReset();
  });

  it("throws notFound (404) when the token does not resolve", async () => {
    vi.mocked(getReportByShareToken).mockReturnValue(null);

    const error = await callPage("invalid-token").then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(Error);
    // notFound() signals itself via a digest containing the 404 status
    const digest = (error as { digest?: string })?.digest ?? "";
    expect(digest).toContain("404");
  });

  it("throws notFound (404) when the token is expired or the store fails", async () => {
    vi.mocked(getReportByShareToken).mockImplementation(() => {
      throw new Error("fs exploded");
    });

    await expect(callPage("boom-token")).rejects.toThrow();
  });

  it("renders the shared report for a valid token (no I18nProvider crash)", async () => {
    vi.mocked(getReportByShareToken).mockReturnValue(fakeReport);

    const el = await callPage("good-token");
    render(el);

    expect(screen.getByText("Weekly Report")).toBeDefined();
    expect(screen.getByText("Shipped the office fix")).toBeDefined();
  });
});
