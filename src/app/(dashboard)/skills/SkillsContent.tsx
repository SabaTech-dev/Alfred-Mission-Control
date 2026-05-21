"use client";

import { Puzzle } from "lucide-react";
import { SectionHeader } from "@/components/Alfred";
import { useI18n } from "@/i18n/provider";
import { Skill } from "./SkillsTypes";
import { SkillCard } from "./SkillCard";

interface SkillsContentProps {
  loading: boolean;
  skills: Skill[];
  workspaceSkills: Skill[];
  systemSkills: Skill[];
  filterSource: "all" | "workspace" | "system";
  togglingSkill: string | null;
  onSelectSkill: (skillId: string) => void;
  onToggleSkill: (skillId: string, currentlyEnabled: boolean) => void;
}

export function SkillsContent({
  loading,
  skills,
  workspaceSkills,
  systemSkills,
  filterSource,
  togglingSkill,
  onSelectSkill,
  onToggleSkill,
}: SkillsContentProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "12px",
          padding: "48px",
          textAlign: "center",
        }}
      >
        <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>
          {t("dashboard.telemetry.loading")}
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "12px",
          padding: "48px",
          textAlign: "center",
        }}
      >
        <Puzzle
          style={{
            width: "48px",
            height: "48px",
            color: "var(--text-muted)",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ color: "var(--text-secondary)" }}>No se encontraron skills</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {workspaceSkills.length > 0 && (filterSource === "all" || filterSource === "workspace") && (
        <div>
          <SectionHeader label="WORKSPACE SKILLS" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            {workspaceSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onClick={() => onSelectSkill(skill.id)}
                onToggle={() => onToggleSkill(skill.id, skill.enabled)}
                isToggling={togglingSkill === skill.id}
              />
            ))}
          </div>
        </div>
      )}

      {systemSkills.length > 0 && (filterSource === "all" || filterSource === "system") && (
        <div>
          <SectionHeader label="SYSTEM SKILLS" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            {systemSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onClick={() => onSelectSkill(skill.id)}
                onToggle={() => onToggleSkill(skill.id, skill.enabled)}
                isToggling={togglingSkill === skill.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
