import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE } from "@/lib/paths";
import { listTasks } from "@/lib/kanban-db";

export const dynamic = "force-dynamic";

const WORKSPACE = path.resolve(OPENCLAW_WORKSPACE);

function safePath(...segments: string[]): string {
  const resolved = path.resolve(WORKSPACE, ...segments);
  const rel = path.relative(WORKSPACE, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path traversal: ${segments.join("/")}`);
  }
  return resolved;
}

export interface ResearchPipelineItem {
  id: string;
  title: string;
  source: "report" | "pdca" | "feature_request" | "kanban_task";
  phase: "investigacion" | "propuesta" | "desarrollo" | "testing" | "deploy";
  status: string;
  agent: string | null;
  priority: "low" | "medium" | "high";
  date: string;
  description: string;
  filePath: string | null;
}

function phaseFromTaskStatus(status: string): ResearchPipelineItem["phase"] {
  switch (status) {
    case "backlog": return "investigacion";
    case "in_progress": return "desarrollo";
    case "review": return "testing";
    case "done": return "deploy";
    case "blocked": return "propuesta";
    default: return "investigacion";
  }
}

function phaseFromReportFilename(name: string): ResearchPipelineItem["phase"] {
  if (/eval|analysis|audit|investig/i.test(name)) return "investigacion";
  if (/proposal|propuesta|plan|outreach/i.test(name)) return "propuesta";
  if (/implement|setup|develop|build/i.test(name)) return "desarrollo";
  if (/test|qa|review|security-check/i.test(name)) return "testing";
  if (/launch|deploy|release|go-live/i.test(name)) return "deploy";
  return "investigacion";
}

function priorityFromName(name: string): "low" | "medium" | "high" {
  if (/critical|urgent|hotfix|security/i.test(name)) return "high";
  if (/important|enhancement|feature/i.test(name)) return "medium";
  return "low";
}

function parseReports(): ResearchPipelineItem[] {
  const activeDir = safePath("reports/central/active");
  if (!fs.existsSync(activeDir)) return [];

  const items: ResearchPipelineItem[] = [];
  const entries = fs.readdirSync(activeDir);

  for (const entry of entries) {
    const fullPath = path.join(activeDir, entry);
    if (!fs.statSync(fullPath).isFile() || !entry.endsWith(".md")) continue;
    if (entry === "PDCA_LOG.md") continue; // Handled separately

    const content = fs.readFileSync(fullPath, "utf-8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : entry.replace(/\.md$/, "").replace(/-/g, " ");

    const stat = fs.statSync(fullPath);
    const date = stat.mtime.toISOString().split("T")[0];

    // Try to extract agent from content
    const agentMatch = content.match(/\*\*(?:Agente|Agent|Autor|Responsable):\*\*\s*(.+)/i);
    const agent = agentMatch ? agentMatch[1].trim() : null;

    // Extract status keywords
    const statusMatch = content.match(/\*\*(?:Status|Estado):\*\*\s*(.+)/i);
    const status = statusMatch ? statusMatch[1].trim() : "active";

    // Description: first non-heading paragraph
    const descMatch = content.match(/^##.*\n+([^\n#]+)/m);
    const description = descMatch ? descMatch[1].trim().substring(0, 200) : title;

    items.push({
      id: `report-${entry}`,
      title,
      source: "report",
      phase: phaseFromReportFilename(entry),
      status,
      agent,
      priority: priorityFromName(entry),
      date,
      description,
      filePath: entry,
    });
  }

  return items;
}

function parsePDCA(): ResearchPipelineItem[] {
  const pdcaFile = safePath("reports/central/active/PDCA_LOG.md");
  if (!fs.existsSync(pdcaFile)) return [];

  const content = fs.readFileSync(pdcaFile, "utf-8");
  const items: ResearchPipelineItem[] = [];

  // Extract PDCA cycles
  const cycleRegex = /###\s+(SCAN|HYPOTHESIS|EXPERIMENT|MEASURE|INTEGRATE)\s+\(Fase\s+\d+\)([\s\S]*?)(?=###|$)/g;
  let match;
  let cycleIdx = 0;

  while ((match = cycleRegex.exec(content)) !== null) {
    const phase_name = match[1];
    const section = match[2];
    cycleIdx++;

    const descMatch = section.match(/[-•]\s+(.+)/);
    const description = descMatch ? descMatch[1].trim().substring(0, 200) : `${phase_name} phase`;

    items.push({
      id: `pdca-${cycleIdx}`,
      title: `PDCA #${String(cycleIdx).padStart(3, "0")} - ${phase_name}`,
      source: "pdca",
      phase: phase_name === "SCAN" ? "investigacion"
        : phase_name === "HYPOTHESIS" ? "propuesta"
        : phase_name === "EXPERIMENT" ? "desarrollo"
        : phase_name === "MEASURE" ? "testing"
        : "deploy",
      status: "active",
      agent: "alfred",
      priority: "medium",
      date: new Date().toISOString().split("T")[0],
      description,
      filePath: "PDCA_LOG.md",
    });
  }

  // If no cycles parsed, create a summary item
  if (items.length === 0) {
    const dateMatch = content.match(/\*\*Fecha:\*\*\s*(\d{4}-\d{2}-\d{2})/);
    const errorsMatch = content.match(/\*\*Errores nuevos:\*\*\s*(\d+)/);

    items.push({
      id: "pdca-summary",
      title: "PDCA Log - Último ciclo",
      source: "pdca",
      phase: "investigacion",
      status: "active",
      agent: "alfred",
      priority: "medium",
      date: dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0],
      description: `Errores nuevos: ${errorsMatch?.[1] ?? "?"}`,
      filePath: "PDCA_LOG.md",
    });
  }

  return items;
}

