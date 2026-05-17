"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface CostEntry { service: string; monthly: number; trend: "up" | "down" | "stable"; recommendation: string }

export default function CostOptimizationPage() {
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCosts([
      { service: "Compute (OCI)", monthly: 45.20, trend: "stable", recommendation: "Consider flexible shapes for non-prod" },
      { service: "Storage", monthly: 12.80, trend: "up", recommendation: "Archive old logs to object storage" },
      { service: "Network Egress", monthly: 3.40, trend: "down", recommendation: "Good — within free tier" },
      { service: "DNS", monthly: 1.00, trend: "stable", recommendation: "No action needed" },
      { service: "API Calls (External)", monthly: 0.00, trend: "stable", recommendation: "All within free tiers" },
    ]);
    setLoading(false);
  }, []);

  const totalMonthly = costs.reduce((a, c) => a + c.monthly, 0);
  const trendIcon = (t: string) => (t === "up" ? "↑" : t === "down" ? "↓" : "→");
  const trendColor = (t: string) => (t === "up" ? "#ef4444" : t === "down" ? "#22c55e" : "var(--text-muted)");

  return (
    <AdminPageLayout title="Cost Optimization" description="Infrastructure cost tracking and optimization recommendations">
      <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Estimated Monthly Cost</div>
        <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)" }}>${totalMonthly.toFixed(2)}</div>
      </div>
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {costs.map((c) => (
            <div key={c.service} style={{ padding: "1rem", backgroundColor: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>{c.service}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>${c.monthly.toFixed(2)}</span>
                  <span style={{ fontSize: "12px", color: trendColor(c.trend) }}>{trendIcon(c.trend)}</span>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>💡 {c.recommendation}</div>
            </div>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
