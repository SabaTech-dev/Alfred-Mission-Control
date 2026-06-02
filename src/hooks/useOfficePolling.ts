"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AgentState, AgentStatus } from "@/components/Office3D/agentsConfig";
import { fetchOfficeAgents, fetchAgentStatuses } from "@/lib/office-agents";
import type {
  Visitor,
  AgentApiResponse,
  AgentApiItem,
  ConfiguredSubagent,
  AgentConfig,
} from "@/lib/office3d-types";
import {
  fetchWithTimeout,
  buildSubagentOfficeId,
  getVisitorStatus,
  parseParentFromKey,
} from "@/lib/office-utils";
import {
  matchRuntimeToConfigured,
  computeSubagentConfigs,
  computeSubagentStateById,
} from "@/lib/office-subagent-state";

interface UseOfficePollingOptions {
  initialAgents?: AgentConfig[];
}

export interface UseOfficePollingReturn {
  agents: AgentConfig[];
  agentStates: Record<string, AgentState>;
  visitors: Visitor[];
  configuredSubagents: ConfiguredSubagent[];
  subagentConfigs: AgentConfig[];
  subagentStateById: Map<string, AgentStatus>;
  runtimeSubagentByConfiguredId: Map<string, Visitor>;
  loading: boolean;
  refetch: () => void;
}

