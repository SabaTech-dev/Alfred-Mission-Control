import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface Alert {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "CRITICAL";
  category: string;
  message: string;
  endpoint?: string | null;
  value?: number | null;
  threshold?: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const alertsPath = path.join(process.cwd(), "performance-alerts.json");

    let alerts: Alert[] = [];
    try {
      if (fs.existsSync(alertsPath)) {
        alerts = JSON.parse(fs.readFileSync(alertsPath, "utf-8"));
      }
    } catch {
      // Corrupted file
    }

    // Support query params: level, category, limit
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let filtered = alerts;

    if (level) {
      filtered = filtered.filter((a) => a.level === level.toUpperCase());
    }
    if (category) {
      filtered = filtered.filter((a) => a.category === category);
    }

    // Return most recent first, limited
    const result = filtered.reverse().slice(0, limit);

    // Summary stats
    const summary = {
      total: alerts.length,
      critical: alerts.filter((a) => a.level === "CRITICAL").length,
      warnings: alerts.filter((a) => a.level === "WARN").length,
      info: alerts.filter((a) => a.level === "INFO").length,
    };

    return NextResponse.json({ alerts: result, summary });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load alerts", details: String(error) },
      { status: 500 }
    );
  }
}
