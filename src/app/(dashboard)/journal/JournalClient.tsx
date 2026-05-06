"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  JournalTimeline,
  JournalEntryCard,
  JournalEditorModal,
  JournalFilters,
} from "@/components/journal";
import { OperationsJournalEntry, CreateJournalEntryInput, UpdateJournalEntryInput } from "@/lib/mission-types";

export interface JournalInitialData {
  entries: OperationsJournalEntry[];
}

export default function JournalClient({ initialData }: { initialData?: JournalInitialData }) {
  const [entries, setEntries] = useState<OperationsJournalEntry[]>(initialData?.entries ?? []);
  const [loading, setLoading] = useState(!initialData?.entries);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OperationsJournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!initialData?.entries) {
      fetchEntries();
    }
  }, [initialData]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("limit", "50");

      const res = await fetch(`/api/journal?${params}`);
      const data = await res.json();
      if (data.entries) {
        setEntries(data.entries as OperationsJournalEntry[]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: CreateJournalEntryInput | UpdateJournalEntryInput) => {
    setSaving(true);
    try {
      if (editingEntry) {
        const res = await fetch(`/api/journal/${editingEntry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.entry) {
          setEntries(
            entries.map((e) => (e.id === editingEntry.id ? result.entry : e))
          );
        }
      } else {
        const res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.entry) {
          setEntries([result.entry, ...entries]);
        }
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
      setEntries(entries.filter((e) => e.id !== id));
    } catch {
      // ignore
    }
  };

  const handleEdit = (entry: OperationsJournalEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    fetchEntries();
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
            Diario de Operaciones
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Registra y revisa tus actividades diarias
          </p>
        </div>
        <button
          onClick={handleNewEntry}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: "var(--accent)", color: "var(--text-primary)" }}
        >
          <Plus className="w-4 h-4" />
          Nueva Entrada
        </button>
      </div>

      {/* Filters */}
      <JournalFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={handleClearFilters}
      />

      {/* Apply filters button */}
      {(startDate || endDate) && (
        <div className="mt-3 mb-6">
          <button
            onClick={fetchEntries}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: "var(--card-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Aplicar Filtros
          </button>
        </div>
      )}

      {/* Timeline */}
      <JournalTimeline
        entries={entries}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
      />

      {/* Editor Modal */}
      <JournalEditorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        entry={editingEntry}
        isSaving={saving}
      />
    </div>
  );
}
