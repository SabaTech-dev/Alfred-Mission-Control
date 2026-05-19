"use client";

import { Server, Bot, Heart, Play } from "lucide-react";

import type { HeartbeatStatus as HeartbeatStatusType } from "@/operations/heartbeat-ops";

interface CronStatsCardsProps {
  systemJobsCount: number;
  activeJobs: number;
  pausedJobs: number;
  heartbeat: HeartbeatStatusType | null;
  activeTab: string;
  onTabClick: (tab: "system" | "openclaw" | "heartbeat") => void;
}

export function CronStatsCards({
  systemJobsCount,
  activeJobs,
  pausedJobs,
  heartbeat,
  activeTab,
  onTabClick,
}: CronStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
      <div onClick={() => onTabClick("system")} style={{
        backgroundColor: "color-mix(in srgb, var(--info) 10%, var(--card))",
        border: activeTab === "system" ? "2px solid var(--info)" : "1px solid var(--border)",
        borderRadius: "0.75rem", padding: "1rem", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            padding: "0.75rem",
            backgroundColor: "color-mix(in srgb, var(--info) 20%, transparent)",
            borderRadius: "0.5rem",
          }}>
            <Server className="w-6 h-6" style={{ color: "var(--info)" }} />
          </div>
          <div>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{systemJobsCount}</p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>System Jobs</p>
          </div>
        </div>
      </div>

      <div onClick={() => onTabClick("openclaw")} style={{
        backgroundColor: "color-mix(in srgb, var(--accent) 10%, var(--card))",
        border: activeTab === "openclaw" ? "2px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: "0.75rem", padding: "1rem", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            padding: "0.75rem",
            backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
            borderRadius: "0.5rem",
          }}>
            <Bot className="w-6 h-6" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{activeJobs}</p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Agent Jobs</p>
          </div>
        </div>
      </div>

      <div onClick={() => onTabClick("heartbeat")} style={{
        backgroundColor: "var(--card)",
        border: activeTab === "heartbeat" ? "2px solid var(--error)" : "1px solid var(--border)",
        borderRadius: "0.75rem", padding: "1rem", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            padding: "0.75rem",
            backgroundColor: heartbeat?.enabled
              ? "color-mix(in srgb, var(--success) 20%, transparent)"
              : "var(--card-elevated)",
            borderRadius: "0.5rem",
          }}>
            <Heart className="w-6 h-6" style={{
              color: heartbeat?.enabled ? "var(--success)" : "var(--text-muted)",
            }} />
          </div>
          <div>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {heartbeat?.every || "—"}
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Heartbeat</p>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "0.75rem", padding: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            padding: "0.75rem", backgroundColor: "var(--card-elevated)",
            borderRadius: "0.5rem",
          }}>
            <Play className="w-6 h-6" style={{ color: "var(--text-secondary)" }} />
          </div>
          <div>
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{pausedJobs}</p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Paused</p>
          </div>
        </div>
      </div>
    </div>
  );
}
