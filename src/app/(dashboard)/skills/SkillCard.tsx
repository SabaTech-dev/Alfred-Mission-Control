"use client";

import { Power, X, FileText, ExternalLink } from "lucide-react";

export interface Skill {
  id: string;
  name: string;
  description: string;
  location: string;
  source: "workspace" | "system";
  workspace?: string;
  homepage?: string;
  emoji?: string;
  fileCount: number;
  fullContent: string;
  files: string[];
  agents: string[];
  enabled: boolean;
}

interface SkillCardProps {
  skill: Skill;
  onClick: () => void;
  onToggle: () => void;
  isToggling: boolean;
}

export function SkillCard({ skill, onClick, onToggle, isToggling }: SkillCardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        borderRadius: "8px",
        padding: "16px",
        border: "1px solid var(--border)",
        cursor: "pointer",
        transition: "all 150ms ease",
        opacity: skill.enabled ? 1 : 0.6,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface-hover)";
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        {skill.emoji && <span style={{ fontSize: "24px", flexShrink: 0 }}>{skill.emoji}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "4px",
            }}
          >
            {skill.name}
          </h3>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: "1.5",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {skill.description}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "12px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <SkillBadges skill={skill} />
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {skill.homepage && <ExternalLink style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />}
          <ToggleSwitch enabled={skill.enabled} onToggle={onToggle} isToggling={isToggling} />
        </div>
      </div>
    </div>
  );
}

interface SkillBadgesProps {
  skill: Skill;
}

function SkillBadges({ skill }: SkillBadgesProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
      <Badge
        variant="source"
        text={skill.source === "system" ? "system" : (skill.workspace || "workspace")}
        source={skill.source}
      />
      {!skill.enabled && (
        <Badge variant="disabled" text="DISABLED" />
      )}
      {skill.agents &&
        skill.agents.length > 0 &&
        skill.agents.map((agent) => (
          <Badge key={agent} variant="agent" text={agent} />
        ))}
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "10px",
          color: "var(--text-muted)",
        }}
      >
        {skill.fileCount} files
      </span>
    </div>
  );
}

interface BadgeProps {
  variant: "source" | "disabled" | "agent";
  text: string;
  source?: "workspace" | "system";
}

function Badge({ variant, text, source }: BadgeProps) {
  const styles = {
    source: {
      backgroundColor: source === "workspace" ? "var(--accent-soft)" : "var(--surface-elevated)",
      color: source === "workspace" ? "var(--accent)" : "var(--text-muted)",
    },
    disabled: {
      backgroundColor: "var(--surface-elevated)",
      color: "var(--text-muted)",
      border: "1px solid var(--border)",
    },
    agent: {
      backgroundColor: "var(--surface-elevated)",
      color: "var(--text-secondary)",
      border: "1px solid var(--border)",
    },
  };

  const currentStyle = styles[variant];

  return (
    <div
      style={{
        padding: "3px 8px",
        borderRadius: "4px",
        fontFamily: variant === "agent" ? "var(--font-mono)" : "var(--font-body)",
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: variant === "agent" ? "0" : "1px",
        textTransform: variant === "agent" ? "none" : "uppercase",
        ...currentStyle,
      }}
    >
      {text}
    </div>
  );
}

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  isToggling: boolean;
}

function ToggleSwitch({ enabled, onToggle, isToggling }: ToggleSwitchProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={isToggling}
      title={enabled ? "Disable skill" : "Enable skill"}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        backgroundColor: enabled ? "var(--accent)" : "var(--text-muted)",
        border: "none",
        cursor: isToggling ? "wait" : "pointer",
        position: "relative",
        transition: "background-color 200ms",
        opacity: isToggling ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "white",
          position: "absolute",
          top: "2px",
          left: enabled ? "18px" : "2px",
          transition: "left 200ms",
        }}
      />
    </button>
  );
}