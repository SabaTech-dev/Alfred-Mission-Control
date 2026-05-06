"use client";

import { useState, useEffect } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Filter } from "lucide-react";

export default function ActivityClient() {
  const [filter, setFilter] = useState<"all" | "success" | "error" | "pending">("all");
  const [agent, setAgent] = useState("all");

  // Reload when filter changes
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setReloadKey((prev) => prev + 1);
  }, [filter, agent]);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
        >
          Activity Feed
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Monitoriza la actividad de todos los agentes
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Filtrar por estado:
          </span>
        </div>
        <button
          onClick={() => setFilter("all")}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: filter === "all" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "all" ? "white" : "var(--text-secondary)",
            border: filter === "all" ? "none" : "1px solid var(--border)",
          }}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter("success")}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: filter === "success" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "success" ? "white" : "var(--text-secondary)",
            border: filter === "success" ? "none" : "1px solid var(--border)",
          }}
        >
          Exitosos
        </button>
        <button
          onClick={() => setFilter("error")}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: filter === "error" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "error" ? "white" : "var(--text-secondary)",
            border: filter === "error" ? "none" : "1px solid var(--border)",
          }}
        >
          Errores
        </button>
        <button
          onClick={() => setFilter("pending")}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: filter === "pending" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "pending" ? "white" : "var(--text-secondary)",
            border: filter === "pending" ? "none" : "1px solid var(--border)",
          }}
        >
          Pendientes
        </button>
      </div>

      {/* Heatmap */}
      <div className="mb-6">
        <ActivityHeatmap />
      </div>

      {/* Feed */}
      <div className="rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <ActivityFeed key={reloadKey} limit={50} status={filter === "all" ? undefined : filter} />
      </div>
    </div>
  );
}
