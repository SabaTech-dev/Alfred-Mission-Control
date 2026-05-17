"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface FeatureFlag { key: string; description: string; enabled: boolean; environment: "production" | "development" | "all"; toggleCount: number }

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFlags([
      { key: "enable_changelog", description: "Show changelog notifications to users", enabled: true, environment: "production", toggleCount: 3 },
      { key: "enable_beta_sidebar", description: "New sidebar design with collapsible groups", enabled: false, environment: "development", toggleCount: 5 },
      { key: "enable_rate_limit_ui", description: "Show rate limit status in header", enabled: true, environment: "all", toggleCount: 1 },
      { key: "enable_dark_mode_sync", description: "Sync dark mode with system preference", enabled: true, environment: "all", toggleCount: 2 },
      { key: "enable_agent_chat", description: "Allow direct chat with agents from UI", enabled: false, environment: "development", toggleCount: 4 },
      { key: "enable_cost_dashboard", description: "Show cost tracking in main dashboard", enabled: false, environment: "development", toggleCount: 1 },
    ]);
    setLoading(false);
  }, []);

  const toggleFlag = (key: string) => {
    setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <AdminPageLayout title="Feature Flags" description="Toggle features on/off across environments">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {flags.map((f) => (
            <div key={f.key} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <code style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{f.key}</code>
                  <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(168,85,247,0.1)", color: "#a855f7" }}>{f.environment}</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{f.description}</div>
              </div>
              <button
                onClick={() => toggleFlag(f.key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: f.enabled ? "#22c55e" : "var(--border)",
                  backgroundColor: f.enabled ? "rgba(34,197,94,0.1)" : "transparent",
                  color: f.enabled ? "#22c55e" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
              >
                {f.enabled ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
