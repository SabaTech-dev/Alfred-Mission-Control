"use client";

import { Activity, AlertTriangle, Shield } from "lucide-react";

import { StatsCard } from "@/components/StatsCard";
import {
  type Alert,
  alertLevelColor,
  timeAgo,
} from "@/hooks/usePerformance";

interface PerformanceAlertsProps {
  alerts: Alert[];
  alertSummary: { total: number; critical: number; warnings: number; info: number };
  onViewAll?: () => void;
  compact?: boolean;
}

export function PerformanceAlerts({ alerts, alertSummary, onViewAll, compact = false }: PerformanceAlertsProps) {
  // Compact mode: recent alerts summary for the overview tab
  if (compact) {
    if (alerts.length === 0) return null;

    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Shield
              className="w-5 h-5"
              style={{ color: alertSummary.critical > 0 ? "var(--error)" : "var(--warning)" }}
            />
            Alertas recientes
          </h2>
          {onViewAll && (
            <button onClick={onViewAll} className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              Ver todas ({alertSummary.total})
            </button>
          )}
        </div>
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-2 rounded-lg"
              style={{
                backgroundColor: `${alertLevelColor(alert.level)}08`,
                border: `1px solid ${alertLevelColor(alert.level)}20`,
              }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: alertLevelColor(alert.level) }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{alert.message}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {alert.category}{alert.endpoint ? ` · ${alert.endpoint}` : ""} · {timeAgo(alert.timestamp)}
                </p>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                style={{ backgroundColor: `${alertLevelColor(alert.level)}20`, color: alertLevelColor(alert.level) }}
              >
                {alert.level}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full alerts tab
  return (
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
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{
                  backgroundColor: `${alertLevelColor(alert.level)}08`,
                  border: `1px solid ${alertLevelColor(alert.level)}20`,
                }}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: alertLevelColor(alert.level) }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${alertLevelColor(alert.level)}20`, color: alertLevelColor(alert.level) }}
                    >
                      {alert.level}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--bg)", color: "var(--text-secondary)" }}
                    >
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
  );
}
