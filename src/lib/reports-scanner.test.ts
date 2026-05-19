import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import os from "os";
import { syncReportsToPipeline } from "./reports-scanner";
import {
  createOpportunity,
  findOpportunityByCompanyTitle,
  listOpportunities,
  clearAllPipelineDataForTesting,
} from "./pipeline-db";

// Mock fs module for controlled report testing
const mockExistsSync = vi.fn();
const mockReaddirSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  const fns = {
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  };
  return { ...fns, default: fns };
});

// Mock activities-db to avoid SQLite lock issues in tests
vi.mock("@/lib/activities-db", () => ({
  logActivity: vi.fn(),
}));

/** Create a temp dir path for a fake workspace */
function makeWorkspace(name: string): string {
  return path.join(os.tmpdir(), `test-workspace-${name}-${Date.now()}`);
}

/** A realistic security review report */
const SECURITY_REPORT = `# Security Review: Acme Corp
**Fecha:** 2026-05-14
**Agente:** Security Agent
**Task ID:** task-123

## Resumen

Se completó la revisión de seguridad para Acme Corp.
Se encontraron 3 vulnerabilidades de severidad media.
`;

/** A second report about the SAME company (should deduplicate) */
const SECURITY_REPORT_V2 = `# Security Review: Acme Corp — Updated
**Fecha:** 2026-05-19
**Agente:** Security Agent

## Resumen

Segunda revisión para Acme Corp con nuevos hallazgos.
Vulnerabilidades críticas encontradas en la API.
`;

/** A research report about a DIFFERENT company */
const RESEARCH_REPORT = `# Research: Market Analysis
**Fecha:** 2026-05-15
**Agente:** Research Agent

## Resumen Ejecutivo

Análisis de mercado para Voice AI en el sector energético español.
Oportunidad significativa con TAM de €18B.
`;

