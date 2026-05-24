import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  listOpportunities,
  createOpportunity,
  getOpportunity,
  updateOpportunity,
  getPipelineKPIs,
  type CreateOpportunityInput,
} from "@/lib/pipeline-db";
import {
  parseReport,
  getEstimatedValue,
  type OpportunitySource,
  type ParsedReport,
} from "@/lib/report-parser";
import { OPENCLAW_WORKSPACE } from "@/lib/paths";
import { logActivity } from "@/lib/activities-db";

export const dynamic = "force-dynamic";

interface SyncResult {
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

const WORKSPACE_DIRS = [
  "/home/ubuntu/.openclaw/workspace-coder",
  "/home/ubuntu/.openclaw/workspace-security",
  "/home/ubuntu/.openclaw/workspace-research",
  "/home/ubuntu/.openclaw/workspace-qa-tester",
  "/home/ubuntu/.openclaw/workspace-devops",
  OPENCLAW_WORKSPACE,
];

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

function inferInitialStage(
  source: OpportunitySource
): CreateOpportunityInput["stage"] {
  if (
    source === "security_audit" ||
    source === "security_review" ||
    source === "security_rereview"
  ) return "qualifying";
  if (source === "qa_review" || source === "qa_testing") return "contacted";
  return "lead";
}

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
    source_type: parsed.sourceType,
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

function syncReportsToPipeline(): SyncResult {
  const result: SyncResult = {
    opportunities_created: 0,
    opportunities_updated: 0,
    opportunities_skipped: 0,
    reports_scanned: 0,
    sync_time: new Date().toISOString(),
    details: [],
  };

  const uniqueWorkspaces = [...new Set(WORKSPACE_DIRS)];

  for (const workspace of uniqueWorkspaces) {
    const reportDirs = [
      path.join(workspace, "reports", "central", "active"),
      path.join(workspace, "docs", "reports", "central", "active"),
    ];

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

        if (!parsed.isOpportunity || parsed.confidence < 50) {
          result.opportunities_skipped++;
          continue;
        }

        const existingOpp = getOpportunity(parsed.reportId);

        if (existingOpp) {
          updateOpportunity(parsed.reportId, {
            notes: [
              `Updated from report: ${file}`,
              `Confidence: ${parsed.confidence}%`,
              "",
              parsed.summary || "",
            ].join("\n"),
          });
          result.opportunities_updated++;
        } else {
          const oppInput = buildOpportunityInput(parsed);
          createOpportunity(oppInput);
          result.opportunities_created++;
        }

        result.details.push({
          reportId: parsed.reportId,
          action: existingOpp ? "updated" : "created",
          target: parsed.target,
          serviceType: parsed.serviceType,
          confidence: parsed.confidence,
        });
      }
    }
  }

  if (result.opportunities_created > 0 || result.opportunities_updated > 0) {
    logActivity(
      "reports_auto_synced",
      `Auto-sync: ${result.reports_scanned} scanned, ${result.opportunities_created} created, ${result.opportunities_updated} updated`,
      "pipeline",
      {
        agent: "auto-sync",
        metadata: {
          created: result.opportunities_created,
          updated: result.opportunities_updated,
          scanned: result.reports_scanned,
        } as Record<string, unknown>,
      }
    );
  }

  return result;
}

/**
 * GET /api/pipeline/auto-sync
 *
 * Auto-syncs reports to pipeline opportunities AND returns full pipeline data.
 * Called by the pipeline page on load for seamless auto-population.
 */
export async function GET() {
  try {
    const syncResult = syncReportsToPipeline();
    const opportunities = listOpportunities();
    const kpis = getPipelineKPIs();

    return NextResponse.json({
      opportunities,
      kpis,
      sync: syncResult,
    });
  } catch (error) {
    console.error("Pipeline auto-sync error:", error);
    // Graceful fallback: return data without sync
    try {
      const opportunities = listOpportunities();
      const kpis = getPipelineKPIs();
      return NextResponse.json({
        opportunities,
        kpis,
        sync: {
          opportunities_created: 0,
          opportunities_updated: 0,
          opportunities_skipped: 0,
          reports_scanned: 0,
          sync_time: new Date().toISOString(),
          details: [],
          error: "Sync failed, returning cached data",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to load pipeline" },
        { status: 500 }
      );
    }
  }
}
