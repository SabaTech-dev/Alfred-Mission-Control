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
  Wifi,
  WifiOff,
  BarChart3,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { LiveStatusIndicator } from "@/components/LiveStatusIndicator";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
  duration: { ms: number; formatted: string };
}

interface LiveData {
  sessions: Session[];
  timestamp: string;
  hasActive: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AGENT_EMOJIS: Record<string, string> = {
  alfred: "🤖",
  main: "🤖",
  coder: "💻",
  research: "🔍",
  security: "🔒",
  devops: "🔧",
  "qa-tester": "🧪",
  unknown: "🤖",
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Brain; mode: "pulse" | "blink" | "wave" }> = {
  thinking:  { color: "#3b82f6", icon: Brain,          mode: "wave" },
  tool_call: { color: "#f59e0b", icon: Zap,            mode: "pulse" },
  responding:{ color: "#10b981", icon: MessageSquare,  mode: "pulse" },
  idle:      { color: "#6b7280", icon: Activity,        mode: "blink" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return "ahora";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Token bar — horizontal bar showing in/out proportion */
function TokenBar({ tokensIn, tokensOut }: { tokensIn: number; tokensOut: number }) {
  const total = tokensIn + tokensOut || 1;
  const inPct = (tokensIn / total) * 100;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${inPct}%`, backgroundColor: "#3b82f6" }} />
      </div>
      <span className="text-xs font-mono shrink-0" style={{ color: "var(--text-secondary)" }}>
        {formatTokens(tokensIn)} in / {formatTokens(tokensOut)} out
      </span>
    </div>
  );
}

/** Session card with animated border */
function SessionCard({ session, index }: { session: Session; index: number }) {
  const config = STATUS_CONFIG[session.status] || STATUS_CONFIG.idle;
  const StatusIcon = config.icon;
  const emoji = AGENT_EMOJIS[session.agent.toLowerCase()] || AGENT_EMOJIS.unknown;
  const prevStatusRef = useRef(session.status);
  const [flash, setFlash] = useState(false);

  // Detect status transitions
  useEffect(() => {
    if (prevStatusRef.current !== session.status) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prevStatusRef.current = session.status;
      return () => clearTimeout(t);
    }
  }, [session.status]);

  return (
    <div
      className="group p-4 rounded-xl transition-all duration-300 hover:shadow-lg"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderLeft: `4px solid ${config.color}`,
        animation: flash ? "statusFlash 0.6s ease-out" : undefined,
      }}
    >
      <style>{`
        @keyframes statusFlash {
          0% { background-color: ${config.color}20; }
          100% { background-color: var(--card); }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Agent info */}
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: "var(--card-elevated)" }}
          >
            {emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                {session.agent}
              </span>
              <LiveStatusIndicator color={config.color} size={8} mode={config.mode} />
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                style={{ backgroundColor: config.color + "20", color: config.color }}
              >
                <StatusIcon className="w-3 h-3" />
                {session.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{session.model}</p>
            <p className="text-xs mt-1 font-mono truncate" style={{ color: "var(--text-muted)" }}>
              {session.sessionKey}
            </p>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex flex-col gap-2 md:w-64 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                {session.duration.formatted}
              </span>
            </div>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {formatTokens(session.totalTokens)} tokens
            </span>
          </div>
          <TokenBar tokensIn={session.tokensIn} tokensOut={session.tokensOut} />
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <Activity className="w-3 h-3" />
            última actividad {formatTimeAgo(session.lastActivityAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function LiveFeedPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [totalPolls, setTotalPolls] = useState(0);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      const json = await res.json();
      setData(json);
      setError(null);
      setConnected(true);
      setTotalPolls((p) => p + 1);
    } catch {
      setError("Error al conectar con el servidor");
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Scroll to latest session
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.sessions.length]);

  // Aggregate stats
  const totalTokensIn = data?.sessions.reduce((s, ses) => s + ses.tokensIn, 0) ?? 0;
  const totalTokensOut = data?.sessions.reduce((s, ses) => s + ses.tokensOut, 0) ?? 0;
  const activeCount = data?.sessions.filter((s) => s.status !== "idle").length ?? 0;
  const idleCount = data?.sessions.filter((s) => s.status === "idle").length ?? 0;

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <p style={{ color: "var(--text-muted)" }}>Conectando al feed en vivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1
            className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-1.5px" }}
          >
            Live Session Feed
          </h1>
          {data?.hasActive ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }}>
              <LiveStatusIndicator color="#10b981" size={8} mode="pulse" />
              <span className="text-sm font-semibold" style={{ color: "#10b981" }}>LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(107, 114, 128, 0.15)" }}>
              <LiveStatusIndicator color="#6b7280" size={8} mode="blink" speed={3000} />
              <span className="text-sm font-medium" style={{ color: "#6b7280" }}>IDLE</span>
            </div>
          )}
          {/* Connection indicator */}
          <div className="ml-auto flex items-center gap-2">
            {connected ? (
              <Wifi className="w-4 h-4" style={{ color: "var(--success)" }} />
            ) : (
              <WifiOff className="w-4 h-4" style={{ color: "var(--error)" }} />
            )}
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {connected ? "Conectado" : "Desconectado"}
            </span>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Actividad en tiempo real de todos los agentes
          <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Actualiza cada 10s · Poll #{totalPolls}
          </span>
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 p-4 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}
        >
          <span>{error}</span>
          <button onClick={fetchData} className="flex items-center gap-1 text-sm font-medium" style={{ color: "#ef4444" }}>
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* Summary cards */}
      {data && data.sessions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Sesiones</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{data.sessions.length}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{activeCount} activas · {idleCount} idle</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4" style={{ color: "#3b82f6" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Tokens In</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{formatTokens(totalTokensIn)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4" style={{ color: "#10b981" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Tokens Out</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{formatTokens(totalTokensOut)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: "#f59e0b" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Total</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{formatTokens(totalTokensIn + totalTokensOut)}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data?.sessions.length === 0 && (
        <div
          className="text-center py-16 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Activity className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            Todos los agentes en reposo
          </h2>
          <p style={{ color: "var(--text-muted)" }}>No hay sesiones activas en este momento</p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Última verificación: {new Date(data.timestamp).toLocaleTimeString("es-ES")}
          </p>
        </div>
      )}

      {/* Session feed */}
      {data && data.sessions.length > 0 && (
        <div className="space-y-3">
          {data.sessions.map((session, index) => (
            <SessionCard key={session.sessionKey || index} session={session} index={index} />
          ))}
          <div ref={feedEndRef} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <span>
          {data?.timestamp ? `Última actualización: ${new Date(data.timestamp).toLocaleTimeString("es-ES")}` : ""}
        </span>
        <button
          onClick={fetchData}
          className="flex items-center gap-1 font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--accent)" }}
        >
          <RefreshCw className="w-3 h-3" />
          Actualizar ahora
        </button>
      </div>
    </div>
  );
}
