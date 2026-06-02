"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { KanbanTask, KanbanColumn } from "@/lib/kanban-db";

export type ExecutionFilter = "all" | "running" | "success" | "error" | "pending" | "none";
export type ArchiveView = "active" | "archived";

export interface KanbanInitialData {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  configuredAgents: string[];
  domains: { id: string; name: string }[];
}

export interface TaskCounts {
  all: number;
  running: number;
  success: number;
  error: number;
  pending: number;
  none: number;
}

export function useKanbanData(initialData: KanbanInitialData) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialData.columns);
  const [tasks, setTasks] = useState<KanbanTask[]>(initialData.tasks);
  const [executionFilter, setExecutionFilter] = useState<ExecutionFilter>("all");
  const [archiveView, setArchiveView] = useState<ArchiveView>("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [configuredAgents] = useState<string[]>(initialData.configuredAgents);
  const [createdByFilter, setCreatedByFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [domains] = useState<{ id: string; name: string }[]>(initialData.domains);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [columnsRes, tasksRes] = await Promise.all([
        fetch("/api/kanban/columns"),
        fetch(`/api/kanban/tasks?view=${archiveView}`),
      ]);

      if (!columnsRes.ok || !tasksRes.ok) {
        throw new Error("Failed to fetch kanban data");
      }

      const columnsData = await columnsRes.json();
      const tasksData = await tasksRes.json();

      setColumns(columnsData.columns || []);
      setTasks(tasksData.tasks || []);
    } catch (err) {
      console.error("Failed to fetch kanban data:", err);
      setError(err instanceof Error ? err.message : "Failed to load kanban board");
    } finally {
      setLoading(false);
    }
  }, [archiveView]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [archiveView, fetchData]);

  const filteredTasks = useMemo(() => {
    if (executionFilter === "all") return tasks;
    if (executionFilter === "none") return tasks.filter((t) => !t.executionStatus);
    return tasks.filter((t) => t.executionStatus === executionFilter);
  }, [tasks, executionFilter]);

  const taskCounts = useMemo<TaskCounts>(() => {
    return {
      all: tasks.length,
      running: tasks.filter((t) => t.executionStatus === "running").length,
      success: tasks.filter((t) => t.executionStatus === "success").length,
      error: tasks.filter((t) => t.executionStatus === "error").length,
      pending: tasks.filter((t) => t.executionStatus === "pending").length,
      none: tasks.filter((t) => !t.executionStatus).length,
    };
  }, [tasks]);

  const handleTaskClick = useCallback((task: KanbanTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddTask = useCallback((_columnId: string) => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(async (taskData: Partial<KanbanTask>) => {
    try {
      if (editingTask) {
        const res = await fetch(`/api/kanban/tasks/${editingTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update task");
        }
      }

      setIsModalOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      console.error("Failed to save task:", err);
      throw err;
    }
  }, [editingTask, fetchData]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task");
      }

      fetchData();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }, [fetchData]);

  const handleMoveTask = useCallback(async (taskId: string, targetColumnId: string, targetOrder?: number) => {
    try {
      const res = await fetch(`/api/kanban/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetColumnId, targetOrder }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to move task");
      }

      fetchData();
    } catch (err) {
      console.error("Failed to move task:", err);
    }
  }, [fetchData]);

  const handleAddColumn = useCallback(async (name: string, color: string) => {
    try {
      const res = await fetch("/api/kanban/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create column");
      }

      fetchData();
    } catch (err) {
      console.error("Failed to create column:", err);
    }
  }, [fetchData]);

  const handleRestoreTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to restore task");
      }

      fetchData();
    } catch (err) {
      console.error("Failed to restore task:", err);
    }
  }, [fetchData]);

  return {
    // Data
    columns,
    tasks,
    filteredTasks,
    taskCounts,

    // Loading/error
    loading,
    error,

    // Filter state
    executionFilter,
    setExecutionFilter,
    archiveView,
    setArchiveView,

    // Modal state
    isModalOpen,
    editingTask,
    setIsModalOpen,
    setEditingTask,
    addColumnModalOpen,
    setAddColumnModalOpen,

    // Config data
    configuredAgents,
    domains,

    // Filter values
    createdByFilter,
    setCreatedByFilter,
    assigneeFilter,
    setAssigneeFilter,
    domainFilter,
    setDomainFilter,

    // Handlers
    fetchData,
    handleTaskClick,
    handleAddTask,
    handleSaveTask,
    handleDeleteTask,
    handleMoveTask,
    handleAddColumn,
    handleRestoreTask,
  };
}
