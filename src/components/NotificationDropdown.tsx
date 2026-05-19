"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

import { NotificationItem, Notification } from "@/components/NotificationItem";

const iconButtonStyle: React.CSSProperties = {
  padding: "6px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
};

function handleIconButtonHover(e: React.MouseEvent<HTMLButtonElement>, active: boolean) {
  e.currentTarget.style.backgroundColor = active ? "var(--surface)" : "transparent";
  e.currentTarget.style.color = active ? "var(--text-primary)" : "var(--text-muted)";
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
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
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const clearRead = async () => {
    try {
      await fetch("/api/notifications?action=clearRead", { method: "DELETE" });
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to clear read notifications:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          width: "36px", height: "36px", borderRadius: "8px", border: "none",
          backgroundColor: isOpen ? "var(--surface-elevated)" : "transparent",
          color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = "var(--surface-hover, rgba(255,255,255,0.05))";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: "2px", right: "2px", width: "18px", height: "18px",
            borderRadius: "50%", backgroundColor: "#f87171", color: "#fff", fontSize: "10px",
            fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--bg)",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: "420px",
          maxHeight: "600px", backgroundColor: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "12px", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)", zIndex: 1000,
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--surface-elevated)",
          }}>
            <div>
              <h3 style={{
                fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700,
                color: "var(--text-primary)", marginBottom: "2px",
              }}>Notifications</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} title="Mark all as read" style={iconButtonStyle}
                  onMouseEnter={(e) => handleIconButtonHover(e, true)}
                  onMouseLeave={(e) => handleIconButtonHover(e, false)}>
                  <CheckCheck size={16} />
                </button>
              )}
              {notifications.some((n) => n.read) && (
                <button onClick={clearRead} title="Clear read notifications" style={iconButtonStyle}
                  onMouseEnter={(e) => handleIconButtonHover(e, true)}
                  onMouseLeave={(e) => handleIconButtonHover(e, false)}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && notifications.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                Loading...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "40px 20px", color: "var(--text-muted)", textAlign: "center",
              }}>
                <Bell size={48} style={{ opacity: 0.3, marginBottom: "12px" }} />
                <p style={{ fontSize: "14px" }}>No notifications yet</p>
              </div>
            )}
            {notifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isLast={index === notifications.length - 1}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
