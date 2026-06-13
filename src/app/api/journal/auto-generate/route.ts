import { NextRequest, NextResponse } from "next/server";
import { getActivities } from "@/lib/activities-db";
import { createJournalEntry, listJournalEntries } from "@/lib/kanban-db";

export const dynamic = "force-dynamic";

/**
 * POST /api/journal/auto-generate
 * Auto-generates a journal entry from the day's activities.
 * Body: { date: string (YYYY-MM-DD) }
 * 
 * Aggregates activities for the given date and creates a narrative
 * summary with highlights. Skips if entry already exists.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const date = body.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD format)" },
        { status: 400 }
      );
    }

    // Check if entry already exists for this date
    const existing = listJournalEntries({ startDate: date, endDate: date });
    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Journal entry already exists for this date", entry: existing[0] },
        { status: 200 }
      );
    }

    // Fetch activities for the date
    const result = getActivities({
      startDate: date,
      endDate: date,
      limit: 500,
      sort: "oldest",
    });

    const activities = result.activities;
    const total = result.total;

    if (total === 0) {
      return NextResponse.json(
        { message: "No activities found for this date", entry: null },
        { status: 200 }
      );
    }

    // Build narrative from activities
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    const errors: string[] = [];
    const notableActions: string[] = [];

    for (const act of activities) {
      byType[act.type] = (byType[act.type] || 0) + 1;
      byStatus[act.status] = (byStatus[act.status] || 0) + 1;
      if (act.agent) {
        byAgent[act.agent] = (byAgent[act.agent] || 0) + 1;
      }
      if (act.status === "error") {
        errors.push(`[${act.type}] ${act.description}`);
      }
      // Notable: security, build, or high-duration actions
      if (act.type === "security" || act.type === "build" || (act.duration_ms && act.duration_ms > 60000)) {
        notableActions.push(`${act.type}: ${act.description}`);
      }
    }

    const successCount = (byStatus["success"] || 0) + (byStatus["approved"] || 0);
    const errorCount = (byStatus["error"] || 0) + (byStatus["rejected"] || 0);
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
    const agents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]);
    const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);

    // Compose narrative
    const lines: string[] = [];
    lines.push(`Resumen de operaciones del ${date}: ${total} actividades registradas con ${successRate}% de tasa de éxito.`);
    
    if (agents.length > 0) {
      const agentSummary = agents.map(([name, count]) => `${name} (${count})`).join(", ");
      lines.push(`Agentes activos: ${agentSummary}.`);
    }

    if (types.length > 0) {
      const typeSummary = types.slice(0, 5).map(([t, c]) => `${t}: ${c}`).join(", ");
      lines.push(`Distribución: ${typeSummary}.`);
    }

    if (errorCount > 0) {
      lines.push(`⚠️ ${errorCount} errores detectados.`);
    }

    if (notableActions.length > 0) {
      lines.push(`Acciones destacadas: ${notableActions.slice(0, 5).join("; ")}.`);
    }

    // Total tokens if available
    const totalTokens = activities.reduce((sum, a) => sum + (a.tokens_used || 0), 0);
    if (totalTokens > 0) {
      lines.push(`Tokens consumidos: ${totalTokens.toLocaleString()}.`);
    }

    const narrative = lines.join(" ");

    // Build highlights
    const highlights: string[] = [];
    if (successRate === 100) highlights.push("✅ 100% tasa de éxito");
    if (errorCount > 0) highlights.push(`❌ ${errorCount} errores`);
    if (total > 50) highlights.push(`🔥 ${total} actividades (día intenso)`);
    if (agents.length > 1) highlights.push(`🤖 ${agents.length} agentes activos`);
    if (totalTokens > 10000) highlights.push(`📊 ${Math.round(totalTokens / 1000)}K tokens`);
    highlights.push(`📈 ${successRate}% éxito`);

    // Create the entry
    const entry = createJournalEntry({
      date,
      narrative,
      highlights: highlights.slice(0, 10),
    });

    return NextResponse.json({ entry, generated: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to auto-generate journal entry:", error);
    return NextResponse.json(
      { error: "Failed to auto-generate journal entry" },
      { status: 500 }
    );
  }
}
