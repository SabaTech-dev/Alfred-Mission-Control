"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Loader2,
  Filter,
  X,
} from "lucide-react";

import {
  type RunHistoryEntry,
  type UseRunHistoryReturn,
  formatHistoryDate,
  formatDuration,
} from "@/hooks/useRunHistory";

interface CronRunHistorySectionProps {
  history: UseRunHistoryReturn;
}

export function CronRunHistorySection({ history }: CronRunHistorySectionProps) {
  const {
    runHistory,
    loadingHistory,
    historyTotal,
    statusFilter,
    fromDate,
    toDate,
    setStatusFilter,
    setFromDate,
    setToDate,
    handleApplyFilters,
    handleClearFilters,
  } = history;

  return (
    <div
      style={{
        marginTop: "0.75rem",
        backgroundColor: "var(--card-elevated)",
        borderRadius: "0.5rem",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.5rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        <History className="w-3.5 h-3.5" />
        Recent Runs
        {historyTotal > 0 && (
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            ({historyTotal} total)
          </span>
        )}
        {loadingHistory && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
      </div>

      {/* Filters */}
      <div
        style={{
          padding: "0.5rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.1)",
        }}
      >
        <Filter className="w-3 h-3" style={{ color: "var(--text-muted)" }} />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.25rem 0.5rem",
            fontSize: "0.7rem",
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.25rem",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <option value="">All status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
        </select>

        {/* From date */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          placeholder="From"
          style={{
            padding: "0.25rem 0.5rem",
            fontSize: "0.7rem",
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.25rem",
            color: "var(--text-primary)",
            width: "auto",
          }}
        />

        {/* To date */}
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          placeholder="To"
          style={{
            padding: "0.25rem 0.5rem",
            fontSize: "0.7rem",
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.25rem",
            color: "var(--text-primary)",
            width: "auto",
          }}
        />

        {/* Apply button */}
        <button
          onClick={handleApplyFilters}
          style={{
            padding: "0.25rem 0.5rem",
            fontSize: "0.7rem",
            backgroundColor: "var(--accent)",
            color: "#000",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Apply
        </button>

        {/* Clear button */}
        {(statusFilter || fromDate || toDate) && (
          <button
            onClick={handleClearFilters}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.7rem",
              backgroundColor: "transparent",
              color: "var(--text-muted)",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {!loadingHistory && runHistory.length === 0 && (
        <div
          style={{
            padding: "0.75rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          {statusFilter || fromDate || toDate
            ? "No runs match filters"
            : "No run history available"}
        </div>
      )}

      {/* Run list */}
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {runHistory.map((run: RunHistoryEntry, idx: number) => (
          <div
            key={run.id || idx}
            style={{
              padding: "0.5rem 0.75rem",
              borderBottom:
                idx < runHistory.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            {run.status === "success" ? (
              <CheckCircle2
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "var(--success)" }}
              />
            ) : run.status === "error" ? (
              <XCircle
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "var(--error)" }}
              />
            ) : (
              <Clock
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "var(--warning)" }}
              />
            )}
            <span style={{ color: "var(--text-secondary)", flex: 1 }}>
              {formatHistoryDate(run.startedAt)}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {formatDuration(run.durationMs)}
            </span>
            {run.error && (
              <span
                style={{
                  color: "var(--error)",
                  maxWidth: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={run.error}
              >
                {run.error}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
