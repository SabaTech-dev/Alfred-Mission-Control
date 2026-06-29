import { useState, useEffect } from "react";

// Re-export the shared type so existing imports (`import type { AgentHeartbeat }
// from "@/hooks/useHeartbeat"`) keep working while the single source of truth
// lives in src/lib/heartbeat-types.ts and is shared with the API route.
export type { AgentHeartbeat } from "@/lib/heartbeat-types";
import type { AgentHeartbeat } from "@/lib/heartbeat-types";

export const HEARTBEAT_TEMPLATE = `# Heartbeat

## Checks to perform every 30 minutes

- [ ] Check email for urgent messages
- [ ] Review calendar for events in next 2 hours
- [ ] Check weather for significant changes
- [ ] Review pending tasks
- [ ] If idle for 8+ hours, send brief check-in

## Notes

- Only alert if something actually needs attention
- Use \`HEARTBEAT_OK\` if everything is fine
- Be smart about prioritization
`;

interface HeartbeatData {
  enabled: boolean;
  every: string;
  target: string;
  activeHours: { start: string; end: string } | null;
  heartbeatMd: string;
  heartbeatMdPath: string;
  configured: boolean;
  agentHeartbeats?: AgentHeartbeat[];
}

interface UseHeartbeatOptions {
  data: HeartbeatData;
  onSave: (content: string, agentId?: string) => Promise<void>;
}

export function useHeartbeat({ data, onSave }: UseHeartbeatOptions) {
  const [isEditing, setIsEditing] = useState(!data.configured);
  const [content, setContent] = useState(data.heartbeatMd);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const [editingConfigAgent, setEditingConfigAgent] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ every: string; target: string }>({
    every: "15m",
    target: "none",
  });
  const [isSavingAgent, setIsSavingAgent] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAgentId) {
      loadAgentHeartbeatMd(selectedAgentId);
    } else {
      setContent(data.heartbeatMd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId, data.heartbeatMd]);

  const loadAgentHeartbeatMd = async (agentId: string) => {
    setIsLoadingContent(true);
    try {
      const res = await fetch(`/api/heartbeat?agentId=${encodeURIComponent(agentId)}`);
      if (res.ok) {
        const json = await res.json();
        setContent(json.heartbeatMd || "");
      }
    } catch (e) {
      console.error("Failed to load agent HEARTBEAT.md:", e);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave(content, selectedAgentId || undefined);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditConfig = (agent: AgentHeartbeat) => {
    setEditingConfigAgent(agent.agentId);
    setEditForm({ every: agent.every, target: agent.target });
  };

  const cancelEditConfig = () => {
    setEditingConfigAgent(null);
    setEditForm({ every: "15m", target: "none" });
  };

  const saveAgentConfig = async (agentId: string) => {
    setIsSavingAgent(agentId);
    try {
      const res = await fetch(`/api/heartbeat/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        if (data.agentHeartbeats) {
          data.agentHeartbeats = data.agentHeartbeats.map((a) =>
            a.agentId === agentId
              ? { ...a, every: editForm.every, target: editForm.target }
              : a
          );
        }
        setEditingConfigAgent(null);
      }
    } catch (e) {
      console.error("Failed to save agent config:", e);
    } finally {
      setIsSavingAgent(null);
    }
  };

  const selectAgentForEdit = (agentId: string | null) => {
    setSelectedAgentId(agentId);
    setIsEditing(false);
  };

  const useTemplate = () => {
    setContent(HEARTBEAT_TEMPLATE);
    setIsEditing(true);
  };

  const getSelectedAgentName = (): string | null => {
    if (!selectedAgentId || !data.agentHeartbeats) return null;
    const agent = data.agentHeartbeats.find((a) => a.agentId === selectedAgentId);
    return agent?.agentName || selectedAgentId;
  };

  return {
    isEditing,
    setIsEditing,
    content,
    setContent,
    isSaving,
    saveSuccess,
    isLoadingContent,
    selectedAgentId,
    editingConfigAgent,
    editForm,
    setEditForm,
    isSavingAgent,
    handleSave,
    startEditConfig,
    cancelEditConfig,
    saveAgentConfig,
    selectAgentForEdit,
    useTemplate,
    getSelectedAgentName,
  };
}
