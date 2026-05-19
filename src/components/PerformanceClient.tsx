"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Server,
  FileText,
  RefreshCw,
  Shield,
  Gauge,
  BarChart3,
} from "lucide-react";

import { StatsCard } from "@/components/StatsCard";
import {
  type UsePerformanceReturn,
  statusColor,
  formatMs,
  logLevelColor,
} from "@/hooks/usePerformance";
import { usePerformance } from "@/hooks/usePerformance";
import { PerformanceAlerts } from "@/components/PerformanceAlerts";

/* ------------------------------------------------------------------ */
/*  Sparkline (no external deps)                                       */
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
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function PerformanceClient() {
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "history">("overview");
  const perf: UsePerformanceReturn = usePerformance();

  if (perf.loading && !perf.data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: "var(--accent)" }} />
      </div>
    );
  }

  if (perf.error && !perf.data) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <AlertTriangle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--error)" }} />
        <p style={{ color: "var(--text-primary)" }} className="font-semibold mb-1">Error al cargar datos</p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{perf.error}</p>
        <button onClick={perf.refresh} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
          Reintentar
        </button>
      </div>
    );
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
              {tab === "overview" ? "Vista General" : tab === "alerts" ? `Alertas (${perf.alertSummary.total})` : "Historial"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {perf.data?.serverTime ? new Date(perf.data.serverTime).toLocaleString("es-ES") : "—"}
          </span>
          <button
            onClick={perf.refresh}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Endpoints sanos" value={`${perf.healthyCount}/${perf.apiEndpoints.length || "—"}`} icon={<Server className="w-5 h-5" />} iconColor="var(--success)" />
            <StatsCard title="Endpoints con error" value={perf.errorCount} icon={<AlertTriangle className="w-5 h-5" />} iconColor={perf.errorCount > 0 ? "var(--error)" : "var(--success)"} />
            <StatsCard title="Alertas activas" value={perf.alertSummary.critical + perf.alertSummary.warnings} icon={<Shield className="w-5 h-5" />} iconColor={perf.alertSummary.critical > 0 ? "var(--error)" : perf.alertSummary.warnings > 0 ? "var(--warning)" : "var(--success)"} />
            <StatsCard title="Último check" value={perf.results?.timestamp ? new Date(perf.results.timestamp).toLocaleTimeString("es-ES") : "—"} icon={<Clock className="w-5 h-5" />} iconColor="var(--info)" />
          </div>

          {/* API Response Times with trends */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Gauge className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Tiempos de respuesta API
              {perf.historyData && (
                <span className="text-xs font-normal ml-2" style={{ color: "var(--text-secondary)" }}>
                  (con tendencia de {perf.historyData.dataPoints?.length ?? 0} puntos)
                </span>
              )}
            </h2>
            {perf.apiEndpoints.length === 0 ? (
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
                    {perf.apiEndpoints.map((ep) => {
                      const bl = perf.baselineEndpoints[ep.endpoint];
                      const baselineMs = bl?.responseTime;
                      const variation = ep.responseTime != null && baselineMs != null
                        ? ((ep.responseTime - baselineMs) / baselineMs) * 100 : null;
                      const trend = perf.trendSummary[ep.endpoint];
                      const spark = perf.sparklineData[ep.endpoint];
                      return (
                        <tr key={ep.endpoint} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="py-2 px-3 font-mono text-xs" style={{ color: "var(--text-primary)" }}>{ep.endpoint}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${statusColor(ep.status)}20`, color: statusColor(ep.status) }}>{ep.status}</span>
                          </td>
                          <td className="py-2 px-3" style={{ color: "var(--text-primary)" }}>
                            {ep.error ? "—" : ep.responseTime != null ? formatMs(ep.responseTime) : "—"}
                          </td>
                          <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{baselineMs != null ? formatMs(baselineMs) : "—"}</td>
                          <td className="py-2 px-3">
                            {trend ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>avg {formatMs(trend.avg)} · [{formatMs(trend.min)}–{formatMs(trend.max)}]</span>
                                {variation != null && (
                                  <span className="flex items-center gap-1 text-xs font-medium" style={{ color: variation > 0 ? "var(--error)" : "var(--success)" }}>
                                    {variation > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            ) : <span style={{ color: "var(--text-secondary)" }}>—</span>}
                          </td>
                          <td className="py-2 px-3">
                            {spark && spark.length >= 2 ? <Sparkline data={spark} color={ep.status === "OK" ? "var(--success)" : "var(--error)"} /> : <span className="text-xs" style={{ color: "var(--text-secondary)" }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <PerformanceAlerts alerts={perf.alerts} alertSummary={perf.alertSummary} onViewAll={() => setActiveTab("alerts")} compact />

          {/* Monitor Log */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <FileText className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Log del monitor
              <span className="text-xs font-normal ml-2" style={{ color: "var(--text-secondary)" }}>Últimas {(perf.data?.recentLogs?.length ?? 0)} líneas</span>
            </h2>
            <div className="rounded-lg p-4 overflow-auto max-h-80 font-mono text-xs leading-relaxed" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}>
              {(perf.data?.recentLogs ?? []).length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>No hay entradas de log.</p>
              ) : (
                (perf.data?.recentLogs ?? []).map((line, i) => (
                  <div key={i} style={{ color: logLevelColor(line) }}>{line}</div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <PerformanceAlerts alerts={perf.alerts} alertSummary={perf.alertSummary} />
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <BarChart3 className="w-5 h-5" style={{ color: "var(--accent)" }} />
              Tendencia de respuesta por endpoint
              <span className="text-xs font-normal ml-2" style={{ color: "var(--text-secondary)" }}>({perf.historyData?.totalPoints ?? 0} puntos totales)</span>
            </h2>
            {Object.keys(perf.trendSummary).length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>No hay datos históricos suficientes. Los datos se acumulan con el tiempo.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(perf.trendSummary).map(([endpoint, trend]) => {
                  const spark = perf.sparklineData[endpoint];
                  return (
                    <div key={endpoint} className="p-4 rounded-lg" style={{ border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>{endpoint}</p>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{trend.sampleCount} muestras</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {spark && spark.length >= 2 && <Sparkline data={spark} width={200} height={40} />}
                        <div className="grid grid-cols-4 gap-3 text-sm flex-1">
                          <div><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Actual</p><p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatMs(trend.current)}</p></div>
                          <div><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Promedio</p><p className="font-semibold" style={{ color: "var(--text-primary)" }}>{formatMs(trend.avg)}</p></div>
                          <div><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Mín</p><p className="font-semibold" style={{ color: "var(--success)" }}>{formatMs(trend.min)}</p></div>
                          <div><p className="text-xs" style={{ color: "var(--text-secondary)" }}>Máx</p><p className="font-semibold" style={{ color: "var(--error)" }}>{formatMs(trend.max)}</p></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Response time evolution table */}
          {perf.historyData && perf.historyData.dataPoints.length > 0 && (
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
                      {perf.apiEndpoints.map((ep) => (
                        <th key={ep.endpoint} className="text-left py-2 px-3 font-medium font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{ep.endpoint}</th>
                      ))}
                      <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.historyData.dataPoints.slice(-20).reverse().map((point, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="py-1.5 px-3 text-xs" style={{ color: "var(--text-secondary)" }}>{new Date(point.timestamp).toLocaleTimeString("es-ES")}</td>
                        {perf.apiEndpoints.map((ep) => {
                          const entry = point.apiResponseTimes.find((e) => e.endpoint === ep.endpoint);
                          return (
                            <td key={ep.endpoint} className="py-1.5 px-3 text-xs font-mono" style={{ color: entry?.status === "OK" ? "var(--success)" : "var(--error)" }}>
                              {entry ? `${entry.responseTime.toFixed(1)}ms` : "—"}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-3 text-xs" style={{ color: point.alertCount > 0 ? "var(--warning)" : "var(--text-secondary)" }}>{point.alertCount}</td>
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
