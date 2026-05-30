"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, FileText, Clock, BookTemplate,
  Users, Shield, Bell, Settings, Building2,
  ChevronLeft, FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    href:  "/dashboard",
    icon:  LayoutDashboard,
    roles: ["SUPER_ADMIN","ADMIN","MANAGER","APPROVER","REVIEWER","SUBMITTER"],
  },
  {
    label: "Documents",
    href:  "/documents",
    icon:  FileText,
    roles: ["SUPER_ADMIN","ADMIN","MANAGER","APPROVER","REVIEWER","SUBMITTER"],
  },
  {
    label: "Pending Review",
    href:  "/documents?view=pending_my_action",
    icon:  Clock,
    roles: ["SUPER_ADMIN","ADMIN","MANAGER","APPROVER"],
  },
  {
    label: "Templates",
    href:  "/templates",
    icon:  BookTemplate,
    roles: ["SUPER_ADMIN","ADMIN","MANAGER"],
  },
  {
    label: "Users",
    href:  "/users",
    icon:  Users,
    roles: ["SUPER_ADMIN","ADMIN"],
  },
  {
    label: "Roles",
    href:  "/roles",
    icon:  Shield,
    roles: ["SUPER_ADMIN","ADMIN"],
  },
  {
    label: "Organization",
    href:  "/organization",
    icon:  Building2,
    roles: ["SUPER_ADMIN","ADMIN"],
  },
  {
    label: "Notifications",
    href:  "/notifications",
    icon:  Bell,
    roles: ["SUPER_ADMIN","ADMIN","MANAGER","APPROVER","REVIEWER","SUBMITTER"],
  },
  {
    label: "Settings",
    href:  "/settings",
    icon:  Settings,
    roles: ["SUPER_ADMIN","ADMIN","MANAGER","APPROVER","REVIEWER","SUBMITTER"],
  },
];

export default function Sidebar() {
  const pathname            = usePathname();
  const { data: session }   = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const role                = session?.user?.systemRole ?? "SUBMITTER";

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: "bg-red-100 text-red-700",
    ADMIN:       "bg-blue-100 text-blue-700",
    MANAGER:     "bg-violet-100 text-violet-700",
    APPROVER:    "bg-emerald-100 text-emerald-700",
    REVIEWER:    "bg-amber-100 text-amber-700",
    SUBMITTER:   "bg-gray-100 text-gray-600",
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 shrink-0 z-20",
        collapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border gap-3 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <FileCheck2 className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span
            className="text-lg font-bold tracking-tight truncate"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            DocuFlow
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all shrink-0",
            collapsed && "rotate-180"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Org name */}
      {!collapsed && session?.user?.organizationName && (
        <div className="px-4 py-2.5 border-b border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate">
            {session.user.organizationName}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto custom-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          // Match active state — handle query strings
          const basePath    = item.href.split("?")[0];
          const hasQuery    = item.href.includes("?");
          const isActive    = hasQuery
            ? false
            : pathname === basePath ||
              (basePath !== "/dashboard" && pathname.startsWith(basePath));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 shrink-0",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {!collapsed && session?.user && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/50">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{session.user.name}</p>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", ROLE_COLORS[role] ?? ROLE_COLORS.SUBMITTER)}>
                {role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
