import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE_ROOT = path.resolve(
  process.env.WORKSPACE_PATH ||
    path.join(process.env.HOME || "/home/ubuntu", ".openclaw/workspace")
);

/**
 * Validates that a resolved path is within the workspace root.
 * Prevents path traversal attacks.
 */
function isPathWithinWorkspace(inputPath: string): boolean {
  const resolved = path.resolve(WORKSPACE_ROOT, inputPath);
  const relativePath = path.relative(WORKSPACE_ROOT, resolved);

  // If relative path starts with "..", it's outside the workspace
  return !relativePath.startsWith("..") && !relativePath.startsWith(path.sep + "..");
}

/**
 * Safe path join that validates the result is within workspace.
 */
function safePathJoin(...segments: string[]): string {
  const fullPath = path.join(...segments);
  if (!isPathWithinWorkspace(fullPath)) {
    throw new Error(`Path traversal detected: ${fullPath}`);
  }
  return path.resolve(WORKSPACE_ROOT, fullPath);
}

interface PDCACycle {
  id: string;
  title: string;
  status: "plan" | "do" | "check" | "act" | "done";
  date: string;
  category: "mejora" | "investigacion" | "fix" | "aprendizaje" | "protocolo";
  description: string;
  source: string;
  metrics?: string;
  outcome?: string;
}

interface PDCAStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
}

// ── Parsers ────────────────────────────────────────────────────────

