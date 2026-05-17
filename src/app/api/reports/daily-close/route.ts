import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE } from "@/lib/paths";

export const dynamic = "force-dynamic";

const WORKSPACE = path.resolve(OPENCLAW_WORKSPACE);

interface DailyCloseEntry {
  date: string;
  filename: string;
  title: string;
  summary: string;
  logros: string[];
  bloqueos: string[];
  nextSteps: string[];
  content: string;
  type: "cierre" | "agenda";
}

interface EveningAgendaEntry {
  date: string;
  filename: string;
  title: string;
  summary: string;
  advances: string[];
  pendingDecisions: string[];
  activeTasks: { name: string; status: string; detail: string }[];
  suggestedAgenda: string[];
  content: string;
  type: "cierre" | "agenda";
}

type ReportEntry = DailyCloseEntry | EveningAgendaEntry;

function extractDateFromFilename(filename: string): string {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function extractSection(content: string, heading: string): string[] {
  const lines: string[] = [];
  let inSection = false;
  for (const line of content.split("\n")) {
    if (line.match(/^#{1,3}\s+/)) {
      if (inSection) break;
      if (line.toLowerCase().includes(heading.toLowerCase())) {
        inSection = true;
      }
      continue;
    }
    if (inSection) {
      const trimmed = line.replace(/^[-*]\s*/, "").trim();
      if (trimmed) lines.push(trimmed);
    }
  }
  return lines;
}

function extractSummaryText(content: string): string {
  // Extract first non-heading, non-empty paragraph
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith("**") && !trimmed.startsWith("```")) {
      return trimmed.slice(0, 200);
    }
  }
  return "";
}

async function parseCierreDelDia(dirPath: string): Promise<DailyCloseEntry[]> {
  let files: string[];
  try {
    files = await fs.readdir(dirPath);
  } catch {
    return [];
  }

  const entries: DailyCloseEntry[] = [];
  for (const file of files.sort().reverse()) {
    if (!file.endsWith(".md")) continue;
    const fullPath = path.join(dirPath, file);
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      const date = extractDateFromFilename(file);
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Cierre del Día - ${date}`;

      entries.push({
        date,
        filename: file,
        title,
        summary: extractSummaryText(content),
        logros: extractSection(content, "logros"),
        bloqueos: extractSection(content, "bloqueos"),
        nextSteps: extractSection(content, "next steps"),
        content,
        type: "cierre",
      });
    } catch {
      // skip
    }
  }
  return entries;
}

async function parseEveningAgenda(dirPath: string): Promise<EveningAgendaEntry[]> {
  let files: string[];
  try {
    files = await fs.readdir(dirPath);
  } catch {
    return [];
  }

  const entries: EveningAgendaEntry[] = [];
  for (const file of files.sort().reverse()) {
    if (!file.endsWith(".md")) continue;
    const fullPath = path.join(dirPath, file);
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      const date = extractDateFromFilename(file);
      const titleMatch = content.match(/^(#+)\s+(.+)$/m);
      const title = titleMatch ? titleMatch[2].replace(/\*\*/g, "").trim() : `Evening Agenda - ${date}`;

      // Parse active tasks
      const activeTasks: { name: string; status: string; detail: string }[] = [];
      let inActiveTasks = false;
      for (const line of content.split("\n")) {
        if (line.match(/^#{1,3}\s+/)) {
          inActiveTasks = line.toLowerCase().includes("estado de tareas") || line.toLowerCase().includes("tareas activas");
          continue;
        }
        if (inActiveTasks && line.trim().startsWith("-")) {
          const match = line.match(/-\s+\*\*(.+?)\*\*\s*\(([^)]+)\):\s*(.+)/);
          if (match) {
            activeTasks.push({ name: match[1], status: match[2], detail: match[3] });
          } else {
            const simplified = line.replace(/^[-*]\s*/, "").trim();
            if (simplified) activeTasks.push({ name: simplified, status: "", detail: "" });
          }
        }
      }

      entries.push({
        date,
        filename: file,
        title,
        summary: extractSummaryText(content),
        advances: extractSection(content, "avanzamos"),
        pendingDecisions: extractSection(content, "decisiones pendientes"),
        activeTasks,
        suggestedAgenda: extractSection(content, "agenda sugerida"),
        content,
        type: "agenda",
      });
    } catch {
      // skip
    }
  }
  return entries;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get("type"); // "cierre" | "agenda" | null (all)
  const dateFilter = searchParams.get("date"); // YYYY-MM-DD or YYYY-MM
  const search = searchParams.get("search");

  try {
    const cierreDir = path.join(WORKSPACE, "reports/cron/cierre-del-dia");
    const agendaDir = path.join(WORKSPACE, "reports/cron/evening-agenda");

    let cierres: ReportEntry[] = [];
    let agendas: ReportEntry[] = [];

    if (!reportType || reportType === "cierre") {
      cierres = await parseCierreDelDia(cierreDir);
    }
    if (!reportType || reportType === "agenda") {
      agendas = await parseEveningAgenda(agendaDir);
    }

    let all = [...cierres, ...agendas];

    // Apply date filter
    if (dateFilter) {
      all = all.filter((e) => e.date.startsWith(dateFilter));
    }

    // Apply search
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q)
      );
    }

    // Sort by date desc
    all.sort((a, b) => b.date.localeCompare(a.date));

    // Stats
    const stats = {
      totalCierres: cierres.length,
      totalAgendas: agendas.length,
      dateRange: {
        earliest: all.length > 0 ? all[all.length - 1].date : null,
        latest: all.length > 0 ? all[0].date : null,
      },
      availableMonths: [...new Set(all.map((e) => e.date.slice(0, 7)))].sort().reverse(),
    };

    return NextResponse.json({ reports: all, stats });
  } catch (error) {
    console.error("Error in daily-close API:", error);
    return NextResponse.json({ error: "Failed to load daily close data" }, { status: 500 });
  }
}
