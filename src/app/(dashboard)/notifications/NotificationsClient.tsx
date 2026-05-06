"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck, Trash2, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
}

const typeConfig: Record<
  Notification["type"],
  {
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    colorVar: string;
    bgVar: string;
  }
> = {
  info: {
    icon: Bell,
    colorVar: "#60a5fa",
    bgVar: "rgba(59, 130, 246, 0.12)",
  },
  success: {
    icon: Bell,
    colorVar: "#4ade80",
    bgVar: "rgba(74, 222, 128, 0.12)",
  },
  warning: {
    icon: Bell,
    colorVar: "#fbbf24",
    bgVar: "rgba(251, 191, 36, 0.12)",
  },
  error: {
    icon: Bell,
    colorVar: "#f87171",
    bgVar: "rgba(248, 113, 113, 0.12)",
  },
};

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "info" | "success" | "warning" | "error">("all");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("unread", "true");
      params.set("limit", "100");

      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      await fetchNotifications();
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      await fetchNotifications();
    } catch {
      // ignore
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      await fetchNotifications();
    } catch {
      // ignore
    }
  };

  const clearRead = async () => {
    if (!confirm("¿Estás seguro de eliminar todas las notificaciones leídas?")) return;
    try {
      await fetch("/api/notifications?action=clearRead", { method: "DELETE" });
      await fetchNotifications();
    } catch {
      // ignore
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter === "all") return true;
    return n.type === typeFilter;
  });

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold mb-1 flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
          >
            <Bell className="w-6 h-6" />
            Centro de Notificaciones
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Todas tus notificaciones en un solo lugar
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Estado:
          </span>
        </div>
        <button
          onClick={() => setFilter("all")}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: filter === "all" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "all" ? "white" : "var(--text-secondary)",
            border: filter === "all" ? "none" : "1px solid var(--border)",
          }}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter("unread")}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: filter === "unread" ? "var(--accent)" : "var(--card-elevated)",
            color: filter === "unread" ? "white" : "var(--text-secondary)",
            border: filter === "unread" ? "none" : "1px solid var(--border)",
          }}
        >
          No leídas
        </button>
        <button
          onClick={markAllAsRead}
          disabled={notifications.length === 0}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <CheckCheck className="w-4 h-4" />
          Marcar todas como leídas
        </button>
        <button
          onClick={clearRead}
          disabled={notifications.length === 0}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          style={{
            backgroundColor: "var(--card-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <Trash2 className="w-4 h-4" />
          Eliminar leídas
        </button>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setTypeFilter("all")}
          className="px-3 py-1 rounded-lg text-xs transition-colors"
          style={{
            backgroundColor: typeFilter === "all" ? "var(--card-elevated)" : "transparent",
            color: "var(--text-secondary)",
            border: typeFilter === "all" ? "1px solid var(--border)" : "1px solid transparent",
          }}
        >
          Todos
        </button>
        <button
          onClick={() => setTypeFilter("info")}
          className="px-3 py-1 rounded-lg text-xs transition-colors"
          style={{
            backgroundColor: typeFilter === "info" ? typeConfig.info.bgVar : "transparent",
            color: typeConfig.info.colorVar,
            border: typeFilter === "info" ? "none" : "1px solid transparent",
          }}
        >
          Info
        </button>
        <button
          onClick={() => setTypeFilter("success")}
          className="px-3 py-1 rounded-lg text-xs transition-colors"
          style={{
            backgroundColor: typeFilter === "success" ? typeConfig.success.bgVar : "transparent",
            color: typeConfig.success.colorVar,
            border: typeFilter === "success" ? "none" : "1px solid transparent",
          }}
        >
          Success
        </button>
        <button
          onClick={() => setTypeFilter("warning")}
          className="px-3 py-1 rounded-lg text-xs transition-colors"
          style={{
            backgroundColor: typeFilter === "warning" ? typeConfig.warning.bgVar : "transparent",
            color: typeConfig.warning.colorVar,
            border: typeFilter === "warning" ? "none" : "1px solid transparent",
          }}
        >
          Warning
        </button>
        <button
          onClick={() => setTypeFilter("error")}
          className="px-3 py-1 rounded-lg text-xs transition-colors"
          style={{
            backgroundColor: typeFilter === "error" ? typeConfig.error.bgVar : "transparent",
            color: typeConfig.error.colorVar,
            border: typeFilter === "error" ? "none" : "1px solid transparent",
          }}
        >
          Error
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <div className="animate-pulse text-lg">Cargando notificaciones...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredNotifications.length === 0 && (
        <div
          className="text-center py-20 rounded-xl"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-muted)" }}
        >
          <Bell
            style={{
              width: "48px",
              height: "48px",
              color: "var(--text-muted)",
              margin: "0 auto 16px",
            }}
          />
          <p>No hay notificaciones</p>
        </div>
      )}

      {/* Notifications List */}
      {!loading && filteredNotifications.length > 0 && (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;
            const isUnread = !notification.read;

            return (
              <div
                key={notification.id}
                className={`rounded-xl p-4 transition-all hover:shadow-md ${
                  isUnread ? "border-l-4" : ""
                }`}
                style={{
                  backgroundColor: "var(--card)",
                  border: isUnread
                    ? `4px solid ${config.colorVar}`
                    : "1px solid var(--border)",
                  opacity: isUnread ? 1 : 0.7,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="shrink-0 mt-0.5"
                    style={{ backgroundColor: config.bgVar, borderRadius: "8px", padding: "8px" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.colorVar }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3
                        className="font-semibold text-base"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs transition-colors hover:opacity-75"
                            style={{ color: "var(--text-muted)" }}
                            title="Marcar como leída"
                          >
                            Check
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs transition-colors hover:opacity-75"
                          style={{ color: "var(--error)" }}
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p
                      className="text-sm mb-2 whitespace-pre-wrap"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {notification.message}
                    </p>
                    <div
                      className="flex items-center gap-3 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <span>{formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
