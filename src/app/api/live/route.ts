import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { withTimeout } from "@/lib/with-timeout";

const execAsync = promisify(exec);

// Hard ceiling for the whole `openclaw sessions` probe. The browser fetch
// budget is ~25s; we stay well under it so a hung subprocess can't stall this
// endpoint (and cascade into sibling requests on the same Node process).
const SESSIONS_PROBE_TIMEOUT_MS = 5000;

interface Session {
  sessionKey: string;
  model?: string;
  startedAt?: string;
  lastActivityAt?: string;
  tokensIn?: number;
  tokensOut?: number;
  status?: string;
  agent?: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filterParam = url.searchParams.get('filter') || 'active'; // active | all | type:cron | type:spawn-child | type:direct
    const maxAgeHours = filterParam === 'all' ? 9999 : 2; // Default: only last 2h

    // Get active sessions from OpenClaw. Bound the probe so a hung CLI can't
    // block the response; the exec `timeout` reaps the child at the OS level
    // and withTimeout guarantees we reject within the budget.
    let stdout: string;
    try {
      const result = await withTimeout(
        execAsync("openclaw sessions --json 2>&1", {
          timeout: SESSIONS_PROBE_TIMEOUT_MS,
        }),
        SESSIONS_PROBE_TIMEOUT_MS,
        "openclaw-sessions",
      );
      stdout = result.stdout;
    } catch (probeError) {
      // Probe timed out or failed — return an explicit empty snapshot instead
      // of hanging the dashboard poller.
      console.warn("[api/live] sessions probe failed, returning empty snapshot", {
        error: probeError instanceof Error ? probeError.message : String(probeError),
      });
      return NextResponse.json({
        sessions: [],
        totalCount: 0,
        filteredCount: 0,
        byKind: {},
        timestamp: new Date().toISOString(),
        hasActive: false,
        degraded: true,
      });
    }

    // Clean command output - extract JSON object from mixed stdout
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        sessions: [],
        timestamp: new Date().toISOString(),
        hasActive: false,
      });
    }

    const result = JSON.parse(jsonMatch[0]);
    const sessions: Session[] = result.sessions || result || [];

    // Process and enrich sessions
    const enrichedSessions = sessions.map((session: Session) => {
      const startedAt = session.startedAt ? new Date(session.startedAt) : new Date();
      const lastActivityAt = session.lastActivityAt ? new Date(session.lastActivityAt) : new Date();
      const now = new Date();
      
      const durationMs = now.getTime() - startedAt.getTime();
      const durationMin = Math.floor(durationMs / 60000);
      const durationSec = Math.floor((durationMs % 60000) / 1000);

      // Determine session status
      const idleMs = now.getTime() - lastActivityAt.getTime();
      let status = "idle";
      if (idleMs < 30000) status = "thinking";
      else if (idleMs < 60000) status = "responding";
      else if (idleMs < 120000) status = "tool_call";

      // Extract agent name and session type from session key
      const agentMatch = session.sessionKey?.match(/agent:([^:]+)/);
      const agent = agentMatch ? agentMatch[1] : "unknown";
      
      // Determine session kind
      let kind = "direct";
      if (session.sessionKey?.includes(":cron:")) kind = "cron";
      else if (session.sessionKey?.includes(":subag")) kind = "spawn-child";
      else if (session.sessionKey?.includes(":acp:")) kind = "spawn-child";
      else if (session.sessionKey?.includes(":nocturno")) kind = "direct";

      return {
        sessionKey: session.sessionKey,
        agent,
        kind,
        model: session.model || "unknown",
        startedAt: startedAt.toISOString(),
        lastActivityAt: lastActivityAt.toISOString(),
        tokensIn: session.tokensIn || 0,
        tokensOut: session.tokensOut || 0,
        totalTokens: (session.tokensIn || 0) + (session.tokensOut || 0),
        status,
        duration: {
          ms: durationMs,
          formatted: durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`,
        },
        idleMs, // for filtering
      };
    });

    // Sort by last activity (most recent first)
    enrichedSessions.sort((a, b) => 
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    // Apply filter
    let filtered = enrichedSessions;
    if (filterParam === 'active') {
      filtered = enrichedSessions.filter(s => s.idleMs < maxAgeHours * 3600000);
    } else if (filterParam.startsWith('type:')) {
      const type = filterParam.replace('type:', '');
      filtered = enrichedSessions.filter(s => s.kind === type);
    }
    // Remove idleMs from output
    const cleaned = filtered.map(({ idleMs, ...rest }) => rest);

    // Group stats
    const byKind: Record<string, number> = {};
    enrichedSessions.forEach(s => { byKind[s.kind] = (byKind[s.kind] || 0) + 1; });

    return NextResponse.json({
      sessions: cleaned,
      totalCount: enrichedSessions.length,
      filteredCount: cleaned.length,
      byKind,
      timestamp: new Date().toISOString(),
      hasActive: enrichedSessions.length > 0,
    });
  } catch (error) {
    console.error("Error fetching live sessions:", error);
    // Return empty array on error - graceful fallback
    return NextResponse.json({
      sessions: [],
      timestamp: new Date().toISOString(),
      hasActive: false,
      error: "Unable to fetch sessions",
    });
  }
}
