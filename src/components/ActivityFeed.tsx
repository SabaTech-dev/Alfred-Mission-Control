"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

interface ActivityItem {
  id: string;
  description?: string;
  timestamp?: string;
  type?: string;
  status?: string;
  agent?: string | null;
}

interface ActivityFeedProps {
  limit?: number;
  status?: string;
  agent?: string;
}

function statusColor(status?: string): string {
  switch (status) {
    case "success":
    case "approved":
      return "var(--success)";
    case "error":
    case "rejected":
      return "var(--error)";
    case "pending":
    case "running":
      return "var(--warning)";
    default:
      return "var(--text-muted)";
  }
}

function statusIcon(status?: string) {
  switch (status) {
    case "success":
    case "approved":
      return CheckCircle2;
    case "error":
    case "rejected":
      return AlertTriangle;
    default:
      return Activity;
  }
}

export function ActivityFeed({ limit = 10, status, agent }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      try {
        const params = new URLSearchParams();
        if (status && status !== "all") params.set("status", status);
        if (agent && agent !== "all") params.set("agent", agent);
        params.set("limit", String(limit));

        const response = await authFetch(`/api/activities?${params}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Activity feed request failed: ${response.status}`);
        }

        const data = await response.json();
        const nextActivities = Array.isArray(data)
          ? data
          : Array.isArray(data.activities)
            ? data.activities
            : [];

        if (active) {
          setActivities(nextActivities);
        }
      } catch (error) {
        console.error("Failed to load activity feed:", error);
        if (active) {
          setActivities([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadActivities();
    return () => {
      active = false;
    };
  }, [limit, status, agent]);

  if (loading) {
    return (
      <div className="p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        …
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        —
      </div>
    );
  }

  return (
    <div>
      {activities.map((activityItem) => {
        const Icon = statusIcon(activityItem.status);
        const color = statusColor(activityItem.status);

        return (
          <div
            key={activityItem.id}
            className="flex items-start gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="mt-0.5 shrink-0" style={{ color }}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {activityItem.description || activityItem.type || activityItem.id}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                {activityItem.agent ? <span>{activityItem.agent}</span> : null}
                {activityItem.timestamp ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="w-3 h-3" />
                    {new Date(activityItem.timestamp).toLocaleString("es-ES")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}