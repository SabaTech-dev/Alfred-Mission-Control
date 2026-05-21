"use client";

import { useCallback, useEffect, useState } from "react";
import type { CostData } from "@/lib/costs-data";
import type { Tab } from "./types";

export function useAnalyticsData(initialCostData: CostData | null) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [collecting, setCollecting] = useState(false);

  const [costData, setCostData] = useState<CostData | null>(initialCostData);
  const [costLoading, setCostLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    const triggerCollection = async () => {
      setCollecting(true);
      try {
        await fetch("/api/collect-usage", { method: "POST" });
      } catch (error) {
        console.warn("Auto-collection failed:", error);
      } finally {
        setCollecting(false);
      }
    };

    triggerCollection();
  }, []);

  const fetchCostData = useCallback(async () => {
    setCostLoading(true);
    try {
      const res = await fetch(`/api/costs?timeframe=${timeframe}`);
      if (res.ok) {
        const cData = await res.json();
        setCostData(cData);
      }
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    } finally {
      setCostLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    if (activeTab === "costs") {
      fetchCostData();
    }
  }, [activeTab, timeframe, fetchCostData]);

  const saveBudget = useCallback(async () => {
    const newBudget = parseFloat(budgetInput);
    if (isNaN(newBudget) || newBudget <= 0) return;

    setSavingBudget(true);
    try {
      const res = await fetch("/api/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: newBudget }),
      });
      if (res.ok) {
        const responseData = await res.json();
        if (costData) {
          setCostData({ ...costData, budget: responseData.budget });
        }
        setEditingBudget(false);
      }
    } catch (error) {
      console.error("Failed to save budget:", error);
    } finally {
      setSavingBudget(false);
    }
  }, [budgetInput, costData]);

  return {
    activeTab,
    setActiveTab,
    collecting,
    costData,
    costLoading,
    timeframe,
    setTimeframe,
    editingBudget,
    setEditingBudget,
    budgetInput,
    setBudgetInput,
    savingBudget,
    fetchCostData,
    saveBudget,
  };
}
