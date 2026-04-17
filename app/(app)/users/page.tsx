"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Search, UserCheck, UserX, Edit, MoreVertical,
  Mail, Building2, Shield, ChevronDown, Loader2, X,
  CheckCircle2, AlertCircle, Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "APPROVER", "REVIEWER", "SUBMITTER"] as const;

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30",
  ADMIN:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30",
  MANAGER:     "bg-violet-100 text-violet-700 dark:bg-violet-900/30",
  APPROVER:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
  REVIEWER:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
  SUBMITTER:   "bg-gray-100 text-gray-700 dark:bg-gray-800",
};

const createUserSchema = z.object({
  name:        z.string().min(2, "Name is required"),
  email:       z.string().email("Valid email required"),
  password:    z.string().min(8, "Password must be at least 8 characters"),
  systemRole:  z.enum(SYSTEM_ROLES).default("SUBMITTER"),
  jobTitle:    z.string().optional(),
  departmentId: z.string().optional(),
  managerId:   z.string().optional(),
});

const editUserSchema = z.object({
  name:        z.string().min(2),
  systemRole:  z.enum(SYSTEM_ROLES),
  jobTitle:    z.string().optional(),
  departmentId: z.string().optional(),
  managerId:   z.string().optional(),
  isActive:    z.boolean(),
});

