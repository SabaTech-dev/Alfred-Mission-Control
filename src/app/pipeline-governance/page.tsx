/**
 * Pipeline Governance Dashboard
 *
 * Displays Kanban metrics and governance status
 */

"use client";

import { useEffect, useState } from "react";

interface Metrics {
  summary: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    blockedTasks: number;
  };
  statusMetrics: {
    [status: string]: {
      count: number;
      avgTimeMs: number;
      avgTimeHuman: string;
      maxTimeMs: number;
      maxTimeHuman: string;
    };
  };
  stuckTasks: {
    id: string;
    title: string;
    status: string;
    assignee: string | null;
    timeInStatusMs: number;
    timeInStatusHuman: string;
    thresholdMs: number;
    thresholdHuman: string;
  }[];
  specialistMetrics: {
    [specialist: string]: {
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      avgCompletionTimeMs: number;
      avgCompletionTimeHuman: string;
      throughputPerDay: number;
    };
  };
  cycleTime: {
    overall: number;
    byType: {
      [type: string]: number;
    };
  };
}

export default function PipelineGovernanceDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEnforce, setLastEnforce] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/kanban/metrics?days=7");
      if (!response.ok) {
        throw new Error("Failed to load metrics");
      }

      const data = await response.json();
      setMetrics(data);
      setLastEnforce(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runAutoEnforce = async () => {
    try {
      const response = await fetch("/api/kanban/auto-enforce", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to run auto-enforce");
      }

      const result = await response.json();
      alert(`Auto-enforce completado: ${result.summary.pings} pings, ${result.summary.escalates} escalados, ${result.summary.comments} comentarios`);
      loadMetrics();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Error al cargar métricas"}</p>
          <button
            onClick={loadMetrics}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de Gobernanza del Pipeline
            </h1>
            <p className="text-gray-600 mt-1">
              Última actualización: {lastEnforce}
            </p>
          </div>
          <div className="space-x-3">
            <button
              onClick={loadMetrics}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Actualizar
            </button>
            <button
              onClick={runAutoEnforce}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Ejecutar Auto-Enforce
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Tareas"
            value={metrics.summary.totalTasks}
            color="blue"
          />
          <SummaryCard
            title="Activas"
            value={metrics.summary.activeTasks}
            color="green"
          />
          <SummaryCard
            title="Completadas"
            value={metrics.summary.completedTasks}
            color="purple"
          />
          <SummaryCard
            title="Bloqueadas"
            value={metrics.summary.blockedTasks}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Métricas por Estado</h2>
            <div className="space-y-4">
              {Object.entries(metrics.statusMetrics).map(([status, data]) => (
                <div key={status} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium capitalize">{status}</span>
                    <span className="text-gray-600">{data.count} tareas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Tiempo medio:</span>{" "}
                      <span className="font-medium">{data.avgTimeHuman}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tiempo máx:</span>{" "}
                      <span className="font-medium">{data.maxTimeHuman}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stuck Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Tareas Estancadas ({metrics.stuckTasks.length})
            </h2>
            {metrics.stuckTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sin tareas estancadas 🎉</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {metrics.stuckTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-red-200 rounded-lg p-4 bg-red-50"
                  >
                    <div className="font-medium text-sm mb-1">{task.title}</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Estado:</span> {task.status}
                      </div>
                      <div>
                        <span className="font-medium">Asignado:</span>{" "}
                        {task.assignee || "sin asignar"}
                      </div>
                      <div>
                        <span className="font-medium">Tiempo en estado:</span>{" "}
                        <span className="text-red-600 font-semibold">
                          {task.timeInStatusHuman}
                        </span>{" "}
                        (umbral: {task.thresholdHuman})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Specialist Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Métricas por Especialista</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(metrics.specialistMetrics).map(
                ([specialist, data]) => (
                  <div key={specialist} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">{specialist}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {data.throughputPerDay.toFixed(2)} tareas/día
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Total:</span>{" "}
                        <span className="font-medium">{data.totalTasks}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Hechas:</span>{" "}
                        <span className="font-medium">{data.completedTasks}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">En Progreso:</span>{" "}
                        <span className="font-medium">
                          {data.inProgressTasks}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs mt-2">
                      <span className="text-gray-500">Tiempo medio:</span>{" "}
                      <span className="font-medium">
                        {data.avgCompletionTimeHuman}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Cycle Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tiempo de Ciclo</h2>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <div className="text-sm text-gray-500 mb-1">Global</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatDuration(metrics.cycleTime.overall)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-2">Por Prioridad</div>
                <div className="space-y-2">
                  {Object.entries(metrics.cycleTime.byType).map(
                    ([type, time]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center"
                      >
                        <span className="capitalize text-sm">{type}</span>
                        <span className="font-medium text-sm">
                          {formatDuration(time)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    red: "bg-red-500",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className={`h-2 ${colorClasses[color as keyof typeof colorClasses]} rounded mt-3`}></div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
