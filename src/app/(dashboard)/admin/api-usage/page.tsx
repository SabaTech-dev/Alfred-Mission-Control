"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface ApiUsageEntry { endpoint: string; calls: number; avgMs: number; errors: number; lastCalled: string }

export default function ApiUsagePage() {
  const [usage, setUsage] = useState<ApiUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUsage([
      { endpoint: "/api/agents", calls: 12450, avgMs: 45, errors: 12, lastCalled: new Date().toISOString() },
      { endpoint: "/api/kanban", calls: 8920, avgMs: 32, errors: 3, lastCalled: new Date().toISOString() },
      { endpoint: "/api/sessions", calls: 6730, avgMs: 120, errors: 8, lastCalled: new Date().toISOString() },
      { endpoint: "/api/skills", calls: 3420, avgMs: 67, errors: 1, lastCalled: new Date(Date.now() - 300000).toISOString() },
      { endpoint: "/api/system", calls: 2100, avgMs: 15, errors: 0, lastCalled: new Date().toISOString() },
      { endpoint: "/api/files", calls: 1890, avgMs: 230, errors: 45, lastCalled: new Date(Date.now() - 600000).toISOString() },
      { endpoint: "/api/config", calls: 560, avgMs: 12, errors: 0, lastCalled: new Date(Date.now() - 3600000).toISOString() },
    ]);
    setLoading(false);
  }, []);

  const totalCalls = usage.reduce((a, u) => a + u.calls, 0);
  const totalErrors = usage.reduce((a, u) => a + u.errors, 0);

  return (
    <AdminPageLayout title="API Usage" description="API endpoint usage statistics and error rates">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Calls (24h)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{totalCalls.toLocaleString()}</div>
        </div>
        <div style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Errors (24h)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>{totalErrors}</div>
        </div>
        <div style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Error Rate</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: totalErrors / totalCalls > 0.01 ? "#f59e0b" : "#22c55e" }}>
            {(totalErrors / totalCalls * 100).toFixed(2)}%
          </div>
        </div>
      </div>
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Endpoint", "Calls", "Avg RT", "Errors", "Last Called"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.endpoint} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--text-primary)", fontSize: "12px" }}>{u.endpoint}</td>
                  <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{u.calls.toLocaleString()}</td>
                  <td style={{ padding: "8px", color: u.avgMs > 100 ? "#f59e0b" : "var(--text-secondary)" }}>{u.avgMs}ms</td>
                  <td style={{ padding: "8px", color: u.errors > 10 ? "#ef4444" : "var(--text-secondary)" }}>{u.errors}</td>
                  <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: "12px" }}>{new Date(u.lastCalled).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageLayout>
  );
}
