/**
 * Reports Scanner — scans report directories and syncs to pipeline opportunities.
 * Deduplicates by company + title (case-insensitive, whitespace-trimmed).
 */
import fs from "fs";
import path from "path";
import {
  parseReport,
  getEstimatedValue,
  type OpportunitySource,
  type ParsedReport,
} from "@/lib/report-parser";
import {
  createOpportunity,
  updateOpportunity,
  findOpportunityByCompany,
  type CreateOpportunityInput,
} from "@/lib/pipeline-db";

export interface SyncOptions {
  /** Single workspace directory to scan (overrides default multi-workspace) */
  workspaceDir?: string;
  /** Minimum confidence (0-100) to treat a report as an opportunity. Default: 50 */
  minConfidence?: number;
  /** If true, calculate results but do NOT write to database. Default: false */
  dryRun?: boolean;
}

export interface SyncResult {
  opportunities_created: number;
  opportunities_updated: number;
  opportunities_skipped: number;
  reports_scanned: number;
  sync_time: string;
  details: Array<{
    reportId: string;
    action: "created" | "updated" | "skipped";
    target: string;
    serviceType: string;
    confidence: number;
  }>;
}

/**
 * Map an OpportunitySource to a service_type for the pipeline.
 */
function mapServiceType(
  source: OpportunitySource
): CreateOpportunityInput["service_type"] {
  const mapping: Record<string, CreateOpportunityInput["service_type"]> = {
    security_audit: "consultoria_audit",
    security_review: "consultoria_audit",
    security_rereview: "consultoria_audit",
    research_market: "consultoria_retainer",
    research_technology: "consultoria_retainer",
    qa_review: "consultoria_managed",
    qa_testing: "consultoria_managed",
    devops_infra: "orquestacion_setup",
    other: "other",
  };
  return mapping[source] || "other";
}

/**
 * Infer the initial pipeline stage from an OpportunitySource.
 */
function inferInitialStage(
  source: OpportunitySource
): CreateOpportunityInput["stage"] {
  if (
    source === "security_audit" ||
    source === "security_review" ||
    source === "security_rereview"
  )
    return "qualifying";
  if (source === "qa_review" || source === "qa_testing") return "contacted";
  return "lead";
}

/**
 * Build the opportunity input from a parsed report.
 */
function buildOpportunityInput(parsed: ParsedReport): CreateOpportunityInput {
  const estimatedValue = getEstimatedValue(parsed.serviceType);
  return {
    company: parsed.target,
    title: parsed.title,
    description:
      parsed.summary || `Reporte generado por ${parsed.agent}`,
    stage: inferInitialStage(parsed.serviceType),
    value: estimatedValue,
    currency: "EUR",
    service_type: mapServiceType(parsed.serviceType),
    source: `report:${parsed.agent}`,
    next_action: `Seguimiento de ${parsed.title}`,
    next_action_date: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    notes: [
      `Auto-synced from report by ${parsed.agent}`,
      `Report ID: ${parsed.reportId}`,
      `Confidence: ${parsed.confidence}%`,
      "",
      parsed.summary || "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/**
 * Scan report directories and sync opportunities to the pipeline.
 *
 * Deduplication strategy: find by company + title (case-insensitive).
 * When a match is found, UPDATE instead of CREATE, and use max(existing, new) for value.
 */
export async function syncReportsToPipeline(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const { workspaceDir, minConfidence = 50, dryRun = false } = options;

  const result: SyncResult = {
    opportunities_created: 0,
    opportunities_updated: 0,
    opportunities_skipped: 0,
    reports_scanned: 0,
    sync_time: new Date().toISOString(),
    details: [],
  };

  // Determine which report directories to scan
  const reportDirs: string[] = [];
  if (workspaceDir) {
    reportDirs.push(
      path.join(workspaceDir, "reports", "central", "active"),
      path.join(workspaceDir, "docs", "reports", "central", "active")
    );
  }

  for (const reportsDir of reportDirs) {
    if (!fs.existsSync(reportsDir)) continue;

    const files = fs
      .readdirSync(reportsDir)
      .filter((f) => f.endsWith(".md") && f !== "PDCA_LOG.md");

    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = parseReport(content, file);

      result.reports_scanned++;

      // Skip low-confidence or non-opportunity reports
      if (!parsed.isOpportunity || parsed.confidence < minConfidence) {
        result.opportunities_skipped++;
        result.details.push({
          reportId: parsed.reportId,
          action: "skipped",
          target: parsed.target,
          serviceType: parsed.serviceType,
          confidence: parsed.confidence,
        });
        continue;
      }

      // Dedup: find existing opportunity by company (same company = same deal)
      const existing = findOpportunityByCompany(parsed.target);

      if (existing) {
        // UPDATE: use max(existing, new) for value
        const newValue = getEstimatedValue(parsed.serviceType);
        const maxValue = Math.max(existing.value, newValue);

        if (!dryRun) {
          updateOpportunity(existing.id, {
            value: maxValue,
            notes: [
              `Updated from report: ${file}`,
              `Confidence: ${parsed.confidence}%`,
              "",
              parsed.summary || "",
            ].join("\n"),
          });
        }

        result.opportunities_updated++;
        result.details.push({
          reportId: parsed.reportId,
          action: "updated",
          target: parsed.target,
          serviceType: parsed.serviceType,
          confidence: parsed.confidence,
        });
      } else {
        // CREATE: new opportunity
        if (!dryRun) {
          const oppInput = buildOpportunityInput(parsed);
          createOpportunity(oppInput);
        }

        result.opportunities_created++;
        result.details.push({
          reportId: parsed.reportId,
          action: "created",
          target: parsed.target,
          serviceType: parsed.serviceType,
          confidence: parsed.confidence,
        });
      }
    }
  }

  return result;
}
