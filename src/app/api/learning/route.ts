import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WORKSPACE = process.env.WORKSPACE_PATH || path.join(process.env.HOME || "/home/ubuntu", ".openclaw/workspace");

interface LearningEntry {
  id: string;
  title: string;
  category: "golden" | "rule" | "pattern" | "adoption";
  content: string;
  date: string;
}

interface ErrorEntry {
  id: string;
  title: string;
  status: "open" | "mitigated" | "resolved" | "verified";
  content: string;
}

interface FeatureRequest {
  id: string;
  title: string;
  content: string;
}

function parseLearnings(content: string): LearningEntry[] {
  const entries: LearningEntry[] = [];
  const sections = content.split(/^### /m).slice(1);

  for (const section of sections) {
    const lines = section.split("\n");
    const titleLine = lines[0];
    const body = lines.slice(1).join("\n").trim();

    let category: LearningEntry["category"] = "pattern";
    if (titleLine.includes("REGLA DE ORO")) category = "golden";
    else if (titleLine.includes("REGLA") || titleLine.includes("REGla")) category = "rule";
    else if (titleLine.includes("Adopción")) category = "adoption";

    const dateMatch = titleLine.match(/\((\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : "unknown";
    const title = titleLine.replace(/^[🥇🔴🟡🟢]+\s*/, "").trim();

    entries.push({
      id: Buffer.from(title).toString("base64").slice(0, 12),
      title,
      category,
      content: body,
      date,
    });
  }
  return entries;
}

function parseErrors(content: string): ErrorEntry[] {
  const entries: ErrorEntry[] = [];
  const regex = /##\s*\[([^\]]+)\]\s*(.+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    const title = match[2].trim();
    const statusMatch = content.slice(match.index + match[0].length, match.index + match[0].length + 200).match(/Status:\s*(\w+)/i);
    const status = statusMatch ? (statusMatch[1].toLowerCase() as ErrorEntry["status"]) : "open";

    const sectionEnd = content.indexOf("## [", match.index + 1);
    const sectionContent = content.slice(
      match.index + match[0].length,
      sectionEnd > 0 ? sectionEnd : content.length
    ).trim();

    entries.push({ id, title, status, content: sectionContent });
  }
  return entries;
}

function parseFeatureRequests(content: string): FeatureRequest[] {
  const entries: FeatureRequest[] = [];
  const lines = content.split("\n");
  let current: FeatureRequest | null = null;

  for (const line of lines) {
    const titleMatch = line.match(/^##\s+(.+)/);
    if (titleMatch) {
      if (current) entries.push(current);
      current = { id: `fr-${entries.length}`, title: titleMatch[1], content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) entries.push(current);
  return entries;
}

export async function GET() {
  try {
    const learningsPath = path.join(WORKSPACE, ".learnings", "LEARNINGS.md");
    const errorsPath = path.join(WORKSPACE, ".learnings", "ERRORS.md");
    const frPath = path.join(WORKSPACE, ".learnings", "FEATURE_REQUESTS.md");
    const radarPath = path.join(WORKSPACE, "docs", "tech-radar.md");

    const learningsContent = fs.existsSync(learningsPath) ? fs.readFileSync(learningsPath, "utf-8") : "";
    const errorsContent = fs.existsSync(errorsPath) ? fs.readFileSync(errorsPath, "utf-8") : "";
    const frContent = fs.existsSync(frPath) ? fs.readFileSync(frPath, "utf-8") : "";
    const radarContent = fs.existsSync(radarPath) ? fs.readFileSync(radarPath, "utf-8") : "";

    const learnings = parseLearnings(learningsContent);
    const errors = parseErrors(errorsContent);
    const features = parseFeatureRequests(frContent);

    // Stats
    const errorStats = {
      total: errors.length,
      open: errors.filter(e => e.status === "open").length,
      mitigated: errors.filter(e => e.status === "mitigated").length,
      resolved: errors.filter(e => e.status === "resolved").length,
      verified: errors.filter(e => e.status === "verified").length,
    };

    const learningStats = {
      total: learnings.length,
      golden: learnings.filter(l => l.category === "golden").length,
      rules: learnings.filter(l => l.category === "rule").length,
      patterns: learnings.filter(l => l.category === "pattern").length,
      adoptions: learnings.filter(l => l.category === "adoption").length,
    };

    // Radar categories
    const radarCategories: string[] = [];
    const radarRegex = /^##\s+[🔵🟡🟠🔴⚪]\s+(.+)/gm;
    let rMatch;
    while ((rMatch = radarRegex.exec(radarContent)) !== null) {
      radarCategories.push(rMatch[1].trim());
    }

    return NextResponse.json({
      learnings,
      errors,
      features,
      radarContent,
      radarCategories,
      stats: { learnings: learningStats, errors: errorStats, features: features.length },
    });
  } catch (error) {
    console.error("Learning API error:", error);
    return NextResponse.json(
      { learnings: [], errors: [], features: [], radarContent: "", radarCategories: [], stats: { learnings: { total: 0, golden: 0, rules: 0, patterns: 0, adoptions: 0 }, errors: { total: 0, open: 0, mitigated: 0, resolved: 0, verified: 0 }, features: 0 } },
      { status: 500 }
    );
  }
}
