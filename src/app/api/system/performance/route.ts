import { NextRequest, NextResponse } from "next/server";

import { cachedSystemStats } from "@/lib/system-stats";
import { requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Auth check
  const auth = await requireAuth(request);
  if (!auth.authorized) return auth.error;

  const startTime = Date.now();

  try {
    const stats = await cachedSystemStats.get();
    const responseTimeMs = Date.now() - startTime;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cpu: {
        load: stats.cpu.load,
        loadAvg1: stats.cpu.loadAvg1,
        loadAvg5: stats.cpu.loadAvg5,
        loadAvg15: stats.cpu.loadAvg15,
      },
      memory: {
        total_gb: stats.memory.total,
        used_gb: stats.memory.used,
        free_gb: stats.memory.free,
        usage_percent:
          stats.memory.total > 0
            ? Math.round((stats.memory.used / stats.memory.total) * 10000) / 100
            : 0,
      },
      uptime: stats.uptime,
      active_agents: stats.activeAgents,
      total_agents: stats.totalAgents,
      tokens_today: stats.tokensToday,
      vpn_active: stats.vpnActive,
      firewall_active: stats.firewallActive,
      services: {
        active: stats.activeServices,
        total: stats.totalServices,
      },
      response_time_avg_ms: responseTimeMs,
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    );
  }
}
