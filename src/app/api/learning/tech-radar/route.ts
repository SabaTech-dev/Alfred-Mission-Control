import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE = process.env.WORKSPACE_PATH || path.join(process.env.HOME || "/home/ubuntu", ".openclaw/workspace");

export interface RadarTech {
  id: string;
  name: string;
  quadrant: "Adopt" | "Trial" | "Assess" | "Hold";
  ring: number; // 1=inner (most mature) to 4=outer
  description: string;
  category: string;
  license?: string;
  version?: string;
  purpose?: string;
  note?: string;
  status?: string;
}

interface RadarData {
  technologies: RadarTech[];
  stats: {
    total: number;
    byQuadrant: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

const QUADRANT_MAP: Record<string, RadarTech["quadrant"]> = {
  "adoptado": "Adopt",
  "evaluar": "Trial",
  "vigilar": "Assess",
  "descartado": "Hold",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  framework: ["framework", "orquestación", "agent", "coding", "next.js", "react", "fastapi"],
  tool: ["tool", "cli", "automation", "browser", "mcp", "management", "monitoring", "secrets", "billing", "search"],
  language: ["language", "model", "llm", "glm", "gpt", "qwen", "llama", "gemma", "mistral", "claude"],
  platform: ["platform", "self-hosted", "docker", "deploy", "dns", "cloudflare", "coolify", "saas", "dashboard"],
};

function inferCategory(row: string): string {
  const lower = row.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "tool";
}

function parseTableRows(content: string): string[][] {
  const rows: string[][] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && !trimmed.match(/^\|[\s\-:|]+\|$/)) {
      const cells = trimmed.split("|").filter(c => c.trim() !== "").map(c => c.trim());
      rows.push(cells);
    }
  }
  return rows;
}

function parseTechRadar(content: string): { technologies: RadarTech[]; stats: { total: number; byQuadrant: Record<string, number>; byCategory: Record<string, number> } } {
  const technologies: RadarTech[] = [];

  // Split into sections by ## headings - simple and direct
  const sectionRegex = /^## (🔵|🟡|⚪|🔴) (Adoptado|Evaluar|Vigilar|Descartado)/gm;
  const sections: { quadrant: RadarTech["quadrant"]; content: string }[] = [];

  let match;
  const sectionStarts: { index: number; quadrant: RadarTech["quadrant"] }[] = [];

  while ((match = sectionRegex.exec(content)) !== null) {
    const emoji = match[1];
    const quadrantName = match[2]; // Adoptado|Evaluar|Vigilar|Descartado
    const keyword = quadrantName.toLowerCase().trim();
    const quadrant = QUADRANT_MAP[keyword];
    if (quadrant) {
      sectionStarts.push({ index: match.index, quadrant });
    }
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i].index;
    let end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].index : content.length;
    
    // Stop if there's any other ## heading before the next quadrant
    const sectionToEnd = content.slice(start, end);
    const otherHeadingMatch = sectionToEnd.match(/^##\s+(?!🔵|🟡|⚪|🔴).*/gm);
    if (otherHeadingMatch) {
      end = start + sectionToEnd.indexOf(otherHeadingMatch[0]);
    }
    
    const sectionContent = content.slice(start, end);
    sections.push({ quadrant: sectionStarts[i].quadrant, content: sectionContent });
  }

  for (const section of sections) {
    const { quadrant, content: sectionContent } = section;
    const rows = parseTableRows(sectionContent);

    // Skip if no table rows (besides header)
    if (rows.length <= 1) continue;
    const header = rows[0].map(h => h.toLowerCase());

    // Detect column indices - require at least "herramienta/tool" column
    const nameIdx = header.findIndex(h => h.includes("herramienta") || h.includes("tool"));
    if (nameIdx === -1) continue; // Skip if no tool column found
    
    const versionIdx = header.findIndex(h => h.includes("versión") || h.includes("version"));
    const licenseIdx = header.findIndex(h => h.includes("licencia") || h.includes("license"));
    const purposeIdx = header.findIndex(h => h.includes("propósito") || h.includes("purpose") || h.includes("razón") || h.includes("reason"));
    const noteIdx = header.findIndex(h => h.includes("nota") || h.includes("note") || h.includes("estado") || h.includes("status") || h.includes("razón") || h.includes("reason") || h.includes("¿por qué"));
    const dateIdx = header.findIndex(h => h.includes("fecha") || h.includes("date"));
    
    // Additional validation: skip tables that look like investigation results
    if (header.some(h => h.includes("tema") || h.includes("reporte") || h.includes("resultado"))) continue;

    // Assign ring based on quadrant
    let defaultRing: number;
    switch (quadrant) {
      case "Adopt": defaultRing = 1; break;
      case "Trial": defaultRing = 2; break;
      case "Assess": defaultRing = 3; break;
      case "Hold": defaultRing = 4; break;
      default: defaultRing = 4;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue;

      const nameCell = nameIdx >= 0 ? row[nameIdx] : row[0];
      // Clean markdown bold
      const name = nameCell.replace(/\*\*/g, "").replace(/—/g, "").trim();
      if (!name || name.match(/^[-–—]$/)) continue;

      const description = purposeIdx >= 0 ? (row[purposeIdx] || "").replace(/\*\*/g, "").trim() : "";
      const license = licenseIdx >= 0 ? (row[licenseIdx] || "").replace(/\*\*/g, "").trim() : undefined;
      const version = versionIdx >= 0 ? (row[versionIdx] || "").replace(/\*\*/g, "").trim() : undefined;
      const note = noteIdx >= 0 ? (row[noteIdx] || "").replace(/\*\*/g, "").trim() : undefined;

      const category = inferCategory(row.join(" "));

      // Generate unique ID to avoid duplicates
      let id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      // Check for duplicate IDs and append counter if needed
      let counter = 1;
      let originalId = id;
      while (technologies.some(t => t.id === id)) {
        id = `${originalId}-${counter}`;
        counter++;
      }
      
      technologies.push({
        id,
        name,
        quadrant,
        ring: defaultRing,
        description,
        category,
        license: license || undefined,
        version: version || undefined,
        purpose: description,
        note: note || undefined,
      });
    }
  }

  // Stats
  const byQuadrant: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const t of technologies) {
    byQuadrant[t.quadrant] = (byQuadrant[t.quadrant] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  }

  return {
    technologies,
    stats: { total: technologies.length, byQuadrant, byCategory },
  };
}

// Cache for 5 minutes
let cachedData: { data: RadarData; ts: number } | null = null;
const CACHE_TTL = 0; // Force no cache for testing

export async function GET() {
  try {
    if (cachedData && Date.now() - cachedData.ts < CACHE_TTL) {
      return NextResponse.json(cachedData.data);
    }

    const radarPath = path.join(WORKSPACE, "docs", "tech-radar.md");
    if (!fs.existsSync(radarPath)) {
      return NextResponse.json(
        { technologies: [], stats: { total: 0, byQuadrant: {}, byCategory: {} } },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(radarPath, "utf-8");
    const data = parseTechRadar(content);
    cachedData = { data, ts: Date.now() };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Tech Radar API error:", error);
    return NextResponse.json(
      { technologies: [], stats: { total: 0, byQuadrant: {}, byCategory: {} } },
      { status: 500 }
    );
  }
}
