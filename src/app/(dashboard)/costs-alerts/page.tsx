"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Settings,
  Loader2,
  Save,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DailyUsage {
  date: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

interface AgentUsage {
  agent: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  percentage: number;
}

interface Alert {
  level: "ok" | "warning" | "critical";
  message: string;
  value: number;
  threshold: number;
}

interface UsageData {
  today: DailyUsage;
  weekly: DailyUsage[];
  byAgent: AgentUsage[];
  totalCost: number;
  budget: number;
  budgetUsed: number;
  alerts: Alert[];
  timestamp: string;
}

interface CostConfig {
  monthlyBudget: number;
  alerts: {
    warning: number;
    critical: number;
  };
  lastUpdated: string;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F"];

const ALERT_STYLES: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string }> = {
  ok: { icon: CheckCircle, color: "#10b981", bgColor: "rgba(16, 185, 129, 0.1)" },
  warning: { icon: AlertTriangle, color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
  critical: { icon: XCircle, color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" },
};

export default function CostAlertsPage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [config, setConfig] = useState<CostConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editConfig, setEditConfig] = useState({ monthlyBudget: 50, warning: 40, critical: 80 });

  const fetchData = useCallback(async () => {
    try {
      const [usageRes, configRes] = await Promise.all([
        fetch("/api/costs-alerts/usage"),
        fetch("/api/costs-alerts/config"),
      ]);
      const usageData = await usageRes.json();
      const configData = await configRes.json();
      setUsage(usageData);
      setConfig(configData);
      setEditConfig({
        monthlyBudget: configData.monthlyBudget,
        warning: configData.alerts.warning,
        critical: configData.alerts.critical,
      });
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/costs-alerts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyBudget: editConfig.monthlyBudget,
          alerts: {
            warning: editConfig.warning,
            critical: editConfig.critical,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setEditMode(false);
        fetchData(); // Refresh usage with new config
      }
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "var(--accent)" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading cost data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--text-primary)",
            letterSpacing: "-1.5px",
          }}
        >
          💰 Cost Alerts Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Monitor usage and manage budget thresholds
        </p>
      </div>

      {/* Alerts Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {usage?.alerts.map((alert, index) => {
            const style = ALERT_STYLES[alert.level];
            const Icon = style.icon;
            return (
              <div
                key={index}
                className="p-4 rounded-xl flex items-center gap-3"
                style={{
                  backgroundColor: style.bgColor,
                  border: `1px solid ${style.color}40`,
                }}
              >
                <Icon className="w-6 h-6" style={{ color: style.color }} />
                <div>
                  <p className="font-medium" style={{ color: style.color }}>
                    {alert.message}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Threshold: {alert.threshold}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Budget Config */}
      <div
        className="mb-6 p-4 rounded-xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Settings className="w-5 h-5" />
            Budget Configuration
          </h2>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--card-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Edit
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  Monthly Budget ($)
                </label>
                <input
                  type="number"
                  value={editConfig.monthlyBudget}
                  onChange={(e) => setEditConfig({ ...editConfig, monthlyBudget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  Warning Threshold (%)
                </label>
                <input
                  type="number"
                  value={editConfig.warning}
                  onChange={(e) => setEditConfig({ ...editConfig, warning: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  min={1}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
                  Critical Threshold (%)
                </label>
                <input
                  type="number"
                  value={editConfig.critical}
                  onChange={(e) => setEditConfig({ ...editConfig, critical: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: "var(--card-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  min={1}
                  max={100}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditConfig({
                    monthlyBudget: config?.monthlyBudget || 50,
                    warning: config?.alerts.warning || 40,
                    critical: config?.alerts.critical || 80,
                  });
                }}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--card-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Monthly Budget</p>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                ${config?.monthlyBudget || 50}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Warning At</p>
              <p className="text-xl font-bold" style={{ color: "#f59e0b" }}>
                {config?.alerts.warning || 40}%
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Critical At</p>
              <p className="text-xl font-bold" style={{ color: "#ef4444" }}>
                {config?.alerts.critical || 80}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Usage Today */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: "var(--accent)" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Total Cost</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            ${usage?.totalCost.toFixed(2) || "0.00"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            of ${usage?.budget || 50} budget ({usage?.budgetUsed || 0}%)
          </p>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#3b82f6" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Tokens Today</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {((usage?.today.tokensIn || 0) + (usage?.today.tokensOut || 0)).toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            In: {(usage?.today.tokensIn || 0).toLocaleString()} / Out: {(usage?.today.tokensOut || 0).toLocaleString()}
          </p>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: "#10b981" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Today Cost</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            ${usage?.today.cost.toFixed(3) || "0.000"}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Weekly Trend
          </h3>
          {usage?.weekly && usage.weekly.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage.weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "var(--text-primary)" }}
                  />
                  <Bar dataKey="cost" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p style={{ color: "var(--text-muted)" }}>No data available</p>
            </div>
          )}
        </div>

        {/* By Agent */}
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <PieChartIcon className="w-5 h-5" />
            By Agent
          </h3>
          {usage?.byAgent && usage.byAgent.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usage.byAgent}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="percentage"
                    nameKey="agent"
                    label={({ agent, percentage }) => `${agent}: ${percentage}%`}
                    labelLine={false}
                  >
                    {usage.byAgent.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p style={{ color: "var(--text-muted)" }}>No data available</p>
            </div>
          )}

          {/* Agent Legend */}
          {usage?.byAgent && usage.byAgent.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {usage.byAgent.map((agent, index) => (
                <div key={agent.agent} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {agent.agent}: ${agent.cost.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Last updated: {usage?.timestamp ? new Date(usage.timestamp).toLocaleString() : "N/A"}
        </p>
      </div>
    </div>
  );
}
