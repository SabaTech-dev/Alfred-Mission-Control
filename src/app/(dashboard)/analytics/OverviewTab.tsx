"use client";

import { BarChart3, TrendingUp, Clock, Target } from "lucide-react";
import { ActivityLineChart } from "@/components/charts/ActivityLineChart";
import { ActivityPieChart } from "@/components/charts/ActivityPieChart";
import { HourlyHeatmap } from "@/components/charts/HourlyHeatmap";
import { SuccessRateGauge } from "@/components/charts/SuccessRateGauge";
import { ScheduledTasksManager } from "@/components/ScheduledTasksManager";
import { useI18n } from "@/i18n/provider";
import type { AnalyticsData } from "@/lib/analytics-data";

interface OverviewTabProps {
  data: AnalyticsData;
}

export function OverviewTab({ data }: OverviewTabProps) {
  const { t } = useI18n();

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <div
          className="rounded-xl p-3 md:p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs md:text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("analytics.totalThisWeek")}</p>
          <p className="text-xl md:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {data.byDay.reduce((sum, d) => sum + d.count, 0)}
          </p>
        </div>
        <div
          className="rounded-xl p-3 md:p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs md:text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("analytics.mostActiveDay")}</p>
          <p className="text-xl md:text-2xl font-bold" style={{ color: "var(--accent)" }}>
            {data.byDay.reduce((max, d) => (d.count > max.count ? d : max), data.byDay[0])?.date || "-"}
          </p>
        </div>
        <div
          className="rounded-xl p-3 md:p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs md:text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("analytics.topActivityType")}</p>
          <p className="text-xl md:text-2xl font-bold capitalize" style={{ color: "var(--info)" }}>
            {data.byType[0]?.type || "-"}
          </p>
        </div>
        <div
          className="rounded-xl p-3 md:p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs md:text-sm mb-1" style={{ color: "var(--text-secondary)" }}>{t("analytics.successRate")}</p>
          <p className="text-xl md:text-2xl font-bold" style={{ color: "var(--success)" }}>
            {data.successRate.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div
          className="rounded-xl p-4 md:p-6"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" style={{ color: "var(--accent)" }} />
            <h2
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              {t("analytics.activityOverTime")}
            </h2>
          </div>
          <ActivityLineChart data={data.byDay} />
        </div>

        <div
          className="rounded-xl p-4 md:p-6"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" style={{ color: "var(--accent)" }} />
            <h2
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              {t("analytics.activityByType")}
            </h2>
          </div>
          <ActivityPieChart data={data.byType} />
        </div>

        <div
          className="rounded-xl p-4 md:p-6"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <Clock className="w-4 h-4 md:w-5 md:h-5" style={{ color: "var(--accent)" }} />
            <h2
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              {t("analytics.activityByHour")}
            </h2>
          </div>
          <HourlyHeatmap data={data.byHour} />
        </div>

        <div
          className="rounded-xl p-4 md:p-6"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <Target className="w-4 h-4 md:w-5 md:h-5" style={{ color: "var(--accent)" }} />
            <h2
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              {t("analytics.successRate")}
            </h2>
          </div>
          <SuccessRateGauge rate={data.successRate} />
        </div>
      </div>

      <div className="mt-6">
        <ScheduledTasksManager />
      </div>
    </>
  );
}
