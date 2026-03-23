import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

export async function GET() {
  try {
    // Get active sessions from OpenClaw
    const { stdout } = await execAsync("openclaw sessions --json 2>&1", {
      timeout: 30000,
    });

    // Clean Hindsight output - extract JSON object from mixed output
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

      // Extract agent name from session key
      const agentMatch = session.sessionKey?.match(/agent:([^:]+)/);
      const agent = agentMatch ? agentMatch[1] : "unknown";

      return {
        sessionKey: session.sessionKey,
        agent,
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
      };
    });

    // Sort by last activity (most recent first)
    enrichedSessions.sort((a, b) => 
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    return NextResponse.json({
      sessions: enrichedSessions,
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
