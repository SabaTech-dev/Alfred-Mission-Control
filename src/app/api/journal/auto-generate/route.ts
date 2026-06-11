import { NextRequest, NextResponse } from "next/server";
import { getActivities } from "@/lib/activities-db";
import { listJournalEntries, createJournalEntry } from "@/lib/kanban-db";

export const dynamic = "force-dynamic";

/**
 * POST /api/journal/auto-generate
 * Auto-generates a journal entry from today's activities.
 * Body: { date?: string } // defaults to today (YYYY-MM-DD)
 *
 * Logic:
 * 1. Fetch activities for the given date
 * 2. Group by type and status
 * 3. Build a narrative summary
 * 4. Extract highlights (errors, notable events)
 * 5. Create journal entry if one doesn't already exist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const today = new Date().toISOString().split("T")[0];
    const date = body?.date || today;

    // Check if entry already exists for this date
    const existing = listJournalEntries({ startDate: date, endDate: date });
    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Journal entry already exists for this date", entry: existing[0] },
        { status: 200 }
      );
    }

    // Fetch activities for the date
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;
    const result = getActivities({
      startDate,
      endDate,
      sort: "oldest",
      limit: 500,
    });

    const activities = result.activities;

    if (activities.length === 0) {
      return NextResponse.json(
        { message: "No activities found for this date", date },
        { status: 200 }
      );
    }

    // Group by type
    const byType: Record<string, typeof activities> = {};
    const byStatus: Record<string, number> = { success: 0, error: 0, pending: 0, running: 0, approved: 0, rejected: 0 };

    for (const act of activities) {
      const type = act.type || "other";
      if (!byType[type]) byType[type] = [];
      byType[type].push(act);
      if (byStatus[act.status] !== undefined) byStatus[act.status]++;
    }

    // Build narrative
    const total = activities.length;
    const successCount = byStatus.success || 0;
    const errorCount = byStatus.error || 0;
    const typeSummaries = Object.entries(byType)
      .map(([type, acts]) => `${acts.length} ${type}`)
      .join(", ");

    let narrative = `Resumen automático del ${date}: ${total} actividades registradas (${successCount} exitosas, ${errorCount} errores). Tipos: ${typeSummaries}.`;

    // Add details for each type group (top 5 per type)
    const typeDetails: string[] = [];
    for (const [type, acts] of Object.entries(byType)) {
      const top = acts.slice(0, 5);
      for (const a of top) {
        typeDetails.push(`- [${a.status.toUpperCase()}] ${a.type}: ${a.description}`);
      }
      if (acts.length > 5) {
        typeDetails.push(`  ... y ${acts.length - 5} más`);
      }
    }

    narrative += `\n\nDetalles:\n${typeDetails.join("\n")}`;

    // Extract highlights: errors and notable events
    const highlights: string[] = [];

    // Errors as highlights
    const errors = activities.filter((a) => a.status === "error");
    if (errors.length > 0) {
      highlights.push(`⚠️ ${errors.length} errores detectados`);
      for (const e of errors.slice(0, 3)) {
        highlights.push(`Error en ${e.type}: ${e.description}`);
      }
    }

    // Most active types
    const topTypes = Object.entries(byType)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 3);
    for (const [type, acts] of topTypes) {
      if (acts.length >= 3) {
        highlights.push(`📊 ${type}: ${acts.length} actividades`);
      }
    }

    // Agents involved
    const agents = new Set(activities.map((a) => a.agent).filter(Boolean));
    if (agents.size > 0) {
      highlights.push(`🤖 Agentes activos: ${Array.from(agents).join(", ")}`);
    }

    // Create the journal entry
    const entry = createJournalEntry({
      date,
      narrative: narrative.slice(0, 5000),
      highlights: highlights.slice(0, 10),
    });

    return NextResponse.json(
      { message: "Journal entry auto-generated", entry, stats: { total, successCount, errorCount, types: Object.keys(byType) } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to auto-generate journal entry:", error);
    return NextResponse.json(
      { error: "Failed to auto-generate journal entry" },
      { status: 500 }
    );
  }
}
