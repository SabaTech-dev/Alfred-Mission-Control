"use client";

import { getModelDisplayName } from "@/lib/model-utils";

import Link from "next/link";

import {
  Bot,
  Circle,
  Gamepad2,
  Users,
} from "lucide-react";

import { useI18n } from "@/i18n/provider";
import type {
  AgentTelemetry,
  TelemetryDegradation,
  TelemetryFreshness,
} from "@/lib/telemetry/types";

const STATUS_COLORS: Record<string, string> = {
  working: "var(--accent)",
  online: "var(--success)",
  idle: "var(--info)",
  offline: "var(--text-muted)",
};

interface DashboardAgentGridProps {
  agents: AgentTelemetry[];
  degraded: TelemetryDegradation[];
  freshness: TelemetryFreshness;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function DashboardAgentGrid({
  agents,
  degraded,
  freshness,
  loading,
  error,
  onRetry,
}: DashboardAgentGridProps) {
  const { t } = useI18n();

  const hasDegradedSections = degraded.length > 0;
  const hasStaleSnapshot = freshness.status === "stale";

  return (
    <div
      className="mb-6 rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="accent-line" />
          <h2
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            <Users className="inline-block w-5 h-5 mr-2 mb-1" />
            {t("dashboard.multiAgentSystem")}
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href="/office"
            className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--text-primary)",
            }}
          >
            <Gamepad2 className="inline-block w-4 h-4 mr-1 mb-0.5" />
            {t("dashboard.openOffice")}
          </Link>
          <Link
            href="/agents"
            className="text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            {t("common.viewAll")}
          </Link>
        </div>
      </div>

      <div className="p-5">
        {hasStaleSnapshot && !loading && !error && (
          <div
            className="mb-3 text-xs flex items-center justify-between rounded-md px-3 py-2"
            style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)" }}
          >
            <span>
              {t("dashboard.telemetry.stale", { seconds: freshness.snapshotAgeSec })}
            </span>
            <button
              type="button"
              className="text-xs font-medium"
              style={{ color: "var(--accent)" }}
              onClick={onRetry}
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {hasDegradedSections && !loading && !error && (
          <div
            className="mb-3 rounded-md px-3 py-2"
            style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-medium" style={{ color: "var(--error)" }}>
              {t("dashboard.telemetry.degradedTitle", { count: degraded.length })}
            </p>
            <div className="mt-1 space-y-1">
              {degraded.map((entry) => (
                <p
                  key={`${entry.section}-${entry.code}`}
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("dashboard.telemetry.degradedItem", {
                    section: entry.section,
                    message: entry.message,
                  })}
                </p>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.telemetry.loading")}
          </div>
        )}

        {!loading && error && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: "var(--error)" }}>
              {error}
            </p>
            <button
              type="button"
              className="text-xs font-medium"
              style={{ color: "var(--accent)" }}
              onClick={onRetry}
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {!loading && !error && agents.length === 0 && (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.telemetry.empty")}
          </div>
        )}

        {!loading && !error && agents.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="p-3 rounded-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: "var(--card-elevated)",
                  border: `2px solid ${agent.color}`,
                  cursor: "pointer",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl">{agent.emoji}</div>
                  <Circle
                    className="w-2 h-2"
                    style={{
                      fill: STATUS_COLORS[agent.status],
                      color: STATUS_COLORS[agent.status],
                    }}
                  />
                </div>
                <div
                  className="text-sm font-bold mb-1"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: "var(--text-primary)",
                  }}
                >
                  {agent.name}
                </div>
                <div
                  className="text-xs truncate mb-1"
                  style={{ color: "var(--text-muted)" }}
                  title={typeof agent.model === "string" ? agent.model : JSON.stringify(agent.model)}
                >
                  <Bot className="inline-block w-3 h-3 mr-1" />
                  {getModelDisplayName(agent.model)}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t(`agents.status.${agent.status}`)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
