"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Gauge,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Server,
  FileText,
  RefreshCw,
  Shield,
  BarChart3,
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

interface AlertsData {
  alerts: Alert[];
  summary: { total: number; critical: number; warnings: number; info: number };
}

interface HistoryPoint {
  timestamp: string;
  apiResponseTimes: Array<{
    endpoint: string;
    responseTime: number;
    status: string;
  }>;
  alertCount: number;
}

interface TrendInfo {
  avg: number;
  min: number;
  max: number;
  current: number;
  sampleCount: number;
}

interface HistoryData {
  dataPoints: HistoryPoint[];
  totalPoints: number;
  trendSummary: Record<string, TrendInfo>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusColor(status: string): string {
  if (status === "success" || status === "OK") return "var(--success)";
  if (status === "ERROR" || status === "error" || status === "SLOW") return "var(--error)";
  return "var(--warning)";
}

function alertLevelColor(level: string): string {
  if (level === "CRITICAL") return "var(--error)";
  if (level === "WARN") return "var(--warning)";
  return "var(--info)";
}

function formatMs(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(2)}ms`;
}

function logLevelColor(line: string): string {
  if (line.includes("[ERROR]")) return "var(--error)";
  if (line.includes("[WARN]")) return "var(--warning)";
  return "var(--text-secondary)";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/* ------------------------------------------------------------------ */
/*  Sparkline component (no external deps)                             */
/* ------------------------------------------------------------------ */

function Sparkline({ data, width = 120, height = 32, color = "var(--accent)" }: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PerformanceClient() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "history">("overview");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [perfRes, alertsRes, histRes] = await Promise.allSettled([
        fetch("/api/performance"),
        fetch("/api/performance/alerts?limit=20"),
        fetch("/api/performance/history?limit=60"),
      ]);

      if (perfRes.status === "fulfilled" && perfRes.value.ok) {
        setData(await perfRes.value.json());
      }
      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        setAlertsData(await alertsRes.value.json());
      }
      if (histRes.status === "fulfilled" && histRes.value.ok) {
        setHistoryData(await histRes.value.json());
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
        <button onClick={fetchData} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
          Reintentar
        </button>
      </div>
    );
  }

  const results = data?.results;
  const baseline = data?.baseline;
  const apiEndpoints = results?.apiResponseTimes ?? [];
  const healthyCount = apiEndpoints.filter((e) => e.status === "OK").length;
  const errorCount = apiEndpoints.filter((e) => e.status === "ERROR" || e.status === "SLOW").length;
  const baselineEndpoints = baseline?.apiResponseTime?.endpoints ?? {};
  const alerts = alertsData?.alerts ?? [];
  const alertSummary = alertsData?.summary ?? { total: 0, critical: 0, warnings: 0, info: 0 };
  const trendSummary = historyData?.trendSummary ?? {};

  // Build sparkline data per endpoint from history
  const sparklineData: Record<string, number[]> = {};
  if (historyData?.dataPoints) {
    for (const point of historyData.dataPoints) {
      for (const ep of point.apiResponseTimes) {
        if (!sparklineData[ep.endpoint]) sparklineData[ep.endpoint] = [];
        sparklineData[ep.endpoint].push(ep.responseTime);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          {(["overview", "alerts", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab ? "var(--accent)" : "transparent",
                color: activeTab === tab ? "#fff" : "var(--text-secondary)",
              }}
            >
              {tab === "overview" ? "Vista General" : tab === "alerts" ? `Alertas (${alertSummary.total})` : "Historial"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Endpoints sanos" value={`${healthyCount}/${apiEndpoints.length || "—"}`} icon={<Server className="w-5 h-5" />} iconColor="var(--success)" />
            <StatsCard
              title="Endpoints con error"
              value={errorCount}
              icon={<AlertTriangle className="w-5 h-5" />}
              iconColor={errorCount > 0 ? "var(--error)" : "var(--success)"}
            />
            <StatsCard
              title="Alertas activas"
              value={alertSummary.critical + alertSummary.warnings}
              icon={<Shield className="w-5 h-5" />}
              iconColor={alertSummary.critical > 0 ? "var(--error)" : alertSummary.warnings > 0 ? "var(--warning)" : "var(--success)"}
            />
            <StatsCard title="Último check" value={results?.timestamp ? new Date(results.timestamp).toLocaleTimeString("es-ES") : "—"} icon={<Clock className="w-5 h-5" />} iconColor="var(--info)" />
          </div>

          {/* API Response Times with trends */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Gauge className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Tiempos de respuesta API
              {historyData && (
                <span className="text-xs font-normal ml-2" style={{ color: "var(--text-secondary)" }}>
                  (con tendencia de {historyData.dataPoints?.length ?? 0} puntos)
                </span>
              )}
            </h2>
            {apiEndpoints.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No hay datos de respuesta disponibles.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Endpoint</th>
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Estado</th>
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Actual</th>
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Baseline</th>
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Tendencia</th>
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Gráfico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiEndpoints.map((ep) => {
                      const bl = baselineEndpoints[ep.endpoint];
                      const baselineMs = bl?.responseTime;
                      const variation = ep.responseTime != null && baselineMs != null
                        ? ((ep.responseTime - baselineMs) / baselineMs) * 100 : null;
                      const trend = trendSummary[ep.endpoint];
                      const spark = sparklineData[ep.endpoint];

                      return (
                        <tr key={ep.endpoint} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="py-2 px-3 font-mono text-xs" style={{ color: "var(--text-primary)" }}>{ep.endpoint}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${statusColor(ep.status)}20`, color: statusColor(ep.status) }}>
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
                            {trend ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                  avg {formatMs(trend.avg)} · [{formatMs(trend.min)}–{formatMs(trend.max)}]
                                </span>
                                {variation != null && (
                                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: variation > 0 ? "var(--error)" : "var(--success)" }}>
                                    {variation > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-secondary)" }}>—</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {spark && spark.length >= 2 ? (
                              <Sparkline data={spark} color={ep.status === "OK" ? "var(--success)" : "var(--error)"} />
                            ) : (
                              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>—</span>
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

          {/* Recent Alerts Summary */}
          {alerts.length > 0 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Shield className="w-5 h-5" style={{ color: alertSummary.critical > 0 ? "var(--error)" : "var(--warning)" }} />
                  Alertas recientes
                </h2>
                <button onClick={() => setActiveTab("alerts")} className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                  Ver todas ({alertSummary.total})
                </button>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-2 rounded-lg" style={{ backgroundColor: `${alertLevelColor(alert.level)}08`, border: `1px solid ${alertLevelColor(alert.level)}20` }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: alertLevelColor(alert.level) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{alert.message}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {alert.category}{alert.endpoint ? ` · ${alert.endpoint}` : ""} · {timeAgo(alert.timestamp)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" style={{ backgroundColor: `${alertLevelColor(alert.level)}20`, color: alertLevelColor(alert.level) }}>
                      {alert.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monitor Log */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Log del monitor
              <span className="text-xs font-normal ml-2" style={{ color: "var(--text-secondary)" }}>Últimas {(data?.recentLogs?.length ?? 0)} líneas</span>
            </h2>
            <div className="rounded-lg p-4 overflow-auto max-h-80 font-mono text-xs leading-relaxed" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}>
              {(data?.recentLogs ?? []).length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>No hay entradas de log.</p>
              ) : (
                (data?.recentLogs ?? []).map((line, i) => (
                  <div key={i} style={{ color: logLevelColor(line) }}>{line}</div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* Alert summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatsCard title="Total" value={alertSummary.total} icon={<Shield className="w-5 h-5" />} iconColor="var(--info)" />
            <StatsCard title="Críticas" value={alertSummary.critical} icon={<AlertTriangle className="w-5 h-5" />} iconColor="var(--error)" />
            <StatsCard title="Advertencias" value={alertSummary.warnings} icon={<AlertTriangle className="w-5 h-5" />} iconColor="var(--warning)" />
            <StatsCard title="Informativas" value={alertSummary.info} icon={<Activity className="w-5 h-5" />} iconColor="var(--info)" />
          </div>

          {/* Alert list */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Todas las alertas
            </h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>
                No hay alertas registradas. El sistema funciona con normalidad.
              </p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: `${alertLevelColor(alert.level)}08`, border: `1px solid ${alertLevelColor(alert.level)}20` }}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: alertLevelColor(alert.level) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${alertLevelColor(alert.level)}20`, color: alertLevelColor(alert.level) }}>
                          {alert.level}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--bg)", color: "var(--text-secondary)" }}>
                          {alert.category}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {new Date(alert.timestamp).toLocaleString("es-ES")}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>{alert.message}</p>
                      {alert.endpoint && (
                        <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-secondary)" }}>{alert.endpoint}</p>
                      )}
                      {alert.value != null && alert.threshold != null && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          Valor: {alert.value} / Umbral: {alert.threshold}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <BarChart3 className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Tendencia de respuesta por endpoint
              <span className="text-xs font-normal ml-2" style={{ color: "var(--text-secondary)" }}>
                ({historyData?.totalPoints ?? 0} puntos totales)
              </span>
            </h2>
            {Object.keys(trendSummary).length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>
                No hay datos históricos suficientes. Los datos se acumulan con el tiempo.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(trendSummary).map(([endpoint, trend]) => {
                  const spark = sparklineData[endpoint];
                  return (
                    <div key={endpoint} className="p-4 rounded-lg" style={{ border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>{endpoint}</p>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{trend.sampleCount} muestras</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {spark && spark.length >= 2 && (
                          <Sparkline data={spark} width={200} height={40} />
                        )}
                        <div className="grid grid-cols-4 gap-3 text-sm flex-1">
                          <div>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Actual</p>
                            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatMs(trend.current)}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Promedio</p>
                            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatMs(trend.avg)}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Mín</p>
                            <p className="font-semibold" style={{ color: "var(--success)" }}>{formatMs(trend.min)}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Máx</p>
                            <p className="font-semibold" style={{ color: "var(--error)" }}>{formatMs(trend.max)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Response time evolution chart (text-based) */}
          {historyData && historyData.dataPoints.length > 0 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "var(--accent)" }} />
                Evolución temporal
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Timestamp</th>
                      {apiEndpoints.map(ep => (
                        <th key={ep.endpoint} className="text-left py-2 px-3 font-medium font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                          {ep.endpoint}
                        </th>
                      ))}
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.dataPoints.slice(-20).reverse().map((point, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="py-1.5 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                          {new Date(point.timestamp).toLocaleTimeString("es-ES")}
                        </td>
                        {apiEndpoints.map(ep => {
                          const entry = point.apiResponseTimes.find(e => e.endpoint === ep.endpoint);
                          return (
                            <td key={ep.endpoint} className="py-1.5 px-3 text-xs font-mono" style={{ color: entry?.status === "OK" ? "var(--success)" : "var(--error)" }}>
                              {entry ? `${entry.responseTime.toFixed(1)}ms` : "—"}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-3 text-xs" style={{ color: point.alertCount > 0 ? "var(--warning)" : "var(--text-secondary)" }}>
                          {point.alertCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
