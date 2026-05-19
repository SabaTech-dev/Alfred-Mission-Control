"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  PIPELINE_STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
  type PipelineStage,
  type Opportunity,
} from "@/lib/pipeline-types";

export interface FunnelStage {
  stage: PipelineStage;
  label: string;
  count: number;
  value: number;
  color: string;
}

interface PipelineFunnelChartProps {
  opportunities: Opportunity[];
}

function buildFunnelData(opps: Opportunity[]): FunnelStage[] {
  return PIPELINE_STAGES.map((stage) => {
    const stageOpps = opps.filter((o) => o.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      count: stageOpps.length,
      value: stageOpps.reduce((sum, o) => sum + o.value, 0),
      color: STAGE_COLORS[stage],
    };
  });
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FunnelStage }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--card-elevated, #1e1e2e)",
        border: "1px solid var(--border, #333)",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "12px",
      }}
    >
      <div style={{ fontWeight: 600, color: d.color, marginBottom: "4px" }}>
        {d.label}
      </div>
      <div style={{ color: "var(--text-secondary, #aaa)" }}>
        {d.count} oportunidad{d.count !== 1 ? "es" : ""}
      </div>
      <div style={{ color: "var(--text-primary, #eee)", fontWeight: 600 }}>
        {new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(d.value)}
      </div>
    </div>
  );
}

export function PipelineFunnelChart({ opportunities }: PipelineFunnelChartProps) {
  const data = buildFunnelData(opportunities);

  if (opportunities.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface-elevated)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          padding: "40px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "13px",
        }}
      >
        No hay datos para mostrar en el embudo
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface-elevated)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        🔻 Embudo por Etapa
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontWeight: 400,
          }}
        >
          ({opportunities.length} oportunidades)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 80, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={75}
            tick={{ fontSize: 11, fill: "var(--text-secondary, #aaa)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
