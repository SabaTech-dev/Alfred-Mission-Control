import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/provider";
import type { DashboardTelemetryResponse } from "@/lib/telemetry/types";

const AGENT_STATUS = {
  WORKING: "working",
  ONLINE: "online",
  IDLE: "idle",
  OFFLINE: "offline",
} as const;

type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

const TELEMETRY_REQUEST_TIMEOUT_MS = Number(
  process.env.NEXT_PUBLIC_DASHBOARD_TELEMETRY_TIMEOUT_MS ?? "25000",
);

function isRealTelemetryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DASHBOARD_REAL_TELEMETRY === "true";
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Telemetry request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Telemetry request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isDashboardTelemetryPayload(value: unknown): value is DashboardTelemetryResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<DashboardTelemetryResponse>;
  return Boolean(
    payload.summary &&
    payload.freshness &&
    Array.isArray(payload.agents) &&
    Array.isArray(payload.degraded),
  );
}

interface LegacyActivityStatsPayload {
  total?: number;
  today?: number;
  byStatus?: Record<string, number>;
}

interface LegacyAgentPayload {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  model?: string;
}

interface LegacyAgentStatusPayload {
  id: string;
  name: string;
  status: AgentStatus;
  activeSessions: number;
  lastActivity?: string;
}

interface LegacyAgentsResponse {
  agents?: LegacyAgentPayload[];
}

interface LegacyAgentStatusResponse {
  agents?: LegacyAgentStatusPayload[];
}

function normalizeLegacyTelemetry(
  activityStats: LegacyActivityStatsPayload,
  agentsResponse: LegacyAgentsResponse,
  statusResponse: LegacyAgentStatusResponse,
): DashboardTelemetryResponse {
  const statusByAgent = new Map<string, LegacyAgentStatusPayload>();
  const statusEntries = statusResponse.agents ?? [];
  statusEntries.forEach((entry) => {
    statusByAgent.set(entry.id, entry);
  });

  const agents = (agentsResponse.agents ?? []).map((agent) => {
    const status = statusByAgent.get(agent.id);

    return {
      id: agent.id,
      name: agent.name,
      emoji: agent.emoji ?? "🤖",
      color: agent.color ?? "#3b82f6",
      model: agent.model ?? "unknown",
      status: status?.status ?? AGENT_STATUS.OFFLINE,
      activeSessions: status?.activeSessions ?? 0,
      lastActivity: status?.lastActivity,
    };
  });

  const successfulActivities =
    (activityStats.byStatus?.success ?? 0) +
    (activityStats.byStatus?.approved ?? 0);

  const failedActivities =
    (activityStats.byStatus?.error ?? 0) +
    (activityStats.byStatus?.rejected ?? 0);

  return {
    freshness: {
      snapshotAt: new Date().toISOString(),
      snapshotAgeSec: 0,
      stalenessThresholdSec: 30,
      status: "fresh",
    },
    summary: {
      totalActivities: activityStats.total ?? 0,
      todayActivities: activityStats.today ?? 0,
      successfulActivities,
      failedActivities,
    },
    agents,
    degraded: [],
  };
}

export interface UseDashboardTelemetryResult {
  telemetry: DashboardTelemetryResponse | null;
  telemetryLoading: boolean;
  telemetryError: string | null;
  handleRetry: () => void;
}

export function useDashboardTelemetry(
  initialTelemetry: DashboardTelemetryResponse | null,
): UseDashboardTelemetryResult {
  const { t } = useI18n();
  const [telemetry, setTelemetry] = useState<DashboardTelemetryResponse | null>(initialTelemetry);
  const [telemetryLoading, setTelemetryLoading] = useState(!initialTelemetry);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [manualRefreshCounter, setManualRefreshCounter] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchTelemetry = async () => {
      try {
        let payload: DashboardTelemetryResponse;

        if (isRealTelemetryEnabled()) {
          const parsed = await fetchJsonWithTimeout(
            "/api/telemetry/dashboard",
            TELEMETRY_REQUEST_TIMEOUT_MS,
          );
          if (!isDashboardTelemetryPayload(parsed)) {
            throw new Error("Telemetry payload is invalid");
          }

          payload = parsed;
        } else {
          const [activityStats, agentsResponse, statusResponse] = await Promise.all([
            fetchJsonWithTimeout("/api/activities/stats", TELEMETRY_REQUEST_TIMEOUT_MS),
            fetchJsonWithTimeout("/api/agents", TELEMETRY_REQUEST_TIMEOUT_MS),
            fetchJsonWithTimeout("/api/agents/status", TELEMETRY_REQUEST_TIMEOUT_MS),
          ]);

          payload = normalizeLegacyTelemetry(
            activityStats as LegacyActivityStatsPayload,
            agentsResponse as LegacyAgentsResponse,
            statusResponse as LegacyAgentStatusResponse,
          );
        }

        if (!active) {
          return;
        }

        setTelemetry(payload);
        setTelemetryError(null);
      } catch (error) {
        console.error("Failed to load telemetry dashboard payload:", error);
        if (active) {
          setTelemetryError(t("dashboard.telemetry.loadError"));
        }
      } finally {
        if (active) {
          setTelemetryLoading(false);
        }
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [t, manualRefreshCounter]);

  const handleRetry = () => {
    setTelemetryLoading(true);
    setManualRefreshCounter((current) => current + 1);
  };

  return { telemetry, telemetryLoading, telemetryError, handleRetry };
}
