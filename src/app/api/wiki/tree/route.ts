import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.env.HOME || "", ".openclaw/wiki/main");

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function validatePath(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedVault = path.resolve(VAULT_PATH);
  return resolvedPath.startsWith(resolvedVault);
}

async function buildFileTree(dirPath: string, relativePath: string = ""): Promise<FileNode[]> {
  // Security check: validate path is within vault
  if (!validatePath(dirPath)) {
    throw new Error("Invalid path: outside vault");
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    // Skip hidden files and .git
    if (entry.name.startsWith(".") || entry.name === ".git") continue;

    const fullPath = path.join(dirPath, entry.name);
    const entryPath = path.join(relativePath, entry.name);

    if (!validatePath(fullPath)) {
      continue; // Skip files outside vault
    }

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, entryPath);
      // Only include directories that have .md files
      const hasMarkdown = children.some((child) =>
        child.type === "file" && child.name.endsWith(".md")
      );
      if (hasMarkdown) {
        nodes.push({
          name: entry.name,
          path: entryPath,
          type: "directory",
          children,
        });
      }
    } else if (entry.name.endsWith(".md")) {
      nodes.push({
        name: entry.name,
        path: entryPath,
        type: "file",
      });
    }
  }

  return nodes.sort((a, b) => {
    // Directories first
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function GET(request: NextRequest) {
  try {
    const _auth = await requireAgentOrSessionAuth(request); if (!_auth.authorized) return _auth.error;

    const tree = await buildFileTree(VAULT_PATH);
    return NextResponse.json(tree);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to build wiki file tree:", error);
    return NextResponse.json({ error: "Failed to load wiki tree" }, { status: 500 });
  }
}
