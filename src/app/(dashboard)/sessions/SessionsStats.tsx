"use client";

import { MessageSquare, Hash, Clock, Bot } from "lucide-react";

import { useI18n } from "@/i18n/provider";

import { SessionListItem } from "./SessionsTypes";

interface SessionsStatsProps {
  sessions: SessionListItem[];
  counts: Record<string, number>;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function SessionsStats({ sessions, counts }: SessionsStatsProps) {
  const { t } = useI18n();

  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const uniqueModels = [...new Set(sessions.map((s) => s.model))];

  const stats = [
    {
      labelKey: "sessions.totalSessions",
      value: sessions.length,
      icon: MessageSquare,
      color: "var(--accent)",
    },
    {
      labelKey: "sessions.totalTokens",
      value: formatTokenCount(totalTokens),
      icon: Hash,
      color: "#60a5fa",
    },
    {
      labelKey: "sessions.cronRuns",
      value: counts.cron || 0,
      icon: Clock,
      color: "#a78bfa",
    },
    {
      labelKey: "sessions.modelsUsed",
      value: uniqueModels.length,
      icon: Bot,
      color: "#4ade80",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "0.75rem",
        marginBottom: "1.5rem",
      }}
    >
      {stats.map(({ labelKey, value, icon: Icon, color }) => (
        <div
          key={labelKey}
          style={{
            padding: "1rem",
            borderRadius: "0.75rem",
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "0.5rem",
              backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon style={{ width: "18px", height: "18px", color }} />
          </div>
          <div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t(labelKey)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
