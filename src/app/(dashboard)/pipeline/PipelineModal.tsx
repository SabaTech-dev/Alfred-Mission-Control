"use client";

import { X, Save, ArrowRight, Edit3, Trash2 } from "lucide-react";
import { PipelineStage, type Opportunity } from "@/lib/pipeline-types";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/pipeline-types";

interface PipelineModalProps {
  showForm: boolean;
  editingId: string | null;
  formData: any;
  setShowForm: (show: boolean) => void;
  onFormDataChange: (data: any) => void;
  onSave: () => void;
}

export function PipelineModal({ showForm, editingId, formData, setShowForm, onFormDataChange, onSave }: PipelineModalProps) {
  if (!showForm) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={() => setShowForm(false)}
    >
      <div
        style={{
          background: "var(--surface-elevated)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          padding: "24px",
          width: "480px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            {editingId ? "Editar Oportunidad" : "Nueva Oportunidad"}
          </h2>
          <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <FormField label="Empresa *" value={formData.company || ""} onChange={(v) => onFormDataChange({ ...formData, company: v })} />
          <FormField label="Título *" value={formData.title || ""} onChange={(v) => onFormDataChange({ ...formData, title: v })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormField label="Valor (€)" type="number" value={String(formData.value || "")} onChange={(v) => onFormDataChange({ ...formData, value: Number(v) })} />
            <FormSelect
              label="Etapa"
              value={formData.stage || "lead"}
              options={PIPELINE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
              onChange={(v) => onFormDataChange({ ...formData, stage: v as PipelineStage })}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <FormField label="Contacto" value={formData.contact_name || ""} onChange={(v) => onFormDataChange({ ...formData, contact_name: v })} />
            <FormField label="Email" value={formData.contact_email || ""} onChange={(v) => onFormDataChange({ ...formData, contact_email: v })} />
          </div>
          <FormSelect
            label="Tipo de Servicio"
            value={formData.service_type || "other"}
            options={[
              { value: "consultoria_audit", label: "🔍 Consultoría Audit" },
              { value: "consultoria_retainer", label: "🔄 Consultoría Retainer" },
              { value: "consultoria_managed", label: "🛡️ Consultoría Managed" },
              { value: "orquestacion_setup", label: "⚙️ Orquestación Setup" },
              { value: "orquestacion_advanced", label: "🚀 Orquestación Advanced" },
              { value: "orquestacion_managed", label: "🤖 Orquestación Managed" },
              { value: "other", label: "📋 Otro" },
            ]}
            onChange={(v) => onFormDataChange({ ...formData, service_type: v as Opportunity["service_type"] })}
          />
          <FormField label="Próxima Acción" value={formData.next_action || ""} onChange={(v) => onFormDataChange({ ...formData, next_action: v })} />
          <FormField label="Fecha Próx. Acción" type="date" value={formData.next_action_date || ""} onChange={(v) => onFormDataChange({ ...formData, next_action_date: v })} />
          <FormField label="Fuente" value={formData.source || ""} onChange={(v) => onFormDataChange({ ...formData, source: v })} />
          <FormTextarea label="Notas" value={formData.notes || ""} onChange={(v) => onFormDataChange({ ...formData, notes: v })} />

          <button
            onClick={onSave}
            disabled={!formData.company || !formData.title}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: formData.company && formData.title ? "var(--accent)" : "var(--surface)",
              color: formData.company && formData.title ? "#fff" : "var(--text-muted)",
              cursor: formData.company && formData.title ? "pointer" : "not-allowed",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "8px",
            }}
          >
            <Save size={16} /> {editingId ? "Guardar Cambios" : "Crear Oportunidad"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: "13px",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function FormSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: "13px",
          boxSizing: "border-box",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500, display: "block", marginBottom: "4px" }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          fontSize: "13px",
          resize: "vertical",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}