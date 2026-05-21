import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.env.HOME || "", ".openclaw/wiki/main");

interface NoteMeta {
  path: string;
  modified: string;
}

async function getModifiedTimes(dirPath: string, relativePath: string = ""): Promise<NoteMeta[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const meta: NoteMeta[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === ".git") continue;

    const fullPath = path.join(dirPath, entry.name);
    const entryPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      const subMeta = await getModifiedTimes(fullPath, entryPath);
      meta.push(...subMeta);
    } else if (entry.name.endsWith(".md")) {
      try {
        const stats = await fs.stat(fullPath);
        meta.push({
          path: entryPath,
          modified: stats.mtime.toISOString(),
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return meta;
}

export async function GET(request: NextRequest) {
  try {
    const _auth = await requireAgentOrSessionAuth(request); if (!_auth.authorized) return _auth.error;

    const meta = await getModifiedTimes(VAULT_PATH);
    return NextResponse.json(meta);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to get wiki meta:", error);
    return NextResponse.json({ error: "Failed to get wiki meta" }, { status: 500 });
  }
}
