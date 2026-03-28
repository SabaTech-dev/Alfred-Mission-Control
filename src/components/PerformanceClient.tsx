"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Gauge,
  AlertTriangle,
  Clock,
  TrendingUp,
  Server,
  FileText,
  RefreshCw,
} from "lucide-react";
import { StatsCard } from "./StatsCard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

interface PerformanceData {
  results: PerformanceResults | null;
  baseline: BaselineMetrics | null;
  recentLogs: string[];
  serverTime: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusColor(status: string): string {
  if (status === "success" || status === "OK") return "var(--success)";
  if (status === "ERROR" || status === "error") return "var(--error)";
  return "var(--warning)";
}

function formatMs(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(2)}ms`;
}

function logLevelColor(line: string): string {
  if (line.includes("[ERROR]")) return "var(--error)";
  if (line.includes("[WARN]")) return "var(--warning)";
  return "var(--text-secondary)";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PerformanceClient() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/performance");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as PerformanceData;
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--error)" }} />
        <p style={{ color: "var(--text-primary)" }} className="font-semibold mb-1">Error al cargar datos</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const results = data?.results;
  const baseline = data?.baseline;
  const apiEndpoints = results?.apiResponseTimes ?? [];
  const healthyCount = apiEndpoints.filter((e) => e.status === "success" || e.status === "OK").length;
  const errorCount = apiEndpoints.filter((e) => e.status === "ERROR" || e.status === "error").length;
  const baselineEndpoints = baseline?.apiResponseTime?.endpoints ?? {};

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center gap-3 justify-end">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {data?.serverTime ? new Date(data.serverTime).toLocaleString("es-ES") : "—"}
        </span>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Endpoints sanos"
          value={`${healthyCount}/${apiEndpoints.length || "—"}`}
          icon={<Server className="w-5 h-5" />}
          iconColor="var(--success)"
        />
        <StatsCard
          title="Endpoints con error"
          value={errorCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconColor={errorCount > 0 ? "var(--error)" : "var(--success)"}
        />
        <StatsCard
          title="Alertas activas"
          value={results?.alertCount ?? "—"}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconColor="var(--warning)"
        />
        <StatsCard
          title="Último check"
          value={results?.timestamp ? new Date(results.timestamp).toLocaleTimeString("es-ES") : "—"}
          icon={<Clock className="w-5 h-5" />}
          iconColor="var(--info)"
        />
      </div>

      {/* API Response Times */}
      <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Gauge className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Tiempos de respuesta API
        </h2>
        {apiEndpoints.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No hay datos de respuesta disponibles. El servidor de aplicación puede estar detenido.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Endpoint</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Estado</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Tiempo actual</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Baseline</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Variación</th>
                </tr>
              </thead>
              <tbody>
                {apiEndpoints.map((ep) => {
                  const bl = baselineEndpoints[ep.endpoint];
                  const baselineMs = bl?.responseTime;
                  const variation =
                    ep.responseTime != null && baselineMs != null
                      ? ((ep.responseTime - baselineMs) / baselineMs) * 100
                      : null;
                  return (
                    <tr key={ep.endpoint} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-2 px-3 font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                        {ep.endpoint}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${statusColor(ep.status)}20`, color: statusColor(ep.status) }}
                        >
                          {ep.status}
                        </span>
                      </td>
                      <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>
                        {ep.error ? "—" : ep.responseTime != null ? formatMs(ep.responseTime) : "—"}
                      </td>
                      <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>
                        {baselineMs != null ? formatMs(baselineMs) : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {variation != null ? (
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: variation > 0 ? "var(--error)" : "var(--success)" }}>
                            <TrendingUp className="w-3 h-3" />
                            {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Performance Monitor Log */}
      <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Log del monitor
          <span className="text-xs font-normal ml-2" style={{ color: "var(--text-secondary)" }}>
            Últimas {(data?.recentLogs?.length ?? 0)} líneas
          </span>
        </h2>
        <div
          className="rounded-lg p-4 overflow-auto max-h-80 font-mono text-xs leading-relaxed"
          style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
        >
          {(data?.recentLogs ?? []).length === 0 ? (
            <p style={{ color: "var(--text-secondary)" }}>No hay entradas de log disponibles.</p>
          ) : (
            (data?.recentLogs ?? []).map((line, i) => (
              <div key={i} style={{ color: logLevelColor(line) }}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Baseline Info */}
      {baseline && (
        <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Baseline de rendimiento
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Baseline capturado: {baseline.apiResponseTime?.timestamp
              ? new Date(baseline.apiResponseTime.timestamp).toLocaleString("es-ES")
              : "—"}
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(baseline.apiResponseTime?.endpoints ?? {}).map(([endpoint, info]) => (
              <div key={endpoint} className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
                <p className="text-xs font-mono mb-1" style={{ color: "var(--text-secondary)" }}>{endpoint}</p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {formatMs(info.responseTime)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
