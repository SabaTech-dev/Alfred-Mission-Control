"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Zap } from "lucide-react";
import { cronToHuman, isValidCron, CRON_PRESETS } from "@/lib/cron-parser";

export type FrequencyMode = "every-minutes" | "hourly" | "daily" | "weekly" | "monthly" | "custom";

const FREQUENCY_MODES: Array<{ id: FrequencyMode; label: string; emoji: string }> = [
  { id: "every-minutes", label: "Every N minutes", emoji: "⏱️" },
  { id: "hourly", label: "Hourly", emoji: "🕐" },
  { id: "daily", label: "Daily", emoji: "☀️" },
  { id: "weekly", label: "Weekly", emoji: "📅" },
  { id: "monthly", label: "Monthly", emoji: "🗓️" },
  { id: "custom", label: "Custom cron", emoji: "⚙️" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const TEMPLATES = [
  { label: "Daily backup at 3 AM", cron: "0 3 * * *" },
  { label: "Weekday morning report (9 AM)", cron: "0 9 * * 1-5" },
  { label: "Hourly health check", cron: "0 * * * *" },
  { label: "Every 15 minutes", cron: "*/15 * * * *" },
  { label: "Weekly cleanup (Sunday midnight)", cron: "0 0 * * 0" },
  { label: "First of month report", cron: "0 8 1 * *" },
  { label: "Every 5 minutes", cron: "*/5 * * * *" },
  { label: "Twice daily (9 AM & 9 PM)", cron: "0 9,21 * * *" },
];

const SELECT_STYLE = {
  padding: "0.5rem 0.75rem", backgroundColor: "var(--card)",
  border: "1px solid var(--border)", borderRadius: "0.5rem",
  color: "var(--text-primary)", outline: "none",
};

function buildCron(mode: FrequencyMode, opts: Record<string, number | number[]>): string {
  if (mode === "every-minutes") return `*/${opts.minutes || 5} * * * *`;
  if (mode === "hourly") return `${opts.minute || 0} * * * *`;
  if (mode === "daily") return `${opts.minute || 0} ${opts.hour || 9} * * *`;
  if (mode === "weekly") {
    const days = Array.isArray(opts.days) && opts.days.length > 0 ? opts.days.join(",") : "1";
    return `${opts.minute || 0} ${opts.hour || 9} * * ${days}`;
  }
  if (mode === "monthly") return `${opts.minute || 0} ${opts.hour || 9} ${opts.day || 1} * *`;
  return "0 9 * * *";
}

interface ScheduleBuilderProps {
  value: string;
  onChange: (cron: string) => void;
  error?: string;
  onClearError?: () => void;
  defaultFrequencyMode?: FrequencyMode;
}

export function ScheduleBuilder({
  value,
  onChange,
  error,
  onClearError,
  defaultFrequencyMode = "daily",
}: ScheduleBuilderProps) {
  const [frequencyMode, setFrequencyMode] = useState<FrequencyMode>(defaultFrequencyMode);
  const [showPresets, setShowPresets] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [everyMinutes, setEveryMinutes] = useState(15);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(1);

  useEffect(() => {
    if (frequencyMode === "custom") return;
    onChange(buildCron(frequencyMode, {
      minutes: everyMinutes, minute: selectedMinute, hour: selectedHour,
      days: selectedDays, day: selectedDayOfMonth,
    }));
  }, [frequencyMode, everyMinutes, selectedHour, selectedMinute, selectedDays, selectedDayOfMonth, onChange]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
        Frequency
      </label>

      {/* Mode selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        {FREQUENCY_MODES.map((mode) => (
          <button
            key={mode.id} type="button"
            onClick={() => setFrequencyMode(mode.id)}
            style={{
              padding: "0.375rem 0.875rem", borderRadius: "9999px", fontSize: "0.8rem",
              fontWeight: 500, border: "1px solid", cursor: "pointer", transition: "all 0.15s",
              backgroundColor: frequencyMode === mode.id ? "rgba(255,59,48,0.15)" : "var(--card-elevated)",
              color: frequencyMode === mode.id ? "var(--accent)" : "var(--text-secondary)",
              borderColor: frequencyMode === mode.id ? "rgba(255,59,48,0.4)" : "var(--border)",
            }}
          >
            {mode.emoji} {mode.label}
          </button>
        ))}
      </div>

      {frequencyMode === "every-minutes" && (
        <div style={{ padding: "1rem", backgroundColor: "var(--card-elevated)", borderRadius: "0.75rem" }}>
          <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Every</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <input type="range" min={1} max={60} value={everyMinutes}
              onChange={(e) => setEveryMinutes(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent)" }} />
            <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: "4rem", textAlign: "center" }}>
              {everyMinutes} min
            </span>
          </div>
        </div>
      )}

      {frequencyMode === "hourly" && (
        <div style={{ padding: "1rem", backgroundColor: "var(--card-elevated)", borderRadius: "0.75rem" }}>
          <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>At minute</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {MINUTES.map((m) => (
              <button key={m} type="button" onClick={() => setSelectedMinute(m)}
                style={{
                  padding: "0.375rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.85rem",
                  backgroundColor: selectedMinute === m ? "var(--accent)" : "var(--card)",
                  color: selectedMinute === m ? "#000" : "var(--text-secondary)",
                  border: "1px solid var(--border)", cursor: "pointer",
                }}>
                :{String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      )}

      {(frequencyMode === "daily" || frequencyMode === "weekly" || frequencyMode === "monthly") && (
        <div style={{ padding: "1rem", backgroundColor: "var(--card-elevated)", borderRadius: "0.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>At time</label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <select value={selectedHour} onChange={(e) => setSelectedHour(Number(e.target.value))} style={SELECT_STYLE}>
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
              </select>
              <span style={{ color: "var(--text-muted)" }}>:</span>
              <select value={selectedMinute} onChange={(e) => setSelectedMinute(Number(e.target.value))} style={SELECT_STYLE}>
                {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
              </select>
            </div>
          </div>

          {frequencyMode === "weekly" && (
            <div>
              <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>On days</label>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                {WEEKDAYS.map((day, i) => (
                  <button key={day} type="button" onClick={() => toggleDay(i)}
                    style={{
                      flex: 1, padding: "0.5rem 0", borderRadius: "0.5rem", fontSize: "0.75rem",
                      fontWeight: selectedDays.includes(i) ? 700 : 400,
                      backgroundColor: selectedDays.includes(i) ? "var(--accent)" : "var(--card)",
                      color: selectedDays.includes(i) ? "#000" : "var(--text-secondary)",
                      border: "1px solid var(--border)", cursor: "pointer",
                    }}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequencyMode === "monthly" && (
            <div>
              <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>On day of month</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input type="range" min={1} max={28} value={selectedDayOfMonth}
                  onChange={(e) => setSelectedDayOfMonth(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)" }} />
                <span style={{ fontWeight: 700, color: "var(--accent)", minWidth: "3rem", textAlign: "center" }}>
                  Day {selectedDayOfMonth}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom cron */}
      {frequencyMode === "custom" && (
        <div style={{ position: "relative" }}>
          <input type="text" value={value}
            onChange={(e) => { onChange(e.target.value); onClearError?.(); }}
            placeholder="* * * * *"
            style={{
              width: "100%", padding: "0.75rem 1rem", paddingRight: "6rem",
              backgroundColor: "var(--card-elevated)",
              border: `1px solid ${error ? "var(--error)" : "var(--border)"}`,
              borderRadius: "0.5rem", color: "var(--text-primary)", outline: "none",
              fontFamily: "monospace", fontSize: "0.9rem",
            }} />
          <button type="button" onClick={() => setShowPresets(!showPresets)}
            style={{
              position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)",
              padding: "0.375rem 0.625rem", fontSize: "0.75rem",
              backgroundColor: "var(--card)", color: "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: "0.375rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.25rem",
            }}>
            Presets <ChevronDown className={`w-3 h-3 transition-transform ${showPresets ? "rotate-180" : ""}`} />
          </button>

          {showPresets && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.5rem",
              backgroundColor: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "0.75rem", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              zIndex: 20, maxHeight: "16rem", overflowY: "auto",
            }}>
              {CRON_PRESETS.map((preset) => (
                <button key={preset.value} type="button"
                  onClick={() => { onChange(preset.value); setShowPresets(false); }}
                  style={{
                    width: "100%", padding: "0.625rem 1rem", display: "flex",
                    alignItems: "center", justifyContent: "space-between",
                    background: "none", borderTop: "none", borderLeft: "none",
                    borderRight: "none", cursor: "pointer", textAlign: "left",
                    borderBottom: "1px solid var(--border)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--card-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>{preset.label}</span>
                  <code style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{preset.value}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm" style={{ color: "var(--error)" }}>{error}</p>}

      <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "var(--card-elevated)", borderRadius: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <code style={{ fontFamily: "monospace", fontSize: "1rem", color: "var(--accent)", fontWeight: 700 }}>{value}</code>
        {isValidCron(value) && (
          <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>→ {cronToHuman(value)}</span>
        )}
      </div>

      {/* Templates */}
      <div style={{ marginTop: "1.5rem" }}>
        <button type="button" onClick={() => setShowTemplates(!showTemplates)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
          <Zap className="w-4 h-4" /> Templates
          <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
        </button>
        {showTemplates && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {TEMPLATES.map((t) => (
              <button key={t.cron} type="button"
                onClick={() => { onChange(t.cron); setFrequencyMode("custom"); setShowTemplates(false); }}
                style={{
                  padding: "0.375rem 0.875rem", borderRadius: "9999px", fontSize: "0.8rem",
                  backgroundColor: "var(--card-elevated)", color: "var(--text-secondary)",
                  border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
