import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE } from "@/lib/paths";
export const dynamic = "force-dynamic";

const WORKSPACE = path.resolve(OPENCLAW_WORKSPACE);

function isPathWithinWorkspace(inputPath: string): boolean {
  const resolved = path.resolve(WORKSPACE, inputPath);
  const rel = path.relative(WORKSPACE, resolved);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function safePathJoin(...segments: string[]): string {
  const joined = path.resolve(WORKSPACE, ...segments);
  const rel = path.relative(WORKSPACE, joined);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path traversal detected: ${segments.join("/")}`);
  }
  return joined;
}

const REPORT_DIRS = [
  { base: "reports/central/active", category: "central", sub: "active" },
  { base: "reports/central/archive", category: "central", sub: "archive" },
  { base: "reports/cron/ai-social-digest", category: "cron", sub: "ai-social-digest" },
  { base: "reports/cron/cierre-del-dia", category: "cron", sub: "cierre-del-dia" },
  { base: "reports/cron/evening-agenda", category: "cron", sub: "evening-agenda" },
  { base: "reports/cron/cleanup-diario", category: "cron", sub: "cleanup-diario" },
  { base: "reports/cron/cleanup-semanal", category: "cron", sub: "cleanup-semanal" },
  { base: "reports/cron/cleanup-mensual", category: "cron", sub: "cleanup-mensual" },
  { base: "reports/cron/cron-digest", category: "cron", sub: "cron-digest" },
  { base: "reports/cron/dreaming-custom", category: "cron", sub: "dreaming-custom" },
  { base: "reports/cron/dreaming-rem-replay", category: "cron", sub: "dreaming-rem-replay" },
  { base: "reports/cron/github-sync", category: "cron", sub: "github-sync" },
  { base: "reports/cron/hindsight-log-rotation", category: "cron", sub: "hindsight-log-rotation" },
  { base: "reports/cron/lead-scraper", category: "cron", sub: "lead-scraper" },
  { base: "reports/cron/modo-autonomo-nocturno", category: "cron", sub: "modo-autonomo-nocturno" },
  { base: "reports/cron/owasp-security", category: "cron", sub: "owasp-security" },
  { base: "reports/cron/pdca-diario", category: "cron", sub: "pdca-diario" },
  { base: "reports/cron/pg-backup", category: "cron", sub: "pg-backup" },
  { base: "reports/cron/resumen-matutino", category: "cron", sub: "resumen-matutino" },
  { base: "reports/cron/scout-startups", category: "cron", sub: "scout-startups" },
  { base: "reports/cron/seguir-aprendiendo", category: "cron", sub: "seguir-aprendiendo" },
  { base: "reports/cron/tech-radar", category: "cron", sub: "tech-radar" },
  { base: "reports/cron/weekly-self-improvement", category: "cron", sub: "weekly-self-improvement" },
  { base: "reports/cron/wiki-ingest", category: "cron", sub: "wiki-ingest" },
  { base: "reports/cron/wiki-lint", category: "cron", sub: "wiki-lint" },
  { base: "reports/cron/wiki-sync", category: "cron", sub: "wiki-sync" },
];

interface ReportFile {
  name: string;
  path: string;
  title: string;
  category: string;
  sub: string;
  type: string;
  size: number;
  modified: string;
  created: string;
  contentSnippet?: string;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

function getReportType(filename: string, sub: string): string {
  if (sub.includes("ai-social-digest")) return "ai-digest";
  if (sub.includes("cierre-del-dia")) return "daily-close";
  if (sub.includes("evening-agenda")) return "evening-agenda";
  if (sub.includes("cleanup")) return "cleanup";
  if (sub.includes("cron-digest")) return "cron-digest";
  if (sub.includes("dreaming")) return "dreaming";
  if (sub.includes("github-sync")) return "github-sync";
  if (sub.includes("hindsight-log-rotation")) return "log-rotation";
  if (sub.includes("lead-scraper")) return "lead-scraper";
  if (sub.includes("modo-autonomo-nocturno")) return "nocturnal";
  if (sub.includes("owasp-security")) return "owasp-security";
  if (sub.includes("pdca")) return "pdca";
  if (sub.includes("pg-backup")) return "pg-backup";
  if (sub.includes("resumen-matutino")) return "morning-summary";
  if (sub.includes("scout-startups")) return "scout-startups";
  if (sub.includes("seguir-aprendiendo")) return "learning";
  if (sub.includes("tech-radar")) return "tech-radar";
  if (sub.includes("weekly-self-improvement")) return "self-improvement";
  if (sub.includes("wiki")) return "wiki";
  if (filename.includes("security") || filename.includes("audit")) return "security";
  if (filename.includes("performance")) return "performance";
  if (sub === "active") return "active";
  if (sub === "archive") return "archive";
  return "report";
}

async function scanReportDir(
  base: string,
  category: string,
  sub: string,
  includeContent: boolean = false
): Promise<ReportFile[]> {
  const dirPath = path.join(WORKSPACE, base);
  let files: string[];
  try {
    files = await fs.readdir(dirPath);
  } catch {
    return [];
  }

  const reports: ReportFile[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const fullPath = path.join(dirPath, file);
    try {
      const stat = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, "utf-8");
      reports.push({
        name: file,
        path: `${base}/${file}`,
        title: extractTitle(content),
        category,
        sub,
        type: getReportType(file, sub),
        size: stat.size,
        modified: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
        contentSnippet: includeContent ? content.slice(0, 500) : undefined,
      });
    } catch {
      // skip unreadable files
    }
  }
  return reports;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");
  const category = searchParams.get("category");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  try {
    // Read specific file content
    if (filePath) {
      if (!isPathWithinWorkspace(filePath)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }
      const fullPath = safePathJoin(WORKSPACE, filePath);
      const content = await fs.readFile(fullPath, "utf-8");
      return NextResponse.json({ path: filePath, content });
    }

    // Scan all report directories (include content when searching for full-text)
    const needContent = !!search;
    let allReports: ReportFile[] = [];
    const scanPromises = REPORT_DIRS.map((d) =>
      scanReportDir(d.base, d.category, d.sub, needContent)
    );
    const results = await Promise.all(scanPromises);
    for (const r of results) allReports.push(...r);

    // Apply filters
    if (category && category !== "all") {
      allReports = allReports.filter((r) => r.category === category);
    }
    if (type && type !== "all") {
      allReports = allReports.filter((r) => r.type === type);
    }
    if (search) {
      const q = search.toLowerCase();
      allReports = allReports.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.sub.toLowerCase().includes(q) ||
          (r.contentSnippet && r.contentSnippet.toLowerCase().includes(q))
      );
    }
    // Remove contentSnippet from response to reduce payload
    allReports = allReports.map(({ contentSnippet, ...rest }) => rest);

    // Sort by modified desc
    allReports.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    // Summary stats
    const stats = {
      total: allReports.length,
      byCategory: {
        central: allReports.filter((r) => r.category === "central").length,
        cron: allReports.filter((r) => r.category === "cron").length,
      },
      byType: allReports.reduce<Record<string, number>>((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {}),
    };

    return NextResponse.json({ reports: allReports, stats });
  } catch (error) {
    console.error("Error in reports/files API:", error);
    return NextResponse.json({ error: "Failed to scan reports" }, { status: 500 });
  }
}
