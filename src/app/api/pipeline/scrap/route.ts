import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

interface ScrapRequestBody {
  workspaceDir?: unknown;
  scriptPath?: unknown;
}

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
 * Security:
 *   - Uses execFile (no shell) to prevent command injection.
 *   - The script path is fixed by the server: it is derived from
 *     process.env.OPENCLAW_WORKSPACE and a hard-coded relative path.
 *     Request body values for workspaceDir/scriptPath are intentionally
 *     ignored. Validating them and then ignoring them was misleading
 *     (defence-in-depth that misled readers into thinking the body
 *     controlled execution). They are now rejected if present and invalid
 *     to keep a strict input contract, but never influence execution.
 */
export async function POST(request: Request) {
  // Auth handled by root middleware.ts (AGENT_OR_SESSION_API_PREFIXES)
  // No additional auth check needed here

  // Parse and validate request body (allow empty body)
  let body: ScrapRequestBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as ScrapRequestBody;
    }
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Validate workspaceDir / scriptPath if present, but DO NOT use them for
  // execution. They are accepted for backwards compatibility with callers
  // that still send them, but they cannot influence the script that runs.
  for (const field of ["workspaceDir", "scriptPath"] as const) {
    const value = body[field];
    if (typeof value === "string" && value.length > 0) {
      if (!isSafeInput(value) || !isSafePath(value)) {
        return NextResponse.json(
          { success: false, error: `Invalid ${field}` },
          { status: 400 }
        );
      }
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
    // Fixed script path — never derived from request body.
    const scriptPath = path.join(scriptDir, "index-v2.js");
    if (!isSafePath(scriptPath)) {
      return NextResponse.json(
        { success: false, error: "Invalid workspace configuration" },
        { status: 500 }
      );
    }

    // Use execFile (no shell interpolation) to prevent command injection.
    // Arguments are an explicit array; even if scriptPath were attacker
    // influenced it would be passed as a single argv element.
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
  } catch (error) {
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