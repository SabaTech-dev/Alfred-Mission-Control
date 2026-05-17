"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface Metric { name: string; value: string; unit: string; trend: "up" | "down" | "stable"; delta: string }

export default function PerformanceMetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMetrics([
      { name: "Page Load (p50)", value: "142", unit: "ms", trend: "down", delta: "-12ms" },
      { name: "Page Load (p99)", value: "487", unit: "ms", trend: "up", delta: "+23ms" },
      { name: "API Response (avg)", value: "89", unit: "ms", trend: "down", delta: "-5ms" },
      { name: "Memory Usage", value: "67", unit: "%", trend: "stable", delta: "+1%" },
      { name: "CPU Usage", value: "23", unit: "%", trend: "down", delta: "-4%" },
      { name: "Active Connections", value: "34", unit: "", trend: "up", delta: "+8" },
      { name: "Cache Hit Rate", value: "94.2", unit: "%", trend: "up", delta: "+0.8%" },
      { name: "Error Rate", value: "0.3", unit: "%", trend: "down", delta: "-0.1%" },
    ]);
    setLoading(false);
  }, []);

  const trendColor = (t: string) => (t === "down" ? "#22c55e" : t === "up" ? "#f59e0b" : "var(--text-muted)");

  return (
    <AdminPageLayout title="Performance Metrics" description="Detailed system performance measurements and trends">
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "12px" }}>
          {metrics.map((m) => (
            <div key={m.name} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>{m.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{m.value}</span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{m.unit}</span>
                <span style={{ fontSize: "12px", color: trendColor(m.trend) }}>{m.delta}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
