"use client";

import {
  Activity,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";

import { StatsCard } from "@/components/StatsCard";
import { WeatherWidget } from "@/components/WeatherWidget";
import { useI18n } from "@/i18n/provider";

interface DashboardStatsCardsProps {
  totalActivities: number;
  todayActivities: number;
  successfulActivities: number;
  failedActivities: number;
}

export function DashboardStatsCards({
  totalActivities,
  todayActivities,
  successfulActivities,
  failedActivities,
}: DashboardStatsCardsProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4 md:mb-6">
      <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          title={t("dashboard.totalActivities")}
          value={totalActivities.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          iconColor="var(--info)"
        />
        <StatsCard
          title={t("dashboard.today")}
          value={todayActivities.toLocaleString()}
          icon={<Zap className="w-5 h-5" />}
          iconColor="var(--accent)"
        />
        <StatsCard
          title={t("dashboard.successful")}
          value={successfulActivities.toLocaleString()}
          icon={<CheckCircle className="w-5 h-5" />}
          iconColor="var(--success)"
        />
        <StatsCard
          title={t("dashboard.errors")}
          value={failedActivities.toLocaleString()}
          icon={<XCircle className="w-5 h-5" />}
          iconColor="var(--error)"
        />
      </div>

      <div className="lg:col-span-1">
        <WeatherWidget />
      </div>
    </div>
  );
}
