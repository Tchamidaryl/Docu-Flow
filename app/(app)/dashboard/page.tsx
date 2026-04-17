"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText, CheckCircle2, Clock, XCircle, AlertCircle,
  TrendingUp, ArrowRight, RotateCcw, Flame,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils/cn";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  PENDING_APPROVAL: "#f59e0b",
  IN_REVIEW: "#0ea5e9",
  APPROVED: "#10b981",
  REJECTED: "#ef4444",
  REVISION_REQUESTED: "#8b5cf6",
  EXPIRED: "#f97316",
  CANCELLED: "#6b7280",
};

const AUDIT_ACTION_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  CREATED:            { label: "Created",           color: "text-blue-600",   emoji: "📄" },
  SUBMITTED:          { label: "Submitted",          color: "text-amber-600",  emoji: "📤" },
  APPROVED:           { label: "Approved",           color: "text-emerald-600",emoji: "✅" },
  REJECTED:           { label: "Rejected",           color: "text-red-600",    emoji: "❌" },
  REVISION_REQUESTED: { label: "Revision requested", color: "text-violet-600", emoji: "✏️" },
  COMMENTED:          { label: "Commented",          color: "text-sky-600",    emoji: "💬" },
  DELEGATED:          { label: "Delegated",          color: "text-indigo-600", emoji: "↩️" },
  VIEWED:             { label: "Viewed",             color: "text-gray-500",   emoji: "👁️" },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/dashboard")
      .then((r) => r.json())
      .then((d) => { setStats(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const overview = stats?.overview ?? {};
  const charts = stats?.charts ?? {};
  const activity = stats?.recentActivity ?? [];

  const statCards = [
    {
      label: "Total Documents",
      value: overview.totalDocuments ?? 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      href: "/documents",
    },
    {
      label: "Pending My Action",
      value: overview.pendingMyAction ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      href: "/documents?view=pending_my_action",
      highlight: (overview.pendingMyAction ?? 0) > 0,
    },
    {
      label: "Approved (30d)",
      value: overview.approved ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      href: "/documents?status=APPROVED",
    },
    {
      label: "Needs Revision",
      value: overview.revisionRequested ?? 0,
      icon: RotateCcw,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      href: "/documents?status=REVISION_REQUESTED",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
            Good {getGreeting()}, {session?.user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s what&apos;s happening with your documents today.
          </p>
        </div>
        <Link
          href="/documents/new"
          className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <FileText className="w-4 h-4" />
          New Document
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              "group relative bg-card rounded-2xl border p-5 card-hover",
              card.highlight ? "border-amber-300 dark:border-amber-700 shadow-amber-100 dark:shadow-amber-950/20 shadow-md" : "border-border"
            )}
          >
            {card.highlight && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
              {card.value}
            </p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <ArrowRight className="absolute bottom-5 right-5 w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approval trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Approval Trend</h3>
              <p className="text-xs text-muted-foreground">Approvals over last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={charts.approvalTrend ?? []}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(new Date(d), "MMM d")}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                }}
                labelFormatter={(d) => format(new Date(d), "MMMM d, yyyy")}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2.5}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-1">Status Distribution</h3>
          <p className="text-xs text-muted-foreground mb-6">Last 30 days</p>
          {(charts.statusBreakdown ?? []).length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={charts.statusBreakdown}
                    dataKey="_count"
                    nameKey="status"
                    innerRadius={45}
                    outerRadius={70}
                    strokeWidth={2}
                  >
                    {(charts.statusBreakdown ?? []).map((entry: any) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {(charts.statusBreakdown ?? []).map((entry: any) => (
                  <div key={entry.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: STATUS_COLORS[entry.status] ?? "#94a3b8" }}
                      />
                      <span className="text-muted-foreground capitalize">
                        {entry.status.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">{entry._count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Priority breakdown + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-1">By Priority</h3>
          <p className="text-xs text-muted-foreground mb-6">Active documents</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={charts.priorityBreakdown ?? []} barSize={32}>
              <XAxis
                dataKey="priority"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.charAt(0) + v.slice(1).toLowerCase()}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }}
              />
              <Bar dataKey="_count" radius={[6, 6, 0, 0]}>
                {(charts.priorityBreakdown ?? []).map((entry: any) => {
                  const colors: Record<string, string> = {
                    LOW: "#94a3b8", NORMAL: "#3b82f6", HIGH: "#f97316", URGENT: "#ef4444",
                  };
                  return <Cell key={entry.priority} fill={colors[entry.priority] ?? "#3b82f6"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground">Recent Activity</h3>
            <Link href="/documents" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-1">
            {activity.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent activity
              </div>
            ) : (
              activity.map((log: any, i: number) => {
                const meta = AUDIT_ACTION_LABELS[log.action] ?? { label: log.action, color: "text-muted-foreground", emoji: "📄" };
                return (
                  <Link
                    key={log.id ?? i}
                    href={log.document ? `/documents/${log.document.id}` : "#"}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <span className="text-base mt-0.5">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{log.actor?.name}</span>
                        <span className={cn("text-xs", meta.color)}>{meta.label}</span>
                        {log.document && (
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                            &quot;{log.document.title}&quot;
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
      <div className="h-10 w-56 skeleton rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 skeleton rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 skeleton rounded-2xl" />
        <div className="h-72 skeleton rounded-2xl" />
      </div>
    </div>
  );
}
