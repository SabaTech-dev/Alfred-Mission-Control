"use client";

import Link from "next/link";

import {
  Brain,
  BookOpen,
  Calendar,
  Code,
  Puzzle,
  Server,
  Terminal,
  TrendingUp,
  Users,
} from "lucide-react";

import { MoodWidget } from "@/components/MoodWidget";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { useI18n } from "@/i18n/provider";

const QUICK_LINKS = [
  { href: "/cron", icon: Calendar, labelKey: "dashboard.cronJobs", color: "#a78bfa" },
  { href: "/system", icon: Server, labelKey: "dashboard.system", color: "var(--success)" },
  { href: "/logs", icon: Terminal, labelKey: "dashboard.liveLogs", color: "#60a5fa" },
  { href: "/memory", icon: Brain, labelKey: "dashboard.memory", color: "#f59e0b" },
  { href: "/skills", icon: Puzzle, labelKey: "dashboard.skills", color: "#4ade80" },
  { href: "/seo", icon: TrendingUp, labelKey: "dashboard.seo", color: "#fbbf24" },
  { href: "/notepad", icon: BookOpen, labelKey: "dashboard.notebook", color: "#f472b6" },
  { href: "/cowork", icon: Users, labelKey: "dashboard.cowork.title", color: "#22d3ee" },
  { href: "/code", icon: Code, labelKey: "dashboard.code.title", color: "#94a3b8" },
] as const;

export function DashboardSidebar() {
  const { t } = useI18n();

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="accent-line" />
          <h2
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
            }}
          >
            {t("dashboard.quickLinks")}
          </h2>
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {QUICK_LINKS.map(({ href, icon: Icon, labelKey, color }) => (
          <Link
            key={href}
            href={href}
            className="p-3 rounded-lg transition-all hover:scale-[1.02]"
            style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {t(labelKey)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ margin: "1rem", marginTop: "0.5rem" }}>
        <MoodWidget />
      </div>

      <div style={{ margin: "1rem", marginTop: "0.5rem" }}>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)" }}
        >
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("dashboard.smartSuggestions")}
          </h3>
          <SuggestionsPanel compact maxItems={3} />
        </div>
      </div>
    </div>
  );
}
