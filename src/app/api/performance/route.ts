import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface ApiResponseTimeEntry {
  endpoint: string;
  responseTime?: number;
  status: string;
  error?: string;
}

interface PerformanceResults {
  timestamp: string;
  apiResponseTimes?: ApiResponseTimeEntry[];
  lighthouseScores?: Record<string, number> | null;
  bundleSize?: { main?: number; total?: number } | null;
  alertCount?: number;
}

interface BaselineEntry {
  responseTime: number;
  status: string;
}

interface BaselineMetrics {
  lighthouse?: boolean;
  apiResponseTime?: {
    timestamp: string;
    endpoints: Record<string, BaselineEntry>;
  };
  bundleSize?: unknown;
}

export async function GET() {
  try {
    const resultsPath = path.join(process.cwd(), "performance-monitor-results.json");
    const logPath = path.join(process.cwd(), "performance-monitor.log");

    // Read current performance results
    let results: PerformanceResults | null = null;
    try {
      const raw = fs.readFileSync(resultsPath, "utf-8");
      results = JSON.parse(raw) as PerformanceResults;
    } catch {
      // Results file may not exist yet
    }

    // Read baseline data
    let baseline: BaselineMetrics | null = null;
    const baselineDir = path.join(process.cwd(), "performance-baseline-results");
    try {
      if (fs.existsSync(baselineDir)) {
        const files = fs.readdirSync(baselineDir).filter((f) => f.startsWith("baseline-"));
        if (files.length > 0) {
          const latest = files.sort().pop()!;
          const raw = fs.readFileSync(path.join(baselineDir, latest), "utf-8");
          baseline = JSON.parse(raw) as BaselineMetrics;
        }
      }
    } catch {
      // Baseline may not exist
    }

    // Read last N log lines
    let recentLogs: string[] = [];
    try {
      const logContent = fs.readFileSync(logPath, "utf-8").trim();
      const lines = logContent.split("\n").filter(Boolean);
      recentLogs = lines.slice(-50);
    } catch {
      // Log may not exist
    }

    return NextResponse.json({
      results,
      baseline,
      recentLogs,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read performance data", details: String(error) },
      { status: 500 }
    );
  }
}
