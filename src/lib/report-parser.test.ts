import { describe, it, expect } from "vitest";
import {
  parseReportFilename,
  parseReport,
  getEstimatedValue,
  type OpportunitySource,
} from "./report-parser";

describe("report-parser", () => {
  // ── parseReportFilename ──

  describe("parseReportFilename", () => {
    it("parses security-review filename", () => {
      const result = parseReportFilename(
        "security-review-infisical-minio-migration-2026-05-14.md"
      );
      expect(result.agent).toBe("security");
      expect(result.serviceType).toBe("security_review");
      expect(result.target).toBe("infisical-minio-migration");
      expect(result.date).toBe("2026-05-14");
    });

    it("parses security-audit filename", () => {
      const result = parseReportFilename(
        "security-audit-mycompany-infra-2026-05-10.md"
      );
      expect(result.agent).toBe("security");
      expect(result.serviceType).toBe("security_audit");
      expect(result.target).toBe("mycompany-infra");
      expect(result.date).toBe("2026-05-10");
    });

    it("parses qa-review filename", () => {
      const result = parseReportFilename(
        "qa-review-sabatech-hub-qa-verification-2026-05-03.md"
      );
      expect(result.agent).toBe("qa-tester");
      expect(result.serviceType).toBe("qa_review");
      expect(result.target).toBe("sabatech-hub-qa-verification");
      expect(result.date).toBe("2026-05-03");
    });

    it("parses research filename with date", () => {
      const result = parseReportFilename(
        "research-market-voice-ai-comparison-2026-05-14.md"
      );
      expect(result.agent).toBe("research");
      expect(result.serviceType).toBe("research_market");
      expect(result.target).toBe("voice-ai-comparison");
      expect(result.date).toBe("2026-05-14");
    });

    it("falls back for unknown prefix", () => {
      const result = parseReportFilename("hindsight-semantic-dedup.md");
      expect(result.agent).toBe("hindsight");
      expect(result.serviceType).toBe("other");
      expect(result.target).toBe("hindsight-semantic-dedup");
    });

    it("handles filename with multiple date-like segments", () => {
      const result = parseReportFilename(
        "research-tech-acme-project-2026-05-14.md"
      );
      expect(result.agent).toBe("research");
      expect(result.serviceType).toBe("research_technology");
      expect(result.date).toBe("2026-05-14");
    });
  });

  // ── parseReport (full content) ──

  describe("parseReport", () => {
    const securityReport = `# Security Review: Infisical-Minio Migration
**Fecha:** 2026-05-14
**Agente:** Security Agent
**Task ID:** abc-123
**Estado:** ✅ COMPLETO

## Resumen

Se completó la revisión de seguridad para la migración de Infisical a Minio.
Se encontraron 3 vulnerabilidades de severidad media y 1 alta.
Se recomienda parchear antes del deploy a producción.

## Detalles

Algunos detalles adicionales aquí.
`;

    it("extracts reportId from filename", () => {
      const result = parseReport(
        securityReport,
        "security-review-infisical-minio-2026-05-14.md"
      );
      expect(result.reportId).toBe(
        "security-review-infisical-minio-2026-05-14"
      );
    });

    it("extracts agent from bold fields", () => {
      const result = parseReport(
        securityReport,
        "security-review-infisical-minio-2026-05-14.md"
      );
      expect(result.agent).toBe("Security Agent");
    });

    it("extracts task ID from bold fields", () => {
      const result = parseReport(
        securityReport,
        "security-review-infisical-minio-2026-05-14.md"
      );
      expect(result.taskId).toBe("abc-123");
    });

    it("extracts report status (PASS)", () => {
      const result = parseReport(
        securityReport,
        "security-review-infisical-minio-2026-05-14.md"
      );
      expect(result.reportStatus).toBe("COMPLETO");
    });

    it("extracts summary from resumen section", () => {
      const result = parseReport(
        securityReport,
        "security-review-infisical-minio-2026-05-14.md"
      );
      expect(result.summary).toContain("Infisical a Minio");
    });

    it("identifies security_review as an opportunity with high confidence", () => {
      const result = parseReport(
        securityReport,
        "security-review-infisical-minio-2026-05-14.md"
      );
      expect(result.isOpportunity).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it("parses research report with target from filename", () => {
      const researchReport = `# Research: Voice AI Market Analysis
**Fecha:** 2026-05-14
**Agente:** Research Agent

## Resumen Ejecutivo

Análisis del mercado de Voice AI para comercializadoras de energía.
El mercado está en crecimiento con múltiples opciones disponibles.
`;

      const result = parseReport(
        researchReport,
        "research-market-voice-ai-comparison-2026-05-14.md"
      );
      expect(result.target).toBe("Voice Ai Comparison");
      expect(result.serviceType).toBe("research_market");
      expect(result.isOpportunity).toBe(true);
    });

    it("returns empty target for unknown prefixes", () => {
      const unknownReport = `# Some Report
**Fecha:** 2026-05-14

## Resumen

Some random content here.
`;

      const result = parseReport(unknownReport, "random-report.md");
      expect(result.serviceType).toBe("other");
      expect(result.target).toBe("Random Report");
    });

    it("detects FAIL status", () => {
      const failReport = `# Security Audit Result
**Fecha:** 2026-05-14
**Estado:** ❌ FAIL - Critical vulnerabilities found
`;
      const result = parseReport(
        failReport,
        "security-audit-mycompany-2026-05-14.md"
      );
      expect(result.reportStatus).toBe("FAIL");
    });
  });

  // ── getEstimatedValue ──

  describe("getEstimatedValue", () => {
    it("returns correct value for security_audit", () => {
      expect(getEstimatedValue("security_audit")).toBe(5000);
    });

    it("returns correct value for research_market", () => {
      expect(getEstimatedValue("research_market")).toBe(4000);
    });

    it("returns default for other", () => {
      expect(getEstimatedValue("other")).toBe(2000);
    });
  });
});
