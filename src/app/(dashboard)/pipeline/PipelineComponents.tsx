"use client";

export function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: "var(--surface-elevated)", borderRadius: "10px", border: "1px solid var(--border)", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

export function FormField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
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

export function FormSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
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

export function FormTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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
