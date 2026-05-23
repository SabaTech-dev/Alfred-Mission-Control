import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

/**
 * Launch lead scraper script
 * POST /api/pipeline/scrap
 */
export async function POST() {
  try {
    const scriptPath = path.join(
      process.env.OPENCLAW_WORKSPACE || "/home/ubuntu/.openclaw/workspace",
      "scripts",
      "lead-scraper",
      "index-v2.js"
    );

    // Execute scraper in background (detached)
    const { stdout, stderr } = await execAsync(
      `cd ${path.dirname(scriptPath)} && node ${scriptPath}`,
      {
        timeout: 60000, // 60 seconds max
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || "production",
        },
      }
    );

    console.log("[Scraper] Output:", stdout);
    if (stderr) console.error("[Scraper] Stderr:", stderr);

    return NextResponse.json({
      success: true,
      message: "Scrapping iniciado",
      output: stdout,
    });
  } catch (error: any) {
    console.error("[Scraper] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to launch scraper",
      },
      { status: 500 }
    );
  }
}