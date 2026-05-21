"use client";

import { RefreshCw, AlertCircle } from "lucide-react";
import { KanbanBoard, TaskModal, ArchivedTasksList } from "@/components/kanban";
import { useI18n } from "@/i18n/provider";
import { useKanbanData } from "./useKanbanData";
import type { KanbanInitialData } from "./useKanbanData";
import { KanbanToolbar } from "./KanbanToolbar";
import { AddColumnModal } from "./AddColumnModal";

export type { KanbanInitialData } from "./useKanbanData";

export default function KanbanClient({ initialData }: { initialData: KanbanInitialData }) {
  const { t } = useI18n();
  const {
    columns,
    tasks,
    filteredTasks,
    taskCounts,
    loading,
    error,
    executionFilter,
    setExecutionFilter,
    archiveView,
    setArchiveView,
    isModalOpen,
    editingTask,
    setIsModalOpen,
    setEditingTask,
    addColumnModalOpen,
    setAddColumnModalOpen,
    configuredAgents,
    domains,
    createdByFilter,
    setCreatedByFilter,
    assigneeFilter,
    setAssigneeFilter,
    domainFilter,
    setDomainFilter,
    fetchData,
    handleTaskClick,
    handleAddTask,
    handleSaveTask,
    handleDeleteTask,
    handleMoveTask,
    handleAddColumn,
    handleRestoreTask,
  } = useKanbanData(initialData);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <RefreshCw className="h-5 w-5 animate-spin" style={{ color: "var(--accent)" }} />
          <span style={{ color: "var(--text-secondary)" }}>{t("kanban.loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--error)" }}
        >
          <AlertCircle className="h-5 w-5" style={{ color: "var(--error)" }} />
          <span style={{ color: "var(--error)" }}>{error}</span>
          <button
            onClick={fetchData}
            className="rounded-lg px-3 py-1 text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "white" }}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 md:p-6">
      <KanbanToolbar
        archiveView={archiveView}
        onArchiveViewChange={setArchiveView}
        executionFilter={executionFilter}
        onExecutionFilterChange={setExecutionFilter}
        taskCounts={taskCounts}
      />

      {archiveView === "archived" ? (
        <ArchivedTasksList
          tasks={tasks}
          onRestore={handleRestoreTask}
          onTaskClick={handleTaskClick}
        />
      ) : (
        <KanbanBoard
          columns={columns}
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onAddColumn={() => setAddColumnModalOpen(true)}
          onMoveTask={handleMoveTask}
          configuredAgents={configuredAgents}
          createdByFilter={createdByFilter}
          assigneeFilter={assigneeFilter}
          onCreatedByFilterChange={setCreatedByFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          domains={domains}
          domainFilter={domainFilter}
          onDomainFilterChange={setDomainFilter}
        />
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        columns={columns}
        editingTask={editingTask}
        onCommentsUpdated={fetchData}
      />

      <AddColumnModal
        isOpen={addColumnModalOpen}
        onClose={() => setAddColumnModalOpen(false)}
        onAddColumn={handleAddColumn}
      />
    </div>
  );
}
