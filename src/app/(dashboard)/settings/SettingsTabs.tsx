"use client";

import { Server, FileJson, DollarSign, User } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { SettingsTab } from "./SettingsTypes";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const tabs = [
  { id: "system" as const, labelKey: "settings.tabs.system", icon: Server },
  { id: "config" as const, labelKey: "settings.tabs.config", icon: FileJson },
  { id: "pricing" as const, labelKey: "settings.tabs.pricing", icon: DollarSign },
  { id: "about" as const, labelKey: "settings.tabs.about", icon: User },
];

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  const { t } = useI18n();

  return (
    <div className="flex gap-1 mb-6 p-1 rounded-lg overflow-x-auto" style={{ backgroundColor: "var(--card)" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-md transition-all whitespace-nowrap"
          style={{
            backgroundColor: activeTab === tab.id ? "var(--accent)" : "transparent",
            color: activeTab === tab.id ? "white" : "var(--text-secondary)",
          }}
        >
          <tab.icon className="w-4 h-4" />
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
}