"use client";

import { useEffect, useState } from "react";
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";

interface Task {
  id: string;
  name: string;
  type: "cron" | "heartbeat" | "scheduled";
  agentId?: string;
  schedule: string;
  scheduleDisplay: string;
  enabled: boolean;
  nextRun: string | null;
  lastRun: string | null;
  description?: string;
  status?: "success" | "error" | "running" | "pending";
}

export function WeeklyCalendar() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  useEffect(() => {
    authFetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(data.filter((task: Task) => task.nextRun));
        }
      })
      .catch(() => setTasks([]));
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getTasksForDayAndHour = (day: Date, hour: number) => {
    return tasks.filter((task) => {
      if (!task.nextRun) return false;
      const taskDate = new Date(task.nextRun);
      return isSameDay(taskDate, day) && taskDate.getHours() === hour;
    });
  };

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div
      style={{
        backgroundColor: "var(--card)",
        borderRadius: "0.75rem",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={goToPreviousWeek}
            style={{
              padding: "0.5rem",
              backgroundColor: "var(--card-elevated)",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </button>
          <button
            onClick={goToNextWeek}
            style={{
              padding: "0.5rem",
              backgroundColor: "var(--card-elevated)",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronRight className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
          </button>
          <button
            onClick={goToToday}
            style={{
              padding: "0.375rem 0.75rem",
              fontSize: "0.875rem",
              backgroundColor: "var(--card-elevated)",
              color: "var(--text-secondary)",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            {t("calendar.today")}
          </button>
        </div>

        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          {format(currentWeekStart, "MMMM yyyy")}
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          <Calendar className="w-4 h-4" />
          <span>{tasks.length} {t("calendar.scheduledTasks")}</span>
        </div>
      </div>

      {/* Day Headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            padding: "0.75rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            borderRight: "1px solid var(--border)",
          }}
        >
          Time
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            style={{
              padding: "0.75rem",
              textAlign: "center",
              borderRight: "1px solid var(--border)",
              backgroundColor: isSameDay(day, new Date()) ? "color-mix(in srgb, var(--success) 10%, transparent)" : undefined,
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              {format(day, "EEE")}
            </div>
            <div
              style={{
                fontSize: "1.125rem",
                fontWeight: 500,
                color: isSameDay(day, new Date()) ? "var(--success)" : "var(--text-primary)",
              }}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid - Show 6am to 10pm */}
      <div style={{ maxHeight: "600px", overflowY: "auto" }}>
        {hours.filter(h => h >= 6 && h <= 22).map((hour) => (
          <div
            key={hour}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                padding: "0.5rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textAlign: "right",
                paddingRight: "0.75rem",
                borderRight: "1px solid var(--border)",
              }}
            >
              {format(new Date().setHours(hour, 0), "HH:mm")}
            </div>
            {days.map((day) => {
              const dayTasks = getTasksForDayAndHour(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  style={{
                    padding: "0.25rem",
                    minHeight: "3rem",
                    borderRight: "1px solid var(--border)",
                    backgroundColor: isSameDay(day, new Date()) ? "color-mix(in srgb, var(--success) 5%, transparent)" : undefined,
                  }}
                >
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
                        borderLeft: "2px solid var(--accent)",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          color: "var(--accent)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.name}
                      </div>
                      <div
                        style={{
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.scheduleDisplay || task.schedule}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
