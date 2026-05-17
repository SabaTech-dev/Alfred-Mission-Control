"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface ConfigEntry { key: string; value: string; modifiedBy: string; modifiedAt: string; env: "production" | "development" }

export default function ConfigAuditPage() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setConfigs([
      { key: "AGENT_TIMEOUT_MS", value: "300000", modifiedBy: "admin", modifiedAt: new Date(Date.now() - 86400000).toISOString(), env: "production" },
      { key: "MAX_SUBAGENTS", value: "5", modifiedBy: "admin", modifiedAt: new Date(Date.now() - 172800000).toISOString(), env: "production" },
      { key: "LOG_LEVEL", value: "info", modifiedBy: "system", modifiedAt: new Date(Date.now() - 604800000).toISOString(), env: "production" },
      { key: "SESSION_TTL_MS", value: "86400000", modifiedBy: "admin", modifiedAt: new Date(Date.now() - 2592000000).toISOString(), env: "production" },
      { key: "RATE_LIMIT_WINDOW", value: "900000", modifiedBy: "admin", modifiedAt: new Date(Date.now() - 2592000000).toISOString(), env: "production" },
    ]);
    setLoading(false);
  }, []);

  return (
    <AdminPageLayout title="Config Audit" description="Configuration change history and current values">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Key", "Value", "Modified By", "Modified At", "Env"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.key} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--text-primary)", fontWeight: 600 }}>{c.key}</td>
                  <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--text-secondary)" }}>{c.value}</td>
                  <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{c.modifiedBy}</td>
                  <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: "12px" }}>{new Date(c.modifiedAt).toLocaleString()}</td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: c.env === "production" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: c.env === "production" ? "#22c55e" : "#f59e0b" }}>{c.env}</span>
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