export function useOfficePolling(options: UseOfficePollingOptions = {}): UseOfficePollingReturn {
  const { initialAgents } = options;
  const hasInitialAgents = (initialAgents?.length ?? 0) > 0;
  const [agents, setAgents] = useState<AgentConfig[]>(initialAgents || []);
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [configuredSubagents, setConfiguredSubagents] = useState<ConfiguredSubagent[]>([]);
  const [loading, setLoading] = useState(!hasInitialAgents);

  // Ref to expose a refetch function into the useEffect closures
  const refetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    let isMounted = true;
    let configInterval: NodeJS.Timeout | null = null;
    let statusInterval: NodeJS.Timeout | null = null;

    console.log("[office] useOfficePolling mounted", {
      hasInitialAgents,
      initialAgentCount: initialAgents?.length ?? 0,
    });

    if (hasInitialAgents && agents.length === 0) {
      setAgents(initialAgents as AgentConfig[]);
      setLoading(false);
    }

    const fetchFullConfig = async () => {
      try {
        const agentsWithDesks = await fetchOfficeAgents();
        if (agentsWithDesks.length === 0) {
          if (!hasInitialAgents) {
            setAgents([{
              id: "main", name: "Main Agent", emoji: "🤖",
              position: [0, 0, 0], deskRotation: [0, 0, 0],
              tableId: "core-1", color: "#ff6b35",
              role: "Main Agent", department: "core",
            }]);
            setConfiguredSubagents([]);
          }
          setLoading(false);
          return;
        }

        const statusMap = await fetchAgentStatuses();
        let agentsApiList: AgentApiItem[] = [];
        const agentsRes = await fetchWithTimeout("/api/agents");
        if (agentsRes.ok) {
          const agentsApiData: AgentApiResponse = await agentsRes.json();
          agentsApiList = agentsApiData.agents || [];
        }

        const agentDetailsById = new Map<string, AgentApiItem>();
        agentsApiList.forEach((agent) => agentDetailsById.set(agent.id, agent));

        const topLevelAgentIds = new Set(agentsApiList.map((a) => a.id));
        const configuredSubagentIds = new Set<string>();
        agentsApiList.forEach((agent) => {
          (agent.allowAgents || []).forEach((subId) => {
            if (!topLevelAgentIds.has(subId)) configuredSubagentIds.add(subId);
          });
        });

        const filteredAgents = agentsWithDesks.filter((a) => !configuredSubagentIds.has(a.id));
        const primaryAgents = filteredAgents.length > 0 ? filteredAgents : agentsWithDesks;
        const initialAgentsMap = new Map((initialAgents || []).map((a) => [a.id, a]));

        const configs = primaryAgents.map((desk) => {
          const initial = initialAgentsMap.get(desk.id);
          return {
            id: desk.id, name: desk.name, emoji: desk.emoji,
            color: desk.color, role: desk.role,
            position: initial?.position || [desk.deskPosition.x, desk.deskPosition.y, desk.deskPosition.z] as [number, number, number],
            deskRotation: initial?.deskRotation || [0, desk.deskPosition.rotation, 0] as [number, number, number],
            accessories: desk.accessories,
          };
        });
        setAgents(configs);

        if (agentsApiList.length > 0) {
          const nextConfiguredSubagents: ConfiguredSubagent[] = [];
          agentsApiList.forEach((parentAgent) => {
            (parentAgent.allowAgents || []).forEach((subagentId) => {
              if (topLevelAgentIds.has(subagentId)) return;
              const details = parentAgent.allowAgentsDetails?.find((e) => e.id === subagentId);
              nextConfiguredSubagents.push({
                id: buildSubagentOfficeId(parentAgent.id, subagentId),
                parentId: parentAgent.id, subagentId,
                name: details?.name || subagentId,
                emoji: details?.emoji || "🤖",
                color: details?.color || "#60a5fa",
              });
            });
          });
          const uniqueSubagents = new Map<string, ConfiguredSubagent>();
          nextConfiguredSubagents.forEach((s) => uniqueSubagents.set(s.id, s));
          setConfiguredSubagents(Array.from(uniqueSubagents.values()));
        } else {
          setConfiguredSubagents([]);
        }

        const states: Record<string, AgentState> = {};
        agentsWithDesks.forEach((agent) => {
          const statusInfo = statusMap.get(agent.id);
          const details = agentDetailsById.get(agent.id);
          const agentStatus: AgentStatus = statusInfo?.status
            ? (["idle", "working", "thinking", "error", "online", "offline"].includes(statusInfo.status)
              ? statusInfo.status as AgentStatus : "offline")
            : "offline";
          states[agent.id] = {
            id: agent.id, status: agentStatus,
            currentTask: statusInfo?.currentTask,
            model: details?.model, tokensUsed: details?.tokensUsed,
            sessionCount: details?.sessionCount ?? statusInfo?.activeSessions,
            lastActivity: statusInfo?.lastActivity, mood: details?.mood,
          };
        });
        setAgentStates(states);
      } catch (error) {
        const isAbortError = error instanceof DOMException
          ? error.name === "AbortError"
          : (error as Error)?.message?.includes("abort");
        if (isAbortError) return;
        console.error("Failed to load agent configs:", error);
        setAgents([{
          id: "main", name: "Main Agent", emoji: "🤖",
          position: [0, 0, 0], deskRotation: [0, 0, 0],
          tableId: "core-1", color: "#ff6b35",
          role: "Main Agent", department: "core",
        }]);
        setConfiguredSubagents([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchStatusesAndVisitors = async () => {
      if (!isMounted) return;
      try {
        const statusMap = await fetchAgentStatuses();
        setAgentStates((prev) => {
          const next: Record<string, AgentState> = { ...prev };
          statusMap.forEach((statusInfo, agentId) => {
            const nextStatus: AgentStatus = statusInfo?.status
              ? (["idle", "working", "thinking", "error", "online", "offline"].includes(statusInfo.status)
                ? statusInfo.status as AgentStatus : "offline")
              : "offline";
            const current = next[agentId] || {
              id: agentId, status: "offline", model: "unknown",
              tokensPerHour: 0, tasksInQueue: 0, uptime: 0,
            };
            next[agentId] = {
              ...current, status: nextStatus,
              currentTask: statusInfo?.currentTask || current.currentTask,
              lastActivity: statusInfo?.lastActivity || current.lastActivity,
            };
          });
          return next;
        });

        const res = await fetchWithTimeout("/api/sessions");
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        const sessions = data.sessions || [];
        const visitorsById = new Map<string, Visitor>();
        sessions
          .filter((s: { type: string }) => s.type === "subagent")
          .map((s: {
            subagentId?: string; key: string; model: string;
            inputTokens: number; outputTokens: number;
            totalTokens: number; ageMs?: number;
          }) => {
            const parentId = parseParentFromKey(s.key);
            const subagentId = s.subagentId || s.key;
            const ageMs = typeof s.ageMs === "number" ? s.ageMs : Number.MAX_SAFE_INTEGER;
            return {
              id: buildSubagentOfficeId(parentId, subagentId),
              parentId, subagentId, name: subagentId,
              task: "Working...", model: s.model || "unknown",
              tokens: s.totalTokens || s.inputTokens + s.outputTokens,
              status: getVisitorStatus(ageMs), ageMs,
            } as Visitor;
          })
          .forEach((visitor: Visitor) => {
            const current = visitorsById.get(visitor.id);
            if (!current || visitor.ageMs < current.ageMs) {
              visitorsById.set(visitor.id, visitor);
            }
          });
        setVisitors(Array.from(visitorsById.values()));
      } catch (error) {
        const isAbortError = error instanceof DOMException
          ? error.name === "AbortError"
          : (error as Error)?.message?.includes("abort");
        if (isAbortError) return;
        console.error("Failed to refresh statuses/visitors:", error);
      }
    };

    refetchRef.current = () => {
      fetchFullConfig();
      fetchStatusesAndVisitors();
    };

    fetchFullConfig();
    fetchStatusesAndVisitors();
    statusInterval = setInterval(fetchStatusesAndVisitors, 15000);
    configInterval = setInterval(fetchFullConfig, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      if (statusInterval) clearInterval(statusInterval);
      if (configInterval) clearInterval(configInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived state via pure functions
  const runtimeSubagentByConfiguredId = matchRuntimeToConfigured(configuredSubagents, visitors);
  const subagentConfigs = computeSubagentConfigs(configuredSubagents, agents, runtimeSubagentByConfiguredId);
  const subagentStateById = computeSubagentStateById(configuredSubagents, agentStates, runtimeSubagentByConfiguredId);

  const refetch = useCallback(() => refetchRef.current(), []);

  return {
    agents, agentStates, visitors, configuredSubagents,
    subagentConfigs, subagentStateById, runtimeSubagentByConfiguredId,
    loading, refetch,
  };
}
