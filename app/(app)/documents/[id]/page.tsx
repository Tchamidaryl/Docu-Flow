"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, Send, Edit,
  MessageSquare, History, Clock, User2, FileText, Loader2,
  AlertCircle, Lock, Flag, ChevronRight, Check, X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import StatusBadge from "@/components/documents/StatusBadge";
import PriorityBadge from "@/components/documents/PriorityBadge";

const DocumentEditor = dynamic(() => import("@/components/editor/DocumentEditor"), { ssr: false });

type Tab = "content" | "comments" | "history";

export default function DocumentDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [actionModal, setActionModal] = useState<"approve" | "reject" | "revision" | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (id) fetchDocument();
  }, [id]);

  useEffect(() => {
    if (activeTab === "comments" && id) fetchComments();
    if (activeTab === "history" && id && !history) fetchHistory();
  }, [activeTab, id]);

  async function fetchDocument() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/documents/${id}`);
      const data = await res.json();
      if (res.ok) setDocument(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    const res = await fetch(`/api/v1/documents/${id}/comments`);
    const data = await res.json();
    if (res.ok) setComments(data.data ?? []);
  }

  async function fetchHistory() {
    const res = await fetch(`/api/v1/documents/${id}/history`);
    const data = await res.json();
    if (res.ok) setHistory(data.data);
  }

  async function postComment() {
    if (!newComment.trim()) return;
    setPostingComment(true);
    const res = await fetch(`/api/v1/documents/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment, isInternal: isInternalComment }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments([data.data, ...comments]);
      setNewComment("");
    }
    setPostingComment(false);
  }

  async function performAction() {
    if (!actionModal) return;
    if ((actionModal === "reject" || actionModal === "revision") && !actionComment.trim()) {
      setActionError("A comment is required");
      return;
    }
    setIsActing(true);
    setActionError("");
    const endpoint = actionModal === "approve" ? "approve" : actionModal === "reject" ? "reject" : "revision";
    const res = await fetch(`/api/v1/documents/${id}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: actionComment }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionModal(null);
      setActionComment("");
      await fetchDocument();
    } else {
      setActionError(data.error ?? "Action failed");
    }
    setIsActing(false);
  }

  if (loading) return <DetailSkeleton />;
  if (!document) return <div className="text-center py-20 text-muted-foreground">Document not found</div>;

  const userId = session?.user?.id;
  const role = session?.user?.systemRole ?? "SUBMITTER";
  const snapshot = (document.workflowSnapshot as any[]) ?? [];
  const currentStep = snapshot[document.currentStepIndex];
  const isCurrentApprover = currentStep?.resolvedAssigneeId === userId;
  const canAct = isCurrentApprover && ["PENDING_APPROVAL", "IN_REVIEW"].includes(document.status);
  const isSubmitter = document.submittedBy?.id === userId;
  const canEdit = isSubmitter && ["DRAFT", "REVISION_REQUESTED"].includes(document.status);
  const canSubmit = isSubmitter && ["DRAFT", "REVISION_REQUESTED"].includes(document.status) && document.templateId;
  const canApprove = canAct || ["SUPER_ADMIN", "ADMIN"].includes(role);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/documents" className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground shrink-0 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <StatusBadge status={document.status} />
            <PriorityBadge priority={document.priority} />
            {document.isConfidential && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                <Lock className="w-3 h-3" /> Confidential
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
            {document.title}
          </h1>
          {document.description && (
            <p className="text-sm text-muted-foreground mt-1.5">{document.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <User2 className="w-3.5 h-3.5" />
              {document.submittedBy?.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true })}
            </span>
            {document.dueDate && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <Flag className="w-3.5 h-3.5" />
                Due {format(new Date(document.dueDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <Link
              href={`/documents/${id}/edit`}
              className="flex items-center gap-2 border border-border bg-card text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-muted transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          )}
          {canSubmit && (
            <button
              onClick={async () => {
                const res = await fetch(`/api/v1/documents/${id}/submit`, { method: "POST" });
                if (res.ok) fetchDocument();
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Approval action panel */}
          {canApprove && ["PENDING_APPROVAL", "IN_REVIEW"].includes(document.status) && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200">Your approval is required</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Step {document.currentStepIndex + 1}: <strong>{currentStep?.name}</strong>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActionModal("approve")}
                  className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setActionModal("revision")}
                  className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Request Revision
                </button>
                <button
                  onClick={() => setActionModal("reject")}
                  className="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border w-fit">
            {(["content", "comments", "history"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all",
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {tab === "comments" && document._count?.comments > 0 && (
                  <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {document._count.comments}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "content" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {document.content ? (
                <DocumentEditor content={document.content} contentJson={document.contentJson} editable={false} />
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No written content — document may have attached files.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4">
              {/* Post comment */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <div className="flex items-center justify-between mt-3">
                  {["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER"].includes(role) && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded"
                      />
                      Internal (approvers only)
                    </label>
                  )}
                  <button
                    onClick={postComment}
                    disabled={!newComment.trim() || postingComment}
                    className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 ml-auto"
                  >
                    {postingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post
                  </button>
                </div>
              </div>

              {comments.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl py-10 text-center text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No comments yet
                </div>
              ) : (
                comments.map((c) => <CommentCard key={c.id} comment={c} />)
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-card border border-border rounded-2xl p-6">
              {!history ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : (
                <AuditTimeline logs={history.auditLogs ?? []} />
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Workflow progress */}
          {snapshot.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4">Approval Progress</h3>
              <div className="space-y-3">
                {snapshot.map((step: any, i: number) => {
                  const isComplete = step.status === "approved";
                  const isRejected = step.status === "rejected" || step.status === "revision_requested";
                  const isCurrent = i === document.currentStepIndex && !isComplete && !isRejected;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2",
                        isComplete ? "bg-emerald-500 border-emerald-500 text-white" :
                        isRejected ? "bg-red-500 border-red-500 text-white" :
                        isCurrent ? "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30" :
                        "bg-muted border-border text-muted-foreground"
                      )}>
                        {isComplete ? <Check className="w-3.5 h-3.5" /> :
                         isRejected ? <X className="w-3.5 h-3.5" /> :
                         i + 1}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className={cn(
                          "text-xs font-semibold",
                          isCurrent ? "text-amber-700 dark:text-amber-400" :
                          isComplete ? "text-emerald-700 dark:text-emerald-400" :
                          "text-foreground"
                        )}>
                          {step.name}
                        </p>
                        {step.resolvedAssigneeName && (
                          <p className="text-[11px] text-muted-foreground">{step.resolvedAssigneeName}</p>
                        )}
                        {step.completedAt && (
                          <p className="text-[10px] text-muted-foreground/60">
                            {formatDistanceToNow(new Date(step.completedAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Document info */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Details</h3>
            <dl className="space-y-3">
              {[
                { label: "Template", value: document.template?.name ?? "—" },
                { label: "Department", value: document.submittedBy?.department?.name ?? "—" },
                { label: "Created", value: format(new Date(document.createdAt), "MMM d, yyyy") },
                { label: "Version", value: `v${document.version}` },
                ...(document.dueDate ? [{ label: "Due", value: format(new Date(document.dueDate), "MMM d, yyyy") }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-xs font-medium text-foreground text-right">{value}</dd>
                </div>
              ))}
            </dl>
            {document.tags?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {document.tags.map((tag: string) => (
                    <span key={tag} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-slide-in-up">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                {actionModal === "approve" ? "Approve Document" :
                 actionModal === "reject" ? "Reject Document" :
                 "Request Revision"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {actionModal === "approve"
                  ? "Leave an optional comment before approving this step."
                  : actionModal === "reject"
                  ? "Provide a reason for rejection (required)."
                  : "Describe the changes needed (required)."}
              </p>

              <textarea
                value={actionComment}
                onChange={(e) => { setActionComment(e.target.value); setActionError(""); }}
                placeholder={
                  actionModal === "approve" ? "Optional approval comment…" :
                  actionModal === "reject" ? "Reason for rejection…" :
                  "Describe required changes…"
                }
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {actionError && (
                <p className="text-xs text-destructive mt-1.5">{actionError}</p>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => { setActionModal(null); setActionComment(""); setActionError(""); }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performAction}
                  disabled={isActing}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60",
                    actionModal === "approve" ? "bg-emerald-600 hover:bg-emerald-700" :
                    actionModal === "reject" ? "bg-red-600 hover:bg-red-700" :
                    "bg-violet-600 hover:bg-violet-700"
                  )}
                >
                  {isActing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {actionModal === "approve" ? "Approve" : actionModal === "reject" ? "Reject" : "Request Revision"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentCard({ comment }: { comment: any }) {
  return (
    <div className={cn(
      "bg-card border rounded-2xl p-4",
      comment.isInternal ? "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/10" : "border-border"
    )}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {comment.author?.name?.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{comment.author?.name}</span>
            {comment.author?.jobTitle && <span className="text-xs text-muted-foreground">{comment.author.jobTitle}</span>}
            {comment.isInternal && (
              <span className="text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-0.5 rounded-full">Internal</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-foreground mt-1.5 leading-relaxed">{comment.content}</p>
        </div>
      </div>
      {comment.replies?.length > 0 && (
        <div className="ml-11 mt-3 space-y-2 border-l-2 border-border pl-3">
          {comment.replies.map((r: any) => (
            <div key={r.id} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                {r.author?.name?.charAt(0)}
              </div>
              <div>
                <span className="text-xs font-semibold">{r.author?.name}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditTimeline({ logs }: { logs: any[] }) {
  const ACTION_META: Record<string, { emoji: string; color: string }> = {
    CREATED: { emoji: "📄", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30" },
    SUBMITTED: { emoji: "📤", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30" },
    APPROVED: { emoji: "✅", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" },
    REJECTED: { emoji: "❌", color: "bg-red-100 text-red-600 dark:bg-red-900/30" },
    REVISION_REQUESTED: { emoji: "✏️", color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30" },
    COMMENTED: { emoji: "💬", color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30" },
    DELEGATED: { emoji: "↩️", color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30" },
    VIEWED: { emoji: "👁️", color: "bg-gray-100 text-gray-500 dark:bg-gray-800" },
  };

  if (logs.length === 0) return (
    <div className="text-center py-8 text-muted-foreground text-sm">No audit history yet</div>
  );

  return (
    <div className="relative space-y-4">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      {logs.map((log, i) => {
        const meta = ACTION_META[log.action] ?? { emoji: "📌", color: "bg-muted" };
        return (
          <div key={log.id ?? i} className="flex items-start gap-4 relative">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 z-10 border-2 border-background", meta.color)}>
              {meta.emoji}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{log.actor?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {log.action.toLowerCase().replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </p>
              {(log.details as any)?.comment && (
                <p className="text-xs bg-muted/50 rounded-lg px-3 py-2 mt-1.5 text-muted-foreground italic">
                  "{(log.details as any).comment}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 skeleton rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-64 skeleton rounded" />
          <div className="h-4 w-32 skeleton rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 skeleton rounded-2xl" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    </div>
  );
}
