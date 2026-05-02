import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth-check";

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.env.HOME || "", ".openclaw/wiki/main");

interface SearchResult {
  path: string;
  title: string;
  preview: string;
}

function parseTitle(content: string): string {
  const match = content.match(/^---\n[\s\S]*?title:\s*["']?([^"'\n]+)["']?/);
  if (match) return match[1];

  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1];

  return "";
}

function extractPreview(content: string, query: string, maxLength: number = 200): string {
  // Remove frontmatter
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, "");

  // Find query match
  const queryLower = query.toLowerCase();
  const bodyLower = body.toLowerCase();
  const index = bodyLower.indexOf(queryLower);

  if (index === -1) {
    return body.slice(0, maxLength) + "...";
  }

  // Extract context around match
  const start = Math.max(0, index - 50);
  const end = Math.min(body.length, index + query.length + 50);

  let preview = body.slice(start, end);
  if (start > 0) preview = "..." + preview;
  if (end < body.length) preview = preview + "...";

  return preview;
}

async function searchDirectory(dirPath: string, relativePath: string = "", query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === ".git") continue;

    const fullPath = path.join(dirPath, entry.name);
    const entryPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      const subResults = await searchDirectory(fullPath, entryPath, query);
      results.push(...subResults);
    } else if (entry.name.endsWith(".md")) {
      const content = await fs.readFile(fullPath, "utf-8");
      const contentLower = content.toLowerCase();

      // Search in content and title
      if (contentLower.includes(query.toLowerCase())) {
        const title = parseTitle(content) || entry.name.replace(".md", "");
        const preview = extractPreview(content, query);

        results.push({
          path: entryPath,
          title,
          preview,
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
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchDirectory(VAULT_PATH, "", query);

    return NextResponse.json({ results: results.slice(0, 20) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to search wiki:", error);
    return NextResponse.json({ error: "Failed to search wiki" }, { status: 500 });
  }
}
