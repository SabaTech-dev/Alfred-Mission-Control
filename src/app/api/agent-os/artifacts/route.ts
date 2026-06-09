/**
 * Agent OS: Artifacts Gallery API
 * GET /api/agent-os/artifacts — List generated artifacts (reports, files, outputs)
 * Query: ?type=report|file|image|code&limit=50&offset=0
 */
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || "/home/joker/.openclaw";
const WORKSPACE = path.join(OPENCLAW_DIR, "workspace");

interface Artifact {
  id: string;
  name: string;
  type: "report" | "file" | "image" | "code" | "data" | "other";
  path: string;
  size: number;
  modified: string;
  agent: string;
  description: string;
  extension: string;
}

const ARTIFACT_DIRS = [
  { dir: path.join(WORKSPACE, "reports"), type: "report" as const, agent: "alfred" },
  { dir: path.join(WORKSPACE, "output"), type: "file" as const, agent: "alfred" },
  { dir: path.join(OPENCLAW_DIR, "workspace-coder"), type: "code" as const, agent: "coder" },
  { dir: path.join(OPENCLAW_DIR, "workspace-devops"), type: "file" as const, agent: "devops" },
  { dir: path.join(OPENCLAW_DIR, "workspace-qa-tester"), type: "report" as const, agent: "qa" },
  { dir: path.join(OPENCLAW_DIR, "workspace-security"), type: "report" as const, agent: "security" },
];

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".sh", ".yml", ".yaml", ".json", ".md"]);
const DATA_EXTENSIONS = new Set([".csv", ".json", ".xml", ".yaml", ".yml"]);

function detectType(ext: string, dirType: string): Artifact["type"] {
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (DATA_EXTENSIONS.has(ext)) return "data";
  return dirType as Artifact["type"] || "other";
}

async function scanDir(
  dirPath: string,
  defaultType: Artifact["type"],
  defaultAgent: string,
  subdir: string = ""
): Promise<Artifact[]> {
  const results: Artifact[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(dirPath, entry.name);
      const relPath = subdir ? path.join(subdir, entry.name) : entry.name;

      if (entry.isDirectory()) {
        // Recurse one level deep
        const sub = await scanDir(fullPath, defaultType, defaultAgent, relPath);
        results.push(...sub);
      } else {
        const stat = await fs.stat(fullPath).catch(() => null);
        if (!stat) continue;
        const ext = path.extname(entry.name).toLowerCase();
        results.push({
          id: Buffer.from(fullPath).toString("base64").slice(0, 16),
          name: entry.name,
          type: detectType(ext, defaultType),
          path: relPath,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          agent: defaultAgent,
          description: `${entry.name} (${formatBytes(stat.size)})`,
          extension: ext,
        });
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return results;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get("type") || "all";
  const agentFilter = searchParams.get("agent") || "all";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    // Scan all artifact directories in parallel
    const allResults = await Promise.all(
      ARTIFACT_DIRS.map((d) => scanDir(d.dir, d.type, d.agent))
    );

    let artifacts = allResults.flat();

    // Apply filters
    if (typeFilter !== "all") {
      artifacts = artifacts.filter((a) => a.type === typeFilter);
    }
    if (agentFilter !== "all") {
      artifacts = artifacts.filter((a) => a.agent === agentFilter);
    }

    // Sort by modified date descending
    artifacts.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    const total = artifacts.length;
    const paginated = artifacts.slice(offset, offset + limit);

    return NextResponse.json({
      artifacts: paginated,
      total,
      offset,
      limit,
    });
  } catch (error) {
    console.error("[agent-os/artifacts] Error:", error);
    return NextResponse.json({ artifacts: [], total: 0, error: "Failed to list artifacts" }, { status: 500 });
  }
}
