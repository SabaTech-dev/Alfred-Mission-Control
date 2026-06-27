"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Cpu, HardDrive, Activity, Shield, Wifi, WifiOff } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

export { Dock } from "./Dock";
export { TopBar } from "./TopBar";

interface SectionHeaderProps {
  label: string;
}

interface MetricCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  changeColor?: "positive" | "negative" | "secondary" | "accent";
}

interface SystemMonitorData {
  cpu: {
    usage: number;
    cores: number[];
    loadAvg: number[];
  };
  ram: {
    total: number;
    used: number;
    free: number;
    cached: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  tailscale: {
    active: boolean;
    ip: string;
    devices: Array<{ hostname: string; ip: string; os: string; online: boolean }>;
  };
}

function metricColor(changeColor: MetricCardProps["changeColor"]): string {
  switch (changeColor) {
    case "positive":
      return "var(--success)";
    case "negative":
      return "var(--error)";
    case "secondary":
      return "var(--text-secondary)";
    default:
      return "var(--accent)";
  }
}

export function StatusBar() {
  const [now, setNow] = useState<Date | null>(null);
  const [systemData, setSystemData] = useState<SystemMonitorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set date on client only to avoid hydration mismatch
    setNow(new Date());

    const fetchSystemData = async () => {
      try {
        const res = await authFetch("/api/system/monitor");
        if (res.ok) {
          const data = await res.json();
          setSystemData(data);
        }
      } catch (error) {
        // Swallow abort errors from navigation — only log real failures
        if (!(error instanceof TypeError && error.message === "Failed to fetch")) {
          console.error("Failed to fetch system monitor data:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchSystemData();

    // Then fetch every 30 seconds
    const intervalId = window.setInterval(() => {
      fetchSystemData();
      setNow(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <footer
      style={{
        position: "fixed",
        left: "68px",
        right: 0,
        bottom: 0,
        height: "32px",
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 45,
        color: "var(--text-secondary)",
        fontSize: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Mission Control</span>
        <span style={{ opacity: 0.3 }}>|</span>
        
        {/* CPU */}
        {systemData && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Cpu style={{ width: "14px", height: "14px" }} />
            <span>{systemData.cpu.usage}%</span>
          </span>
        )}
        
        {/* RAM */}
        {systemData && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Activity style={{ width: "14px", height: "14px" }} />
            <span>{systemData.ram.used.toFixed(1)}/{systemData.ram.total.toFixed(1)} GB</span>
          </span>
        )}
        
        {/* Disk */}
        {systemData && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <HardDrive style={{ width: "14px", height: "14px" }} />
            <span>{systemData.disk.used}/{systemData.disk.total} GB</span>
          </span>
        )}
        
        {/* Network */}
        {systemData && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Activity style={{ width: "14px", height: "14px" }} />
            <span>{systemData.network.rx.toFixed(2)}/{systemData.network.tx.toFixed(2)} MB/s</span>
          </span>
        )}
        
        {/* Tailscale */}
        {systemData && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {systemData.tailscale.active ? (
              <Wifi style={{ width: "14px", height: "14px", color: "var(--success)" }} />
            ) : (
              <WifiOff style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
            )}
            <span style={{ color: systemData.tailscale.active ? "var(--success)" : "var(--text-muted)" }}>
              {systemData.tailscale.active ? "TS: " + systemData.tailscale.ip : "TS: off"}
            </span>
          </span>
        )}
      </div>
      
      <span>{now ? now.toLocaleString("es-ES") : ""}</span>
    </footer>
  );
}

export function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "var(--text-secondary)",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "9999px",
          backgroundColor: "var(--accent)",
        }}
      />
      {label}
    </div>
  );
}

export function MetricCard({ icon: Icon, value, label, changeColor = "accent" }: MetricCardProps) {
  const iconColor = metricColor(changeColor);

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "4px" }}>{label}</div>
          <div style={{ color: "var(--text-primary)", fontSize: "24px", fontWeight: 700 }}>{value}</div>
        </div>
        <div
          style={{
            backgroundColor: `${iconColor}15`,
            color: iconColor,
            borderRadius: "10px",
            padding: "10px",
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}