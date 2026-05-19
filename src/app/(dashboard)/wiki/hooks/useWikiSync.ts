/**
 * Custom hook for Wiki sync operations
 */
import { useState, useCallback } from "react";
import { SyncStatus } from "../types";

interface UseWikiSyncResult {
  syncStatus: SyncStatus | null;
  isSyncing: boolean;
  handleSync: (onComplete?: () => Promise<void>) => Promise<void>;
  handleSyncStatus: () => Promise<void>;
}

export function useWikiSync(): UseWikiSyncResult {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(async (onComplete?: () => Promise<void>) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/wiki/sync", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync");
      const data = await res.json();
      setSyncStatus({
        status: "green",
        lastSync: data.lastSync,
      });
      if (onComplete) {
        await onComplete();
      }
    } catch (error) {
      console.error("Failed to sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/wiki/sync");
      if (!res.ok) throw new Error("Failed to get sync status");
      const data = await res.json();
      setSyncStatus(data);
    } catch (error) {
      console.error("Failed to get sync status:", error);
    }
  }, []);

  return {
    syncStatus,
    isSyncing,
    handleSync,
    handleSyncStatus,
  };
}