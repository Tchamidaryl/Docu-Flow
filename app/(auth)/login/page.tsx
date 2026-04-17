"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, FileCheck2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setAuthError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setIsLoading(false);
      setAuthError("Invalid email or password. Please try again.");
    } else {
      setIsLoading(false);
      router.push("/dashboard");
      // router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Branding */}
      <div className="relative flex-col justify-between hidden p-12 overflow-hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />
        {/* Floating orbs */}
        <div className="absolute w-64 h-64 rounded-full top-20 right-20 bg-white/30 blur-3xl" />
        <div className="absolute w-48 h-48 rounded-full bottom-20 left-10 bg-indigo-400/50 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="flex items-center justify-center w-10 h-10 bg-white shadow-lg rounded-xl">
              <FileCheck2 className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              DocuFlow
            </span>
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white"
            style={{ fontFamily: "'Syne', sans-serif" }}>
            Approval<br />workflows,<br />
            <span className="text-blue-200">simplified.</span>
          </h1>
          <p className="max-w-sm text-lg leading-relaxed text-blue-100">
            Route documents through multi-level hierarchies, track every decision in real time, and never lose an approval again.
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: "99.9%", label: "Uptime" },
            { value: "< 2min", label: "Avg setup" },
            { value: "SOC 2", label: "Compliant" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 border bg-white/10 backdrop-blur rounded-xl border-white/20">
              <p className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{stat.value}</p>
              <p className="text-sm text-blue-200">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center w-full p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="flex items-center justify-center bg-blue-600 w-9 h-9 rounded-xl">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>DocuFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
              Welcome back
            </h2>
            <p className="text-muted-foreground">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                  errors.email ? "border-destructive focus:ring-destructive/20" : "border-input"
                }`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                    errors.password ? "border-destructive focus:ring-destructive/20" : "border-input"
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Auth error */}
            {authError && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-destructive/10 border-destructive/20">
                <span className="text-xs text-destructive">{authError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center w-full gap-2 px-6 py-3 font-semibold transition-all bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="p-4 mt-8 border rounded-xl bg-muted/50 border-border">
            <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Demo credentials
            </p>
            <div className="space-y-2">
              {[
                { role: "Admin", email: "admin@docuflow.com", color: "text-blue-600", password: "admin123" },
                { role: "Manager", email: "manager@docuflow.com", color: "text-violet-600", password: "password123" },
                { role: "Approver", email: "approver@docuflow.com", color: "text-emerald-600", password: "password123" },
                { role: "Submitter", email: "submitter@docuflow.com", color: "text-amber-600", password: "password123" },
              ].map((d) => (
                <div key={d.role} className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${d.color}`}>{d.role}</span>
                  <span className="font-mono text-muted-foreground">{d.email}</span>
                  <span className="text-muted-foreground">/ {d.password}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
