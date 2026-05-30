"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, BookTemplate, Edit, Trash2, X, Loader2,
  CheckCircle2, AlertCircle, ChevronRight, Clock,
  ArrowUp, ArrowDown, Users2, UserCheck, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApproverStep {
  id:              string; // client-only key
  name:            string; // step label
  assignedUserId:  string; // specific user
  useManagerOf:    boolean;
  timeoutHours:    number;
  requiresComment: boolean;
  canDelegate:     boolean;
}

interface Template {
  id:          string;
  name:        string;
  description: string;
  category:    string;
  slaHours:    number | null;
  isDefault:   boolean;
  steps:       any[];
  _count:      { documents: number };
}

const CATEGORIES = ["General","HR","Finance","Legal","Operations","IT","Procurement"];

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ADMIN:       "bg-blue-100 text-blue-700",
  MANAGER:     "bg-violet-100 text-violet-700",
  APPROVER:    "bg-emerald-100 text-emerald-700",
  REVIEWER:    "bg-amber-100 text-amber-700",
  SUBMITTER:   "bg-gray-100 text-gray-600",
};

let stepCounter = 0;
function newStep(): ApproverStep {
  return {
    id:              `step-${++stepCounter}`,
    name:            "",
    assignedUserId:  "",
    useManagerOf:    false,
    timeoutHours:    48,
    requiresComment: false,
    canDelegate:     true,
  };
}

const IC =
    "w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground";

