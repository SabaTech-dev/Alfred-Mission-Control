"use client";

import { X, AlertTriangle, Clock, Send, DollarSign, Building2, Mail, Linkedin, Calendar } from "lucide-react";
import { type Opportunity, type PipelineStage } from "@/lib/pipeline-types";
import { formatDate, formatCurrency } from "./PipelineTypes";

interface OpportunityPopupModalProps {
  opp: Opportunity | null;
  onClose: () => void;
  onAction: (action: "discard" | "wait" | "investigate") => void;
}

export function OpportunityPopupModal({ opp, onClose, onAction }: OpportunityPopupModalProps) {
  if (!opp) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--background)",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          width: "90%",
          maxWidth: "800px",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-elevated)",
            borderRadius: "16px 16px 0 0",
          }}
        >
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              {opp.company}
            </div>
            <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{opp.title}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                background: "var(--accent)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <DollarSign size={16} />
              {formatCurrency(opp.value)}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                padding: "4px",
                borderRadius: "4px",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Stage Badge */}
          <div style={{ marginBottom: "20px" }}>
            <span
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Stage: {opp.stage}
            </span>
          </div>

          {/* Contact Info */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Building2 size={16} />
              Contacto
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              {opp.contact_name && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                  <span style={{ fontSize: "16px" }}>👤</span>
                  {opp.contact_name}
                </div>
              )}
              {opp.contact_email && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                  <Mail size={16} />
                  <a href={`mailto:${opp.contact_email}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                    {opp.contact_email}
                  </a>
                </div>
              )}
              {opp.contact_linkedin && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                  <Linkedin size={16} />
                  <a href={opp.contact_linkedin} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                    LinkedIn
                  </a>
                </div>
              )}
              {opp.source && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                  <span style={{ fontSize: "16px" }}>📍</span>
                  {opp.source}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {opp.description && (
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                Descripción
              </h3>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                {opp.description}
              </div>
            </div>
          )}

          {/* Next Action */}
          {opp.next_action && (
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={16} />
                Próxima Acción
              </h3>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {opp.next_action}
                {opp.next_action_date && (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "12px" }}>
                    <Calendar size={14} />
                    {formatDate(opp.next_action_date)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {opp.notes && (
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                Notas
              </h3>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6", background: "var(--surface-elevated)", padding: "12px", borderRadius: "8px" }}>
                {opp.notes}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", gap: "16px", marginBottom: "24px" }}>
            <span>Probability: {opp.probability ? `${opp.probability}%` : "N/A"}</span>
            <span>Creado: {formatDate(opp.created_at)}</span>
          </div>

          {/* Actions */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
              ¿Qué quieres hacer con esta oportunidad?
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => onAction("investigate")}
                style={{
                  flex: "1 1 200px",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Send size={16} />
                Investigar
              </button>
              <button
                onClick={() => onAction("wait")}
                style={{
                  flex: "1 1 200px",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-elevated)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Clock size={16} />
                En Espera
              </button>
              <button
                onClick={() => onAction("discard")}
                style={{
                  flex: "1 1 200px",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  border: "1px solid #ef4444",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <AlertTriangle size={16} />
                Descartar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}