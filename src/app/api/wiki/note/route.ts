import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.env.HOME || "", ".openclaw/wiki/main");

interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  [key: string]: any;
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content };
  }

  const frontmatter: Frontmatter = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      // Handle arrays
      if (value.startsWith("[") && value.endsWith("]")) {
        frontmatter[key] = value
          .slice(1, -1)
          .split(",")
          .map((v) => v.trim().replace(/^["']|["']$/g, ""));
      } else {
        // Remove quotes from strings
        frontmatter[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  return { frontmatter, content: match[2] };
}

async function getModifiedTime(filePath: string): Promise<string> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime.toISOString();
  } catch {
    return "";
  }
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const _auth = await requireAgentOrSessionAuth(request); if (!_auth.authorized) return _auth.error;

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    const fullPath = path.join(VAULT_PATH, filePath);

    // Security check: ensure path is within vault
    const resolvedPath = path.resolve(fullPath);
    const resolvedVault = path.resolve(VAULT_PATH);
    if (!resolvedPath.startsWith(resolvedVault)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    const content = await fs.readFile(fullPath, "utf-8");
    const { frontmatter, content: body } = parseFrontmatter(content);
    const modified = await getModifiedTime(fullPath);
    const size = await getFileSize(fullPath);

    return NextResponse.json({
      content: body,
      frontmatter,
      modified,
      size,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to load wiki note:", error);
    return NextResponse.json({ error: "Failed to load note" }, { status: 500 });
  }
}
