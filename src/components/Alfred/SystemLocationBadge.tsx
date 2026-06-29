"use client";

import { useEffect, useState } from "react";
import { Server } from "lucide-react";

import { useI18n } from "@/i18n/provider";
import { authFetch } from "@/lib/auth-fetch";

interface SystemStatusResponse {
  hostname: string;
  uptime: string;
}

/**
 * Compact server location badge for the TopBar.
 *
 * Shows `hostname · uptime` (e.g. "jokerserver · 6d"). Fails silently —
 * if the status endpoint is unavailable the badge simply stays hidden.
 */
export function SystemLocationBadge() {
  const { t } = useI18n();
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);

  useEffect(() => {
    let active = true;
    authFetch("/api/system/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SystemStatusResponse | null) => {
        if (active && data && data.hostname) setStatus(data);
      })
      .catch(() => {
        /* Badge is decorative — swallow errors silently. */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!status) return null;

  return (
    <div
      className="hidden items-center gap-1.5 rounded-md px-2 py-1 md:flex"
      style={{
        backgroundColor: "var(--surface-elevated)",
        border: "1px solid var(--border)",
      }}
      title={t("topbar.location")}
    >
      <Server className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
      <span
        className="text-xs font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {status.hostname}
      </span>
      <span style={{ color: "var(--text-muted)" }}>·</span>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {status.uptime}
      </span>
    </div>
  );
}