type CreateForm = z.infer<typeof createUserSchema>;
type EditForm   = z.infer<typeof editUserSchema>;

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers]               = useState<any[]>([]);
  const [departments, setDepartments]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("");
  const [showCreate, setShowCreate]     = useState(false);
  const [editingUser, setEditingUser]   = useState<any>(null);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session?.user?.systemRole ?? "");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (search)     q.set("search", search);
    if (roleFilter) q.set("role", roleFilter);
    try {
      const res  = await fetch(`/api/v1/users?${q}`);
      const data = await res.json();
      setUsers(data.data?.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    fetch("/api/v1/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.data ?? []));
  }, []);

  // ─── Create user form ────────────────────────────────────
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { systemRole: "SUBMITTER" },
  });

  async function onCreateUser(data: CreateForm) {
    const res = await fetch("/api/v1/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok) {
      showToast(`User ${data.name} created successfully`);
      setShowCreate(false);
      createForm.reset();
      fetchUsers();
    } else {
      showToast(result.error ?? "Failed to create user", false);
    }
  }

  // ─── Edit user form ──────────────────────────────────────
  const editForm = useForm<EditForm>({ resolver: zodResolver(editUserSchema) });

  function openEdit(user: any) {
    setEditingUser(user);
    editForm.reset({
      name:        user.name,
      systemRole:  user.systemRole,
      jobTitle:    user.jobTitle ?? "",
      departmentId: user.department?.id ?? "",
      managerId:   user.manager?.id ?? "",
      isActive:    user.isActive,
    });
  }

  async function onEditUser(data: EditForm) {
    const res = await fetch(`/api/v1/users/${editingUser?.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (res.ok) {
      showToast("User updated successfully");
      setEditingUser(null);
      fetchUsers();
    } else {
      showToast("Failed to update user", false);
    }
  }

  async function toggleActive(user: any) {
    const res = await fetch(`/api/v1/users/${user.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      showToast(`User ${user.isActive ? "deactivated" : "activated"}`);
      fetchUsers();
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} user{users.length > 1 ? "s" : ""} in your organization</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors w-fit"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm bg-card border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
        >
          <option value="">All Roles</option>
          {SYSTEM_ROLES.map((r) => (
            <option key={r} value={r}>{r.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="font-semibold">No users found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wide">User</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden md:table-cell">Role</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden lg:table-cell">Department</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden lg:table-cell">Manager</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide hidden xl:table-cell">Last Active</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3.5 uppercase tracking-wide">Status</th>
                {isAdmin && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.jobTitle && <p className="text-xs text-muted-foreground/60">{user.jobTitle}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="space-y-1">
                      <span className={cn("inline-block text-xs font-medium px-2.5 py-0.5 rounded-full", ROLE_COLORS[user.systemRole])}>
                        {user.systemRole.replace("_", " ")}
                      </span>
                      {user.customRoleUsers?.map((cr: any) => (
                        <span
                          key={cr.customRole.id}
                          className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ml-1"
                          style={{ background: cr.customRole.color + "20", color: cr.customRole.color }}
                        >
                          {cr.customRole.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {user.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {user.manager?.name ?? "—"}
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell text-xs text-muted-foreground">
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                      : "Never"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                      user.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", user.isActive ? "bg-emerald-500" : "bg-gray-400")} />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(user)}
                          title="Edit user"
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          title={user.isActive ? "Deactivate" : "Activate"}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create User Modal ─────────────────────────────── */}
      {showCreate && (
        <Modal title="Add New User" onClose={() => { setShowCreate(false); createForm.reset(); }}>
          <form onSubmit={createForm.handleSubmit(onCreateUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name *" error={createForm.formState.errors.name?.message}>
                <input {...createForm.register("name")} placeholder="John Doe" className={inputCls} />
              </FormField>
              <FormField label="Email Address *" error={createForm.formState.errors.email?.message}>
                <input {...createForm.register("email")} type="email" placeholder="john@company.com" className={inputCls} />
              </FormField>
            </div>

            <FormField label="Password *" error={createForm.formState.errors.password?.message}>
              <input {...createForm.register("password")} type="password" placeholder="Min. 8 characters" className={inputCls} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="System Role *">
                <Controller
                  name="systemRole"
                  control={createForm.control}
                  render={({ field }) => (
                    <select {...field} className={inputCls}>
                      {SYSTEM_ROLES.map((r) => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                    </select>
                  )}
                />
              </FormField>
              <FormField label="Job Title">
                <input {...createForm.register("jobTitle")} placeholder="e.g. Software Engineer" className={inputCls} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Department">
                <Controller
                  name="departmentId"
                  control={createForm.control}
                  render={({ field }) => (
                    <select {...field} className={inputCls}>
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                />
              </FormField>
              <FormField label="Reports To (Manager)">
                <Controller
                  name="managerId"
                  control={createForm.control}
                  render={({ field }) => (
                    <select {...field} className={inputCls}>
                      <option value="">Select manager…</option>
                      {users
                        .filter((u) => ["ADMIN", "MANAGER", "APPROVER"].includes(u.systemRole))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.systemRole})</option>
                        ))}
                    </select>
                  )}
                />
              </FormField>
            </div>

            {/* Role explanation */}
            <RoleExplainer role={createForm.watch("systemRole")} />

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCreate(false); createForm.reset(); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={createForm.formState.isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                {createForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit User Modal ───────────────────────────────── */}
      {editingUser && (
        <Modal title={`Edit — ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={editForm.handleSubmit(onEditUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name *" error={editForm.formState.errors.name?.message}>
                <input {...editForm.register("name")} className={inputCls} />
              </FormField>
              <FormField label="Job Title">
                <input {...editForm.register("jobTitle")} className={inputCls} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="System Role *">
                <Controller
                  name="systemRole"
                  control={editForm.control}
                  render={({ field }) => (
                    <select {...field} className={inputCls}>
                      {SYSTEM_ROLES.map((r) => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                    </select>
                  )}
                />
              </FormField>
              <FormField label="Department">
                <Controller
                  name="departmentId"
                  control={editForm.control}
                  render={({ field }) => (
                    <select {...field} value={field.value ?? ""} className={inputCls}>
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                />
              </FormField>
            </div>

            <FormField label="Reports To (Manager)">
              <Controller
                name="managerId"
                control={editForm.control}
                render={({ field }) => (
                  <select {...field} value={field.value ?? ""} className={inputCls}>
                    <option value="">No manager</option>
                    {users
                      .filter((u) => u.id !== editingUser.id && ["ADMIN", "MANAGER", "APPROVER"].includes(u.systemRole))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.systemRole})</option>
                      ))}
                  </select>
                )}
              />
            </FormField>

            <RoleExplainer role={editForm.watch("systemRole")} />

            {/* Active toggle */}
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div>
                <p className="text-sm font-medium">Account Active</p>
                <p className="text-xs text-muted-foreground">Inactive users cannot log in</p>
              </div>
              <Controller
                name="isActive"
                control={editForm.control}
                render={({ field }) => (
                  <button type="button" onClick={() => field.onChange(!field.value)}
                    className={cn("w-10 h-5 rounded-full transition-colors relative", field.value ? "bg-primary" : "bg-muted-foreground/30")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", field.value ? "left-5" : "left-0.5")} />
                  </button>
                )}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditingUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={editForm.formState.isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                {editForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-slide-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground";

const ROLE_DESCRIPTIONS: Record<string, { can: string[]; cannot: string[] }> = {
  SUPER_ADMIN: { can: ["Everything"], cannot: [] },
  ADMIN:       { can: ["Manage users", "Manage templates", "Approve/reject", "View all documents", "Manage roles"], cannot: [] },
  MANAGER:     { can: ["Approve/reject documents", "Create templates", "View department documents"], cannot: ["Manage users", "Manage roles"] },
  APPROVER:    { can: ["Approve/reject assigned documents", "Comment", "Delegate approvals"], cannot: ["Create templates", "Manage users"] },
  REVIEWER:    { can: ["View assigned documents", "Comment"], cannot: ["Approve/reject", "Create templates"] },
  SUBMITTER:   { can: ["Create documents", "Submit for approval", "View own documents"], cannot: ["Approve/reject", "Manage users"] },
};

function RoleExplainer({ role }: { role: string }) {
  const desc = ROLE_DESCRIPTIONS[role];
  if (!desc) return null;
  return (
    <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs space-y-1.5">
      <p className="font-semibold text-foreground capitalize">{role.replace("_", " ")} — Permissions</p>
      <div className="flex flex-wrap gap-1.5">
        {desc.can.map((p) => (
          <span key={p} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{p}</span>
        ))}
        {desc.cannot.map((p) => (
          <span key={p} className="bg-gray-100 text-gray-400 dark:bg-gray-800 px-2 py-0.5 rounded-full line-through">{p}</span>
        ))}
      </div>
    </div>
  );
}
