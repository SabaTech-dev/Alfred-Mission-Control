"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface Report { id: string; name: string; type: string; generatedAt: string; status: "ready" | "generating" | "failed" }

export default function ComplianceReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setReports([
      { id: "1", name: "SOC2 Monthly - May 2026", type: "SOC2", generatedAt: new Date().toISOString(), status: "ready" },
      { id: "2", name: "GDPR Data Access Report", type: "GDPR", generatedAt: new Date(Date.now() - 86400000).toISOString(), status: "ready" },
      { id: "3", name: "Security Audit Q1 2026", type: "Security", generatedAt: new Date(Date.now() - 2592000000).toISOString(), status: "ready" },
      { id: "4", name: "SOC2 Monthly - Apr 2026", type: "SOC2", generatedAt: new Date(Date.now() - 2592000000).toISOString(), status: "ready" },
    ]);
    setLoading(false);
  }, []);

  const statusColor = (s: string) => (s === "ready" ? "#22c55e" : s === "generating" ? "#3b82f6" : "#ef4444");

  return (
    <AdminPageLayout title="Compliance Reports" description="Generate and view compliance and audit reports">
      <div style={{ marginBottom: "1rem" }}>
        <button style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "var(--accent)", color: "var(--text-primary)", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
          Generate New Report
        </button>
      </div>
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Report", "Type", "Generated", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", fontWeight: 600, color: "var(--text-primary)" }}>{r.name}</td>
                  <td style={{ padding: "8px" }}><span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(168,85,247,0.1)", color: "#a855f7" }}>{r.type}</span></td>
                  <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: "12px" }}>{new Date(r.generatedAt).toLocaleDateString()}</td>
                  <td style={{ padding: "8px" }}><span style={{ color: statusColor(r.status), fontWeight: 600, textTransform: "uppercase", fontSize: "11px" }}>{r.status}</span></td>
                  <td style={{ padding: "8px" }}>{r.status === "ready" && <button style={{ fontSize: "12px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>Download</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageLayout>
  );
}
