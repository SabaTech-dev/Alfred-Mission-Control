"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface ScanResult { id: string; type: string; severity: "critical" | "high" | "medium" | "low" | "info"; description: string; status: "open" | "resolved"; foundAt: string }

export default function SecurityScanPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setResults([
      { id: "1", type: "XSS", severity: "medium", description: "Reflected input in search endpoint not sanitized", status: "resolved", foundAt: new Date(Date.now() - 604800000).toISOString() },
      { id: "2", type: "Headers", severity: "info", description: "Missing Strict-Transport-Security header", status: "resolved", foundAt: new Date(Date.now() - 604800000).toISOString() },
      { id: "3", type: "Auth", severity: "low", description: "Session tokens lack rotation on privilege elevation", status: "open", foundAt: new Date().toISOString() },
    ]);
    setLoading(false);
  }, []);

  const sevColor = (s: string) => ({ critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#3b82f6", info: "var(--text-muted)" }[s] ?? "var(--text-muted)");

  return (
    <AdminPageLayout title="Security Scan" description="Vulnerability scan results and remediation tracking">
      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px", alignItems: "center" }}>
        <button style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "var(--accent)", color: "var(--text-primary)", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
          Run New Scan
        </button>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Last scan: {results.length > 0 ? new Date(Math.max(...results.map(r => new Date(r.foundAt).getTime()))).toLocaleString() : "Never"}</span>
      </div>
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {results.map((r) => (
            <div key={r.id} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", backgroundColor: `${sevColor(r.severity)}20`, color: sevColor(r.severity), fontWeight: 600, textTransform: "uppercase" }}>{r.severity}</span>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>{r.type}</span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{r.description}</div>
              </div>
              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: r.status === "resolved" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: r.status === "resolved" ? "#22c55e" : "#ef4444" }}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
