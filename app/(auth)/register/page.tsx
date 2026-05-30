"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  FileCheck2, Building2, User, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, Eye, EyeOff, AlertCircle,
  Check, X, Info, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const schema = z.object({
  orgName:         z.string().min(2, "At least 2 characters").max(100),
  orgSlug:         z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  departmentName:  z.string().optional(),
  name:            z.string().min(2, "At least 2 characters").max(100),
  email:           z.string().email("Enter a valid email"),
  password:        z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path:    ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { id: 1, label: "Organization", icon: Building2 },
  { id: 2, label: "Admin Account", icon: User },
  { id: 3, label: "Done", icon: CheckCircle2 },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]                 = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [slugStatus, setSlugStatus]     = useState<"idle"|"checking"|"available"|"taken">("idle");
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [createdOrg, setCreatedOrg]     = useState<{ name: string } | null>(null);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), mode: "onChange" });

  const orgName = watch("orgName");
  const orgSlug = watch("orgSlug");

  useEffect(() => {
    if (orgName) {
      setValue("orgSlug",
        orgName.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50),
        { shouldValidate: true }
      );
    }
  }, [orgName, setValue]);

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2 || !/^[a-z0-9-]+$/.test(slug)) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    try {
      const res  = await fetch(`/api/v1/auth/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSlugStatus(data.data?.available ? "available" : "taken");
    } catch { setSlugStatus("idle"); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (orgSlug) checkSlug(orgSlug); }, 500);
    return () => clearTimeout(t);
  }, [orgSlug, checkSlug]);

  async function goNext() {
    const valid = await trigger(["orgName", "orgSlug"]);
    if (!valid || slugStatus === "taken" || slugStatus === "checking") return;
    setStep(2);
  }

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName: data.orgName, orgSlug: data.orgSlug, departmentName: data.departmentName, name: data.name, email: data.email, password: data.password }),
    });
    const result = await res.json();
    if (!res.ok) { setSubmitError(result.error ?? "Registration failed."); return; }
    setCreatedOrg({ name: data.orgName });
    setStep(3);
    setTimeout(async () => {
      await signIn("credentials", { email: data.email, password: data.password, redirect: false });
      router.push("/dashboard");
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <FileCheck2 className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-white text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>DocuFlow</span>
          </div>
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
            Set up your<br />organization<br /><span className="text-blue-200">in minutes.</span>
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-sm">
            Register your organization and become the administrator. Then add your team from the dashboard.
          </p>
        </div>
        <div className="relative z-10 space-y-2.5">
          {[
            "You become the organization Admin",
            "Add & register all other users yourself",
            "Assign roles, departments & managers",
            "Build sequential approval workflows",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-blue-100 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>DocuFlow</span>
          </div>

          {/* Admin-only notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 mb-6">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Administrator setup only</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                This page is for creating a new organization. The account you create here will be the <strong>Admin</strong>.
                All other users (managers, approvers, employees) must be added by you from the <strong>Users</strong> section after login.
              </p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon; const isDone = step > s.id; const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={cn("text-xs font-medium hidden sm:block", isCurrent ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5 rounded-full", isDone ? "bg-emerald-400" : "bg-border")} />}
                </div>
              );
            })}
          </div>

          {/* ─── STEP 1: Organization ─── */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Name your organization</h2>
                <p className="text-sm text-muted-foreground">This is your team's shared workspace inside DocuFlow.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Organization Name <span className="text-destructive">*</span></label>
                <input {...register("orgName")} placeholder="e.g. Acme Corporation" className={cn(IC, errors.orgName && EC)} />
                {errors.orgName && <p className="text-xs text-destructive mt-1">{errors.orgName.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">URL Slug <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono select-none">docuflow/</span>
                  <input {...register("orgSlug")} placeholder="acme-corp" className={cn(IC, "pl-[90px] font-mono",
                    errors.orgSlug || slugStatus === "taken" ? EC : slugStatus === "available" ? "border-emerald-400 focus:border-emerald-500" : "")} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {slugStatus === "checking"  && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {slugStatus === "available" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {slugStatus === "taken"     && <X className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
                {errors.orgSlug && <p className="text-xs text-destructive mt-1">{errors.orgSlug.message}</p>}
                {slugStatus === "taken" && !errors.orgSlug && <p className="text-xs text-destructive mt-1">This slug is already taken</p>}
                {slugStatus === "available" && <p className="text-xs text-emerald-600 mt-1">✓ Available</p>}
                <p className="text-xs text-muted-foreground mt-1">Cannot be changed after creation.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">First Department <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
                <input {...register("departmentName")} placeholder="e.g. Engineering, Operations…" className={IC} />
                <p className="text-xs text-muted-foreground mt-1">Defaults to "General". More departments added later.</p>
              </div>
              <button type="button" onClick={goNext} disabled={slugStatus === "checking" || slugStatus === "taken"}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Admin account ─── */}
          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="animate-fade-in space-y-4">
              <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Create your admin account</h2>
                <p className="text-sm text-muted-foreground">You'll manage <strong>{watch("orgName")}</strong> with full admin access.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full Name <span className="text-destructive">*</span></label>
                <input {...register("name")} placeholder="John Doe" className={cn(IC, errors.name && EC)} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Work Email <span className="text-destructive">*</span></label>
                <input {...register("email")} type="email" placeholder="john@company.com" className={cn(IC, errors.email && EC)} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Password <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" className={cn(IC, "pr-10", errors.password && EC)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                <PwStrength password={watch("password") ?? ""} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirm Password <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input {...register("confirmPassword")} type={showConfirm ? "text" : "password"} placeholder="Re-enter password" className={cn(IC, "pr-10", errors.confirmPassword && EC)} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
              </div>
              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}
              {/* Summary */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Summary</p>
                {[
                  { label: "Organization", value: watch("orgName") || "—" },
                  { label: "Department",   value: watch("departmentName") || "General" },
                  { label: "Your role",    value: "Administrator (ADMIN)" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <button type="submit" disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><Building2 className="w-4 h-4" />Create Organization</>}
              </button>
            </form>
          )}

          {/* ─── STEP 3: Success ─── */}
          {step === 3 && createdOrg && (
            <div className="animate-fade-in text-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>You're all set! 🎉</h2>
              <p className="text-muted-foreground mb-2"><strong>{createdOrg.name}</strong> has been created.</p>
              <p className="text-sm text-muted-foreground mb-6">
                Head to <strong>Users</strong> to add your team, then <strong>Templates</strong> to set up approval workflows.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Signing you in…
              </div>
            </div>
          )}

          {step < 3 && (
            <p className="text-sm text-center text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PwStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score  = checks.filter((c) => c.ok).length;
  const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1 items-center">
        {[0,1,2,3].map((i) => <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < score ? colors[score] : "bg-muted")} />)}
        <span className="text-xs text-muted-foreground ml-1 w-10">{labels[score]}</span>
      </div>
      <div className="flex flex-wrap gap-x-3">
        {checks.map((c) => (
          <span key={c.label} className={cn("text-[10px] flex items-center gap-1", c.ok ? "text-emerald-600" : "text-muted-foreground/50")}>
            {c.ok ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}{c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const IC = "w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";
const EC = "border-destructive focus:ring-destructive/20 focus:border-destructive";
