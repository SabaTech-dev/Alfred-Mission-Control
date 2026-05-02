import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth-check";

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.env.HOME || "", ".openclaw/wiki/main");

interface BacklinkResult {
  path: string;
  title: string;
}

function parseTitle(content: string): string {
  const match = content.match(/^---\n[\s\S]*?title:\s*["']?([^"'\n]+)["']?/);
  if (match) return match[1];

  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1];

  return "";
}

function getNoteNameFromPath(notePath: string): string {
  const filename = path.basename(notePath, ".md");
  return filename;
}

async function searchForBacklinks(dirPath: string, relativePath: string = "", targetNoteName: string): Promise<BacklinkResult[]> {
  const results: BacklinkResult[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === ".git") continue;

    const fullPath = path.join(dirPath, entry.name);
    const entryPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      const subResults = await searchForBacklinks(fullPath, entryPath, targetNoteName);
      results.push(...subResults);
    } else if (entry.name.endsWith(".md")) {
      const content = await fs.readFile(fullPath, "utf-8");

      // Search for [[noteName]] or [[noteName|alias]] patterns
      const wikilinkPattern = new RegExp(`\\[\\[${targetNoteName}(?:\\|[^\\]]+)?\\]\\]`, "g");

      if (wikilinkPattern.test(content)) {
        const title = parseTitle(content) || entry.name.replace(".md", "");
        results.push({
          path: entryPath,
          title,
        });
      }
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);

    const { searchParams } = new URL(request.url);
    const notePath = searchParams.get("path");

    if (!notePath) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const targetNoteName = getNoteNameFromPath(notePath);
    const results = await searchForBacklinks(VAULT_PATH, "", targetNoteName);

    return NextResponse.json({ backlinks: results });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to search backlinks:", error);
    return NextResponse.json({ error: "Failed to search backlinks" }, { status: 500 });
  }
}
