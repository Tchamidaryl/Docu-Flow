"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Filter, FileText, Clock, CheckCircle2, XCircle,
  RotateCcw, AlertTriangle, ChevronRight, Calendar, Tag, User2,
  SlidersHorizontal, LayoutGrid, List,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import StatusBadge from "@/components/documents/StatusBadge";
import PriorityBadge from "@/components/documents/PriorityBadge";

const TABS = [
  { key: "mine",               label: "My Documents",    icon: FileText },
  { key: "pending_my_action",  label: "Pending Action",  icon: Clock },
  { key: "all",                label: "All Documents",   icon: LayoutGrid, adminOnly: true },
];

const STATUS_FILTERS = [
  "All", "DRAFT", "PENDING_APPROVAL", "IN_REVIEW", "APPROVED", "REJECTED", "REVISION_REQUESTED",
];

const PRIORITY_FILTERS = ["All", "URGENT", "HIGH", "NORMAL", "LOW"];

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") ?? "mine") as string;
  const statusParam = searchParams.get("status") ?? "";
  const priorityParam = searchParams.get("priority") ?? "";

  const [documents, setDocuments] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("view", view);
    if (statusParam) params.set("status", statusParam);
    if (priorityParam) params.set("priority", priorityParam);
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/v1/documents?${params}`);
      const data = await res.json();
      setDocuments(data.data?.items ?? []);
      setPagination(data.data?.pagination ?? {});
    } catch {}
    setLoading(false);
  }, [view, statusParam, priorityParam, debouncedSearch]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "All") p.set(key, value);
    else p.delete(key);
    router.push(`/documents?${p.toString()}`);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Documents</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pagination.total ?? 0} document{pagination.total > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/documents/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          New Document
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setParam("view", tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              view === tab.key
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusParam || "All"}
          onChange={(e) => setParam("status", e.target.value)}
          className="text-sm bg-card border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All Statuses" : s.replace(/_/g, " ")}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={priorityParam || "All"}
          onChange={(e) => setParam("priority", e.target.value)}
          className="text-sm bg-card border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
        >
          {PRIORITY_FILTERS.map((p) => (
            <option key={p} value={p}>{p === "All" ? "All Priorities" : p}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border">
          <button onClick={() => setLayout("list")} className={cn("p-2 rounded-lg transition-all", layout === "list" ? "bg-card shadow-sm" : "hover:bg-muted/80")}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setLayout("grid")} className={cn("p-2 rounded-lg transition-all", layout === "grid" ? "bg-card shadow-sm" : "hover:bg-muted/80")}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <DocumentsSkeleton layout={layout} />
      ) : documents.length === 0 ? (
        <EmptyState view={view} />
      ) : layout === "list" ? (
        <DocumentTable documents={documents} />
      ) : (
        <DocumentGrid documents={documents} />
      )}
    </div>
  );
}

function DocumentTable({ documents }: { documents: any[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wide">Document</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden md:table-cell">Status</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden lg:table-cell">Priority</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden lg:table-cell">Submitted By</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden xl:table-cell">Updated</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, i) => (
            <tr
              key={doc.id}
              className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group"
            >
              <td className="px-5 py-4">
                <Link href={`/documents/${doc.id}`} className="block">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {doc.title}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>
                      )}
                      {doc.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {doc.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-4 hidden md:table-cell">
                <StatusBadge status={doc.status} />
              </td>
              <td className="px-4 py-4 hidden lg:table-cell">
                <PriorityBadge priority={doc.priority} />
              </td>
              <td className="px-4 py-4 hidden lg:table-cell">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {doc.submittedBy?.name?.charAt(0)}
                  </div>
                  <span className="text-sm text-muted-foreground truncate max-w-[100px]">{doc.submittedBy?.name}</span>
                </div>
              </td>
              <td className="px-4 py-4 hidden xl:table-cell text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
              </td>
              <td className="px-3 py-4">
                <Link href={`/documents/${doc.id}`}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentGrid({ documents }: { documents: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/documents/${doc.id}`}
          className="group bg-card border border-border rounded-2xl p-5 card-hover flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <StatusBadge status={doc.status} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {doc.title}
            </h3>
            {doc.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{doc.description}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                {doc.submittedBy?.name?.charAt(0)}
              </div>
              <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">{doc.submittedBy?.name}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
            </span>
          </div>
          {doc.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {doc.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function EmptyState({ view }: { view: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">No documents found</h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
        {view === "pending_my_action"
          ? "You have no documents awaiting your action right now."
          : "Get started by creating your first document."}
      </p>
      {view !== "pending_my_action" && (
        <Link
          href="/documents/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Document
        </Link>
      )}
    </div>
  );
}

function DocumentsSkeleton({ layout }: { layout: "list" | "grid" }) {
  return layout === "list" ? (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0">
          <div className="w-8 h-8 skeleton rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 skeleton rounded" />
            <div className="h-3 w-64 skeleton rounded" />
          </div>
          <div className="h-6 w-20 skeleton rounded-full" />
        </div>
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-44 skeleton rounded-2xl" />
      ))}
    </div>
  );
}
