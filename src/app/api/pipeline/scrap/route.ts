import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

// Validate path contains no directory traversal or shell metacharacters
function isSafePath(p: string): boolean {
  return !/[;&|`$(){}\[\]<>\n\r\\]/.test(p) && !p.includes("..") && !p.includes("\0");
}

// Validate input string contains only safe characters (alphanumeric, spaces, basic punctuation)
function isSafeInput(input: string): boolean {
  // Allow alphanumeric, spaces, and basic safe characters
  return /^[a-zA-Z0-9\s\-\_\.\/\\:]+$/.test(input);
}

/**
 * Launch lead scraper script
 * POST /api/pipeline/scrap
 *
 * Security: uses execFile (no shell) to prevent command injection.
 */
export async function POST(request: Request) {
  // Auth handled by root middleware.ts (AGENT_OR_SESSION_API_PREFIXES)
  // No additional auth check needed here

  // Parse and validate request body (allow empty body)
  let body = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text);
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Validate workspaceDir if provided in request body
  if (body.workspaceDir) {
    if (!isSafeInput(body.workspaceDir) || !isSafePath(body.workspaceDir)) {
      return NextResponse.json(
        { success: false, error: "Invalid workspace directory path" },
        { status: 400 }
      );
    }
  }

  // Validate scriptPath if provided in request body
  if (body.scriptPath) {
    if (!isSafeInput(body.scriptPath) || !isSafePath(body.scriptPath)) {
      return NextResponse.json(
        { success: false, error: "Invalid script path" },
        { status: 400 }
      );
    }
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

    // Use the validated script path
    const finalScriptPath = body.scriptPath || scriptPath;
    
    if (!isSafePath(finalScriptPath)) {
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