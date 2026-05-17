"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface NodeStatus { name: string; role: string; status: "online" | "offline" | "restarting"; cpu: number; memory: number; uptime: string }

export default function ClusterStatusPage() {
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNodes([
      { name: "vnic-alfred", role: "primary", status: "online", cpu: 23, memory: 67, uptime: "14d 6h" },
      { name: "vnic-worker-01", role: "worker", status: "online", cpu: 45, memory: 52, uptime: "14d 6h" },
      { name: "vnic-worker-02", role: "worker", status: "online", cpu: 12, memory: 38, uptime: "7d 3h" },
    ]);
    setLoading(false);
  }, []);

  const statusColor = (s: string) => (s === "online" ? "#22c55e" : s === "restarting" ? "#f59e0b" : "#ef4444");

  return (
    <AdminPageLayout title="Cluster Status" description="Node health, resource utilization, and cluster topology">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
          {nodes.map((n) => (
            <div key={n.name} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>{n.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{n.role}</div>
                </div>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: `${statusColor(n.status)}20`, color: statusColor(n.status), fontWeight: 600, textTransform: "uppercase" }}>{n.status}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>CPU</div>
                  <div style={{ height: "4px", backgroundColor: "var(--border)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${n.cpu}%`, backgroundColor: n.cpu > 80 ? "#ef4444" : "#22c55e", borderRadius: "2px" }} />
                  </div>
                  <span style={{ color: "var(--text-secondary)" }}>{n.cpu}%</span>
                </div>
                <div>
                  <div style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Memory</div>
                  <div style={{ height: "4px", backgroundColor: "var(--border)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${n.memory}%`, backgroundColor: n.memory > 80 ? "#ef4444" : "#22c55e", borderRadius: "2px" }} />
                  </div>
                  <span style={{ color: "var(--text-secondary)" }}>{n.memory}%</span>
                </div>
              </div>
              <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>Uptime: {n.uptime}</div>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
