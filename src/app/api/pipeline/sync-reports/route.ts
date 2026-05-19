import { NextResponse } from "next/server";

import { syncReportsToPipeline } from "@/lib/reports-scanner";
import { listOpportunities, getPipelineKPIs } from "@/lib/pipeline-db";
import { logActivity } from "@/lib/activities-db";
import { OPENCLAW_WORKSPACE } from "@/lib/paths";

export const dynamic = "force-dynamic";

/**
 * GET /api/pipeline/sync-reports
 *
 * Scans reports/central/active/ for the main workspace,
 * auto-populates pipeline data with company/title deduplication.
 *
 * Query params:
 *   ?dryRun=true    — preview without writing to DB
 *   ?minConfidence=N — minimum confidence threshold (default 50)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const minConfidence = parseInt(
      searchParams.get("minConfidence") || "50",
      10
    );

    const syncResult = await syncReportsToPipeline({
      workspaceDir: OPENCLAW_WORKSPACE,
      dryRun,
      minConfidence: isNaN(minConfidence) ? 50 : minConfidence,
    });

    // Log activity if changes were made
    if (
      !dryRun &&
      (syncResult.opportunities_created > 0 ||
        syncResult.opportunities_updated > 0)
    ) {
      logActivity(
        "reports_auto_synced",
        `Sync-reports: ${syncResult.reports_scanned} scanned, ${syncResult.opportunities_created} created, ${syncResult.opportunities_updated} updated`,
        "pipeline",
        {
          agent: "sync-reports",
          metadata: {
            created: syncResult.opportunities_created,
            updated: syncResult.opportunities_updated,
            scanned: syncResult.reports_scanned,
          } as Record<string, unknown>,
        }
      );
    }

    // Return pipeline data alongside sync results
    const opportunities = listOpportunities();
    const kpis = getPipelineKPIs();

    return NextResponse.json({
      opportunities,
      kpis,
      sync: syncResult,
    });
  } catch (error) {
    console.error("Pipeline sync-reports error:", error);

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
