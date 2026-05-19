"use client";

import { useEffect, useState, useMemo } from "react";
import { Settings, RefreshCw } from "lucide-react";
import { SystemInfo } from "@/components/SystemInfo";
import { IntegrationStatus } from "@/components/IntegrationStatus";
import { QuickActions } from "@/components/QuickActions";
import { ConfigEditor } from "@/components/ConfigEditor";
import { PricingEditor } from "@/components/PricingEditor";
import { useI18n } from "@/i18n/provider";
import { BRANDING } from "@/config/branding";
import { SystemData, AboutStats, RealSkill, SettingsTab } from "./SettingsTypes";
import { SettingsTabs } from "./SettingsTabs";
import { SettingsAboutSection } from "./SettingsAboutSection";

interface SettingsClientProps {
  initialSystemData: SystemData | null;
}

export default function SettingsClient({ initialSystemData }: SettingsClientProps) {
  const [systemData, setSystemData] = useState<SystemData | null>(initialSystemData);
  const [aboutStats, setAboutStats] = useState<AboutStats | null>(null);
  const [realSkills, setRealSkills] = useState<RealSkill[]>([]);
  const [loading, setLoading] = useState(!initialSystemData);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("system");
  const { t } = useI18n();

  const uptime = useMemo(() => {
    if (!BRANDING.birthDate) return "";
    const birthDate = new Date(BRANDING.birthDate);
    const now = new Date();
    const days = Math.floor(
      (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days}d`;
  }, []);

  const fetchSystemData = async () => {
    try {
      const res = await fetch("/api/system");
      const data = await res.json();
      setSystemData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch system data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAboutStats = async () => {
    try {
      const [activities, skillsRes, tasks] = await Promise.all([
        fetch("/api/activities").then((r) => r.json()),
        fetch("/api/skills").then((r) => r.json()),
        fetch("/api/tasks").then((r) => r.json()),
      ]);
      const total = activities.activities?.length || activities.length || 0;
      const success = (activities.activities || activities).filter(
        (a: { status: string }) => a.status === "success"
      ).length;

      const skillsArray = skillsRes.skills || [];
      setRealSkills(skillsArray);

      setAboutStats({
        totalActivities: total,
        successRate: total > 0 ? Math.round((success / total) * 100) : 100,
        skillsCount: skillsArray.length || 0,
        cronJobs: tasks.length || 0,
      });
    } catch (error) {
      console.error("Failed to fetch about stats:", error);
    }
  };

  useEffect(() => {
    if (!initialSystemData) {
      fetchSystemData();
    }
    fetchAboutStats();
    const interval = setInterval(fetchSystemData, 30000);
    return () => clearInterval(interval);
  }, [initialSystemData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchSystemData();
    fetchAboutStats();
  };

  const agentName = BRANDING.agentName;
  const ownerUsername = BRANDING.ownerUsername;

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 flex items-center gap-2 md:gap-3"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            <Settings className="w-6 h-6 md:w-8 md:h-8" style={{ color: "var(--accent)" }} />
            {t("settings.title")}
          </h1>
          <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
            {t("settings.subtitle")}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {lastRefresh && activeTab === "system" && (
        <div className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          {t("settings.lastUpdated")}: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "system" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <SystemInfo data={systemData} />
            </div>

            <div>
              <IntegrationStatus integrations={systemData?.integrations || null} onRefresh={handleRefresh} />
            </div>

            <div>
              <QuickActions onActionComplete={handleRefresh} />
            </div>
          </div>
        </>
      )}

      {activeTab === "config" && <ConfigEditor />}

      {activeTab === "pricing" && <PricingEditor />}

      {activeTab === "about" && (
        <SettingsAboutSection
          systemData={systemData}
          aboutStats={aboutStats}
          realSkills={realSkills}
          agentName={agentName}
          ownerUsername={ownerUsername}
          uptime={uptime}
        />
      )}

      <div
        className="mt-6 md:mt-8 p-3 md:p-4 rounded-xl"
        style={{
          backgroundColor: "rgba(26, 26, 26, 0.5)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center justify-between text-sm" style={{ color: "var(--text-muted)" }}>
          <span>Alfred v1.0.0</span>
          <span>OpenClaw Agent Dashboard</span>
        </div>
      </div>
    </div>
  );
}