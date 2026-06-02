"use client";

import { useState, useEffect } from "react";
import { FolderOpen, MoreVertical, Calendar, CheckCircle, Circle } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";

export interface ProjectWithStats {
  id: string;
  name: string;
  description: string | null;
  missionAlignment: string | null;
  status: string;
  milestones: unknown[];
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  progress: number;
}

export interface ProjectsInitialData {
  projects: ProjectWithStats[];
}

export default function ProjectsClient({ initialData }: { initialData?: ProjectsInitialData }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<ProjectWithStats[]>(initialData?.projects ?? []);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "paused">("all");
  const [loading, setLoading] = useState(!initialData?.projects);

  useEffect(() => {
    if (!initialData?.projects) {
      authFetch("/api/projects")
        .then((res) => res.json())
        .then((data) => {
          if (data.projects) {
            setProjects(data.projects as ProjectWithStats[]);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initialData]);

  const filteredProjects = projects.filter((project) => {
    if (filter === "all") return true;
    if (filter === "active") return project.status === "active";
    if (filter === "completed") return project.status === "completed";
    if (filter === "paused") return project.status === "paused";
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "var(--accent)";
      case "completed":
        return "var(--success)";
      case "paused":
        return "var(--info)";
      default:
        return "var(--text-muted)";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "Activo";
      case "completed":
        return "Completado";
      case "paused":
        return "Pausado";
      default:
        return status;
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
          >
            Proyectos
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Gestiona todos tus proyectos y su progreso
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: filter === "all" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "all" ? "white" : "var(--text-secondary)",
            border: filter === "all" ? "none" : "1px solid var(--border)",
          }}
        >
          Todos ({projects.length})
        </button>
        <button
          onClick={() => setFilter("active")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: filter === "active" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "active" ? "white" : "var(--text-secondary)",
            border: filter === "active" ? "none" : "1px solid var(--border)",
          }}
        >
          Activos
        </button>
        <button
          onClick={() => setFilter("completed")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: filter === "completed" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "completed" ? "white" : "var(--text-secondary)",
            border: filter === "completed" ? "none" : "1px solid var(--border)",
          }}
        >
          Completados
        </button>
        <button
          onClick={() => setFilter("paused")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: filter === "paused" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "paused" ? "white" : "var(--text-secondary)",
            border: filter === "paused" ? "none" : "1px solid var(--border)",
          }}
        >
          Pausados
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <div className="animate-pulse text-lg">Cargando proyectos...</div>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && filteredProjects.length === 0 ? (
        <div
          className="text-center py-20 rounded-xl"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-muted)" }}
        >
          <FolderOpen
            style={{
              width: "48px",
              height: "48px",
              color: "var(--text-muted)",
              margin: "0 auto 16px",
            }}
          />
          <p>No se encontraron proyectos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl p-5 transition-all hover:shadow-lg"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3
                    className="font-semibold text-lg mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {project.name}
                  </h3>
                  <div
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: getStatusColor(project.status) + "20",
                      color: getStatusColor(project.status),
                    }}
                  >
                    {getStatusLabel(project.status)}
                  </div>
                </div>
                <button className="text-muted hover:opacity-70">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              {project.description && (
                <p
                  className="text-sm mb-4 line-clamp-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {project.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm mb-4">
                <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Circle className="w-4 h-4" />
                  <span>{project.taskCount} tareas</span>
                </div>
                <div className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                  <CheckCircle className="w-4 h-4" />
                  <span>{project.progress}% completo</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                className="w-full h-2 rounded-full mb-3"
                style={{ backgroundColor: "var(--card-elevated)" }}
              >
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${project.progress}%`,
                    backgroundColor: getStatusColor(project.status),
                  }}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Actualizado: {new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
