"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutoRefreshOptions {
  /** Refresh interval in ms (default 30000) */
  intervalMs: number;
  /** Only refresh when tab is visible (default true) */
  pauseWhenHidden?: boolean;
  /** Enable/disable auto-refresh (default true) */
  enabled?: boolean;
}

/**
 * Smart auto-refresh hook.
 * - Pauses when tab is hidden/minimized
 * - Calls the provided callback on interval
 * - Exposes manual trigger and loading state
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  options: UseAutoRefreshOptions
) {
  const { intervalMs, pauseWhenHidden = true, enabled = true } = options;
  const callbackRef = useRef(callback);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep callback ref fresh
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await callbackRef.current();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let intervalId: ReturnType<typeof setInterval>;

    const startInterval = () => {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (pauseWhenHidden && document.visibilityState === "hidden") return;
        refresh();
      }, intervalMs);
    };

    startInterval();

    // Reset interval when tab becomes visible again (refresh immediately)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
        startInterval();
      }
    };

    if (pauseWhenHidden) {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      clearInterval(intervalId);
      if (pauseWhenHidden) {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [intervalMs, pauseWhenHidden, enabled, refresh]);

  return { refresh, isRefreshing };
}
