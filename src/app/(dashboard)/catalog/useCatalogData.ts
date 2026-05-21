"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  CatalogData,
  InventoryData,
  CatalogTab,
  ServiceCategory,
} from "@/lib/catalog-types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function useCatalogData() {
  const [tab, setTab] = useState<CatalogTab>("services");
  const [data, setData] = useState<CatalogData | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<
    ServiceCategory | "all"
  >("all");
  const [skillSearch, setSkillSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchCatalog = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/catalog");
      const d = await res.json();
      setData(d);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error loading catalog:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog/inventory");
      const d = await res.json();
      setInventory(d);
    } catch (err) {
      console.error("Error loading inventory:", err);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchCatalog(true);
    fetchInventory();
  }, [fetchCatalog, fetchInventory]);

  useEffect(() => {
    Promise.all([fetchCatalog(true), fetchInventory()]);
  }, [fetchCatalog, fetchInventory]);

  useEffect(() => {
    const interval = setInterval(() => fetchCatalog(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCatalog]);

  return {
    tab,
    setTab,
    data,
    inventory,
    expanded,
    setExpanded,
    filterCategory,
    setFilterCategory,
    skillSearch,
    setSkillSearch,
    loading,
    refreshing,
    lastRefresh,
    refresh,
  };
}
