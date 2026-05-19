"use client";

import { ExternalLink } from "lucide-react";
import { Skill } from "./SkillsTypes";

interface SkillCardProps {
  skill: Skill;
  onClick: () => void;
  onToggle: () => void;
  isToggling: boolean;
}

export function SkillCard({
  skill,
  onClick,
  onToggle,
  isToggling,
}: SkillCardProps) {
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <div
            style={{
              backgroundColor:
                skill.source === "workspace" ? "var(--accent-soft)" : "var(--surface-elevated)",
              color: skill.source === "workspace" ? "var(--accent)" : "var(--text-muted)",
              padding: "3px 8px",
              borderRadius: "4px",
              fontFamily: "var(--font-body)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {skill.source === "system" ? "system" : (skill.workspace || "workspace")}
          </div>
          {!skill.enabled && (
            <div
              style={{
                backgroundColor: "var(--surface-elevated)",
                color: "var(--text-muted)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontFamily: "var(--font-body)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                border: "1px solid var(--border)",
              }}
            >
              DISABLED
            </div>
          )}
          {skill.agents &&
            skill.agents.length > 0 &&
            skill.agents.map((agent) => (
              <div
                key={agent}
                style={{
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--text-secondary)",
                  padding: "3px 7px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                }}
              >
                {agent}
              </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {skill.homepage && <ExternalLink style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            disabled={isToggling}
            title={skill.enabled ? "Disable skill" : "Enable skill"}
            style={{
              width: "36px",
              height: "20px",
              borderRadius: "10px",
              backgroundColor: skill.enabled ? "var(--accent)" : "var(--text-muted)",
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
                left: skill.enabled ? "18px" : "2px",
                transition: "left 200ms",
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}