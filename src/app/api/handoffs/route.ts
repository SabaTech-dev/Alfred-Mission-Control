import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface Handoff {
  id: string;
  from: string;
  to: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  model?: string;
}

// Sample handoff data based on typical agent interactions
const SAMPLE_HANDOFFS: Handoff[] = [
  {
    id: "h1",
    from: "Alfred",
    to: "coder",
    task: "Implement Fase 3 UX Pro features for Mission Control",
    status: "running",
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    model: "zai/glm-5.1",
  },
  {
    id: "h2",
    from: "Alfred",
    to: "research",
    task: "Research best practices for real-time polling patterns",
    status: "completed",
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 6800000).toISOString(),
    durationMs: 400000,
    model: "zai/glm-5",
  },
  {
    id: "h3",
    from: "Alfred",
    to: "security",
    task: "Audit API endpoints for injection vulnerabilities",
    status: "completed",
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86000000).toISOString(),
    durationMs: 400000,
    model: "zai/glm-5",
  },
  {
    id: "h4",
    from: "Alfred",
    to: "devops",
    task: "Diagnose session polling connection timeout",
    status: "failed",
    startedAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: new Date(Date.now() - 172700000).toISOString(),
    durationMs: 100000,
    model: "zai/glm-4.7",
  },
  {
    id: "h5",
    from: "coder",
    to: "qa-tester",
    task: "Validate regression coverage for Mission Control rendering changes",
    status: "pending",
    startedAt: new Date().toISOString(),
    model: "zai/glm-4.7",
  },
];

export async function GET() {
  try {
    // Try to read session state for real handoff data
    const sessionStatePath = path.join(process.cwd(), "..", "SESSION-STATE.md");
    
    let handoffs: Handoff[] = [...SAMPLE_HANDOFFS];
    
    try {
      const sessionState = await fs.readFile(sessionStatePath, "utf-8");
      
      // Look for delegations section in SESSION-STATE.md
      const delegationsMatch = sessionState.match(/### Delegaciones Activas[\s\S]*?(?=###|$)/);
      if (delegationsMatch) {
        // Parse delegation table rows
        const rowMatches = delegationsMatch[0].matchAll(/\|\s*(\w+)\s*\|\s*(\w+[\w-]*)\s*\|\s*(\S+)\s*\|/g);
        const modelByAgent: Record<string, string> = {
          coder: "zai/glm-5.1",
          research: "zai/glm-5",
          security: "zai/glm-5",
          devops: "zai/glm-4.7",
          "qa-tester": "zai/glm-4.7",
        };
        for (const match of rowMatches) {
          const [, fase, agente, estado] = match;
          if (agente && agente !== "Agente") {
            // Add to handoffs if not already present
            const existingHandoff = handoffs.find(h => h.task.includes(fase));
            if (!existingHandoff && estado !== "⏳") {
              handoffs.unshift({
                id: `h-${Date.now()}-${fase}`,
                from: "Alfred",
                to: agente,
                task: `${fase} implementation`,
                status: estado.includes("✅") ? "completed" : estado.includes("⏳") ? "pending" : "running",
                startedAt: new Date().toISOString(),
                model: modelByAgent[agente],
              });
            }
          }
        }
      }
    } catch {
      // SESSION-STATE.md not readable, use sample data
    }

    // Calculate stats
    const stats = {
      total: handoffs.length,
      completed: handoffs.filter(h => h.status === "completed").length,
      running: handoffs.filter(h => h.status === "running").length,
      pending: handoffs.filter(h => h.status === "pending").length,
      failed: handoffs.filter(h => h.status === "failed").length,
      successRate: 0,
      avgDurationMs: 0,
    };

    stats.successRate = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100) 
      : 0;

    const completedWithDuration = handoffs.filter(h => h.durationMs);
    stats.avgDurationMs = completedWithDuration.length > 0
      ? Math.round(completedWithDuration.reduce((sum, h) => sum + (h.durationMs || 0), 0) / completedWithDuration.length)
      : 0;

    return NextResponse.json({
      handoffs,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching handoffs:", error);
    return NextResponse.json({
      handoffs: SAMPLE_HANDOFFS,
      stats: {
        total: SAMPLE_HANDOFFS.length,
        completed: 2,
        running: 1,
        pending: 1,
        failed: 1,
        successRate: 40,
        avgDurationMs: 300000,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
