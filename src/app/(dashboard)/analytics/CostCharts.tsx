"use client";

import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { useI18n } from "@/i18n/provider";
import type { CostData } from "@/lib/costs-data";
import { COLORS, getModelName } from "./types";

interface CostChartsProps {
  costData: CostData;
}

export function CostCharts({ costData }: CostChartsProps) {
  const { t } = useI18n();

  const tooltipStyle = {
    backgroundColor: "var(--card-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily cost trend */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {t("analytics.dailyCostTrend")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={costData.daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
            <YAxis stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="cost" stroke="var(--accent)" strokeWidth={2} name={t("analytics.costLegend")} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cost by agent */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {t("analytics.costByAgent")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={costData.byAgent}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="agent" stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
            <YAxis stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="cost" fill="var(--accent)" name={t("analytics.costLegend")} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost by model */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {t("analytics.costByModel")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RePieChart>
            <Pie
              data={costData.byModel.map((m) => ({ ...m, friendlyName: getModelName(m.model) }))}
              dataKey="cost"
              nameKey="friendlyName"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.friendlyName}: $${entry.cost.toFixed(2)}`}
            >
              {costData.byModel.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </RePieChart>
        </ResponsiveContainer>
      </div>

      {/* Token usage daily */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {t("analytics.tokenUsageDaily")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={costData.daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
            <YAxis stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="input" stackId="a" fill="#60A5FA" name={t("analytics.inputTokens")} />
            <Bar dataKey="output" stackId="a" fill="#F59E0B" name={t("analytics.outputTokens")} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
