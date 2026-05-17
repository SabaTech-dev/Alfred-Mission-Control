"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface ErrorEntry { id: string; message: string; source: string; count: number; lastOccurrence: string; severity: "critical" | "error" | "warning" }

export default function ErrorTrackingPage() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setErrors([
      { id: "1", message: "ECONNREFUSED 127.0.0.1:6379", source: "cache-client", count: 3, lastOccurrence: new Date().toISOString(), severity: "critical" },
      { id: "2", message: "Rate limit exceeded for API endpoint", source: "api-gateway", count: 12, lastOccurrence: new Date(Date.now() - 1800000).toISOString(), severity: "warning" },
      { id: "3", message: "Timeout waiting for agent response", source: "agent-runtime", count: 5, lastOccurrence: new Date(Date.now() - 3600000).toISOString(), severity: "error" },
      { id: "4", message: "Invalid session token format", source: "auth-middleware", count: 2, lastOccurrence: new Date(Date.now() - 7200000).toISOString(), severity: "warning" },
    ]);
    setLoading(false);
  }, []);

  const severityColor = (s: string) => (s === "critical" ? "#ef4444" : s === "error" ? "#f59e0b" : "#3b82f6");

  return (
    <AdminPageLayout title="Error Tracking" description="Application errors, exceptions, and alert patterns">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {errors.map((e) => (
            <div key={e.id} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)", borderLeft: `3px solid ${severityColor(e.severity)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>{e.message}</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: `${severityColor(e.severity)}20`, color: severityColor(e.severity), fontWeight: 600, textTransform: "uppercase" }}>{e.severity}</span>
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span>Source: <code>{e.source}</code></span>
                <span>Count: {e.count}</span>
                <span>Last: {new Date(e.lastOccurrence).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
