"use client";

import { ExternalLink, Power, FileText, X } from "lucide-react";
import { Skill } from "./SkillsTypes";

interface SkillDetailModalProps {
  skill: Skill | null;
  loading?: boolean;
  onClose: () => void;
  onToggle: () => void;
  isToggling: boolean;
}

export function SkillDetailModal({
  skill,
  onClose,
  onToggle,
  isToggling,
  loading,
}: SkillDetailModalProps) {
  if (loading || !skill) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          zIndex: 100,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: "var(--surface)",
            borderRadius: "12px",
            padding: "48px",
            textAlign: "center",
            maxWidth: "400px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>
            Loading skill details...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "12px",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid var(--border)",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              padding: "8px",
              borderRadius: "6px",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <X style={{ width: "20px", height: "20px" }} />
          </button>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", paddingRight: "40px" }}>
            {skill.emoji && <span style={{ fontSize: "48px" }}>{skill.emoji}</span>}
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                {skill.name}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  marginBottom: "12px",
                }}
              >
                {skill.description}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <div className="badge-positive">{skill.source === "system" ? "system" : (skill.workspace || "workspace")}</div>
                <div className="badge-info">{skill.fileCount} archivos</div>
                {!skill.enabled && (
                  <div
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    DISABLED
                  </div>
                )}
                {skill.agents &&
                  skill.agents.length > 0 &&
                  skill.agents.map((agent) => (
                    <div
                      key={agent}
                      style={{
                        backgroundColor: "var(--surface-elevated)",
                        color: "var(--text-secondary)",
                        padding: "3px 10px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: 600,
                        border: "1px solid var(--border)",
                      }}
                    >
                      @{agent}
                    </div>
                  ))}
                {skill.homepage && (
                  <a
                    href={skill.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--accent)",
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Homepage <ExternalLink style={{ width: "12px", height: "12px" }} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "16px",
              padding: "12px 16px",
              backgroundColor: "var(--surface-elevated)",
              borderRadius: "8px",
            }}
          >
            <Power style={{ width: "18px", height: "18px", color: skill.enabled ? "var(--accent)" : "var(--text-muted)" }} />
            <span style={{ flex: 1, color: "var(--text-primary)", fontSize: "14px" }}>
              {skill.enabled ? "Skill is enabled" : "Skill is disabled"}
            </span>
            <button
              onClick={onToggle}
              disabled={isToggling}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: skill.enabled ? "rgba(239, 68, 68, 0.1)" : "var(--accent)",
                color: skill.enabled ? "#ef4444" : "white",
                border: "none",
                cursor: isToggling ? "wait" : "pointer",
                fontSize: "12px",
                fontWeight: 600,
                opacity: isToggling ? 0.5 : 1,
              }}
            >
              {isToggling ? "..." : skill.enabled ? "Disable" : "Enable"}
            </button>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "12px",
            }}
          >
            Archivos ({skill.files.length})
          </h3>
          <div
            style={{
              backgroundColor: "var(--bg)",
              borderRadius: "8px",
              padding: "16px",
              maxHeight: "400px",
              overflow: "auto",
            }}
          >
            {skill.files.map((file) => (
              <div
                key={file}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  padding: "4px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FileText style={{ width: "14px", height: "14px", color: "var(--text-muted)", flexShrink: 0 }} />
                {file}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}