"use client";

import { Puzzle } from "lucide-react";
import { MetricCard } from "@/components/Alfred";
import { useI18n } from "@/i18n/provider";

interface SkillsHeaderProps {
  totalSkills: number;
  workspaceCount: number;
  systemCount: number;
  updateCount: number;
  showClawHub: boolean;
  onShowClawHub: () => void;
  onUpdateAll: () => void;
}

export function SkillsHeader({
  totalSkills,
  workspaceCount,
  systemCount,
  updateCount,
  onShowClawHub,
  onUpdateAll,
}: SkillsHeaderProps) {
  const { t } = useI18n();

  return (
    <>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "24px",
            fontWeight: 700,
            letterSpacing: "-1px",
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          Skills Manager
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}
        >
          Skills disponibles en el sistema OpenClaw
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onShowClawHub}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: "var(--accent)",
              color: "white",
            }}
          >
            <span>☁️</span> Browse ClawHub
          </button>

          {updateCount > 0 && (
            <button
              onClick={onUpdateAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: "var(--warning)",
                color: "white",
              }}
            >
              <span>⬇️</span> {t("skills.updateAll", { count: updateCount })}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <MetricCard icon={Puzzle} value={totalSkills} label="Total Skills" />
        <MetricCard
          icon={Puzzle}
          value={workspaceCount}
          label="Workspace Skills"
          changeColor="positive"
        />
        <MetricCard
          icon={Puzzle}
          value={systemCount}
          label="System Skills"
          changeColor="secondary"
        />
      </div>
    </>
  );
}
