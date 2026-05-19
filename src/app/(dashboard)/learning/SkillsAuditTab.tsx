"use client";

import { useState } from "react";
import {
  CheckCircle,
  Activity,
  Package,
  Eye,
  Terminal,
  PowerOff,
  AlertOctagon,
  RefreshCw,
} from "lucide-react";

import type { SkillsAuditData } from "@/lib/learning-types";

// ── Health Gauge ────────────────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  let color = "#22c55e"; // green
  if (score < 50) color = "#ef4444"; // red
  else if (score < 75) color = "#f59e0b"; // yellow

  return (
    <div className="flex items-center gap-6">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="var(--border)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <div>
        <p className="text-4xl font-bold" style={{ color, fontFamily: "var(--font-heading)", letterSpacing: "-2px" }}>{score}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Health Score</p>
      </div>
    </div>
  );
}

// ── Skills Audit Tab ────────────────────────────────────────────────────────

interface SkillsAuditTabProps {
  data: SkillsAuditData | null;
  loading: boolean;
  onRefresh: () => void;
}

export function SkillsAuditTab({ data, loading, onRefresh }: SkillsAuditTabProps) {
  const [skillFilter, setSkillFilter] = useState<string>("all");
  const [skillSearch, setSkillSearch] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Running skills audit...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No audit data available</p>
        <button onClick={onRefresh} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}>
          <RefreshCw className="w-4 h-4 inline mr-2" />Run Audit
        </button>
      </div>
    );
  }

  const { total, eligible, visibleToModel, availableAsCommand, disabled, missingRequirements, healthScore, skills } = data;

  const missingSkills = skills.filter(s => s.status === "missing");

  const filteredSkills = skills.filter(s => {
    if (skillFilter === "active" && s.status !== "active") return false;
    if (skillFilter === "missing" && s.status !== "missing") return false;
    if (skillSearch && !s.name.toLowerCase().includes(skillSearch.toLowerCase())) return false;
    return true;
  });

  const metrics = [
    { icon: Package, label: "Total Skills", value: total, color: "#60a5fa" },
    { icon: CheckCircle, label: "Eligible", value: eligible, color: "#22c55e" },
    { icon: Eye, label: "Visible", value: visibleToModel, color: "#a78bfa" },
    { icon: Terminal, label: "Command", value: availableAsCommand, color: "#34d399" },
    { icon: PowerOff, label: "Disabled", value: disabled, color: "#6b7280" },
    { icon: AlertOctagon, label: "Missing Reqs", value: missingRequirements, color: "#ef4444" },
  ];

  return (
    <div>
      {/* Health Score + Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
        {/* Health Gauge */}
        <div className="md:col-span-2 rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Ecosystem Health</h2>
          </div>
          <HealthGauge score={healthScore} />
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Last checked: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Metric Cards */}
        <div className="md:col-span-5 grid grid-cols-2 md:grid-cols-3 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{m.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Missing Requirements Alert */}
      {missingSkills.length > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="w-5 h-5" style={{ color: "#ef4444" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#ef4444" }}>Missing Requirements ({missingSkills.length})</h3>
          </div>
          <div className="space-y-2">
            {missingSkills.map(s => (
              <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: "var(--card)" }}>
                <span className="text-lg">{s.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                  {s.missingBins && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Missing: {s.missingBins}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills List */}
      <div className="rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-4 flex flex-wrap gap-3 items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Skills ({filteredSkills.length})
          </h3>
          <input
            type="text"
            value={skillSearch}
            onChange={e => setSkillSearch(e.target.value)}
            placeholder="Search skills..."
            className="flex-1 min-w-[150px] max-w-[250px] px-3 py-1.5 rounded-lg text-xs"
            style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <div className="flex gap-1">
            {["all", "active", "disabled", "missing"].map(f => (
              <button
                key={f}
                onClick={() => setSkillFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  backgroundColor: skillFilter === f ? "var(--accent)" : "var(--card-elevated)",
                  color: skillFilter === f ? "var(--text-primary)" : "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[400px] overflow-y-auto">
          {filteredSkills.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                backgroundColor: s.status === "missing" ? "rgba(239,68,68,0.08)" : "var(--card-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <span className="text-sm">{s.emoji}</span>
              <span className="truncate" style={{ color: s.status === "missing" ? "#ef4444" : "var(--text-primary)" }}>{s.name}</span>
            </div>
          ))}
          {filteredSkills.length === 0 && (
            <div className="col-span-full text-center py-8" style={{ color: "var(--text-muted)" }}>
              <p className="text-sm">No skills match your filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