describe("reports-scanner", () => {
  beforeEach(() => {
    clearAllPipelineDataForTesting();
    vi.clearAllMocks();

    // Default: let DB initialization pass through (existsSync returns true for data dirs)
    mockExistsSync.mockImplementation((p: unknown) => {
      const s = String(p);
      // Allow DB directories to exist
      if (s.includes("data")) return true;
      return false;
    });
    mockMkdirSync.mockImplementation(() => undefined);
    mockReaddirSync.mockImplementation(() => []);
    mockReadFileSync.mockImplementation(() => {
      throw new Error("File not found");
    });
  });

  afterEach(() => {
    clearAllPipelineDataForTesting();
  });

  /** Helper to set up mocks for a single workspace with given files */
  function setupMocks(
    workspace: string,
    files: string[],
    contentMap: Record<string, string>
  ) {
    const reportsDir = path.join(workspace, "reports", "central", "active");
    const docsReportsDir = path.join(
      workspace,
      "docs",
      "reports",
      "central",
      "active"
    );

    mockExistsSync.mockImplementation((p: unknown) => {
      const s = String(p);
      return s === reportsDir || s === docsReportsDir;
    });

    mockReaddirSync.mockImplementation((p: unknown) => {
      const s = String(p);
      if (s === reportsDir) return files;
      if (s === docsReportsDir) return [];
      return [];
    });

    mockReadFileSync.mockImplementation((p: unknown) => {
      const basename = path.basename(String(p));
      if (contentMap[basename]) return contentMap[basename];
      throw new Error("File not found: " + basename);
    });
  }

  // ── Sync creates opportunities from reports ──

  describe("syncReportsToPipeline", () => {
    it("creates opportunities from security review reports", async () => {
      const workspace = makeWorkspace("security");

      setupMocks(workspace, ["security-review-acme-corp-2026-05-14.md"], {
        "security-review-acme-corp-2026-05-14.md": SECURITY_REPORT,
      });

      const result = await syncReportsToPipeline({
        workspaceDir: workspace,
        minConfidence: 50,
      });

      expect(result.reports_scanned).toBe(1);
      expect(result.opportunities_created).toBe(1);
      expect(result.opportunities_updated).toBe(0);

      const opps = listOpportunities();
      expect(opps).toHaveLength(1);
      expect(opps[0].company).toBe("Acme Corp");
    });

    it("deduplicates by company + title (case-insensitive)", async () => {
      const workspace = makeWorkspace("dedup");

      setupMocks(
        workspace,
        [
          "security-review-acme-corp-2026-05-14.md",
          "security-review-acme-corp-2026-05-19.md",
        ],
        {
          "security-review-acme-corp-2026-05-14.md": SECURITY_REPORT,
          "security-review-acme-corp-2026-05-19.md": SECURITY_REPORT_V2,
        }
      );

      const result = await syncReportsToPipeline({
        workspaceDir: workspace,
        minConfidence: 50,
      });

      // Both reports scanned, only 1 created + 1 updated (dedup)
      expect(result.reports_scanned).toBe(2);
      expect(result.opportunities_created).toBe(1);
      expect(result.opportunities_updated).toBe(1);

      // Only 1 opportunity in DB (deduplicated)
      const opps = listOpportunities();
      expect(opps).toHaveLength(1);

      // Verify it was updated (notes contain "Updated from report")
      expect(opps[0].notes).toContain("Updated from report");
    });

    it("does not duplicate when same company already exists in DB", async () => {
      // Pre-create an opportunity with company "Acme Corp" and title "Security Review: Acme Corp"
      createOpportunity({
        company: "Acme Corp",
        title: "Security Review: Acme Corp",
        value: 2000,
        stage: "lead",
        source: "manual",
      });

      const workspace = makeWorkspace("existing");

      setupMocks(workspace, ["security-review-acme-corp-2026-05-14.md"], {
        "security-review-acme-corp-2026-05-14.md": SECURITY_REPORT,
      });

      const result = await syncReportsToPipeline({
        workspaceDir: workspace,
        minConfidence: 50,
      });

      expect(result.opportunities_created).toBe(0);
      expect(result.opportunities_updated).toBe(1);

      // Still only 1 opportunity
      expect(listOpportunities()).toHaveLength(1);
    });

    it("skips reports below minConfidence threshold", async () => {
      const workspace = makeWorkspace("lowconf");

      const lowConfReport = `# Random Notes
**Fecha:** 2026-05-14

## Notes

Some generic notes that don't look like an opportunity.
`;

      setupMocks(workspace, ["hindsight-semantic-dedup.md"], {
        "hindsight-semantic-dedup.md": lowConfReport,
      });

      const result = await syncReportsToPipeline({
        workspaceDir: workspace,
        minConfidence: 60,
      });

      expect(result.opportunities_skipped).toBe(1);
      expect(result.opportunities_created).toBe(0);
    });

    it("dryRun does not write to database", async () => {
      const workspace = makeWorkspace("dryrun");

      setupMocks(workspace, ["security-review-acme-corp-2026-05-14.md"], {
        "security-review-acme-corp-2026-05-14.md": SECURITY_REPORT,
      });

      const beforeCount = listOpportunities().length;

      const result = await syncReportsToPipeline({
        workspaceDir: workspace,
        dryRun: true,
        minConfidence: 50,
      });

      expect(result.opportunities_created).toBe(1);
      expect(listOpportunities()).toHaveLength(beforeCount);
    });

    it("scans both reports/ and docs/reports/ directories", async () => {
      const workspace = makeWorkspace("both-dirs");
      const reportsDir = path.join(workspace, "reports", "central", "active");
      const docsReportsDir = path.join(
        workspace,
        "docs",
        "reports",
        "central",
        "active"
      );

      mockExistsSync.mockImplementation((p: unknown) => {
        const s = String(p);
        return s === reportsDir || s === docsReportsDir;
      });

      mockReaddirSync.mockImplementation((p: unknown) => {
        const s = String(p);
        if (s === reportsDir)
          return ["security-review-acme-corp-2026-05-14.md"];
        if (s === docsReportsDir)
          return ["research-market-voice-ai-2026-05-15.md"];
        return [];
      });

      mockReadFileSync.mockImplementation((p: unknown) => {
        const s = String(p);
        if (s.includes("security-review")) return SECURITY_REPORT;
        if (s.includes("research-market")) return RESEARCH_REPORT;
        throw new Error("File not found");
      });

      const result = await syncReportsToPipeline({
        workspaceDir: workspace,
        minConfidence: 50,
      });

      expect(result.reports_scanned).toBe(2);
      expect(result.opportunities_created).toBe(2);
    });

    it("updates value to max of existing and new when deduplicating", async () => {
      // Pre-create with LOW value
      createOpportunity({
        company: "Acme Corp",
        title: "Security Review: Acme Corp",
        value: 1000,
        stage: "lead",
      });

      const workspace = makeWorkspace("value-dedup");

      setupMocks(workspace, ["security-review-acme-corp-2026-05-14.md"], {
        "security-review-acme-corp-2026-05-14.md": SECURITY_REPORT,
      });

      await syncReportsToPipeline({
        workspaceDir: workspace,
        minConfidence: 50,
      });

      const opps = listOpportunities();
      // The report estimates 3000 for security_review, existing was 1000
      // After update, should be max(1000, 3000) = 3000
      expect(opps[0].value).toBeGreaterThanOrEqual(3000);
    });
  });

  // ── findOpportunityByCompanyTitle (unit test on pipeline-db) ──

  describe("findOpportunityByCompanyTitle", () => {
    it("finds opportunity by exact company + title", () => {
      createOpportunity({
        company: "Acme Corp",
        title: "Security Review: Acme Corp",
        value: 5000,
      });

      const found = findOpportunityByCompanyTitle(
        "Acme Corp",
        "Security Review: Acme Corp"
      );
      expect(found).not.toBeNull();
      expect(found!.company).toBe("Acme Corp");
    });

    it("is case-insensitive", () => {
      createOpportunity({
        company: "Acme Corp",
        title: "Security Review: Acme Corp",
        value: 5000,
      });

      const found = findOpportunityByCompanyTitle(
        "acme corp",
        "security review: acme corp"
      );
      expect(found).not.toBeNull();
    });

    it("returns null when no match", () => {
      createOpportunity({
        company: "Acme Corp",
        title: "Security Review: Acme Corp",
        value: 5000,
      });

      const found = findOpportunityByCompanyTitle(
        "Other Corp",
        "Security Review: Acme Corp"
      );
      expect(found).toBeNull();
    });

    it("trims whitespace before matching", () => {
      createOpportunity({
        company: "Acme Corp",
        title: "Security Review: Acme Corp",
        value: 5000,
      });

      const found = findOpportunityByCompanyTitle(
        "  Acme Corp  ",
        "  Security Review: Acme Corp  "
      );
      expect(found).not.toBeNull();
    });
  });
});
