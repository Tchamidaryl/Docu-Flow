"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, FileText, CheckSquare, Users, Settings,
  Bell, Shield, Template, ChevronLeft, FileCheck2, Building2,
  BookTemplate, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER", "REVIEWER", "SUBMITTER"],
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER", "REVIEWER", "SUBMITTER"],
  },
  {
    label: "Pending Review",
    href: "/documents?view=pending_my_action",
    icon: ClipboardList,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER"],
  },
  {
    label: "Templates",
    href: "/templates",
    icon: BookTemplate,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    label: "Roles",
    href: "/roles",
    icon: Shield,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER", "REVIEWER", "SUBMITTER"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER", "REVIEWER", "SUBMITTER"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const role = session?.user?.systemRole ?? "SUBMITTER";

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 z-20",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border gap-3 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <FileCheck2 className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
            DocuFlow
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all",
            collapsed && "rotate-180"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/documents?view=pending_my_action"
            ? pathname === "/documents" && false
            : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href.split("?")[0]));

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
            >
              <Icon className={cn("w-4.5 h-4.5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {!collapsed && session?.user && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role.toLowerCase().replace("_", " ")}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
