"use client";

import { useMemo } from "react";
import { type Opportunity } from "@/lib/pipeline-types";
import type { FilteredKPIs } from "./PipelineTypes";

export function usePipelineKPIs(opps: Opportunity[]): FilteredKPIs {
  return useMemo(() => {
    const active = opps.filter((o) => o.stage !== "won" && o.stage !== "lost");
    const won = opps.filter((o) => o.stage === "won");
    const lost = opps.filter((o) => o.stage === "lost");

    const totalPipelineValue = active.reduce((s, o) => s + o.value, 0);
    const wonValue = won.reduce((s, o) => s + o.value, 0);

    // Avg cycle time: mean days from created_at to closed_at for won deals
    let avgCycleTimeDays = 0;
    const closedWithDates = won.filter((o) => o.closed_at && o.created_at);
    if (closedWithDates.length > 0) {
      const totalDays = closedWithDates.reduce((s, o) => {
        const created = new Date(o.created_at).getTime();
        const closed = new Date(o.closed_at!).getTime();
        return s + (closed - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgCycleTimeDays = Math.round(totalDays / closedWithDates.length);
    }

    const wonCount = won.length;
    const lostCount = lost.length;
    const winRate = wonCount + lostCount > 0 ? wonCount / (wonCount + lostCount) : 0;

    return {
      totalOpportunities: opps.length,
      totalPipelineValue,
      avgCycleTimeDays,
      wonCount,
      wonValue,
      lostCount,
      winRate,
    };
  }, [opps]);
}
