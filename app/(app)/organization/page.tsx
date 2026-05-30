"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2, Plus, Trash2, Edit, X, Loader2,
  CheckCircle2, AlertCircle, Users, GitBranch, Save,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const orgSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
});

const deptSchema = z.object({
  name:        z.string().min(1, "Department name is required"),
  description: z.string().optional(),
  parentId:    z.string().optional(),
});

type OrgForm  = z.infer<typeof orgSchema>;
type DeptForm = z.infer<typeof deptSchema>;

export default function OrganizationPage() {
  const { data: session } = useSession();
  const [org, setOrg]               = useState<any>(null);
  const [departments, setDepts]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept]  = useState<any>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session?.user?.systemRole ?? "");

  const showMsg = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const orgForm = useForm<OrgForm>({ resolver: zodResolver(orgSchema) });
  const deptForm = useForm<DeptForm>({ resolver: zodResolver(deptSchema) });

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/organization").then((r) => r.json()),
      fetch("/api/v1/departments").then((r) => r.json()),
    ]).then(([orgData, deptData]) => {
      const o = orgData.data;
      const d = deptData.data ?? [];
      setOrg(o);
      setDepts(d);
      orgForm.reset({ name: o?.name ?? "" });
      setLoading(false);
    });
  }, []);

  async function onSaveOrg(data: OrgForm) {
    const res = await fetch("/api/v1/organization", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: data.name }),
    });
    if (res.ok) {
      const d = await res.json();
      setOrg(d.data);
      showMsg("Organization updated");
    } else {
      showMsg("Failed to update organization", false);
    }
  }

  async function onSaveDept(data: DeptForm) {
    const url    = editingDept ? `/api/v1/departments/${editingDept.id}` : "/api/v1/departments";
    const method = editingDept ? "PATCH" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (res.ok) {
      const d = await res.json();
      if (editingDept) {
        setDepts((prev) => prev.map((dep) => dep.id === editingDept.id ? d.data : dep));
      } else {
        setDepts((prev) => [...prev, d.data]);
      }
      showMsg(editingDept ? "Department updated" : "Department created");
      setShowDeptForm(false);
      setEditingDept(null);
      deptForm.reset();
    } else {
      showMsg("Failed to save department", false);
    }
  }

  async function deleteDept(id: string) {
    if (!confirm("Delete this department? Users in it will be unassigned.")) return;
    const res = await fetch(`/api/v1/departments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDepts((prev) => prev.filter((d) => d.id !== id));
      showMsg("Department deleted");
    } else {
      showMsg("Failed to delete department", false);
    }
  }

  function openEditDept(dept: any) {
    setEditingDept(dept);
    deptForm.reset({ name: dept.name, description: dept.description ?? "", parentId: dept.parentId ?? "" });
    setShowDeptForm(true);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-56 skeleton rounded-xl" />
        <div className="h-48 skeleton rounded-2xl" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-in-up",
          toast.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
        )}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
          Organization
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organization settings and departments
        </p>
      </div>

      {/* Org info card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
              {org?.name}
            </h3>
            <p className="text-sm text-muted-foreground font-mono">{org?.slug}</p>
          </div>
        </div>

        {isAdmin ? (
          <form onSubmit={orgForm.handleSubmit(onSaveOrg)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Organization Name</label>
              <input
                {...orgForm.register("name")}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {orgForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{orgForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Slug (read-only)</label>
              <input
                value={org?.slug ?? ""}
                disabled
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-input bg-muted font-mono opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">The slug cannot be changed after creation.</p>
            </div>
            <button
              type="submit"
              disabled={orgForm.formState.isSubmitting}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {orgForm.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{org?.name}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Slug</span>
              <span className="text-sm font-mono">{org?.slug}</span>
            </div>
          </div>
        )}
      </div>

      {/* Departments card */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
              Departments
            </h3>
            <p className="text-xs text-muted-foreground">{departments.length} department{departments.length !== 1 ? "s" : ""}</p>
          </div>
          {isAdmin && !showDeptForm && (
            <button
              onClick={() => { setShowDeptForm(true); setEditingDept(null); deptForm.reset(); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Department
            </button>
          )}
        </div>

        {/* Add/Edit form */}
        {showDeptForm && (
          <div className="mb-5 p-4 rounded-xl bg-muted/40 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{editingDept ? "Edit Department" : "New Department"}</p>
              <button
                onClick={() => { setShowDeptForm(false); setEditingDept(null); deptForm.reset(); }}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={deptForm.handleSubmit(onSaveDept)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Name *</label>
                  <input
                    {...deptForm.register("name")}
                    placeholder="e.g. Engineering"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {deptForm.formState.errors.name && (
                    <p className="text-xs text-destructive mt-0.5">{deptForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Parent Department</label>
                  <Controller
                    name="parentId"
                    control={deptForm.control}
                    render={({ field }) => (
                      <select {...field} value={field.value ?? ""} className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">None (top level)</option>
                        {departments
                          .filter((d) => d.id !== editingDept?.id)
                          .map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                      </select>
                    )}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Description</label>
                <input
                  {...deptForm.register("description")}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeptForm(false); setEditingDept(null); deptForm.reset(); }}
                  className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptForm.formState.isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60"
                >
                  {deptForm.formState.isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingDept ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {departments.length === 0 ? (
          <div className="text-center py-10">
            <GitBranch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No departments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {departments.map((dept) => {
              const parent = departments.find((d) => d.id === dept.parentId);
              return (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {dept.parentId && (
                      <div className="w-4 h-4 border-l-2 border-b-2 border-border rounded-bl ml-2 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{dept.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {dept.description && (
                          <span className="text-xs text-muted-foreground">{dept.description}</span>
                        )}
                        {parent && (
                          <span className="text-xs text-muted-foreground">
                            under <span className="font-medium">{parent.name}</span>
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {dept._count?.users ?? 0} users
                        </span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditDept(dept)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteDept(dept.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
