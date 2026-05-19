/**
 * Sync status badge component
 */
import { GitFork, RefreshCw } from "lucide-react";
import { formatDate } from "../utils/wikiUtils";
import { SyncStatus } from "../types";

interface SyncBadgeProps {
  syncStatus: SyncStatus | null;
  isSyncing: boolean;
  onSync: () => void;
}

export function SyncBadge({ syncStatus, isSyncing, onSync }: SyncBadgeProps) {
  if (!syncStatus) return null;

  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <button
      onClick={onSync}
      disabled={isSyncing}
      title={isSyncing ? "Syncing..." : "Click to sync"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "12px",
        backgroundColor: `${colors[syncStatus.status]}20`,
        border: `1px solid ${colors[syncStatus.status]}`,
        cursor: isSyncing ? "not-allowed" : "pointer",
        fontSize: "11px",
        fontWeight: 500,
        color: `var(--${syncStatus.status === "green" ? "green" : syncStatus.status === "yellow" ? "yellow" : "red"}-400)`,
      }}
    >
      <GitFork size={12} style={{ color: `var(--${syncStatus.status === "green" ? "green" : syncStatus.status === "yellow" ? "yellow" : "red"}-400)` }} />
      <span>{syncStatus.lastSync ? formatDate(syncStatus.lastSync) : "Never"}</span>
      {isSyncing && <RefreshCw size={10} className="animate-spin" />}
    </button>
  );
}