"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

export function WeatherWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className="rounded-xl p-4 h-full"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
          <Clock3 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {now.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })}
          </p>
        </div>
      </div>
    </div>
  );
}