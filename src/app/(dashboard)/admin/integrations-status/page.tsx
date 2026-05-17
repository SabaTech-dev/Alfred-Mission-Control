"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface Integration { name: string; type: string; status: "connected" | "disconnected" | "error"; lastSync: string; errorCount: number }

export default function IntegrationsStatusPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIntegrations([
      { name: "GitHub", type: "git", status: "connected", lastSync: new Date().toISOString(), errorCount: 0 },
      { name: "OpenAI API", type: "llm", status: "connected", lastSync: new Date().toISOString(), errorCount: 0 },
      { name: "Anthropic API", type: "llm", status: "connected", lastSync: new Date().toISOString(), errorCount: 0 },
      { name: "ClawHub Registry", type: "registry", status: "connected", lastSync: new Date(Date.now() - 300000).toISOString(), errorCount: 0 },
      { name: "Google Calendar", type: "calendar", status: "disconnected", lastSync: new Date(Date.now() - 86400000).toISOString(), errorCount: 2 },
      { name: "Gmail", type: "email", status: "disconnected", lastSync: new Date(Date.now() - 172800000).toISOString(), errorCount: 5 },
      { name: "Weather API", type: "data", status: "connected", lastSync: new Date(Date.now() - 600000).toISOString(), errorCount: 0 },
    ]);
    setLoading(false);
  }, []);

  const statusColor = (s: string) => (s === "connected" ? "#22c55e" : s === "error" ? "#ef4444" : "var(--text-muted)");

  return (
    <AdminPageLayout title="Integrations Status" description="External service connectivity and sync status">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
          {integrations.map((i) => (
            <div key={i.name} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>{i.name}</span>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: `${statusColor(i.status)}20`, color: statusColor(i.status), fontWeight: 600, textTransform: "uppercase" }}>{i.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
                <span>Type: {i.type}</span>
                <span>Last sync: {new Date(i.lastSync).toLocaleTimeString()}</span>
              </div>
              {i.errorCount > 0 && (
                <div style={{ marginTop: "4px", fontSize: "12px", color: "#ef4444" }}>{i.errorCount} recent errors</div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
