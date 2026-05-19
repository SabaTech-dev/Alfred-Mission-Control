"use client";

import { useState, useEffect, useCallback } from "react";

import {
  AgentInfo,
  AgentActivity,
  AgentLog,
  AgentMetrics,
  AgentIdentity,
} from "@/lib/agent-utils";

export interface IdentityForm {
  name: string;
  role: string;
  personality: string;
  avatar: string;
  mission: string;
}

export interface UseAgentInspectReturn {
  agent: AgentInfo | null;
  activities: AgentActivity[];
  logs: AgentLog[];
  metrics: AgentMetrics | null;
  config: Record<string, unknown>;
  identity: AgentIdentity | null;
  identityForm: IdentityForm;
  setIdentityForm: (form: IdentityForm) => void;
  isLoading: boolean;
  logFilter: "all" | "info" | "warn" | "error";
  setLogFilter: (filter: "all" | "info" | "warn" | "error") => void;
  identitySaving: boolean;
  identitySaveSuccess: boolean;
  identityError: string | null;
  refetch: () => void;
  handleSaveIdentity: () => Promise<void>;
}

export function useAgentInspect(
  agentId: string,
  isOpen: boolean
): UseAgentInspectReturn {
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [identityForm, setIdentityForm] = useState<IdentityForm>({
    name: "",
    role: "",
    personality: "",
    avatar: "",
    mission: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identitySaveSuccess, setIdentitySaveSuccess] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const fetchAgentData = useCallback(async () => {
    if (!agentId || !isOpen) return;

    setIsLoading(true);
    try {
      // Fetch agent info
      const agentRes = await fetch(`/api/agents/${agentId}`);
      if (agentRes.ok) {
        const data = await agentRes.json();
        setAgent(data.agent);
      }

      // Fetch activities
      const activityRes = await fetch(`/api/activities?agentId=${agentId}&limit=20`);
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivities(data.activities || []);
      }

      // Fetch logs (simulated)
      setLogs([
        { id: "1", level: "info", message: "Agent started", timestamp: new Date().toISOString(), source: "system" },
        { id: "2", level: "info", message: "Connected to gateway", timestamp: new Date().toISOString(), source: "gateway" },
        { id: "3", level: "debug", message: "Heartbeat sent", timestamp: new Date().toISOString(), source: "heartbeat" },
      ]);

      // Fetch metrics
      const metricsRes = await fetch(`/api/agents/${agentId}/metrics`);
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      } else {
        // Default metrics
        setMetrics({
          totalActivities: activities.length,
          successRate: 95,
          avgResponseTime: 1.2,
          tokensPerDay: 50000,
          errorsLast24h: 2,
          topTasks: [
            { task: "code_review", count: 15 },
            { task: "documentation", count: 8 },
            { task: "testing", count: 5 },
          ],
        });
      }

      // Fetch config
      const configRes = await fetch(`/api/agents/${agentId}/config`);
      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config || {});
      } else {
        setConfig({
          model: agent?.model || "claude-sonnet-4-20250514",
          temperature: 0.7,
          maxTokens: 4096,
          heartbeatInterval: 30,
        });
      }

      // Fetch identity
      const identityRes = await fetch(`/api/agents/${agentId}/identity`);
      if (identityRes.ok) {
        const data = await identityRes.json();
        setIdentity(data.identity);
        setIdentityForm({
          name: data.identity.name || "",
          role: data.identity.role || "",
          personality: data.identity.personality || "",
          avatar: data.identity.avatar || "",
          mission: data.identity.mission || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch agent data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, isOpen, agent?.model, activities.length]);

  useEffect(() => {
    if (isOpen) {
      fetchAgentData();
    }
  }, [isOpen, fetchAgentData]);

  const handleSaveIdentity = async () => {
    setIdentitySaving(true);
    setIdentityError(null);
    setIdentitySaveSuccess(false);

    try {
      const res = await fetch(`/api/agents/${agentId}/identity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: identityForm.name,
          role: identityForm.role,
          personality: identityForm.personality || null,
          avatar: identityForm.avatar || null,
          mission: identityForm.mission || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save identity");
      }

      const data = await res.json();
      setIdentity(data.identity);
      setIdentitySaveSuccess(true);
      setTimeout(() => setIdentitySaveSuccess(false), 2000);
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : "Failed to save identity");
    } finally {
      setIdentitySaving(false);
    }
  };

  return {
    agent,
    activities,
    logs,
    metrics,
    config,
    identity,
    identityForm,
    setIdentityForm,
    isLoading,
    logFilter,
    setLogFilter,
    identitySaving,
    identitySaveSuccess,
    identityError,
    refetch: fetchAgentData,
    handleSaveIdentity,
  };
}
