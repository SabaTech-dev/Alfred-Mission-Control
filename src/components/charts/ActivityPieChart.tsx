"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface ActivityPieChartDatum {
  type?: string;
  name?: string;
  count?: number;
  value?: number;
}

interface ActivityPieChartProps {
  data: ActivityPieChartDatum[];
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export function ActivityPieChart({ data }: ActivityPieChartProps) {
  const normalizedData = data.map((item) => ({
    name: item.type || item.name || "—",
    value: item.count ?? item.value ?? 0,
  }));

  if (normalizedData.length === 0) {
    return <div className="h-[300px] flex items-center justify-center" style={{ color: "var(--text-secondary)" }}>—</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={normalizedData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={(entry) => `${entry.name}: ${entry.value}`}
        >
          {normalizedData.map((entry, index) => (
            <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}