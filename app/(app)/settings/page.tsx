"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Lock, Bell, Building2, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  jobTitle: z.string().optional(),
  email: z.string().email(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

type Tab = "profile" | "security" | "notifications" | "organization";

const TABS = [
  { key: "profile" as Tab,       label: "Profile",       icon: User },
  { key: "security" as Tab,      label: "Security",      icon: Lock },
  { key: "notifications" as Tab, label: "Notifications", icon: Bell },
  { key: "organization" as Tab,  label: "Organization",  icon: Building2 },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name ?? "",
      jobTitle: "",
      email: session?.user?.email ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  async function onSaveProfile(data: ProfileForm) {
    try {
      const res = await fetch(`/api/v1/users/${session?.user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, jobTitle: data.jobTitle }),
      });
      if (res.ok) {
        await update({ name: data.name });
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch {}
  }

  async function onChangePassword(data: PasswordForm) {
    setPasswordError("");
    try {
      const res = await fetch(`/api/v1/users/${session?.user?.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (res.ok) {
        passwordForm.reset();
        setPasswordSaved(true);
        setTimeout(() => setPasswordSaved(false), 3000);
      } else {
        const d = await res.json();
        setPasswordError(d.error ?? "Failed to change password");
      }
    } catch {}
  }

  const role = session?.user?.systemRole ?? "SUBMITTER";
  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30",
    ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30",
    MANAGER: "bg-violet-100 text-violet-700 dark:bg-violet-900/30",
    APPROVER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30",
    REVIEWER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
    SUBMITTER: "bg-gray-100 text-gray-700 dark:bg-gray-800",
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap w-full text-left",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile tab */}
          {activeTab === "profile" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
                Profile Information
              </h3>

              {/* Avatar section */}
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{session?.user?.name}</p>
                  <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", roleColors[role])}>
                      {role.replace("_", " ")}
                    </span>
                    {session?.user?.organizationName && (
                      <span className="text-xs text-muted-foreground">
                        {session.user.organizationName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name</label>
                    <input
                      {...profileForm.register("name")}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Job Title</label>
                    <input
                      {...profileForm.register("jobTitle")}
                      placeholder="e.g. Software Engineer"
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
                  <input
                    {...profileForm.register("email")}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-muted text-sm opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed. Contact your admin.</p>
                </div>

                {/* Read-only role info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">System Role</label>
                    <div className="px-4 py-2.5 rounded-xl border border-input bg-muted text-sm opacity-70">
                      {role.replace("_", " ")}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Department</label>
                    <div className="px-4 py-2.5 rounded-xl border border-input bg-muted text-sm opacity-70">
                      {session?.user?.departmentName ?? "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={profileForm.formState.isSubmitting}
                    className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {profileForm.formState.isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profileSaved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : null}
                    {profileSaved ? "Saved!" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security tab */}
          {activeTab === "security" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>Change Password</h3>

              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4 max-w-sm">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      {...passwordForm.register("currentPassword")}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      {...passwordForm.register("newPassword")}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Confirm New Password</label>
                  <input
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                {passwordError && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{passwordError}</p>
                )}

                <button
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting}
                  className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {passwordForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                   passwordSaved ? <CheckCircle2 className="w-4 h-4" /> : null}
                  {passwordSaved ? "Password Changed!" : "Change Password"}
                </button>
              </form>
            </div>
          )}

          {/* Notifications tab */}
          {activeTab === "notifications" && (
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h3 className="font-semibold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>Notification Preferences</h3>
              {[
                { label: "Approval requests", desc: "When a document is sent to you for approval" },
                { label: "Document approved", desc: "When your document is fully approved" },
                { label: "Document rejected", desc: "When your document is rejected" },
                { label: "Revision requested", desc: "When changes are requested on your document" },
                { label: "Reminders", desc: "SLA deadline reminders" },
                { label: "Comments", desc: "When someone comments on your document" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-10 h-5 bg-muted-foreground/30 peer-checked:bg-primary rounded-full transition-colors relative">
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                </div>
              ))}
              <button className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                Save Preferences
              </button>
            </div>
          )}

          {/* Organization tab */}
          {activeTab === "organization" && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-semibold text-lg mb-5" style={{ fontFamily: "'Syne', sans-serif" }}>Organization Info</h3>
              <dl className="space-y-4">
                {[
                  { label: "Organization", value: session?.user?.organizationName ?? "—" },
                  { label: "Department", value: session?.user?.departmentName ?? "—" },
                  { label: "System Role", value: role.replace("_", " ") },
                  {
                    label: "Custom Roles",
                    value: session?.user?.customRoles?.length
                      ? session.user.customRoles.map((r: any) => r.name).join(", ")
                      : "None assigned",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
