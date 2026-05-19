"use client";

import { FileText, Edit3, Eye, Save, Loader2, CheckCircle2 } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { useHeartbeat, HEARTBEAT_TEMPLATE } from "@/hooks/useHeartbeat";
import type { AgentHeartbeat } from "@/hooks/useHeartbeat";
import { AgentHeartbeatList } from "@/components/AgentHeartbeatList";

interface HeartbeatStatusProps {
  data: {
    enabled: boolean;
    every: string;
    target: string;
    activeHours: { start: string; end: string } | null;
    heartbeatMd: string;
    heartbeatMdPath: string;
    configured: boolean;
    agentHeartbeats?: AgentHeartbeat[];
  };
  onSave: (content: string, agentId?: string) => Promise<void>;
}

export function HeartbeatStatus({ data, onSave }: HeartbeatStatusProps) {
  const { t } = useI18n();
  const hb = useHeartbeat({ data, onSave });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Agent Heartbeats List */}
      {data.agentHeartbeats && data.agentHeartbeats.length > 0 && (
        <AgentHeartbeatList
          agents={data.agentHeartbeats}
          selectedAgentId={hb.selectedAgentId}
          editingConfigAgent={hb.editingConfigAgent}
          editForm={hb.editForm}
          isSavingAgent={hb.isSavingAgent}
          onSelectAgent={hb.selectAgentForEdit}
          onStartEditConfig={hb.startEditConfig}
          onCancelEditConfig={hb.cancelEditConfig}
          onSaveAgentConfig={hb.saveAgentConfig}
          onEditFormChange={hb.setEditForm}
          t={t}
        />
      )}

      {/* HEARTBEAT.md Editor */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--card-elevated)",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            <FileText className="w-4 h-4" />
            {hb.selectedAgentId ? (
              <>
                {t("heartbeat.editor.title")} — <span style={{ color: "var(--accent)" }}>{hb.getSelectedAgentName()}</span>
              </>
            ) : (
              t("heartbeat.editor.title")
            )}
          </span>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {hb.selectedAgentId && (
              <button
                onClick={() => hb.selectAgentForEdit(null)}
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "0.25rem",
                  backgroundColor: "var(--card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                {t("common.clear")}
              </button>
            )}
            <button
              onClick={() => hb.setIsEditing(!hb.isEditing)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                backgroundColor: hb.isEditing ? "var(--accent)" : "var(--card)",
                color: hb.isEditing ? "#000" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              {hb.isEditing ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> {t("heartbeat.editor.preview")}
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" /> {t("heartbeat.editor.edit")}
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{ padding: "1rem" }}>
          {hb.isLoadingContent ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : !hb.content && !hb.isEditing ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
                {t("heartbeat.editor.noFile")}
              </p>
              <button
                onClick={hb.useTemplate}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "var(--accent)",
                  color: "#000",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {t("heartbeat.editor.useTemplate")}
              </button>
            </div>
          ) : (
            <>
              {hb.isEditing ? (
                <textarea
                  value={hb.content}
                  onChange={(e) => hb.setContent(e.target.value)}
                  placeholder={HEARTBEAT_TEMPLATE}
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    color: "var(--text-primary)",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              ) : (
                <div
                  style={{
                    minHeight: "300px",
                    padding: "1rem",
                    backgroundColor: "var(--card-elevated)",
                    borderRadius: "0.5rem",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                  }}
                >
                  {hb.content || HEARTBEAT_TEMPLATE}
                </div>
              )}

              {hb.isEditing && (
                <div
                  style={{
                    marginTop: "1rem",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {hb.saveSuccess && (
                    <span
                      style={{
                        color: "var(--success)",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" /> {t("heartbeat.editor.saved")}
                    </span>
                  )}
                  <button
                    onClick={hb.handleSave}
                    disabled={hb.isSaving}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "var(--success)",
                      color: "#000",
                      border: "none",
                      borderRadius: "0.5rem",
                      cursor: hb.isSaving ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      opacity: hb.isSaving ? 0.7 : 1,
                    }}
                  >
                    {hb.isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> {t("heartbeat.saving")}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> {t("common.save")}
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
