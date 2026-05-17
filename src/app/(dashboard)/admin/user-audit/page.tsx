"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface UserAuditEntry { id: string; username: string; action: string; ip: string; timestamp: string; userAgent: string }

export default function UserAuditPage() {
  const [entries, setEntries] = useState<UserAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEntries([
      { id: "1", username: "admin", action: "LOGIN", ip: "192.168.1.100", timestamp: new Date().toISOString(), userAgent: "Chrome/126.0" },
      { id: "2", username: "admin", action: "PAGE_VIEW", ip: "192.168.1.100", timestamp: new Date(Date.now() - 60000).toISOString(), userAgent: "Chrome/126.0" },
      { id: "3", username: "admin", action: "CONFIG_CHANGE", ip: "192.168.1.100", timestamp: new Date(Date.now() - 300000).toISOString(), userAgent: "Chrome/126.0" },
      { id: "4", username: "unknown", action: "LOGIN_FAILED", ip: "10.0.0.55", timestamp: new Date(Date.now() - 3600000).toISOString(), userAgent: "curl/8.1" },
      { id: "5", username: "admin", action: "LOGOUT", ip: "192.168.1.100", timestamp: new Date(Date.now() - 86400000).toISOString(), userAgent: "Chrome/126.0" },
    ]);
    setLoading(false);
  }, []);

  return (
    <AdminPageLayout title="User Audit" description="User activity audit trail and access patterns">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Time", "User", "Action", "IP", "User Agent"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{new Date(e.timestamp).toLocaleString()}</td>
                  <td style={{ padding: "8px", fontWeight: 600, color: e.username === "unknown" ? "#ef4444" : "var(--text-primary)" }}>{e.username}</td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: e.action.includes("FAILED") ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", color: e.action.includes("FAILED") ? "#ef4444" : "#3b82f6" }}>{e.action}</span>
                  </td>
                  <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: "12px" }}>{e.ip}</td>
                  <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: "12px" }}>{e.userAgent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageLayout>
  );
}
