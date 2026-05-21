"use client";

import { useEffect, useState } from "react";
import { Cpu, Server } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { useToast } from "@/components/Toast";

import { HardwareMetrics } from "./HardwareMetrics";
import { ServicesTable } from "./ServicesTable";
import { NetworkInfo } from "./NetworkInfo";
import { LogsModal } from "./LogsModal";
import type { SystemData, SystemdService, LogsModal as LogsModalData } from "./types";

export type { SystemData, SystemdService, TailscaleDevice, FirewallRule, LogsModal } from "./types";

export default function SystemClient({ initialData }: { initialData: SystemData | null }) {
  const [systemData, setSystemData] = useState<SystemData | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData ? new Date() : null);
  const [selectedTab, setSelectedTab] = useState<"hardware" | "services">("hardware");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [logsModal, setLogsModal] = useState<LogsModalData | null>(null);
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const res = await fetch("/api/system/monitor");
        if (res.ok) {
          const data = await res.json();
          setSystemData(data);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch system data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleServiceAction = async (svc: SystemdService, action: "restart" | "stop" | "start" | "logs") => {
    const key = `${svc.name}-${action}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      if (action === "logs") {
        setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: "", loading: true });
      }

      const res = await fetch("/api/system/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: svc.name, backend: svc.backend || "pm2", action }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Action failed");

      if (action === "logs") {
        setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: data.output, loading: false });
      } else {
        showSuccess(`${svc.name}: ${action} ${t("system.actionSuccessful")}`);
        setTimeout(async () => {
          const r = await fetch("/api/system/monitor");
          if (r.ok) setSystemData(await r.json());
        }, 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("system.actionFailed");
      if (action === "logs") {
        setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: `Error: ${msg}`, loading: false });
      } else {
        showError(`${svc.name}: ${msg}`);
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }}></div>
          <p style={{ color: "var(--text-secondary)" }}>{t("system.loading")}</p>
        </div>
      </div>
    );
  }

  if (!systemData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Server className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-secondary)" }}>{t("system.failed")}</p>
        </div>
      </div>
    );
  }

  const activeServices = systemData.systemd.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {t("system.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>{t("system.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "var(--success)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--success)" }} />
            {t("system.live")}
          </span>
          {lastUpdated && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        {[{ id: "hardware", labelKey: "system.hardware", icon: Cpu }, { id: "services", labelKey: "system.services", icon: Server }].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as "hardware" | "services")}
              className="flex items-center gap-2 px-4 py-2 font-medium transition-all"
              style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)", borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent" }}
            >
              <Icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Hardware Tab */}
      {selectedTab === "hardware" && <HardwareMetrics data={systemData} />}

      {/* Services Tab */}
      {selectedTab === "services" && (
        <div className="space-y-6">
          <ServicesTable
            services={systemData.systemd}
            activeCount={activeServices}
            actionLoading={actionLoading}
            onServiceAction={handleServiceAction}
          />
          <NetworkInfo data={systemData} />
        </div>
      )}

      {/* Logs Modal */}
      {logsModal && (
        <LogsModal modal={logsModal} onClose={() => setLogsModal(null)} />
      )}
    </div>
  );
}
