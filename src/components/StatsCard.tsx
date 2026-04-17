"use client";

import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  iconColor?: string;
  footer?: ReactNode;
}

export function StatsCard({
  title,
  value,
  icon,
  iconColor = "var(--accent)",
  footer,
}: StatsCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs md:text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            {title}
          </p>
          <p className="text-xl md:text-2xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {value}
          </p>
        </div>
        {icon ? (
          <div
            className="shrink-0 rounded-lg p-2"
            style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}