function parsePDCALog(): PDCACycle[] {
  const filePath = safePathJoin("reports/central/active/PDCA_LOG.md");
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const cycles: PDCACycle[] = [];
  const dateMatch = content.match(/\*\*Fecha:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch?.[1] ?? "unknown";

  // Parse "Mejoras Implementadas" section
  const mejoraSection = content.match(
    /## 🚀 Mejoras Implementadas\s*\n([\s\S]*?)(?=## |$)/
  );
  if (mejoraSection) {
    const items = mejoraSection[1].split(/^### /m).slice(1);
    for (const item of items) {
      const lines = item.split("\n");
      const title = lines[0].trim();
      if (!title || title.includes("NINGUNA")) continue;
      const body = lines.slice(1).join("\n").trim();
      cycles.push({
        id: `pdca-log-${cycles.length}`,
        title,
        status: "done",
        date,
        category: "mejora",
        description: body,
        source: "PDCA_LOG.md",
      });
    }
  }

  // Parse "Aprendizajes Nuevos" section
  const aprendSection = content.match(
    /## 📈 Aprendizajes Nuevos[\s\S]*?\n([\s\S]*?)(?=## 🔄|## 💡|$)/
  );
  if (aprendSection) {
    const items = aprendSection[1].split(/^### /m).slice(1);
    for (const item of items) {
      const lines = item.split("\n");
      const title = lines[0].trim();
      if (!title) continue;
      const body = lines.slice(1).join("\n").trim();

      let category: PDCACycle["category"] = "aprendizaje";
      const estadoMatch = body.match(/\*\*Estado:\*\*\s*(.+)/);
      let status: PDCACycle["status"] = "done";

      if (estadoMatch) {
        const estado = estadoMatch[1].toLowerCase();
        if (estado.includes("adoptar")) {
          category = "mejora";
          status = "do";
        } else if (estado.includes("evaluar")) {
          category = "investigacion";
          status = "plan";
        }
      }

      cycles.push({
        id: `pdca-aprend-${cycles.length}`,
        title,
        status,
        date,
        category,
        description: body,
        source: "PDCA_LOG.md",
        outcome: estadoMatch?.[1],
      });
    }
  }

  // Parse "Próximos Pasos" section as Plan items
  const proximosSection = content.match(
    /## 🔄 Próximos Pasos([\s\S]*?)(?=## 💡|$)/
  );
  if (proximosSection) {
    const items = proximosSection[1].split(/^### /m).slice(1);
    for (const item of items) {
      const lines = item.split("\n");
      const title = lines[0].trim();
      if (!title) continue;
      const body = lines.slice(1).join("\n").trim();
      cycles.push({
        id: `pdca-plan-${cycles.length}`,
        title: `Plan: ${title}`,
        status: "plan",
        date,
        category: title.toLowerCase().includes("investig")
          ? "investigacion"
          : title.toLowerCase().includes("fix") || title.toLowerCase().includes("resolver")
          ? "fix"
          : "mejora",
        description: body,
        source: "PDCA_LOG.md",
      });
    }
  }

  // If no detailed items found, create a summary cycle from the whole file
  if (cycles.length === 0) {
    const metricMatch = content.match(/## 📊 Métricas Diarias([\s\S]*?)(?=## )/);
    cycles.push({
      id: "pdca-log-summary",
      title: "PDCA Daily Log",
      status: "check",
      date,
      category: "mejora",
      description: metricMatch ? metricMatch[1].trim() : "Daily PDCA cycle log entry",
      source: "PDCA_LOG.md",
      metrics: metricMatch?.[1].trim(),
    });
  }

  return cycles;
}

function parseSeguirAprendiendo(): PDCACycle[] {
  const dir = safePathJoin("reports/cron/seguir-aprendiendo");
  if (!fs.existsSync(dir)) return [];

  const cycles: PDCACycle[] = [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse(); // newest first

  for (const file of files.slice(0, 10)) {
    const filePath = safePathJoin(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch?.[1] ?? file.replace(".md", "");

    // Extract tema
    const temaMatch = content.match(
      /### Tema seleccionado:\s*(.+)/
    );
    const tema = temaMatch?.[1]?.trim() ?? `Aprendizaje ${date}`;

    // Extract sections
    const descMatch = content.match(
      /### Qué es:\s*\n([\s\S]*?)(?=### |## 2\.|$)/
    );
    const verdictMatch = content.match(
      /\*\*Veredicto\*\*:\s*(.+)/i
    );
    const question2Match = content.match(
      /### Pregunta 2:[\s\S]*?\*\*Veredicto\*\*:\s*(.+)/i
    );

    // Determine status
    let status: PDCACycle["status"] = "done";
    if (verdictMatch) {
      const v = verdictMatch[1].toLowerCase();
      if (v.includes("evaluar")) status = "plan";
      else if (v.includes("adoptar")) status = "do";
    }

    cycles.push({
      id: `sa-${file.replace(".md", "")}`,
      title: tema,
      status,
      date,
      category: "aprendizaje",
      description: descMatch?.[1]?.trim() ?? "",
      source: "seguir-aprendiendo",
      outcome: question2Match?.[1]?.trim() ?? verdictMatch?.[1]?.trim(),
    });
  }

  return cycles;
}

function parseWeeklySelfImprovement(): PDCACycle[] {
  const dir = safePathJoin("reports/cron/weekly-self-improvement");
  if (!fs.existsSync(dir)) return [];

  const cycles: PDCACycle[] = [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  for (const file of files) {
    const filePath = safePathJoin(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const dateMatch = content.match(
      /(\d{1,2}\s+de\s+\w+\s+\d{4})/
    ) ?? file.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch?.[1] ?? file.replace(".md", "");

    // Extract resumen ejecutivo
    const resumenMatch = content.match(
      /## 📊 RESUMEN EJECUTIVO\s*\n([\s\S]*?)(?=## |$)/
    );

    // Extract improvements
    const improveMatch = content.match(
      /## 🚀 Mejoras Implementadas([\s\S]*?)(?=## |$)/
    );

    cycles.push({
      id: `wsi-${file.replace(".md", "")}`,
      title: `Weekly Review - ${date}`,
      status: "check",
      date: file.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? date,
      category: "mejora",
      description: resumenMatch?.[1]?.trim() ?? "",
      source: "weekly-self-improvement",
      metrics: improveMatch?.[1]?.trim(),
    });
  }

  return cycles;
}

function parseAutoresearchProtocol(): PDCACycle {
  const filePath = safePathJoin(".learnings/AUTORESEARCH_PROTOCOL.md");
  if (!fs.existsSync(filePath))
    return {
      id: "ar-protocol",
      title: "AutoResearch Protocol",
      status: "done",
      date: "2026-04-11",
      category: "protocolo",
      description: "Protocolo de mejora continua basado en PDCA + Kaizen + Memoria",
      source: "AUTORESEARCH_PROTOCOL.md",
    };

  const content = fs.readFileSync(filePath, "utf-8");
  const dateMatch = content.match(/\*\*Creado:\*\*\s*(\d{4}-\d{2}-\d{2})/);

  return {
    id: "ar-protocol",
    title: "AutoResearch Protocol",
    status: "done",
    date: dateMatch?.[1] ?? "unknown",
    category: "protocolo",
    description:
      "Protocolo formal de mejora continua: SCAN → HYPOTHESIS → EXPERIMENT → MEASURE → INTEGRATE. Cada cambio es un experimento. Basado en karpathy/autoresearch.",
    source: "AUTORESEARCH_PROTOCOL.md",
  };
}

// ── Stats ──────────────────────────────────────────────────────────

function computeStats(cycles: PDCACycle[]): PDCAStats {
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  for (const c of cycles) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    const month = c.date.slice(0, 7);
    if (month.length === 7) {
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
  }

  return { total: cycles.length, byStatus, byCategory, byMonth };
}

// ── Handler ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const cycles: PDCACycle[] = [
      parseAutoresearchProtocol(),
      ...parsePDCALog(),
      ...parseSeguirAprendiendo(),
      ...parseWeeklySelfImprovement(),
    ];

    // Sort by date descending
    cycles.sort((a, b) => b.date.localeCompare(a.date));

    const stats = computeStats(cycles);

    return NextResponse.json({ cycles, stats });
  } catch (error) {
    console.error("PDCA API error:", error);
    return NextResponse.json(
      { cycles: [], stats: { total: 0, byStatus: {}, byCategory: {}, byMonth: {} } },
      { status: 500 }
    );
  }
}
