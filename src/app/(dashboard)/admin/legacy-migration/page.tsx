"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface Migration { id: string; name: string; from: string; to: string; progress: number; status: "completed" | "in_progress" | "pending" | "failed"; startedAt: string }

export default function LegacyMigrationPage() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMigrations([
      { id: "1", name: "Session Store v2", from: "Cookie-based", to: "HMAC-signed tokens", progress: 100, status: "completed", startedAt: new Date(Date.now() - 2592000000).toISOString() },
      { id: "2", name: "API Routes v3", from: "Pages Router", to: "App Router", progress: 100, status: "completed", startedAt: new Date(Date.now() - 5184000000).toISOString() },
      { id: "3", name: "Agent Config", from: "JSON files", to: "Database-backed", progress: 65, status: "in_progress", startedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "4", name: "Memory System", from: "File-based", to: "Memory-Core + Engram", progress: 100, status: "completed", startedAt: new Date(Date.now() - 172800000).toISOString() },
      { id: "5", name: "Notification System", from: "Polling", to: "WebSocket push", progress: 0, status: "pending", startedAt: new Date().toISOString() },
    ]);
    setLoading(false);
  }, []);

  const statusColor = (s: string) => ({ completed: "#22c55e", in_progress: "#3b82f6", pending: "var(--text-muted)", failed: "#ef4444" }[s] ?? "var(--text-muted)");

  return (
    <AdminPageLayout title="Legacy Migration" description="Track migration progress from legacy systems to new architecture">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {migrations.map((m) => (
            <div key={m.id} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>{m.name}</span>
                  <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                    {m.from} → {m.to}
                  </span>
                </div>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: `${statusColor(m.status)}20`, color: statusColor(m.status), fontWeight: 600, textTransform: "uppercase" }}>
                  {m.status.replace("_", " ")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, height: "6px", backgroundColor: "var(--border)", borderRadius: "3px" }}>
                  <div style={{ height: "100%", width: `${m.progress}%`, backgroundColor: statusColor(m.status), borderRadius: "3px", transition: "width 0.3s ease" }} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", minWidth: "36px" }}>{m.progress}%</span>
              </div>
              <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                Started: {new Date(m.startedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
