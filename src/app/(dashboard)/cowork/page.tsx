"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Play, Square, Loader2 } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";
import {
  loadLayout,
  saveLayout,
  MAX_PANELS,
  MIN_PANELS,
  type CoworkLayout,
} from "@/lib/cowork";

interface AgentOption {
  id: string;
  name?: string;
}

type AgentStatus = "idle" | "running" | "error";

interface PanelState {
  agentId: string;
  status: AgentStatus;
  task: string;
  log: string;
}

function statusColor(status: AgentStatus): string {
  switch (status) {
    case "running":
      return "var(--success)";
    case "error":
      return "var(--error)";
    default:
      return "var(--text-muted)";
  }
}

export default function CoworkPage() {
  const { t } = useI18n();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [panelCount, setPanelCount] = useState<number>(2);
  const [panels, setPanels] = useState<PanelState[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted layout once on mount.
  useEffect(() => {
    const layout = loadLayout();
    setPanelCount(layout.panels);
    setHydrated(true);
  }, []);

  // Load agents from the existing endpoint.
  useEffect(() => {
    let cancelled = false;
    setAgentsLoading(true);
    authFetch("/api/agents")
      .then((res) => (res.ok ? res.json() : { agents: [] }))
      .then((data: { agents?: AgentOption[] }) => {
        if (cancelled) return;
        setAgents(data.agents ?? []);
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      })
      .finally(() => {
        if (!cancelled) setAgentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist panel count + selected agents whenever the session is running.
  useEffect(() => {
    if (!hydrated) return;
    const layout: CoworkLayout = {
      panels: panelCount,
      agents: panels.map((p) => p.agentId).filter(Boolean),
    };
    saveLayout(layout);
  }, [panelCount, panels, hydrated]);

  const startSession = useCallback(() => {
    const next: PanelState[] = Array.from({ length: panelCount }, (_, i) => ({
      agentId: agents[i]?.id ?? "",
      status: "idle" as AgentStatus,
      task: "",
      log: "",
    }));
    setPanels(next);
  }, [panelCount, agents]);

  const endSession = useCallback(() => {
    setPanels([]);
  }, []);

  const updatePanel = useCallback((index: number, updates: Partial<PanelState>) => {
    setPanels((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    );
  }, []);

  const gridTemplate = useMemo(() => {
    if (panels.length <= 1) return "1fr";
    if (panels.length === 2) return "1fr 1fr";
    if (panels.length === 3) return "1fr 1fr 1fr";
    return "1fr 1fr 1fr 1fr";
  }, [panels.length]);

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="mb-1 text-2xl font-bold md:text-3xl"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
              letterSpacing: "-1.5px",
            }}
          >
            <Users
              className="mr-2 inline-block h-6 w-6 align-text-bottom"
              style={{ color: "var(--accent)" }}
            />
            {t("cowork.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {t("cowork.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("cowork.panelCount")}
            <select
              value={panelCount}
              onChange={(e) => setPanelCount(Number(e.target.value))}
              disabled={panels.length > 0}
              className="rounded-md px-2 py-1.5 text-sm"
              style={{
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {Array.from({ length: MAX_PANELS - MIN_PANELS + 1 }, (_, i) => MIN_PANELS + i).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ),
              )}
            </select>
          </label>

          {panels.length === 0 ? (
            <button
              onClick={startSession}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}
            >
              <Play className="h-4 w-4" />
              {t("cowork.startSession")}
            </button>
          ) : (
            <button
              onClick={endSession}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all hover:opacity-90"
              style={{
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <Square className="h-4 w-4" />
              {t("cowork.endSession")}
            </button>
          )}
        </div>
      </div>

      {panels.length === 0 ? (
        <div
          className="flex flex-1 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="text-center" style={{ color: "var(--text-muted)" }}>
            <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("cowork.empty")}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm">
              {agentsLoading ? t("cowork.loadingAgents") : t("cowork.emptyHint")}
            </p>
          </div>
        </div>
      ) : (
        <div
          className="grid flex-1 gap-3 overflow-hidden"
          style={{
            gridTemplateColumns: gridTemplate,
            gridAutoRows: "1fr",
          }}
        >
          {panels.map((panel, index) => (
            <CoworkPanel
              key={index}
              panel={panel}
              agents={agents}
              agentsLoading={agentsLoading}
              onChange={(updates) => updatePanel(index, updates)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CoworkPanelProps {
  panel: PanelState;
  agents: AgentOption[];
  agentsLoading: boolean;
  onChange: (updates: Partial<PanelState>) => void;
  t: (key: string) => string;
}

function CoworkPanel({ panel, agents, agentsLoading, onChange, t }: CoworkPanelProps) {
  const statusLabel = (() => {
    switch (panel.status) {
      case "running":
        return t("cowork.statusRunning");
      case "error":
        return t("cowork.statusError");
      default:
        return t("cowork.statusIdle");
    }
  })();

  return (
    <section
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <select
          value={panel.agentId}
          onChange={(e) => onChange({ agentId: e.target.value })}
          className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="">{t("cowork.selectAgent")}</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name ?? agent.id}
            </option>
          ))}
        </select>
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: statusColor(panel.status),
          }}
        >
          {panel.status === "running" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: statusColor(panel.status),
              }}
            />
          )}
          {statusLabel}
        </span>
      </div>

      <div
        className="flex items-center gap-1 px-3 py-1.5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {t("cowork.status")}:
        </span>
        {(["idle", "running", "error"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ status: s })}
            className="rounded px-1.5 py-0.5 text-xs transition-all"
            style={{
              backgroundColor: panel.status === s ? statusColor(s) : "transparent",
              color: panel.status === s ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            {s === "idle"
              ? t("cowork.statusIdle")
              : s === "running"
                ? t("cowork.statusRunning")
                : t("cowork.statusError")}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden p-3">
        <div>
          <label
            className="mb-1 block text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("cowork.currentTask")}
          </label>
          <input
            type="text"
            value={panel.task}
            onChange={(e) => onChange({ task: e.target.value })}
            placeholder={t("cowork.taskPlaceholder")}
            className="w-full rounded-md px-2 py-1.5 text-sm"
            style={{
              backgroundColor: "var(--card-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <label
            className="mb-1 block text-xs font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("cowork.log")}
          </label>
          <textarea
            value={panel.log}
            onChange={(e) => onChange({ log: e.target.value })}
            placeholder={t("cowork.logPlaceholder")}
            className="min-h-0 flex-1 resize-none rounded-md p-2 font-mono text-xs"
            style={{
              backgroundColor: "var(--card-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>
      </div>

      {agentsLoading && agents.length === 0 ? null : null}
    </section>
  );
}
