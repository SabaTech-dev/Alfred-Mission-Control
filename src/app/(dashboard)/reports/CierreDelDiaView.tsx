"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays, Moon, Sun, ChevronRight, Search, Filter, Clock,
  AlertTriangle, CheckCircle2, ArrowRight, Loader2, X
} from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";

interface ReportEntry {
  date: string;
  filename: string;
  title: string;
  summary: string;
  logros?: string[];
  bloqueos?: string[];
  nextSteps?: string[];
  advances?: string[];
  pendingDecisions?: string[];
  activeTasks?: { name: string; status: string; detail: string }[];
  suggestedAgenda?: string[];
  content: string;
  type: "cierre" | "agenda";
}

interface Stats {
  totalCierres: number;
  totalAgendas: number;
  dateRange: { earliest: string | null; latest: string | null };
  availableMonths: string[];
}

function formatFriendlyDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";

  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function CierreDelDiaView() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<ReportEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "cierre" | "agenda">("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterMonth !== "all") params.set("date", filterMonth);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/reports/daily-close?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReports(data.reports);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterMonth, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadFullContent = useCallback(async (entry: ReportEntry) => {
    setSelected(entry);
  }, []);

  // Group reports by date for timeline
  const grouped = reports.reduce<Record<string, ReportEntry[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort().reverse();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 md:p-4 flex-shrink-0"
        style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <CalendarDays className="w-5 h-5 md:w-6 md:h-6" style={{ color: "var(--accent)" }} />
          <div>
            <h1
              className="text-lg md:text-xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
            >
              Cierre del Día & Evening Agenda
            </h1>
            <p className="text-xs md:text-sm" style={{ color: "var(--text-secondary)" }}>
              {stats
                ? `${stats.totalCierres} cierres · ${stats.totalAgendas} agendas`
                : "Cargando..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: showFilters || filterType !== "all" || filterMonth !== "all" || searchQuery
                ? "var(--accent)" : "var(--card-elevated)",
              border: "1px solid var(--border)",
              color: showFilters || filterType !== "all" || filterMonth !== "all" || searchQuery
                ? "white" : "var(--text-primary)",
            }}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
          {(filterType !== "all" || filterMonth !== "all" || searchQuery) && (
            <button
              onClick={() => { setFilterType("all"); setFilterMonth("all"); setSearchQuery(""); }}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
              title="Limpiar filtros"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="flex flex-wrap items-center gap-2 p-3 flex-shrink-0"
          style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en cierres y agendas..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "all" | "cierre" | "agenda")}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">Todos</option>
            <option value="cierre">Cierre del Día</option>
            <option value="agenda">Evening Agenda</option>
          </select>
          {stats && stats.availableMonths.length > 0 && (
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">Todos los meses</option>
              {stats.availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Timeline */}
        <div
          className="w-full md:w-96 overflow-y-auto flex-shrink-0"
          style={{
            backgroundColor: "var(--card)",
            borderRight: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {isLoading && (
            <div className="flex items-center justify-center p-8" style={{ color: "var(--text-secondary)" }}>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando...
            </div>
          )}

          {!isLoading && reports.length === 0 && (
            <div className="p-6 text-center" style={{ color: "var(--text-muted)" }}>
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron cierres ni agendas</p>
              <p className="text-xs mt-1">Intenta ajustar los filtros</p>
            </div>
          )}

          {sortedDates.map((date) => (
            <div key={date}>
              {/* Date header */}
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--border)" }}
              >
                <Clock className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {formatFriendlyDate(date)}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {date}
                </span>
              </div>

              {/* Entries for this date */}
              <div className="px-2 py-1 space-y-1">
                {grouped[date].map((entry) => {
                  const isSelected = selected?.filename === entry.filename && selected?.date === entry.date;
                  const isCierre = entry.type === "cierre";
                  return (
                    <button
                      key={`${entry.type}-${entry.filename}`}
                      onClick={() => loadFullContent(entry)}
                      className="w-full text-left rounded-lg p-3 transition-all"
                      style={{
                        backgroundColor: isSelected ? "var(--accent)" : "transparent",
                        border: `1px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "var(--card-elevated, var(--background))";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {isCierre ? (
                          <Sun className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isSelected ? "white" : "#f59e0b" }} />
                        ) : (
                          <Moon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: isSelected ? "white" : "#8b5cf6" }} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.15)"
                                  : isCierre ? "rgba(245,158,11,0.1)" : "rgba(139,92,246,0.1)",
                                color: isSelected
                                  ? "white"
                                  : isCierre ? "#f59e0b" : "#8b5cf6",
                              }}
                            >
                              {isCierre ? "Cierre" : "Agenda"}
                            </span>
                          </div>
                          <p
                            className="font-medium text-sm mt-1 line-clamp-2"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {entry.title}
                          </p>

                          {/* Quick stats */}
                          {isCierre && entry.logros && entry.bloqueos && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {entry.logros.length > 0 && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "#22c55e" }}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  {entry.logros.length}
                                </span>
                              )}
                              {entry.bloqueos.length > 0 && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "#ef4444" }}>
                                  <AlertTriangle className="w-3 h-3" />
                                  {entry.bloqueos.length}
                                </span>
                              )}
                            </div>
                          )}

                          {!isCierre && entry.activeTasks && (
                            <div className="flex items-center gap-1 text-xs mt-1.5" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "var(--text-muted)" }}>
                              <ArrowRight className="w-3 h-3" />
                              {entry.activeTasks.length} tareas activas
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col" style={{ backgroundColor: "var(--background)" }}>
          {selected ? (
            <>
              {/* Detail header */}
              <div
                className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--card)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selected.type === "cierre" ? (
                    <Sun className="w-4 h-4 flex-shrink-0" style={{ color: "#f59e0b" }} />
                  ) : (
                    <Moon className="w-4 h-4 flex-shrink-0" style={{ color: "#8b5cf6" }} />
                  )}
                  <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {selected.title}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatFriendlyDate(selected.date)}
                  </span>
                </div>
              </div>

              {/* Quick summary cards for cierre */}
              {selected.type === "cierre" && (
                <div
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 flex-shrink-0"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {selected.logros && selected.logros.length > 0 && (
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-4 h-4" style={{ color: "#22c55e" }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: "#22c55e" }}>
                          Logros ({selected.logros.length})
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {selected.logros.slice(0, 5).map((l, i) => (
                          <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            • {l.length > 80 ? l.slice(0, 80) + "…" : l}
                          </li>
                        ))}
                        {selected.logros.length > 5 && (
                          <li className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                            +{selected.logros.length - 5} más
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  {selected.bloqueos && selected.bloqueos.length > 0 && (
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: "#ef4444" }}>
                          Bloqueos ({selected.bloqueos.length})
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {selected.bloqueos.slice(0, 5).map((b, i) => (
                          <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            • {b.length > 80 ? b.slice(0, 80) + "…" : b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selected.nextSteps && selected.nextSteps.length > 0 && (
                    <div
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowRight className="w-4 h-4" style={{ color: "#3b82f6" }} />
                        <span className="text-xs font-semibold uppercase" style={{ color: "#3b82f6" }}>
                          Next Steps ({selected.nextSteps.length})
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {selected.nextSteps.slice(0, 5).map((n, i) => (
                          <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            • {n.length > 80 ? n.slice(0, 80) + "…" : n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Quick summary for agenda */}
              {selected.type === "agenda" && selected.activeTasks && selected.activeTasks.length > 0 && (
                <div
                  className="p-3 flex-shrink-0"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-secondary)" }}>
                    Tareas Activas ({selected.activeTasks.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.activeTasks.map((task, i) => {
                      const statusColor = task.status.includes("REVIEW") ? "#f59e0b"
                        : task.status.includes("IN_PROGRESS") ? "#3b82f6"
                        : task.status.includes("DONE") ? "#22c55e"
                        : task.status.includes("BACKLOG") ? "#6b7280"
                        : task.status.includes("WAITING") ? "#a855f7"
                        : "var(--text-muted)";
                      return (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: `${statusColor}15`,
                            border: `1px solid ${statusColor}30`,
                            color: statusColor,
                          }}
                        >
                          {task.name} {task.status && `(${task.status})`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full markdown content */}
              <div className="flex-1 min-h-0 overflow-auto p-4">
                <MarkdownPreview content={selected.content} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
              <div className="text-center">
                <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Selecciona un cierre o agenda</p>
                <p className="text-sm mt-1">Timeline de cierres del día y agendas nocturnas</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
