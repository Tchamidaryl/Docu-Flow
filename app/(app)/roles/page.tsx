"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Shield, Plus, Edit, Trash2, X, Loader2, CheckCircle2, Users } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils/cn";

const ALL_PERMISSIONS = [
  { group: "Documents",   perms: [
    { key: "document:create",       label: "Create documents" },
    { key: "document:read:own",     label: "View own documents" },
    { key: "document:read:all",     label: "View all documents" },
    { key: "document:read:dept",    label: "View department documents" },
    { key: "document:edit:own",     label: "Edit own documents" },
    { key: "document:edit:all",     label: "Edit any document" },
    { key: "document:delete:own",   label: "Delete own documents" },
    { key: "document:cancel:own",   label: "Cancel own documents" },
    { key: "document:submit",       label: "Submit for approval" },
  ]},
  { group: "Approvals",   perms: [
    { key: "approval:approve",          label: "Approve documents" },
    { key: "approval:reject",           label: "Reject documents" },
    { key: "approval:request_revision", label: "Request revision" },
    { key: "approval:delegate",         label: "Delegate approvals" },
    { key: "approval:bypass",           label: "Bypass workflow" },
  ]},
  { group: "Templates",   perms: [
    { key: "template:create", label: "Create templates" },
    { key: "template:read",   label: "View templates" },
    { key: "template:edit",   label: "Edit templates" },
    { key: "template:delete", label: "Delete templates" },
  ]},
  { group: "Users",       perms: [
    { key: "user:read",        label: "View users" },
    { key: "user:invite",      label: "Invite users" },
    { key: "user:edit",        label: "Edit users" },
    { key: "user:deactivate",  label: "Deactivate users" },
    { key: "user:assign_role", label: "Assign roles" },
  ]},
  { group: "Reports",     perms: [
    { key: "reports:view", label: "View reports" },
    { key: "audit:view",   label: "View audit logs" },
  ]},
];

const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#0891b2","#7c3aed","#059669","#dc2626","#d97706"];

const schema = z.object({
  name:        z.string().min(2, "Name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
  color:       z.string(),
});

type FormData = z.infer<typeof schema>;

export default function RolesPage() {
  const { data: session } = useSession();
  const [roles, setRoles]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole]   = useState<any>(null);
  const [toast, setToast]         = useState<string | null>(null);

  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session?.user?.systemRole ?? "");

  useEffect(() => { fetchRoles(); }, []);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res  = await fetch("/api/v1/roles");
      const data = await res.json();
      setRoles(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { permissions: [], color: COLORS[0] },
  });

  function openEdit(role: any) {
    setEditRole(role);
    form.reset({ name: role.name, description: role.description ?? "", permissions: role.permissions, color: role.color ?? COLORS[0] });
  }

  async function onSubmit(data: FormData) {
    const method  = editRole ? "PATCH" : "POST";
    const url     = editRole ? `/api/v1/roles/${editRole.id}` : "/api/v1/roles";
    const res     = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      showMsg(editRole ? "Role updated" : "Role created");
      setShowCreate(false);
      setEditRole(null);
      form.reset({ permissions: [], color: COLORS[0] });
      fetchRoles();
    }
  }

  async function deleteRole(id: string) {
    if (!confirm("Delete this role? Users with this role will lose its permissions.")) return;
    const res = await fetch(`/api/v1/roles/${id}`, { method: "DELETE" });
    if (res.ok) { showMsg("Role deleted"); fetchRoles(); }
  }

  const isEditing = showCreate || !!editRole;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {toast && (
        <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-sm font-medium animate-slide-in-up">
          <CheckCircle2 className="w-4 h-4" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Custom Roles</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define roles with specific permissions beyond the system defaults
          </p>
        </div>
        {isAdmin && !isEditing && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role list */}
        <div className={cn("space-y-3", isEditing ? "lg:col-span-1" : "lg:col-span-3")}>
          {loading ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)
          ) : roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card border border-border rounded-2xl">
              <Shield className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-foreground">No custom roles yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Create roles to assign specific permissions</p>
              {isAdmin && (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl">
                  <Plus className="w-3.5 h-3.5" /> Create First Role
                </button>
              )}
            </div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="bg-card border border-border rounded-2xl p-5 group hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: (role.color ?? "#3b82f6") + "20" }}>
                      <Shield className="w-4.5 h-4.5" style={{ color: role.color ?? "#3b82f6" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{role.name}</p>
                      {role.description && <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteRole(role.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions?.slice(0, 6).map((p: string) => (
                    <span key={p} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {p.replace(/:/g, " › ")}
                    </span>
                  ))}
                  {role.permissions?.length > 6 && (
                    <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                      +{role.permissions.length - 6} more
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {role._count?.users ?? 0} user{(role._count?.users ?? 0) !== 1 ? "s" : ""} assigned
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create / Edit form */}
        {isEditing && (
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {editRole ? `Edit: ${editRole.name}` : "Create New Role"}
                </h3>
                <button onClick={() => { setShowCreate(false); setEditRole(null); form.reset({ permissions: [], color: COLORS[0] }); }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Role Name *</label>
                    <input {...form.register("name")} placeholder="e.g. Legal Reviewer" className="w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Color</label>
                    <Controller name="color" control={form.control} render={({ field }) => (
                      <div className="flex gap-2 flex-wrap">
                        {COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => field.onChange(c)}
                            className={cn("w-7 h-7 rounded-full border-2 transition-all", field.value === c ? "border-foreground scale-110" : "border-transparent")}
                            style={{ background: c }} />
                        ))}
                      </div>
                    )} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <input {...form.register("description")} placeholder="What is this role for?" className="w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                {/* Permissions */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Permissions *
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      {form.watch("permissions")?.length ?? 0} selected
                    </span>
                  </label>
                  {form.formState.errors.permissions && (
                    <p className="text-xs text-destructive mb-2">{form.formState.errors.permissions.message}</p>
                  )}
                  <Controller name="permissions" control={form.control} render={({ field }) => (
                    <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                      {ALL_PERMISSIONS.map((group) => (
                        <div key={group.group}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.group}</p>
                            <button type="button" onClick={() => {
                              const groupKeys  = group.perms.map((p) => p.key);
                              const allChecked = groupKeys.every((k) => field.value.includes(k));
                              if (allChecked) {
                                field.onChange(field.value.filter((k) => !groupKeys.includes(k)));
                              } else {
                                field.onChange([...new Set([...field.value, ...groupKeys])]);
                              }
                            }} className="text-[10px] text-primary hover:underline">
                              {group.perms.every((p) => field.value.includes(p.key)) ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {group.perms.map((perm) => {
                              const checked = field.value.includes(perm.key);
                              return (
                                <label key={perm.key}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors",
                                    checked ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                                  )}>
                                  <input type="checkbox" checked={checked} className="sr-only"
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        field.onChange([...field.value, perm.key]);
                                      } else {
                                        field.onChange(field.value.filter((k) => k !== perm.key));
                                      }
                                    }} />
                                  <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0", checked ? "bg-primary border-primary" : "border-border")}>
                                    {checked && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                                  </div>
                                  {perm.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )} />
                </div>

                <div className="flex gap-3 pt-2 border-t border-border">
                  <button type="button"
                    onClick={() => { setShowCreate(false); setEditRole(null); form.reset({ permissions: [], color: COLORS[0] }); }}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={form.formState.isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {form.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editRole ? "Update Role" : "Create Role"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
