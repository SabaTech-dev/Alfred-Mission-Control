"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n } from "@/i18n/provider";
import {
  type EfficiencyData,
  getScoreColor,
  GaugeArc,
  TrendIndicator,
  ScoreComponentBar,
} from "@/components/EfficiencyGaugeSVG";

type PeriodType = "7" | "14" | "30";

export function EfficiencyGauge() {
  const { t } = useI18n();
  const [data, setData] = useState<EfficiencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("7");
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const [efficiencyScoreLabel, setEfficiencyScoreLabel] = useState("Efficiency Score");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/costs/efficiency?days=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch efficiency data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  useEffect(() => {
    setEfficiencyScoreLabel(t("efficiency.efficiencyScore"));
  }, [t, efficiencyScoreLabel]);

  if (loading) {
    return (
      <div
        className="p-6 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2
            className="w-5 h-5 animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <span style={{ color: "var(--text-secondary)" }}>
            {t("efficiency.calculating")}
          </span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="p-6 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          {t("efficiency.title")}
        </h3>
        <div className="text-center py-8">
          <p style={{ color: "var(--text-muted)" }}>
            {t("efficiency.noData")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-xl"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("efficiency.title")}
          </h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("efficiency.description")}
          </p>
        </div>

        {/* Period selector */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ backgroundColor: "var(--card-elevated)" }}
        >
          {(["7", "14", "30"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1 rounded text-xs font-medium transition-all"
              style={{
                backgroundColor: period === p ? "var(--accent)" : "transparent",
                color: period === p ? "white" : "var(--text-secondary)",
              }}
            >
              {t("efficiency.days", { days: p })}
            </button>
          ))}
        </div>
      </div>

      {/* Main Score Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gauge */}
        <div className="flex flex-col items-center justify-center">
          <GaugeArc score={data.score} grade={data.grade} />
          <TrendIndicator
            trend={data.trend}
            trendPercent={data.trendPercent}
            vsPreviousLabel={t("efficiency.vsPrevious", { percent: data.trendPercent })}
            stableLabel={t("efficiency.stable")}
          />
        </div>

        {/* Components */}
        <div className="lg:col-span-2 space-y-4">
          <h4
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("efficiency.scoreComponents")}
          </h4>

          <ScoreComponentBar
            label={t("efficiency.successRate")}
            value={data.components.successRate}
            tooltipKey="successRate"
            tooltipText={t("efficiency.successRateTooltip")}
            showTooltip={showTooltip}
            onTooltipChange={setShowTooltip}
          />

          <ScoreComponentBar
            label={t("efficiency.taskCompletion")}
            value={data.components.taskCompletion}
            tooltipKey="taskCompletion"
            tooltipText={t("efficiency.taskCompletionTooltip")}
            showTooltip={showTooltip}
            onTooltipChange={setShowTooltip}
          />

          <ScoreComponentBar
            label={t("efficiency.tokenEfficiency")}
            value={data.components.tokenEfficiency}
            tooltipKey="tokenEfficiency"
            tooltipText={t("efficiency.tokenEfficiencyTooltip")}
            showTooltip={showTooltip}
            onTooltipChange={setShowTooltip}
          />

          {/* Breakdown */}
          <div className="mt-4 pt-4 grid grid-cols-2 gap-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t("efficiency.totalActivities")}
              </p>
              <p
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {data.breakdown.totalActivities.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t("efficiency.successFailed")}
              </p>
              <p
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                <span style={{ color: "var(--success)" }}>
                  {data.breakdown.successfulActivities}
                </span>
                {" / "}
                <span style={{ color: "var(--error)" }}>
                  {data.breakdown.failedActivities}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History Chart */}
      {data.history && data.history.length > 0 && (
        <div>
          <h4
            className="text-sm font-semibold uppercase tracking-wide mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("efficiency.trendHistory", { days: period })}
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="var(--text-muted)"
                style={{ fontSize: "12px" }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: "var(--accent)", r: 4 }}
                name={efficiencyScoreLabel}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Formula explanation */}
      <div
        className="mt-4 pt-4 text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <p>
          <strong>{t("efficiency.formula")}</strong> {t("efficiency.formulaText")}
        </p>
      </div>
    </div>
  );
}
