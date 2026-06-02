"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, RefreshCw, Search, AlertTriangle } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { SessionListItem } from "@/operations/sessions-list-ops";

import { FilterType } from "./SessionsTypes";
import { SessionDetail } from "./SessionDetail";
import { SessionRow } from "./SessionRow";
import { SessionsFilterTabs } from "./SessionsFilterTabs";
import { SessionsStats } from "./SessionsStats";
import { SessionsTableHeader } from "./SessionsTableHeader";
import { authFetch } from "@/lib/auth-fetch";

export default function SessionsClient({ initialSessions }: { initialSessions: SessionListItem[] }) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<SessionListItem[]>(initialSessions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setError(t("sessions.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const handleModelChanged = useCallback((sessionId: string, newModel: string) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, model: newModel } : s)));
  }, []);

  const filtered = sessions.filter((s) => {
    if (filter !== "all" && s.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.key.toLowerCase().includes(q) && !s.model.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div style={{ padding: "1.5rem 2rem", minHeight: "100vh" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-1px",
              marginBottom: "0.25rem",
            }}
          >
            {t("sessions.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{t("sessions.subtitle")}</p>
        </div>

        <SessionsStats sessions={sessions} counts={counts} />

        <div
          style={{
            borderRadius: "0.75rem",
            overflow: "hidden",
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid var(--border)",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <SessionsFilterTabs filter={filter} counts={counts} onFilterChange={setFilter} />

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <Search style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter sessions..."
                  style={{
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                    width: "160px",
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setLoading(true);
                  loadSessions();
                }}
                style={{
                  padding: "0.375rem",
                  borderRadius: "0.5rem",
                  background: "var(--card-elevated)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Refresh"
              >
                <RefreshCw style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          <SessionsTableHeader />

          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3rem",
                gap: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid var(--accent)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Loading sessions...
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1.5rem",
                color: "var(--error)",
              }}
            >
              <AlertTriangle style={{ width: "16px", height: "16px" }} />
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--text-muted)",
              }}
            >
              <MessageSquare style={{ width: "40px", height: "40px", margin: "0 auto 0.75rem", opacity: 0.3 }} />
              <p>No sessions match your filter</p>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onClick={() => setSelectedSession(session)}
                onModelChanged={handleModelChanged}
              />
            ))}
        </div>
      </div>

      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
