"use client";

import { Calendar, MapPin, Terminal, Clock, Activity, CheckCircle, Puzzle, Cpu, Folder, HardDrive, Coffee } from "lucide-react";
import { SystemData, AboutStats, RealSkill } from "./SettingsTypes";
import { BRANDING, getAgentDisplayName } from "@/config/branding";
import { useI18n } from "@/i18n/provider";

const SKILL_DISPLAY_COLORS = [
  "#0088cc",
  "#1DA1F2",
  "#facc15",
  "#60a5fa",
  "#f472b6",
  "#34d399",
  "#FF0000",
  "#EA4335",
  "#8b5cf6",
  "#f97316",
];

const getPersonalityTraits = (t: (key: string) => string) => [
  { trait: t("about.traits.direct"), desc: t("about.traits.directDesc"), emoji: "🎯" },
  { trait: t("about.traits.efficient"), desc: t("about.traits.efficientDesc"), emoji: "⚡" },
  { trait: t("about.traits.curious"), desc: t("about.traits.curiousDesc"), emoji: "🔍" },
  { trait: t("about.traits.loyal"), desc: t("about.traits.loyalDesc"), emoji: "💎" },
];

const getPhilosophies = (t: (key: string) => string) => [
  t("about.philosophy.1"),
  t("about.philosophy.2"),
  t("about.philosophy.3"),
  t("about.philosophy.4"),
];

interface SettingsAboutSectionProps {
  systemData: SystemData | null;
  aboutStats: AboutStats | null;
  realSkills: RealSkill[];
  agentName: string;
  ownerUsername: string;
  uptime: string;
}

export function SettingsAboutSection({
  systemData,
  aboutStats,
  realSkills,
  agentName,
  ownerUsername,
  uptime,
}: SettingsAboutSectionProps) {
  const { t } = useI18n();

  const description =
    BRANDING.agentDescription ||
    `AI assistant for ${ownerUsername}. Powered by OpenClaw.`;

  return (
    <div className="max-w-4xl">
      <div
        className="rounded-xl p-4 md:p-6 mb-6"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{
              border: "3px solid var(--accent)",
              backgroundColor: "var(--background)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRANDING.agentAvatar || "/logo.png"}
              alt={agentName}
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 mb-2">
              <h2
                className="text-xl md:text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-primary)",
                }}
              >
                {getAgentDisplayName()}
              </h2>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "var(--success-bg)",
                  color: "var(--success)",
                }}
              >
                ● {t("about.online")}
              </span>
            </div>

            <p
              className="text-sm mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>

            <div
              className="flex flex-wrap justify-center sm:justify-start gap-3 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {BRANDING.birthDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {t("about.born")}{" "}
                  {new Date(BRANDING.birthDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
              {BRANDING.agentLocation && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {BRANDING.agentLocation}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                OpenClaw + {systemData?.system?.model?.split("/")[1]?.split("-")[0] || "AI"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {uptime && (
          <div
            className="rounded-xl p-3 text-center"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <Clock className="w-5 h-5 mx-auto mb-1" style={{ color: "var(--accent)" }} />
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {uptime}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("about.uptime")}
            </div>
          </div>
        )}

        <div
          className="rounded-xl p-3 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Activity className="w-5 h-5 mx-auto mb-1" style={{ color: "var(--info)" }} />
          <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {aboutStats?.totalActivities.toLocaleString() || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("about.activities")}
          </div>
        </div>

        <div
          className="rounded-xl p-3 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <CheckCircle className="w-5 h-5 mx-auto mb-1" style={{ color: "var(--success)" }} />
          <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {aboutStats?.successRate || "..."}%
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("about.successRate")}
          </div>
        </div>

        <div
          className="rounded-xl p-3 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Puzzle className="w-5 h-5 mx-auto mb-1" style={{ color: "#a78bfa" }} />
          <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {aboutStats?.skillsCount || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("about.skills")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Cpu className="w-5 h-5 mx-auto mb-1" style={{ color: "#8b5cf6" }} />
          <div className="text-xs font-bold truncate px-1" style={{ color: "var(--text-primary)" }}>
            {systemData?.system?.model?.split("/").pop() || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("about.model")}
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Folder className="w-5 h-5 mx-auto mb-1" style={{ color: "#f97316" }} />
          <div className="text-xs font-bold truncate px-1" style={{ color: "var(--text-primary)" }}>
            {(systemData?.system?.workspacePath || "").split("/").pop() || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("about.workspace")}
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <HardDrive className="w-5 h-5 mx-auto mb-1" style={{ color: "#34d399" }} />
          <div className="text-xs font-bold truncate px-1" style={{ color: "var(--text-primary)" }}>
            {systemData?.system?.platform || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("about.platform")}
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <Terminal className="w-5 h-5 mx-auto mb-1" style={{ color: "#1DA1F2" }} />
          <div className="text-xs font-bold truncate px-1" style={{ color: "var(--text-primary)" }}>
            v{systemData?.system?.nodeVersion || "..."}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("about.nodeVersion")}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: "var(--accent)" }}>❤️</span>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("about.aboutSection")}
            </h3>
          </div>
          <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <p>
              {t("about.aboutText1", {
                name: `${agentName}`,
                openclaw: "OpenClaw",
                model: systemData?.system?.model?.split("/")[1]?.split("-")[0] || "Claude",
              })}
            </p>
            <p>{t("about.aboutText2", { owner: ownerUsername })}</p>
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: "#facc15" }}>✨</span>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("about.personality")}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {getPersonalityTraits(t).map((p) => (
              <div
                key={p.trait}
                className="rounded-lg p-2 flex items-start gap-2"
                style={{ backgroundColor: "var(--background)" }}
              >
                <span className="text-lg">{p.emoji}</span>
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {p.trait}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {p.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "var(--info)" }}>🧠</span>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("about.philosophyTitle")}
          </h3>
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {getPhilosophies(t).map((p, i) => (
            <div key={i} className="flex gap-2 p-2 rounded-lg" style={{ backgroundColor: "var(--background)" }}>
              <span className="flex-shrink-0 text-sm" style={{ color: "var(--accent)" }}>
                ▸
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {p}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "var(--warning)" }}>⚡</span>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("about.capabilities", { count: realSkills.length })}
          </h3>
        </div>
        {realSkills.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {realSkills.map((skill, index) => {
              const color = SKILL_DISPLAY_COLORS[index % SKILL_DISPLAY_COLORS.length];
              return (
                <div
                  key={skill.id}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ backgroundColor: "var(--background)" }}
                  title={skill.description}
                >
                  <span
                    className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-sm"
                    style={{ color }}
                  >
                    {skill.emoji || "⚡"}
                  </span>
                  <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                    {skill.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("about.noSkills")}
          </div>
        )}
      </div>

      <div
        className="text-center py-4 rounded-xl"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Coffee className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("about.builtWithSimple")}{" "}
            <a
              href="https://github.com/openclaw/openclaw"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", textDecoration: "underline" }}
            >
              OpenClaw
            </a>
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {agentName} — {t("about.coPilot")}
        </p>
      </div>
    </div>
  );
}