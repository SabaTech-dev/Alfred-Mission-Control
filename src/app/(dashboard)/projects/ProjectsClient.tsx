"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen, MoreVertical, Calendar, CheckCircle, Circle,
  Plus, Pencil, Trash2, X, Target,
} from "lucide-react";
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

interface ProjectFormData {
  name: string;
  description: string;
  missionAlignment: string;
  status: string;
}

const emptyForm: ProjectFormData = {
  name: "",
  description: "",
  missionAlignment: "",
  status: "active",
};

export default function ProjectsClient({ initialData }: { initialData?: ProjectsInitialData }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<ProjectWithStats[]>(initialData?.projects ?? []);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "paused">("all");
  const [loading, setLoading] = useState(!initialData?.projects);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<ProjectWithStats | null>(null);
  const [showDelete, setShowDelete] = useState<ProjectWithStats | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData?.projects) {
      authFetch("/api/projects")
        .then((res) => res.json())
        .then((data) => {
          if (data.projects) setProjects(data.projects as ProjectWithStats[]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [initialData]);

  // Close menus on outside click
  useEffect(() => {
    if (menuOpen) {
      const handler = () => setMenuOpen(null);
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [menuOpen]);

  const filteredProjects = projects.filter((project) => {
    if (filter === "all") return true;
    return project.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "var(--accent)";
      case "completed": return "var(--success)";
      case "paused": return "var(--info)";
      default: return "var(--text-muted)";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "Activo";
      case "completed": return "Completado";
      case "paused": return "Pausado";
      default: return status;
    }
  };

  const openCreate = () => {
    setFormData(emptyForm);
    setShowCreate(true);
  };

  const openEdit = (project: ProjectWithStats) => {
    setFormData({
      name: project.name,
      description: project.description || "",
      missionAlignment: project.missionAlignment || "",
      status: project.status,
    });
    setShowEdit(project);
    setMenuOpen(null);
  };

  const openDelete = (project: ProjectWithStats) => {
    setShowDelete(project);
    setMenuOpen(null);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setShowCreate(false);
        setFormData(emptyForm);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit || !formData.name.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/projects/${showEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((prev) => prev.map((p) => (p.id === showEdit.id ? data.project : p)));
        setShowEdit(null);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setSaving(true);
    try {
      await authFetch(`/api/projects/${showDelete.id}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== showDelete.id));
      setShowDelete(null);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  // Modal shared styles
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    backgroundColor: "var(--input-bg, var(--card-elevated))",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "6px",
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Proyectos
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Gestiona todos tus proyectos y su progreso
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "active", "completed", "paused"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: filter === f ? "var(--accent)" : "var(--card-elevated)",
              color: filter === f ? "white" : "var(--text-secondary)",
              border: filter === f ? "none" : "1px solid var(--border)",
            }}
          >
            {f === "all" ? `Todos (${projects.length})` : getStatusLabel(f)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <div className="animate-pulse text-lg">Cargando proyectos...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-20 rounded-xl" style={{ backgroundColor: "var(--surface)", color: "var(--text-muted)" }}>
          <FolderOpen style={{ width: "48px", height: "48px", color: "var(--text-muted)", margin: "0 auto 16px" }} />
          <p>No se encontraron proyectos</p>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl p-5 transition-all hover:shadow-lg relative"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                    {project.name}
                  </h3>
                  <div
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: getStatusColor(project.status) + "20", color: getStatusColor(project.status) }}
                  >
                    {getStatusLabel(project.status)}
                  </div>
                </div>
                {/* Context Menu */}
                <div className="relative">
                  <button
                    className="p-1 rounded hover:opacity-70"
                    style={{ color: "var(--text-muted)" }}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === project.id ? null : project.id); }}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {menuOpen === project.id && (
                    <div
                      className="absolute right-0 top-8 w-40 rounded-lg shadow-lg z-50 py-1"
                      style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80"
                        style={{ color: "var(--text-primary)" }}
                        onClick={() => openEdit(project)}
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80"
                        style={{ color: "var(--error, #ef4444)" }}
                        onClick={() => openDelete(project)}
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {project.description}
                </p>
              )}

              {/* Mission Alignment */}
              {project.missionAlignment && (
                <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  <Target className="w-3.5 h-3.5" />
                  <span>{project.missionAlignment}</span>
                </div>
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
              <div className="w-full h-2 rounded-full mb-3" style={{ backgroundColor: "var(--card-elevated)" }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${project.progress}%`, backgroundColor: getStatusColor(project.status) }}
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

      {/* ===== CREATE MODAL ===== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 mx-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Nuevo Proyecto</h2>
              <button onClick={() => { setShowCreate(false); setFormData(emptyForm); }} style={{ color: "var(--text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  style={inputStyle}
                  placeholder="Nombre del proyecto"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea
                  style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                  placeholder="Descripción breve..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Alineación con Misión</label>
                <input
                  style={inputStyle}
                  placeholder="Ej: QA-FRAMEWORK MVP"
                  value={formData.missionAlignment}
                  onChange={(e) => setFormData({ ...formData, missionAlignment: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select
                  style={inputStyle}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Completado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setFormData(emptyForm); }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "white" }}
              >
                {saving ? "Creando..." : "Crear Proyecto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 mx-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Editar Proyecto</h2>
              <button onClick={() => setShowEdit(null)} style={{ color: "var(--text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  style={inputStyle}
                  placeholder="Nombre del proyecto"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea
                  style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                  placeholder="Descripción breve..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Alineación con Misión</label>
                <input
                  style={inputStyle}
                  placeholder="Ej: QA-FRAMEWORK MVP"
                  value={formData.missionAlignment}
                  onChange={(e) => setFormData({ ...formData, missionAlignment: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select
                  style={inputStyle}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Activo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Completado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEdit(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || !formData.name.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "white" }}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION ===== */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 mx-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Eliminar Proyecto</h2>
              <button onClick={() => setShowDelete(null)} style={{ color: "var(--text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
              ¿Estás seguro de que quieres eliminar <strong>{showDelete.name}</strong>?
            </p>
            {showDelete.taskCount > 0 && (
              <p className="text-xs mb-4" style={{ color: "var(--warning, #f59e0b)" }}>
                ⚠️ Este proyecto tiene {showDelete.taskCount} tareas que quedarán sin proyecto asignado.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--error, #ef4444)", color: "white" }}
              >
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
