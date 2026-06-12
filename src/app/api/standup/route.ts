import { NextResponse } from "next/server";
import { getActivities } from "@/lib/activities-db";
import { getDb } from "@/lib/kanban-db";

export const dynamic = "force-dynamic";

interface StandupSection {
  title: string;
  items: string[];
  count: number;
}

interface StandupReport {
  date: string;
  generatedAt: string;
  summary: {
    totalActivities: number;
    successRate: number;
    topActivityTypes: { type: string; count: number }[];
  };
  yesterday: StandupSection;
  today: StandupSection;
  blockers: StandupSection;
  tasksByAgent: { agent: string; total: number; done: number; inProgress: number; todo: number }[];
}

export async function GET() {
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Fetch activities for yesterday
    const yesterdayActivities = getActivities({ limit: 500, offset: 0 });
    const allActivities = yesterdayActivities.activities || [];

    const filteredYesterday = allActivities.filter(
      (a: { timestamp?: string }) => a.timestamp && new Date(a.timestamp) >= yesterdayStart && new Date(a.timestamp) < todayStart
    );
    const filteredToday = allActivities.filter(
      (a: { timestamp?: string }) => a.timestamp && new Date(a.timestamp) >= todayStart
    );

    // Success rate
    const totalWithStatus = allActivities.filter((a: { status?: string }) => a.status).length;
    const successCount = allActivities.filter((a: { status?: string }) => a.status === "success" || a.status === "approved").length;
    const successRate = totalWithStatus > 0 ? Math.round((successCount / totalWithStatus) * 100) : 100;

    // Top activity types
    const typeCounts: Record<string, number> = {};
    allActivities.forEach((a: { type?: string }) => {
      if (a.type) typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });
    const topActivityTypes = Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Tasks by agent from kanban
    let tasksByAgent: StandupReport["tasksByAgent"] = [];
    try {
      const db = getDb();
      const agentRows = db.prepare(`
        SELECT assigned_to as agent, 
               COUNT(*) as total,
               SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
               SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
               SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo
        FROM tasks 
        WHERE deleted_at IS NULL
        GROUP BY assigned_to
        ORDER BY total DESC
      `).all() as { agent: string; total: number; done: number; inProgress: number; todo: number }[];
      tasksByAgent = agentRows.map(r => ({
        agent: r.agent || "Unassigned",
        total: r.total,
        done: r.done || 0,
        inProgress: r.inProgress || 0,
        todo: r.todo || 0,
      }));
    } catch {
      // kanban DB may not be available
    }

    // Build sections
    const yesterdayItems = filteredYesterday
      .slice(0, 10)
      .map((a: { description?: string; type?: string; status?: string }) => 
        `[${a.status || "ok"}] ${a.type || "action"}: ${a.description || "no description"}`
      );

    const todayItems = filteredToday
      .slice(0, 10)
      .map((a: { description?: string; type?: string; status?: string }) =>
        `[${a.status || "ok"}] ${a.type || "action"}: ${a.description || "no description"}`
      );

    const errorItems = allActivities
      .filter((a: { status?: string; timestamp?: string }) => a.status === "error" && a.timestamp && new Date(a.timestamp) >= yesterdayStart)
      .slice(0, 5)
      .map((a: { description?: string; type?: string }) => `${a.type || "error"}: ${a.description || "unknown error"}`);

    const report: StandupReport = {
      date: now.toISOString().split("T")[0],
      generatedAt: now.toISOString(),
      summary: {
        totalActivities: allActivities.length,
        successRate,
        topActivityTypes,
      },
      yesterday: {
        title: "Yesterday's Activity",
        items: yesterdayItems,
        count: filteredYesterday.length,
      },
      today: {
        title: "Today's Activity",
        items: todayItems,
        count: filteredToday.length,
      },
      blockers: {
        title: "Blockers / Errors",
        items: errorItems,
        count: errorItems.length,
      },
      tasksByAgent,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to generate standup:", error);
    return NextResponse.json(
      {
        date: new Date().toISOString().split("T")[0],
        generatedAt: new Date().toISOString(),
        summary: { totalActivities: 0, successRate: 0, topActivityTypes: [] },
        yesterday: { title: "Yesterday", items: [], count: 0 },
        today: { title: "Today", items: [], count: 0 },
        blockers: { title: "Blockers", items: [], count: 0 },
        tasksByAgent: [],
        error: "Failed to generate standup report",
      },
      { status: 500 }
    );
  }
}
