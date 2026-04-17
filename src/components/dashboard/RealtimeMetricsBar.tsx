"use client";

import { useEffect, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SystemMetrics {
  cpu: { load: number; loadAvg1: number };
  memory: { total_gb: number; used_gb: number; usage_percent: number };
  uptime: string;
  active_agents: number;
  total_agents: number;
  tokens_today: number;
  services: { active: number; total: number };
  response_time_avg_ms: number;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 5000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  return `${Math.floor(diff / 60_000)}m ago`;
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  unit,
  color,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-lg font-bold text-white">
          {value}
          {unit && <span className="ml-0.5 text-xs font-normal text-gray-400">{unit}</span>}
        </p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL = 10_000; // 10s

export function RealtimeMetricsBar({ endpoint = "/api/system/performance" }: { endpoint?: string }) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string>("");

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SystemMetrics = await res.json();
      setMetrics(data);
      setLastFetch(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
  }, [endpoint]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (error && !metrics) {
    return (
      <div className="rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
        ⚠️ Failed to load metrics: {error}
      </div>
    );
  }

  if (!metrics) return null;

  const cpuColor =
    metrics.cpu.load > 80
      ? "bg-red-500"
      : metrics.cpu.load > 50
      ? "bg-yellow-500"
      : "bg-green-500";

  const memColor =
    metrics.memory.usage_percent > 85
      ? "bg-red-500"
      : metrics.memory.usage_percent > 60
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="CPU"
          value={`${metrics.cpu.load}`}
          unit="%"
          color={cpuColor}
          sub={`avg: ${metrics.cpu.loadAvg1}`}
        />
        <MetricCard
          label="Memory"
          value={`${metrics.memory.usage_percent.toFixed(0)}`}
          unit="%"
          color={memColor}
          sub={`${metrics.memory.used_gb.toFixed(1)} / ${metrics.memory.total_gb.toFixed(1)} GB`}
        />
        <MetricCard
          label="Agents"
          value={`${metrics.active_agents}`}
          unit={`/ ${metrics.total_agents}`}
          color="bg-blue-500"
          sub="active"
        />
        <MetricCard
          label="Tokens Today"
          value={formatNumber(metrics.tokens_today)}
          color="bg-purple-500"
        />
        <MetricCard
          label="Uptime"
          value={metrics.uptime}
          color="bg-green-500"
        />
        <MetricCard
          label="Services"
          value={`${metrics.services.active}`}
          unit={`/ ${metrics.services.total}`}
          color={metrics.services.active === metrics.services.total ? "bg-green-500" : "bg-yellow-500"}
        />
      </div>
      <p className="text-right text-xs text-gray-600">
        Updated {lastFetch ? timeAgo(lastFetch) : "—"} · {metrics.response_time_avg_ms}ms
      </p>
    </div>
  );
}
