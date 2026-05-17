"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface Backup { id: string; name: string; size: string; created: string; status: "completed" | "running" | "failed"; type: "auto" | "manual" }

export default function DatabaseBackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBackups([
      { id: "1", name: "daily-auto-2026-05-12", size: "2.4 GB", created: new Date().toISOString(), status: "completed", type: "auto" },
      { id: "2", name: "daily-auto-2026-05-11", size: "2.3 GB", created: new Date(Date.now() - 86400000).toISOString(), status: "completed", type: "auto" },
      { id: "3", name: "pre-migration-snapshot", size: "2.1 GB", created: new Date(Date.now() - 172800000).toISOString(), status: "completed", type: "manual" },
      { id: "4", name: "daily-auto-2026-05-10", size: "2.2 GB", created: new Date(Date.now() - 259200000).toISOString(), status: "failed", type: "auto" },
    ]);
    setLoading(false);
  }, []);

  const statusColor = (s: string) => (s === "completed" ? "#22c55e" : s === "running" ? "#3b82f6" : "#ef4444");

  return (
    <AdminPageLayout title="Database Backups" description="Manage and monitor database backup operations">
      <div style={{ marginBottom: "1rem", display: "flex", gap: "8px" }}>
        <button style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "var(--accent)", color: "var(--text-primary)", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
          Create Manual Backup
        </button>
      </div>
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Name", "Size", "Created", "Type", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--text-primary)" }}>{b.name}</td>
                  <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{b.size}</td>
                  <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{new Date(b.created).toLocaleDateString()}</td>
                  <td style={{ padding: "8px" }}><span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: b.type === "auto" ? "rgba(59,130,246,0.1)" : "rgba(168,85,247,0.1)", color: b.type === "auto" ? "#3b82f6" : "#a855f7" }}>{b.type}</span></td>
                  <td style={{ padding: "8px" }}><span style={{ color: statusColor(b.status), fontWeight: 600, textTransform: "uppercase", fontSize: "11px" }}>{b.status}</span></td>
                  <td style={{ padding: "8px" }}><button style={{ fontSize: "12px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>Restore</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageLayout>
  );
}
