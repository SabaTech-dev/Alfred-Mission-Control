import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";
import { requireAgentOrSessionAuth } from "@/lib/auth-helpers";

const VAULT_PATH = process.env.VAULT_PATH || path.join(process.env.HOME || "", ".openclaw/wiki/main");

function getLastSyncTime(): Date | null {
  try {
    const output = execSync(
      `cd "${VAULT_PATH}" && git log -1 --format=%ct`,
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();

    if (output) {
      return new Date(parseInt(output) * 1000);
    }
  } catch {
    // Git repo might not exist or no commits
  }

  return null;
}

function performSync(): { success: boolean; error?: string } {
  try {
    execSync(`cd "${VAULT_PATH}" && git pull`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000, // 30 seconds
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Sync failed",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const _auth = await requireAgentOrSessionAuth(request); if (!_auth.authorized) return _auth.error;

    const result = performSync();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Sync failed" },
        { status: 500 }
      );
    }

    const lastSync = getLastSyncTime();

    return NextResponse.json({
      success: true,
      lastSync: lastSync?.toISOString() || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to sync wiki:", error);
    return NextResponse.json({ error: "Failed to sync wiki" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const _auth = await requireAgentOrSessionAuth(request); if (!_auth.authorized) return _auth.error;

    const lastSync = getLastSyncTime();
    const now = new Date();

    let status: "green" | "yellow" | "red" = "green";

    if (lastSync) {
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSync > 24) {
        status = "red";
      } else if (hoursSinceSync > 2) {
        status = "yellow";
      }
    } else {
      status = "red";
    }

    return NextResponse.json({
      status,
      lastSync: lastSync?.toISOString() || null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to get sync status:", error);
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 });
  }
}
