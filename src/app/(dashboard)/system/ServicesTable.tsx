"use client";

import { Server, RotateCw, Play, Square, Loader2, Terminal } from "lucide-react";

import { useI18n } from "@/i18n/provider";

import type { SystemdService } from "./types";
import { formatUptime, formatBytes } from "./utils";

interface ServicesTableProps {
  services: SystemdService[];
  activeCount: number;
  actionLoading: Record<string, boolean>;
  onServiceAction: (svc: SystemdService, action: "restart" | "stop" | "start" | "logs") => void;
}

export function ServicesTable({ services, activeCount, actionLoading, onServiceAction }: ServicesTableProps) {
  const { t } = useI18n();

  return (
    <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
        <Server className="w-5 h-5" style={{ color: "var(--accent)" }} />
        {t("system.services")} ({activeCount}/{services.length} {t("system.activeStatus").toLowerCase()})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("system.service")}</th>
              <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("system.description")}</th>
              <th className="text-left py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("system.status")}</th>
              <th className="text-right py-2 px-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{t("system.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((svc) => {
              const isActionable = svc.backend === "pm2" || svc.backend === "systemd";
              const restartKey = `${svc.name}-restart`;
              const stopKey = `${svc.name}-stop`;
              const logsKey = `${svc.name}-logs`;

              return (
                <tr key={svc.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-3 px-3">
                    <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>{svc.name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{svc.description || "—"}</span>
                      {svc.uptime != null && svc.status === "active" && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {t("system.up")} {formatUptime(svc.uptime)}
                          {svc.restarts != null && svc.restarts > 0 && ` · ${svc.restarts} ${t("system.restarts")}`}
                          {svc.mem != null && ` · ${formatBytes(svc.mem)}`}
                          {svc.cpu != null && ` · ${svc.cpu.toFixed(1)}% ${t("system.cpuLabel")}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            svc.status === "active" ? "var(--success)" :
                            svc.status === "not_deployed" ? "var(--info, #3b82f6)" :
                            svc.status === "failed" ? "var(--error)" : "var(--text-muted)",
                        }}
                      />
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor:
                            svc.status === "active" ? "var(--success-bg)" :
                            svc.status === "not_deployed" ? "rgba(59,130,246,0.12)" :
                            svc.status === "failed" ? "var(--error-bg)" : "var(--card-elevated)",
                          color:
                            svc.status === "active" ? "var(--success)" :
                            svc.status === "not_deployed" ? "#60a5fa" :
                            svc.status === "failed" ? "var(--error)" : "var(--text-muted)",
                        }}
                      >
                        {svc.status === "not_deployed" ? t("system.notDeployed") : svc.status}
                      </span>
                      {svc.backend && svc.backend !== "none" && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)", fontSize: "10px" }}
                        >
                          {svc.backend}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-1">
                      {isActionable && (
                        <>
                          <button
                            onClick={() => onServiceAction(svc, "restart")}
                            disabled={actionLoading[restartKey]}
                            className="p-1.5 rounded transition-colors"
                            title="Restart"
                            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {actionLoading[restartKey] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCw className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => onServiceAction(svc, svc.status === "active" ? "stop" : "start")}
                            disabled={actionLoading[stopKey] || svc.status === "not_deployed"}
                            className="p-1.5 rounded transition-colors"
                            title={svc.status === "active" ? "Stop" : "Start"}
                            style={{ color: svc.status === "active" ? "var(--error)" : "var(--success)", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {svc.status === "active" ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => onServiceAction(svc, "logs")}
                            disabled={actionLoading[logsKey]}
                            className="p-1.5 rounded transition-colors"
                            title="View Logs"
                            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                          >
                            {actionLoading[logsKey] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Terminal className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
