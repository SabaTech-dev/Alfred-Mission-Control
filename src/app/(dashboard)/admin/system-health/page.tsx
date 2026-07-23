"use client";

import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useEffect, useState } from "react";

interface HealthCheck {
  name: string;
  status: "up" | "down";
  details: string;
}

type CategoryName = "core" | "llm" | "services" | "dev";

interface GroupedChecks {
  core: HealthCheck[];
  llm: HealthCheck[];
  services: HealthCheck[];
  dev: HealthCheck[];
}

const serviceCategories: Record<string, CategoryName> = {
  "alfred-mc": "core",
  "openclaw-gateway": "core",
  "postgresql": "core",
  "ollama": "llm",
  "llama.cpp-gpu": "llm",
  "llama.cpp-embed": "llm",
  "coolify": "dev",
  "browserless": "services",
  "langfuse": "services",
  "searxng": "services",
  "qmd-mcp": "services",
  "engram": "services",
  "pr-agent": "dev",
  "memory-core": "core",
};

const categoryLabels: Record<CategoryName, string> = {
  core: "🖥️ Core",
  llm: "🧠 LLM & Embeddings",
  services: "🔧 Supporting Services",
  dev: "👷 Dev & CI Tools",
};

function statusColor(status: string) {
  return status === "up" ? "#22c55e" : "#ef4444";
}

function statusBg(status: string) {
  return status === "up" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
}

function ServiceCard({ check }: { check: HealthCheck }) {
  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "var(--bg)",
        borderRadius: "8px",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
          {check.name}
        </span>
        <span
          style={{
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "4px",
            backgroundColor: statusBg(check.status),
            color: statusColor(check.status),
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {check.status}
        </span>
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", wordBreak: "break-word" }}>
        {check.details}
      </div>
    </div>
  );
}

export default function SystemHealthPage() {
  const [allChecks, setAllChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [uptime, setUptime] = useState<number | null>(null);

  function fetchHealth() {
    fetch("/api/health")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setAllChecks(data.checks ?? []);
        setUptime(data.uptime ?? null);
        setLastUpdated(new Date(data.timestamp ?? Date.now()).toLocaleTimeString());
        setError(null);
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const grouped: GroupedChecks = {
    core: [],
    llm: [],
    services: [],
    dev: [],
  };
  for (const check of allChecks) {
    const cat = serviceCategories[check.name] ?? "services";
    grouped[cat].push(check);
  }

  const totalServices = allChecks.length;
  const upServices = allChecks.filter((c) => c.status === "up").length;
  const overallStatus = upServices === totalServices ? "healthy" : upServices > 0 ? "degraded" : "down";

  return (
    <AdminPageLayout
      title="System Health"
      description="Real-time health status of all infrastructure services"
    >
      {/* Overall status bar */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "20px",
          padding: "1rem",
          borderRadius: "8px",
          backgroundColor: statusBg(overallStatus === "healthy" ? "up" : "down"),
          border: `1px solid ${statusColor(overallStatus === "healthy" ? "up" : "down")}`,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              textTransform: "uppercase",
              color: statusColor(overallStatus === "healthy" ? "up" : "down"),
            }}
          >
            {overallStatus === "healthy" ? "✅ All Systems Operational" : overallStatus === "degraded" ? "⚠️ Degraded" : "❌ Critical"}
          </span>
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {upServices}/{totalServices} services up
          </span>
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
          {uptime !== null && <span>API uptime: {Math.round(uptime / 3600)}h {Math.round((uptime % 3600) / 60)}m</span>}
          {lastUpdated && <span>Last: {lastUpdated}</span>}
          <button
            onClick={() => { setLoading(true); fetchHealth(); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "12px",
              textDecoration: "underline",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading && allChecks.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : error && allChecks.length === 0 ? (
        <p style={{ color: "#ef4444" }}>Error: {error}</p>
      ) : (
        Object.entries(grouped).map(
          ([cat, checks]) =>
            checks.length > 0 && (
              <div key={cat} style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    marginBottom: "8px",
                  }}
                >
                  {categoryLabels[cat as CategoryName]}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {checks.map((check) => (
                    <ServiceCard key={check.name} check={check} />
                  ))}
                </div>
              </div>
            ),
        )
      )}
    </AdminPageLayout>
  );
}
