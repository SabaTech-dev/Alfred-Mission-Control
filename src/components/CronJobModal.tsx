"use client";

import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";

import { getNextRuns, isValidCron } from "@/lib/cron-parser";
import type { CronJob } from "@/components/CronJobCard";
import { ScheduleBuilder } from "@/components/ScheduleBuilder";
import type { FrequencyMode } from "@/components/ScheduleBuilder";

interface CronJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Partial<CronJob>) => void;
  editingJob?: CronJob | null;
}

const TIMEZONES = [
  "UTC", "Europe/Madrid", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Singapore", "Australia/Sydney",
];

export function CronJobModal({ isOpen, onClose, onSave, editingJob }: CronJobModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState("0 9 * * *");
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingJob) {
        setName(editingJob.name);
        setDescription(editingJob.description);
        setMessage(editingJob.message || "");
        setSchedule(typeof editingJob.schedule === "string" ? editingJob.schedule : String(editingJob.schedule));
        setTimezone(editingJob.timezone);
      } else {
        setName("");
        setDescription("");
        setMessage("");
        setSchedule("0 9 * * *");
        setTimezone("Europe/Madrid");
      }
      setErrors({});
    }
  }, [isOpen, editingJob]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!schedule.trim()) newErrors.schedule = "Schedule is required";
    else if (!isValidCron(schedule)) newErrors.schedule = "Invalid cron expression";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave({
        id: editingJob?.id,
        name: name.trim(),
        description: description.trim(),
        message: message.trim(),
        schedule: schedule.trim(),
        timezone,
        enabled: editingJob?.enabled ?? true,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const nextRuns = isValidCron(schedule) ? getNextRuns(schedule, 5) : [];

  if (!isOpen) return null;

  // Key forces ScheduleBuilder remount when modal context changes
  const scheduleBuilderKey = isOpen ? `open-${editingJob?.id ?? "new"}` : "closed";
  const defaultFreqMode: FrequencyMode = editingJob ? "custom" : "daily";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl mx-4"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {editingJob ? "✏️ Edit Cron Job" : "➕ Create Cron Job"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Job Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
              placeholder="e.g., Daily Backup"
              style={{
                width: "100%", padding: "0.75rem 1rem",
                backgroundColor: "var(--card-elevated)",
                border: `1px solid ${errors.name ? "var(--error)" : "var(--border)"}`,
                borderRadius: "0.5rem", color: "var(--text-primary)", outline: "none",
                fontSize: "0.9rem",
              }}
            />
            {errors.name && <p className="mt-1 text-sm" style={{ color: "var(--error)" }}>{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this job"
              rows={2}
              style={{
                width: "100%", padding: "0.75rem 1rem",
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem", color: "var(--text-primary)", outline: "none",
                fontSize: "0.9rem", resize: "none",
              }}
            />
          </div>

          {/* Task Message */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Task Message {editingJob && <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(what the task executes)</span>}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="The prompt/instruction sent to the agent when this task runs"
              rows={4}
              style={{
                width: "100%", padding: "0.75rem 1rem",
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem", color: "var(--text-primary)", outline: "none",
                fontSize: "0.85rem", resize: "vertical",
                fontFamily: "monospace",
              }}
            />
          </div>

          {/* Schedule Builder */}
          <ScheduleBuilder
            key={scheduleBuilderKey}
            value={schedule}
            onChange={setSchedule}
            error={errors.schedule}
            onClearError={() => setErrors((p) => ({ ...p, schedule: "" }))}
            defaultFrequencyMode={defaultFreqMode}
          />

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{
                width: "100%", padding: "0.75rem 1rem",
                backgroundColor: "var(--card-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem", color: "var(--text-primary)", outline: "none", cursor: "pointer",
              }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Preview Next Runs */}
          {nextRuns.length > 0 && (
            <div style={{ padding: "1rem", backgroundColor: "var(--card-elevated)", borderRadius: "0.75rem", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4" style={{ color: "#C084FC" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Preview: Next 5 executions
                </span>
              </div>
              <div className="space-y-2">
                {nextRuns.map((run, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{
                      width: "1.5rem", height: "1.5rem", borderRadius: "9999px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: "rgba(192,132,252,0.15)", color: "#C084FC",
                      fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    {run.toLocaleString("es-ES", {
                      weekday: "short", year: "numeric", month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit", hour12: false,
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "0.625rem 1.5rem",
                backgroundColor: "var(--accent)", color: "#000",
                borderRadius: "0.5rem", border: "none", cursor: isSaving ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: "0.9rem", opacity: isSaving ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>{editingJob ? "Update Job" : "Create Job"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
