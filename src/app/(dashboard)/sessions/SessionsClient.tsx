"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Hash, Clock, Bot, RefreshCw, Search, AlertTriangle } from "lucide-react";
import { ModelDropdown } from "@/components/ModelDropdown";
import { useI18n } from "@/i18n/provider";
import { SessionListItem, SessionMessage } from "@/operations/sessions-list-ops";
import { FilterType } from "./SessionsTypes";
import { MessageBubble } from "./MessageBubble";
import { SessionDetail } from "./SessionDetail";
import { SessionRow } from "./SessionRow";
import { SessionsFilterTabs } from "./SessionsFilterTabs";

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
      const res = await fetch("/api/sessions");
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

  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const uniqueModels = [...new Set(sessions.map((s) => s.model))];

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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {[
            {
              labelKey: "sessions.totalSessions",
              value: sessions.length,
              icon: MessageSquare,
              color: "var(--accent)",
            },
            {
              labelKey: "sessions.totalTokens",
              value: totalTokens >= 1_000_000 ? `${(totalTokens / 1_000_000).toFixed(1)}M` : totalTokens >= 1_000 ? `${(totalTokens / 1_000).toFixed(0)}k` : String(totalTokens),
              icon: Hash,
              color: "#60a5fa",
            },
            {
              labelKey: "sessions.cronRuns",
              value: counts.cron || 0,
              icon: Clock,
              color: "#a78bfa",
            },
            {
              labelKey: "sessions.modelsUsed",
              value: uniqueModels.length,
              icon: Bot,
              color: "#4ade80",
            },
          ].map(({ labelKey, value, icon: Icon, color }) => (
            <div
              key={labelKey}
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "0.5rem",
                  backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: "18px", height: "18px", color }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  {value}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t(labelKey)}</div>
              </div>
            </div>
          ))}
        </div>

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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 1rem",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--card-elevated)",
            }}
          >
            <div style={{ width: "32px", flexShrink: 0 }} />
            <div
              style={{
                flex: 1,
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Session
            </div>
            <div
              style={{
                minWidth: "100px",
                textAlign: "right",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Tokens / ctx
            </div>
            <div
              style={{
                minWidth: "80px",
                textAlign: "right",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Updated
            </div>
            <div style={{ width: "14px", flexShrink: 0 }} />
          </div>

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