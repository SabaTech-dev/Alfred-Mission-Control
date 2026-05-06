import { WeeklyCalendar } from "@/components/WeeklyCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
        >
          Calendario Semanal
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Visualiza tareas programadas, heartbeats y crons de todos los agentes
        </p>
      </div>

      {/* Weekly Calendar */}
      <WeeklyCalendar />
    </div>
  );
}
