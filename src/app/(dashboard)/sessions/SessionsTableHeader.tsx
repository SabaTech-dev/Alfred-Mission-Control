"use client";

export function SessionsTableHeader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--card-elevated)",
      }}
    >
      <div style={{ width: "32px", flexShrink: 0 }} />
      <div
        style={{
          flex: 1,
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Session
      </div>
      <div
        style={{
          minWidth: "100px",
          textAlign: "right",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Tokens / ctx
      </div>
      <div
        style={{
          minWidth: "80px",
          textAlign: "right",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Updated
      </div>
      <div style={{ width: "14px", flexShrink: 0 }} />
    </div>
  );
}
