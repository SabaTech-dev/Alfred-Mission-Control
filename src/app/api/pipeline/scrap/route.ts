import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

// Validate path contains no directory traversal or shell metacharacters
function isSafePath(p: string): boolean {
  return !/[;&|`$(){}\[\]<>\n\r\\]/.test(p) && !p.includes("..");
}

/**
 * Launch lead scraper script
 * POST /api/pipeline/scrap
 *
 * Security: uses execFile (no shell) to prevent command injection.
 */
export async function POST(request: Request) {
  // Auth check: require agent header
  const agentId = request.headers.get("x-agent-id");
  const agentKey = request.headers.get("x-agent-key");
  const expectedKey = process.env.AGENT_API_KEY;
  if (!expectedKey || agentId !== "coder" || agentKey !== expectedKey) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspaceDir = process.env.OPENCLAW_WORKSPACE || "/home/ubuntu/.openclaw/workspace";
    if (!isSafePath(workspaceDir)) {
      return NextResponse.json(
        { success: false, error: "Invalid workspace configuration" },
        { status: 500 }
      );
    }

    const scriptDir = path.join(workspaceDir, "scripts", "lead-scraper");
    const scriptPath = path.join(scriptDir, "index-v2.js");

    if (!isSafePath(scriptPath)) {
      return NextResponse.json(
        { success: false, error: "Invalid script path" },
        { status: 500 }
      );
    }

    // Use execFile (no shell interpolation) to prevent command injection
    const { stdout, stderr } = await execFileAsync("node", [scriptPath], {
      cwd: scriptDir,
      timeout: 60000,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || "production",
      },
    });

    console.log("[Scraper] Output:", stdout);
    if (stderr) console.error("[Scraper] Stderr:", stderr);

    return NextResponse.json({
      success: true,
      message: "Scrapping iniciado",
      output: stdout,
    });
  } catch (error: unknown) {
    console.error("[Scraper] Error:", error);
    // Do not expose internal error details to client
    return NextResponse.json(
      {
        success: false,
        error: "Failed to launch scraper. Check server logs for details.",
      },
      { status: 500 }
    );
  }
}