"use client";

interface SuccessRateGaugeProps {
  rate: number;
}

export function SuccessRateGauge({ rate }: SuccessRateGaugeProps) {
  const clampedRate = Math.max(0, Math.min(100, rate));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedRate / 100) * circumference;
  const color = clampedRate >= 90 ? "var(--success)" : clampedRate >= 70 ? "var(--warning)" : "var(--error)";

  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="12" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {clampedRate.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}