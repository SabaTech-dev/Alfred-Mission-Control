import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface HistoryDataPoint {
  timestamp: string;
  apiResponseTimes: Array<{
    endpoint: string;
    responseTime: number;
    status: string;
  }>;
  alertCount: number;
  lighthouseScores: Record<string, unknown> | null;
  bundleSize: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const historyPath = path.join(process.cwd(), "performance-history.json");

    let history: HistoryDataPoint[] = [];
    try {
      if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
      }
    } catch {
      // Corrupted file
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "60", 10);
    const endpoint = searchParams.get("endpoint");

    let result = history.slice(-limit);

    // If specific endpoint requested, extract only that endpoint's data
    if (endpoint) {
      result = result.map((point) => ({
        ...point,
        apiResponseTimes: point.apiResponseTimes.filter(
          (e) => e.endpoint === endpoint
        ),
      }));
    }

    // Calculate trend summary if we have data
    const trendSummary: Record<string, {
      avg: number;
      min: number;
      max: number;
      current: number;
      sampleCount: number;
    }> = {};

    if (history.length > 0) {
      const endpoints = new Set<string>();
      for (const point of history.slice(-limit)) {
        for (const e of point.apiResponseTimes) {
          endpoints.add(e.endpoint);
        }
      }

      for (const ep of endpoints) {
        const times: number[] = [];
        for (const point of history.slice(-limit)) {
          const entry = point.apiResponseTimes.find((e) => e.endpoint === ep);
          if (entry && entry.responseTime != null) {
            times.push(entry.responseTime);
          }
        }
        if (times.length > 0) {
          trendSummary[ep] = {
            avg: Math.round((times.reduce((s, v) => s + v, 0) / times.length) * 100) / 100,
            min: Math.min(...times),
            max: Math.max(...times),
            current: times[times.length - 1],
            sampleCount: times.length,
          };
        }
      }
    }

    return NextResponse.json({
      dataPoints: result,
      totalPoints: history.length,
      trendSummary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load history", details: String(error) },
      { status: 500 }
    );
  }
}
