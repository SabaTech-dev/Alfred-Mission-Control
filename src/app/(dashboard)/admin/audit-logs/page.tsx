"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  status: "success" | "failure" | "warning";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with real API call
    const mockLogs: AuditEntry[] = [
      { id: "1", timestamp: new Date().toISOString(), action: "LOGIN", user: "admin", resource: "/api/auth/login", status: "success" },
      { id: "2", timestamp: new Date(Date.now() - 3600000).toISOString(), action: "CONFIG_UPDATE", user: "admin", resource: "/api/config", status: "success" },
      { id: "3", timestamp: new Date(Date.now() - 7200000).toISOString(), action: "AGENT_DEPLOY", user: "system", resource: "/api/agents/coder", status: "success" },
      { id: "4", timestamp: new Date(Date.now() - 10800000).toISOString(), action: "LOGIN_FAILED", user: "unknown", resource: "/api/auth/login", status: "failure" },
      { id: "5", timestamp: new Date(Date.now() - 14400000).toISOString(), action: "SKILL_INSTALL", user: "admin", resource: "/api/skills/weather", status: "success" },
    ];
    setLogs(mockLogs);
    setLoading(false);
  }, []);

  const statusColor = (s: string) =>
    s === "success" ? "#22c55e" : s === "failure" ? "#ef4444" : "#f59e0b";

  return (
    <AdminPageLayout title="Audit Logs" description="Security audit trail for all system actions">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>Time</th>
                <th style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>Action</th>
                <th style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>User</th>
                <th style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>Resource</th>
                <th style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--text-primary)" }}>{log.action}</td>
                  <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{log.user}</td>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>{log.resource}</td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ color: statusColor(log.status), fontWeight: 600, textTransform: "uppercase", fontSize: "11px" }}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageLayout>
  );
}
