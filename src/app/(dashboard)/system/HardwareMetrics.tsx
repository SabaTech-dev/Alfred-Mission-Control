"use client";

import { Cpu, HardDrive, MemoryStick, Network, ArrowDown, ArrowUp } from "lucide-react";

import { useI18n } from "@/i18n/provider";

import type { SystemData } from "./types";

function getStatusColor(value: number): string {
  return value < 60 ? "var(--success)" : value < 85 ? "var(--warning)" : "var(--error)";
}

interface HardwareMetricsProps {
  data: SystemData;
}

export function HardwareMetrics({ data }: HardwareMetricsProps) {
  const { t } = useI18n();

  const cpuColor = getStatusColor(data.cpu.usage);
  const ramPercent = (data.ram.used / data.ram.total) * 100;
  const ramColor = getStatusColor(ramPercent);
  const diskColor = getStatusColor(data.disk.percent);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                <Cpu className="w-5 h-5" style={{ color: cpuColor }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("system.cpu")}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("system.cores", { count: data.cpu.cores.length })}</p>
              </div>
            </div>
            <span className="text-2xl font-bold" style={{ color: cpuColor }}>{data.cpu.usage}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "var(--card-elevated)" }}>
            <div className="h-full transition-all duration-500" style={{ width: `${data.cpu.usage}%`, backgroundColor: cpuColor }} />
          </div>
          <div className="flex justify-between text-sm" style={{ color: "var(--text-secondary)" }}>
            <span>{t("system.loadAverage")}</span>
            <span>{data.cpu.loadAvg[0].toFixed(2)} / {data.cpu.loadAvg[1].toFixed(2)} / {data.cpu.loadAvg[2].toFixed(2)}</span>
          </div>
        </div>

        {/* RAM */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                <MemoryStick className="w-5 h-5" style={{ color: ramColor }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("system.ram")}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{data.ram.used.toFixed(1)}GB / {data.ram.total.toFixed(1)}GB</p>
              </div>
            </div>
            <span className="text-2xl font-bold" style={{ color: ramColor }}>{ramPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
            <div className="h-full transition-all duration-500" style={{ width: `${ramPercent}%`, backgroundColor: ramColor }} />
          </div>
        </div>

        {/* Disk */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
                <HardDrive className="w-5 h-5" style={{ color: diskColor }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("system.disk")}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{data.disk.used.toFixed(1)}GB / {data.disk.total.toFixed(1)}GB</p>
              </div>
            </div>
            <span className="text-2xl font-bold" style={{ color: diskColor }}>{data.disk.percent.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
            <div className="h-full transition-all duration-500" style={{ width: `${data.disk.percent}%`, backgroundColor: diskColor }} />
          </div>
        </div>

        {/* Network */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--card-elevated)" }}>
              <Network className="w-5 h-5" style={{ color: "var(--info, #3b82f6)" }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{t("system.network")}</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("system.liveIO")}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <ArrowDown className="w-4 h-4" style={{ color: "var(--success)" }} />
                <span>{t("system.rxIn")}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{data.network.rx.toFixed(2)} MB/s</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <ArrowUp className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span>{t("system.txOut")}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{data.network.tx.toFixed(2)} MB/s</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>RX</div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
                  <div className="h-full" style={{ width: `${Math.min(data.network.rx * 10, 100)}%`, backgroundColor: "var(--success)" }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>TX</div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--card-elevated)" }}>
                  <div className="h-full" style={{ width: `${Math.min(data.network.tx * 10, 100)}%`, backgroundColor: "var(--accent)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