export default function TemplatesPage() {
  const { data: session }             = useSession();
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [allUsers, setAllUsers]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editingTpl, setEditingTpl]   = useState<Template | null>(null);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  // Form state
  const [tplName, setTplName]         = useState("");
  const [tplDesc, setTplDesc]         = useState("");
  const [tplCategory, setTplCategory] = useState("General");
  const [tplSla, setTplSla]           = useState<number | "">("");
  const [steps, setSteps]             = useState<ApproverStep[]>([newStep()]);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");

  const canManage = ["SUPER_ADMIN","ADMIN","MANAGER"].includes(session?.user?.systemRole ?? "");

  const showMsg = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/templates").then((r) => r.json()),
      fetch("/api/v1/users?limit=200").then((r) => r.json()),
    ]).then(([tData, uData]) => {
      setTemplates(tData.data ?? []);
      setAllUsers(uData.data?.items ?? []);
      setLoading(false);
    });
  }, []);

  // ── Form helpers ───────────────────────────────────────────────────────

  function openCreate() {
    setEditingTpl(null);
    setTplName(""); setTplDesc(""); setTplCategory("General"); setTplSla("");
    setSteps([newStep()]);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(tpl: Template) {
    setEditingTpl(tpl);
    setTplName(tpl.name);
    setTplDesc(tpl.description ?? "");
    setTplCategory(tpl.category ?? "General");
    setTplSla(tpl.slaHours ?? "");
    setSteps(tpl.steps.map((s: any) => ({
      id:              `step-${++stepCounter}`,
      name:            s.name,
      assignedUserId:  s.assignedUserId ?? "",
      useManagerOf:    s.useManagerOf,
      timeoutHours:    s.timeoutHours ?? 48,
      requiresComment: s.requiresComment,
      canDelegate:     s.canDelegate,
    })));
    setFormError("");
    setShowForm(true);
  }

  function addStep()        { setSteps((prev) => [...prev, newStep()]); }
  function removeStep(id: string)  { setSteps((prev) => prev.filter((s) => s.id !== id)); }
  function moveStep(id: string, dir: -1 | 1) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const to   = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  }
  function updateStep(id: string, patch: Partial<ApproverStep>) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  async function saveTemplate() {
    setFormError("");
    if (!tplName.trim()) { setFormError("Template name is required"); return; }
    if (steps.length === 0) { setFormError("Add at least one approval step"); return; }

    // Validate each step has a name and an assignee (user or auto-assign)
    for (let i = 0; i < steps.length; i++) {
      if (!steps[i].name.trim()) { setFormError(`Step ${i + 1}: name is required`); return; }
      if (!steps[i].useManagerOf && !steps[i].assignedUserId) {
        setFormError(`Step ${i + 1}: choose an approver or enable "auto-assign to manager"`); return;
      }
    }

    setSaving(true);
    const payload = {
      name:        tplName,
      description: tplDesc,
      category:    tplCategory,
      slaHours:    tplSla !== "" ? Number(tplSla) : undefined,
      steps: steps.map((s, i) => ({
        stepOrder:       i + 1,
        name:            s.name,
        actionType:      "SEQUENTIAL",
        assignedUserId:  s.useManagerOf ? undefined : s.assignedUserId || undefined,
        useManagerOf:    s.useManagerOf,
        isRequired:      true,
        timeoutHours:    s.timeoutHours || undefined,
        requiresComment: s.requiresComment,
        canDelegate:     s.canDelegate,
      })),
    };

    const url    = editingTpl ? `/api/v1/templates/${editingTpl.id}` : "/api/v1/templates";
    const method = editingTpl ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data   = await res.json();
    setSaving(false);

    if (res.ok) {
      showMsg(editingTpl ? "Template updated" : "Template created");
      setShowForm(false);
      // Refresh
      const fresh = await fetch("/api/v1/templates").then((r) => r.json());
      setTemplates(fresh.data ?? []);
    } else {
      setFormError(data.error ?? "Failed to save template");
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/v1/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      showMsg("Template deleted");
    }
  }

  const CATEGORY_COLORS: Record<string, string> = {
    HR: "bg-violet-100 text-violet-700", Finance: "bg-emerald-100 text-emerald-700",
    Legal: "bg-blue-100 text-blue-700",  Operations: "bg-amber-100 text-amber-700",
    IT: "bg-sky-100 text-sky-700",       General: "bg-gray-100 text-gray-600",
  };

  // Users who can be approvers (everyone except pure submitters, but show all)
  const approverUsers = allUsers.filter((u) => u.isActive);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {toast && (
        <div className={cn("fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-in-up",
          toast.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Approval Templates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define who approves documents and in what order
          </p>
        </div>
        {canManage && !showForm && (
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>

      {/* Sequential rule info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 mb-6">
        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Sequential approval enforcement</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
            All workflows are <strong>strictly sequential</strong>. Each approver can see the document immediately, but cannot approve or reject until all previous approvers in the chain have approved. Rejections stop the workflow at any step.
          </p>
        </div>
      </div>

      <div className={cn("grid gap-6", showForm ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>

        {/* ── Templates list ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {loading ? (
            [...Array(3)].map((_,i) => <div key={i} className="h-40 skeleton rounded-2xl" />)
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
              <BookTemplate className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold">No templates yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first approval workflow</p>
              {canManage && (
                <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl">
                  <Plus className="w-3.5 h-3.5" /> Create Template
                </button>
              )}
            </div>
          ) : templates.map((tpl) => (
            <div key={tpl.id} className="bg-card border border-border rounded-2xl p-5 group hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                    {tpl.isDefault && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Default</span>}
                    {tpl.category && (
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", CATEGORY_COLORS[tpl.category] ?? CATEGORY_COLORS.General)}>
                        {tpl.category}
                      </span>
                    )}
                  </div>
                  {tpl.description && <p className="text-xs text-muted-foreground">{tpl.description}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(tpl)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteTemplate(tpl.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Visual step chain */}
              <div className="space-y-1.5">
                {tpl.steps?.map((step: any, i: number) => {
                  const user = allUsers.find((u) => u.id === step.assignedUserId);
                  return (
                    <div key={step.id ?? i} className="flex items-center gap-2">
                      {/* Step number */}
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {i + 1}
                      </div>
                      {/* Step info */}
                      <div className="flex-1 flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-medium text-foreground">{step.name}</span>
                        <span className="text-muted-foreground/40">·</span>
                        {step.useManagerOf ? (
                          <span className="text-xs text-muted-foreground italic">Submitter&apos;s manager</span>
                        ) : user ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                              {user.name?.charAt(0)}
                            </div>
                            <span className="text-xs text-muted-foreground">{user.name}</span>
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", ROLE_COLORS[user.systemRole])}>
                              {user.systemRole.replace("_"," ")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">No assignee</span>
                        )}
                        {step.requiresComment && <span className="ml-auto text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Comment required</span>}
                      </div>
                      {i < tpl.steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-2.5 border-t border-border/50">
                <span className="flex items-center gap-1"><Users2 className="w-3.5 h-3.5" />{tpl.steps?.length ?? 0} approver{(tpl.steps?.length ?? 0) !== 1 ? "s" : ""}</span>
                {tpl.slaHours && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{tpl.slaHours}h SLA</span>}
                <span className="ml-auto">{tpl._count?.documents ?? 0} doc{(tpl._count?.documents ?? 0) > 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Create / Edit form ──────────────────────────────────────── */}
        {showForm && (
          <div className="bg-card border border-border rounded-2xl sticky top-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                {editingTpl ? "Edit Template" : "New Template"}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingTpl(null); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Template Name *</label>
                  <input value={tplName} onChange={(e) => setTplName(e.target.value)}
                    placeholder="e.g. HR Document Approval" className={IC} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <select value={tplCategory} onChange={(e) => setTplCategory(e.target.value)} className={IC}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Total SLA (hours)</label>
                  <input value={tplSla} onChange={(e) => setTplSla(e.target.value === "" ? "" : Number(e.target.value))}
                    type="number" placeholder="e.g. 120" className={IC} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <input value={tplDesc} onChange={(e) => setTplDesc(e.target.value)}
                    placeholder="When is this workflow used?" className={IC} />
                </div>
              </div>

              {/* Approver steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-sm font-semibold">Approval Chain *</label>
                    <p className="text-xs text-muted-foreground">Pick approvers in order. Step 2 sees the doc but waits for Step 1 to approve first.</p>
                  </div>
                  <button type="button" onClick={addStep}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Add step
                  </button>
                </div>

                <div className="space-y-3">
                  {steps.map((step, index) => {
                    const selectedUser = approverUsers.find((u) => u.id === step.assignedUserId);
                    return (
                      <div key={step.id} className="border border-border rounded-xl p-4 space-y-3 bg-muted/10">
                        {/* Step header */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {index + 1}
                          </div>
                          <input value={step.name} onChange={(e) => updateStep(step.id, { name: e.target.value })}
                            placeholder={`Step ${index + 1} name (e.g. Manager Approval)`}
                            className={cn(IC, "text-sm py-2 flex-1")} />
                          {/* Move up/down */}
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={() => moveStep(step.id, -1)} disabled={index === 0}
                              className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => moveStep(step.id, 1)} disabled={index === steps.length - 1}
                              className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                          {steps.length > 1 && (
                            <button type="button" onClick={() => removeStep(step.id)}
                              className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Assignee section */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground block">Who approves this step?</label>

                          {/* Auto-assign toggle */}
                          <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                            <div className={cn("w-8 h-4 rounded-full transition-colors relative shrink-0", step.useManagerOf ? "bg-primary" : "bg-muted-foreground/30")}>
                              <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform", step.useManagerOf ? "left-4" : "left-0.5")} />
                            </div>
                            <input type="checkbox" checked={step.useManagerOf} className="sr-only"
                              onChange={(e) => updateStep(step.id, { useManagerOf: e.target.checked, assignedUserId: e.target.checked ? "" : step.assignedUserId })} />
                            <div>
                              <p className="text-xs font-medium">Auto-assign to submitter&apos;s manager</p>
                              <p className="text-[10px] text-muted-foreground">Dynamically resolved when document is submitted</p>
                            </div>
                          </label>

                          {/* Specific user picker */}
                          {!step.useManagerOf && (
                            <div className="space-y-2">
                              <select value={step.assignedUserId} onChange={(e) => updateStep(step.id, { assignedUserId: e.target.value })}
                                className={cn(IC, "text-sm py-2")}>
                                <option value="">— Select approver —</option>
                                {approverUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}  ({u.systemRole.replace("_"," ")}) {u.department?.name ? `· ${u.department.name}` : ""}
                                  </option>
                                ))}
                              </select>

                              {/* Selected user card */}
                              {selectedUser && (
                                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                    {selectedUser.name?.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{selectedUser.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{selectedUser.jobTitle || selectedUser.systemRole.replace("_", " ")} · {selectedUser.department?.name ?? "No dept"}</p>
                                  </div>
                                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0", ROLE_COLORS[selectedUser.systemRole])}>
                                    {selectedUser.systemRole.replace("_"," ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Step options */}
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Timeout (hours)</label>
                            <input value={step.timeoutHours} onChange={(e) => updateStep(step.id, { timeoutHours: Number(e.target.value) })}
                              type="number" min={1} placeholder="48" className={cn(IC, "text-xs py-1.5")} />
                          </div>
                          <div className="space-y-1.5 pt-3">
                            {[
                              { field: "requiresComment" as const, label: "Comment required to approve" },
                              { field: "canDelegate"     as const, label: "Can delegate to another" },
                            ].map(({ field, label }) => (
                              <label key={field} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={step[field]}
                                  onChange={(e) => updateStep(step.id, { [field]: e.target.checked })}
                                  className="rounded w-3.5 h-3.5" />
                                <span className="text-[11px] text-muted-foreground">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Visual chain preview */}
                {steps.length > 1 && (
                  <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Approval order preview</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {steps.map((s, i) => {
                        const u = approverUsers.find((u) => u.id === s.assignedUserId);
                        return (
                          <div key={s.id} className="flex items-center gap-1">
                            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5">
                              <span className="text-[9px] font-bold text-primary">Step {i+1}</span>
                              <span className="text-[10px] text-foreground font-medium">
                                {s.useManagerOf ? "Manager" : u?.name ?? "?"}
                              </span>
                            </div>
                            {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-1 ml-1">
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2.5 py-1.5">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">✓ Approved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{formError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => { setShowForm(false); setEditingTpl(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={saveTemplate} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTpl ? "Update Template" : "Create Template"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

