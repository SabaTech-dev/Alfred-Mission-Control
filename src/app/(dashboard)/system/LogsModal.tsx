"use client";

import { Terminal, X, Loader2 } from "lucide-react";

import { useI18n } from "@/i18n/provider";

import type { LogsModal as LogsModalData } from "./types";

interface LogsModalProps {
  modal: LogsModalData;
  onClose: () => void;
}

export function LogsModal({ modal, onClose }: LogsModalProps) {
  const { t } = useI18n();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        width: "95vw", maxWidth: "900px", height: "80vh",
        backgroundColor: "#0d1117",
        borderRadius: "1rem", border: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.875rem 1rem",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <Terminal className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span style={{ color: "#c9d1d9", fontFamily: "monospace", fontSize: "0.9rem" }}>
            {modal.name} {t("system.logs")}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#8b949e", marginLeft: "0.5rem" }}>
            ({modal.backend})
          </span>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", padding: "0.375rem", borderRadius: "0.375rem", background: "none", border: "none", cursor: "pointer", color: "#8b949e" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
          {modal.loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : (
            <pre style={{
              fontFamily: "monospace", fontSize: "0.8rem",
              color: "#c9d1d9", whiteSpace: "pre-wrap", wordBreak: "break-all",
              lineHeight: 1.6,
            }}>
              {modal.content || t("system.noLogOutput")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
