"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, LogOut, User, Settings, ChevronDown, Search, Plus, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatDistanceToNow } from "date-fns";
import { ThemeToggle } from "../ThemeToggle";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/documents": "Documents",
  "/templates": "Templates",
  "/users": "Users",
  "/roles": "Roles",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const title = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? "DocuFlow";

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/v1/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data?.notifications ?? []);
        setUnreadCount(data.data?.unreadCount ?? 0);
      }
    } catch {}
  }

  async function markAllRead() {
    await fetch("/api/v1/notifications", { method: "PATCH" });
    setUnreadCount(0);
    setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
  }

  const notifTypeIcon: Record<string, string> = {
    APPROVAL_REQUEST: "🔔",
    APPROVED: "✅",
    REJECTED: "❌",
    REVISION_REQUESTED: "✏️",
    REMINDER: "⏰",
    DELEGATED: "↩️",
    COMMENTED: "💬",
    EXPIRED: "⏱️",
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center gap-4 px-4 lg:px-6 shrink-0 z-10">
      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Quick create */}
        <Link
          href="/documents/new"
          className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Document
        </Link>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <Bell className="w-4.5 h-4.5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5.5 h-5.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-in-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No new notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <Link
                      key={n.id}
                      href={n.documentId ? `/documents/${n.documentId}` : "/notifications"}
                      onClick={() => setNotifOpen(false)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0",
                        !n.isRead && "bg-primary/5"
                      )}
                    >
                      <span className="text-base mt-0.5">{notifTypeIcon[n.type] ?? "📄"}</span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-medium truncate", !n.isRead && "font-semibold")}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </Link>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <Link href="/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-primary hover:underline block text-center">
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>
        <ThemeToggle />

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 hover:bg-muted rounded-xl px-3 py-2 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {session?.user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
              {session?.user?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-in-up">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold truncate">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                  {session?.user?.systemRole?.toLowerCase().replace("_", " ")}
                </span>
              </div>
              <div className="p-1.5">
                {[
                  { label: "Profile", icon: User, href: "/settings" },
                  { label: "Settings", icon: Settings, href: "/settings" },
                ].map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
