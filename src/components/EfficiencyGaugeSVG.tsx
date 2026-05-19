import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

export interface EfficiencyData {
  score: number;
  grade: string;
  components: {
    successRate: number;
    taskCompletion: number;
    tokenEfficiency: number;
  };
  breakdown: {
    totalActivities: number;
    successfulActivities: number;
    failedActivities: number;
    totalTokens: number;
    usefulTokens: number;
  };
  trend: "up" | "down" | "stable";
  trendPercent: number;
  history: Array<{
    date: string;
    score: number;
    activities: number;
    successRate: number;
  }>;
  period: string;
  timestamp: string;
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "var(--success)";
    case "B":
      return "#84cc16";
    case "C":
      return "var(--warning)";
    case "D":
      return "#f97316";
    case "F":
      return "var(--error)";
    default:
      return "var(--text-muted)";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 90) return "var(--success)";
  if (score >= 80) return "#84cc16";
  if (score >= 70) return "var(--warning)";
  if (score >= 60) return "#f97316";
  return "var(--error)";
}

interface GaugeArcProps {
  score: number;
  grade: string;
}

export function GaugeArc({ score, grade }: GaugeArcProps) {
  return (
    <div className="relative w-48 h-48">
      {/* Background circle */}
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="96"
          cy="96"
          r="88"
          fill="none"
          stroke="var(--card-elevated)"
          strokeWidth="12"
        />
        {/* Progress arc */}
        <circle
          cx="96"
          cy="96"
          r="88"
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 553} 553`}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-5xl font-bold"
          style={{ color: getScoreColor(score) }}
        >
          {score.toFixed(0)}
        </div>
        <div
          className="text-2xl font-bold mt-1"
          style={{ color: getGradeColor(grade) }}
        >
          {grade}
        </div>
      </div>
    </div>
  );
}

interface TrendIndicatorProps {
  trend: "up" | "down" | "stable";
  trendPercent: number;
  vsPreviousLabel: string;
  stableLabel: string;
}

export function TrendIndicator({ trend, trendPercent, vsPreviousLabel, stableLabel }: TrendIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mt-4">
      {trend === "up" && (
        <>
          <TrendingUp className="w-4 h-4" style={{ color: "var(--success)" }} />
          <span style={{ color: "var(--success)" }}>
            {vsPreviousLabel}
          </span>
        </>
      )}
      {trend === "down" && (
        <>
          <TrendingDown className="w-4 h-4" style={{ color: "var(--error)" }} />
          <span style={{ color: "var(--error)" }}>
            {vsPreviousLabel}
          </span>
        </>
      )}
      {trend === "stable" && (
        <>
          <Minus className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <span style={{ color: "var(--text-muted)" }}>{stableLabel}</span>
        </>
      )}
    </div>
  );
}

interface ScoreComponentBarProps {
  label: string;
  value: number;
  tooltipKey: string;
  tooltipText: string;
  showTooltip: string | null;
  onTooltipChange: (key: string | null) => void;
}

export function ScoreComponentBar({
  label,
  value,
  tooltipKey,
  tooltipText,
  showTooltip,
  onTooltipChange,
}: ScoreComponentBarProps) {
  return (
    <div
      className="relative"
      onMouseEnter={() => onTooltipChange(tooltipKey)}
      onMouseLeave={() => onTooltipChange(null)}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--text-primary)" }}>
            {label}
          </span>
          <Info
            className="w-3 h-3 cursor-help"
            style={{ color: "var(--text-muted)" }}
          />
        </div>
        <span
          className="font-semibold"
          style={{ color: getScoreColor(value) }}
        >
          {value.toFixed(1)}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--card-elevated)" }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${value}%`,
            backgroundColor: getScoreColor(value),
          }}
        />
      </div>
      {showTooltip === tooltipKey && (
        <div
          className="absolute z-10 p-2 rounded text-xs mt-1"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}
