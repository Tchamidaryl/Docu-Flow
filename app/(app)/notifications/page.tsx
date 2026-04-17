"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, FileText, Check, X, RotateCcw, MessageSquare, Clock, UserCheck } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  APPROVAL_REQUEST:   { icon: Bell,        color: "text-amber-600",   bg: "bg-amber-100 dark:bg-amber-900/30",   label: "Approval Request" },
  APPROVED:           { icon: Check,       color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Approved" },
  REJECTED:           { icon: X,           color: "text-red-600",     bg: "bg-red-100 dark:bg-red-900/30",       label: "Rejected" },
  REVISION_REQUESTED: { icon: RotateCcw,   color: "text-violet-600",  bg: "bg-violet-100 dark:bg-violet-900/30", label: "Revision Requested" },
  REMINDER:           { icon: Clock,       color: "text-blue-600",    bg: "bg-blue-100 dark:bg-blue-900/30",     label: "Reminder" },
  DELEGATED:          { icon: UserCheck,   color: "text-indigo-600",  bg: "bg-indigo-100 dark:bg-indigo-900/30", label: "Delegated" },
  COMMENTED:          { icon: MessageSquare, color: "text-sky-600",   bg: "bg-sky-100 dark:bg-sky-900/30",       label: "New Comment" },
  EXPIRED:            { icon: Clock,       color: "text-orange-600",  bg: "bg-orange-100 dark:bg-orange-900/30", label: "Expired" },
  DOCUMENT_CANCELLED: { icon: X,           color: "text-gray-600",    bg: "bg-gray-100 dark:bg-gray-800",        label: "Cancelled" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { fetchNotifications(); }, [filter]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const q = filter === "unread" ? "?unread=true" : "";
      const res = await fetch(`/api/v1/notifications${q}`);
      const data = await res.json();
      setNotifications(data.data?.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/v1/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  }

  async function markOneRead(id: string) {
    await fetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
            Notifications
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border w-fit mb-6">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all",
              filter === f
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Bell className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="font-semibold text-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "unread" ? "You have no unread notifications" : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {notifications.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG["APPROVAL_REQUEST"];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 p-4 border-b border-border/50 last:border-0 transition-colors",
                  !n.isRead && "bg-primary/[0.03]",
                  "hover:bg-muted/30"
                )}
              >
                {/* Icon */}
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                  <Icon className={cn("w-4.5 h-4.5", cfg.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("text-sm", !n.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                    {n.document && (
                      <Link
                        href={`/documents/${n.document.id}`}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        View document
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markOneRead(n.id)}
                        className="text-[11px] text-muted-foreground hover:text-foreground ml-auto"
                      >
                        Mark read
                      </button>
                    )}
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
