"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity,
  Bot,
  Clock,
  Zap,
  MessageSquare,
  Brain,
  Loader2,
} from "lucide-react";

interface Session {
  sessionKey: string;
  agent: string;
  model: string;
  startedAt: string;
  lastActivityAt: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  status: "thinking" | "tool_call" | "responding" | "idle";
  duration: {
    ms: number;
    formatted: string;
  };
}

interface LiveData {
  sessions: Session[];
  timestamp: string;
  hasActive: boolean;
}

const AGENT_EMOJIS: Record<string, string> = {
  alfred: "🤖",
  coder: "💻",
  research: "🔍",
  security: "🔒",
  debug: "🐛",
  "refactor-expert": "⚡",
  unknown: "🤖",
};

const STATUS_COLORS: Record<string, string> = {
  thinking: "#3b82f6",
  tool_call: "#f59e0b",
  responding: "#10b981",
  idle: "#6b7280",
};

const STATUS_ICONS: Record<string, typeof Activity> = {
  thinking: Brain,
  tool_call: Zap,
  responding: MessageSquare,
  idle: Activity,
};

export default function LiveFeedPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError("Failed to fetch live data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Poll every 10 seconds
    pollIntervalRef.current = setInterval(fetchData, 10000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchData]);

  // Auto-scroll to bottom when new sessions appear
  useEffect(() => {
    if (data?.sessions.length) {
      feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.sessions]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <p style={{ color: "var(--text-muted)" }}>Connecting to live feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
              letterSpacing: "-1.5px",
            }}
          >
            🔴 Live Session Feed
          </h1>
          {data?.hasActive && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" 
              style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }}>
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "#10b981" }}
              />
              <span className="text-sm font-medium" style={{ color: "#10b981" }}>LIVE</span>
            </div>
          )}
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Real-time activity from all agents • Updates every 10s
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="mb-4 p-4 rounded-lg"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
        >
          {error}
        </div>
      )}

      {/* Sessions Feed */}
      {data?.sessions.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <Activity className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            All Agents Idle
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            No active sessions at the moment
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Last checked: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.sessions.map((session, index) => {
            const StatusIcon = STATUS_ICONS[session.status] || Activity;
            const emoji = AGENT_EMOJIS[session.agent.toLowerCase()] || AGENT_EMOJIS.unknown;
            
            return (
              <div
                key={session.sessionKey || index}
                className="p-4 rounded-xl transition-all hover:shadow-lg"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderLeft: `4px solid ${STATUS_COLORS[session.status]}`,
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Agent info */}
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: "var(--card-elevated)" }}
                    >
                      {emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                          {session.agent}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: STATUS_COLORS[session.status] + "20",
                            color: STATUS_COLORS[session.status],
                          }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {session.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {session.model}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {session.sessionKey}
                      </p>
                    </div>
                  </div>

                  {/* Right: Stats */}
                  <div className="flex flex-wrap gap-4 md:gap-6">
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Tokens In</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {session.tokensIn.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Tokens Out</p>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {session.tokensOut.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Duration</p>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" style={{ color: "var(--accent)" }} />
                        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {session.duration.formatted}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={feedEndRef} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : "N/A"}
        </p>
      </div>
    </div>
  );
}