function parseFeatureRequests(): ResearchPipelineItem[] {
  const paths = [
    safePath(".learnings/FEATURE_REQUESTS.md"),
  ];

  const items: ResearchPipelineItem[] = [];
  for (const fp of paths) {
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, "utf-8");

    // Parse entries: ### FR-XXX or ## FR-XXX
    const frRegex = /#{2,3}\s+(FR-\d+.*?)\n([\s\S]*?)(?=#{2,3}\s+FR-|$)/g;
    let match;
    while ((match = frRegex.exec(content)) !== null) {
      const title = match[1].trim();
      const section = match[2];

      const statusMatch = section.match(/\*\*Status:\*\*\s*(.+)/i);
      const status = statusMatch ? statusMatch[1].trim() : "open";

      const priorityMatch = section.match(/\*\*Priority:\*\*\s*(.+)/i);
      const priorityRaw = priorityMatch ? priorityMatch[1].trim().toLowerCase() : "medium";

      const descMatch = section.match(/\*\*Descripción:\*\*\s*(.+)/i);
      const description = descMatch ? descMatch[1].trim().substring(0, 200) : title;

      items.push({
        id: `fr-${title.replace(/\s+/g, "-")}`,
        title,
        source: "feature_request",
        phase: status === "done" || status === "implemented" ? "deploy"
          : status === "in_progress" ? "desarrollo"
          : status === "rejected" ? "propuesta"
          : "investigacion",
        status,
        agent: null,
        priority: priorityRaw === "high" ? "high" : priorityRaw === "low" ? "low" : "medium",
        date: new Date().toISOString().split("T")[0],
        description,
        filePath: null,
      });
    }
  }
  return items;
}

function getKanbanResearchTasks(): ResearchPipelineItem[] {
  try {
    const tasks = listTasks();
    // Filter for research/investigation related tasks
    return tasks
      .filter((t) =>
        t.status !== "done" &&
        (t.title?.toLowerCase().includes("research") ||
          t.title?.toLowerCase().includes("investig") ||
          t.title?.toLowerCase().includes("analysis") ||
          t.title?.toLowerCase().includes("report") ||
          t.title?.toLowerCase().includes("pipeline") ||
          t.title?.toLowerCase().includes("catalog") ||
          t.description?.toLowerCase().includes("autoresearch") ||
          t.description?.toLowerCase().includes("investig"))
      )
      .map((t) => ({
        id: `kt-${t.id}`,
        title: t.title,
        source: "kanban_task" as const,
        phase: phaseFromTaskStatus(t.status),
        status: t.status,
        agent: t.assignee || null,
        priority: (t.priority as "low" | "medium" | "high") || "medium",
        date: t.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
        description: (t.description || "").substring(0, 200),
        filePath: null,
      }));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const reports = parseReports();
    const pdca = parsePDCA();
    const features = parseFeatureRequests();
    const kanbanTasks = getKanbanResearchTasks();

    const all = [...reports, ...pdca, ...features, ...kanbanTasks];

    // Phase stats
    const phases = ["investigacion", "propuesta", "desarrollo", "testing", "deploy"] as const;
    const phaseStats = Object.fromEntries(
      phases.map((p) => [p, all.filter((i) => i.phase === p).length])
    );

    // Source stats
    const sourceStats = Object.fromEntries(
      (["report", "pdca", "feature_request", "kanban_task"] as const).map(
        (s) => [s, all.filter((i) => i.source === s).length]
      )
    );

    return NextResponse.json({
      items: all,
      stats: {
        total: all.length,
        byPhase: phaseStats,
        bySource: sourceStats,
      },
    });
  } catch (error) {
    console.error("Pipeline research GET error:", error);
    // Don't leak internal error details (paths, FS errors) to the client.
    return NextResponse.json(
      { error: "Failed to load research pipeline" },
      { status: 500 }
    );
  }
}
