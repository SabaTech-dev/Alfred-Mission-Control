"use client";

import { Wifi, ShieldCheck, Monitor } from "lucide-react";

import { useI18n } from "@/i18n/provider";

import type { SystemData } from "./types";

interface NetworkInfoProps {
  data: SystemData;
}

export function NetworkInfo({ data }: NetworkInfoProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tailscale */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
            <Wifi className="w-5 h-5" style={{ color: data.tailscale.active ? "var(--success)" : "var(--error)" }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("system.tailscaleVpn")}</h3>
            <p className="text-sm" style={{ color: data.tailscale.active ? "var(--success)" : "var(--error)" }}>
              {data.tailscale.active ? t("system.activeStatus") : t("system.inactiveStatus")}
            </p>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>{t("system.thisServer")}</span>
            <span className="font-mono" style={{ color: "var(--text-primary)" }}>{data.tailscale.ip}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-secondary)" }}>{t("system.devicesConnected")}</span>
            <span style={{ color: "var(--text-primary)" }}>{data.tailscale.devices.length}</span>
          </div>
        </div>
        {data.tailscale.devices.length > 0 && (
          <div className="space-y-2 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            {data.tailscale.devices.map((dev, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{dev.hostname}</span>
                  <span style={{ color: "var(--text-muted)" }}>({dev.os})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono" style={{ color: "var(--text-muted)" }}>{dev.ip}</span>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dev.online ? "var(--success)" : "var(--text-muted)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Firewall */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
            <ShieldCheck className="w-5 h-5" style={{ color: data.firewall.active ? "var(--success)" : "var(--error)" }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("system.firewall")}</h3>
            <p className="text-sm" style={{ color: data.firewall.active ? "var(--success)" : "var(--error)" }}>
              {data.firewall.active ? t("system.activeStatus") : t("system.inactiveStatus")}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {data.firewall.rules.map((rule, i) => (
            <div
              key={i}
              className="flex items-start justify-between text-xs py-1.5"
              style={{ borderBottom: i < data.firewall.rules.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{rule.port}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "var(--success-bg)", color: "var(--success)", fontSize: "9px" }}>
                    {rule.action}
                  </span>
                </div>
                {rule.comment && <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{rule.comment}</span>}
              </div>
              <span className="font-mono text-right" style={{ color: "var(--text-secondary)", maxWidth: "120px", wordBreak: "break-all" }}>
                {rule.from}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
