"use client";

import { Check, X, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
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
    icon: Info,
    colorVar: "#60a5fa",
    bgVar: "rgba(59, 130, 246, 0.12)",
  },
  success: {
    icon: CheckCircle,
    colorVar: "#4ade80",
    bgVar: "rgba(74, 222, 128, 0.12)",
  },
  warning: {
    icon: AlertTriangle,
    colorVar: "#fbbf24",
    bgVar: "rgba(251, 191, 36, 0.12)",
  },
  error: {
    icon: XCircle,
    colorVar: "#f87171",
    bgVar: "rgba(248, 113, 113, 0.12)",
  },
};

interface NotificationItemProps {
  notification: Notification;
  isLast: boolean;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}

export function NotificationItem({
  notification,
  isLast,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <div
      onClick={() => onClick(notification)}
      style={{
        display: "flex",
        gap: "12px",
        padding: "16px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        backgroundColor: notification.read ? "transparent" : "rgba(96, 165, 250, 0.05)",
        cursor: notification.link ? "pointer" : "default",
        transition: "background-color 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (notification.link) {
          e.currentTarget.style.backgroundColor = "var(--surface-hover, rgba(255,255,255,0.03))";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = notification.read
          ? "transparent"
          : "rgba(96, 165, 250, 0.05)";
      }}
    >
      {/* Type Icon */}
      <div
        style={{
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: config.bgVar,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "fit-content",
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: config.colorVar }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "4px" }}>
          <h4
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "2px",
            }}
          >
            {notification.title}
          </h4>
          {!notification.read && (
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#60a5fa",
                flexShrink: 0,
                marginLeft: "8px",
              }}
            />
          )}
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: "1.5",
            marginBottom: "6px",
          }}
        >
          {notification.message}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
          </span>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "4px" }}>
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                title="Mark as read"
                style={{
                  padding: "4px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--surface)";
                  e.currentTarget.style.color = "#4ade80";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                <Check size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              title="Delete"
              style={{
                padding: "4px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface)";
                e.currentTarget.style.color = "#f87171";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
