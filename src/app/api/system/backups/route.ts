import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME || "/root", ".openclaw");
const BACKUP_DIR = path.join(OPENCLAW_DIR, "backups");

interface BackupEntry {
  id: string;
  timestamp: string;
  status: "completed" | "failed" | "in_progress";
  size_bytes: number;
  components: string[];
}

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function readBackupIndex(): BackupEntry[] {
  const indexPath = path.join(BACKUP_DIR, "index.json");
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  } catch {
    return [];
  }
}

function writeBackupIndex(entries: BackupEntry[]): void {
  ensureBackupDir();
  fs.writeFileSync(
    path.join(BACKUP_DIR, "index.json"),
    JSON.stringify(entries, null, 2)
  );
}

function createBackup(): BackupEntry {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const components: string[] = [];

  let totalSize = 0;

  ensureBackupDir();

  // Backup kanban database
  const kanbanPath = path.join(OPENCLAW_DIR, "workspace/Alfred-Mission-Control/data/kanban.db");
  if (fs.existsSync(kanbanPath)) {
    const destPath = path.join(BACKUP_DIR, `${id}-kanban.db`);
    fs.copyFileSync(kanbanPath, destPath);
    totalSize += fs.statSync(destPath).size;
    components.push("kanban");
  }

  // Backup openclaw config
  const configPath = path.join(OPENCLAW_DIR, "openclaw.json");
  if (fs.existsSync(configPath)) {
    const destPath = path.join(BACKUP_DIR, `${id}-openclaw.json`);
    fs.copyFileSync(configPath, destPath);
    totalSize += fs.statSync(destPath).size;
    components.push("config");
  }

  // Backup usage tracking
  const usagePath = path.join(OPENCLAW_DIR, "data/usage-tracking.db");
  if (fs.existsSync(usagePath)) {
    const destPath = path.join(BACKUP_DIR, `${id}-usage.db`);
    fs.copyFileSync(usagePath, destPath);
    totalSize += fs.statSync(destPath).size;
    components.push("usage");
  }

  return {
    id,
    timestamp,
    status: "completed",
    size_bytes: totalSize,
    components,
  };
}

// GET /api/system/backups — List all backups
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.error;
  try {
    const entries = readBackupIndex();
    return NextResponse.json({ backups: entries, total: entries.length });
  } catch (error) {
    console.error("Error listing backups:", error);
    return NextResponse.json(
      { error: "Failed to list backups" },
      { status: 500 }
    );
  }
}

// POST /api/system/backups — Create a new backup
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.error;
  try {
    const entry = createBackup();
    const entries = readBackupIndex();
    entries.push(entry);
    writeBackupIndex(entries);

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

// DELETE /api/system/backups — Delete backup by ?id=xxx
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.error;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Backup ID is required" },
        { status: 400 }
      );
    }

    const entries = readBackupIndex();
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    // Remove backup files
    const backupFiles = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(id));
    for (const file of backupFiles) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    }

    // Remove from index
    entries.splice(index, 1);
    writeBackupIndex(entries);

    return NextResponse.json({ deleted: id });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return NextResponse.json(
      { error: "Failed to delete backup" },
      { status: 500 }
    );
  }
}
