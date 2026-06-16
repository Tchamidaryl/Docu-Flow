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
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

    const onSubmit = async (data: LoginForm) => {
        setAuthError(null);
        const result = await signIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
        });

        if (result?.error) {
            setAuthError("Invalid email or password. Please try again.");
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden flex-col justify-between p-12">
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />
                {/* Floating orbs */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-white/30 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-10 w-48 h-48 bg-indigo-400/50 rounded-full blur-2xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                            <FileCheck2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <span
                            className="text-white text-xl font-bold"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            DocuFlow
                        </span>
                    </div>

                    <h1
                        className="text-5xl font-extrabold text-white leading-tight mb-6"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                        Approval
                        <br />
                        workflows,
                        <br />
                        <span className="text-blue-200">simplified.</span>
                    </h1>
                    <p className="text-blue-100 text-lg leading-relaxed max-w-sm">
                        Route documents through multi-level hierarchies, track
                        every decision in real time, and never lose an approval
                        again.
                    </p>
                </div>

                {/* Stats row */}
                <div className="relative z-10 grid grid-cols-3 gap-4">
                    {[
                        { value: "99.9%", label: "Uptime" },
                        { value: "< 2min", label: "Avg setup" },
                        { value: "SOC 2", label: "Compliant" },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20"
                        >
                            <p
                                className="text-white text-xl font-bold"
                                style={{ fontFamily: "'Syne', sans-serif" }}
                            >
                                {stat.value}
                            </p>
                            <p className="text-blue-200 text-sm">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 mb-10 lg:hidden">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                            <FileCheck2 className="w-5 h-5 text-white" />
                        </div>
                        <span
                            className="text-xl font-bold"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            DocuFlow
                        </span>
                    </div>

                    <div className="mb-8">
                        <h2
                            className="text-3xl font-bold text-foreground mb-2"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            Welcome back
                        </h2>
                        <p className="text-muted-foreground">
                            Sign in to your workspace
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                    >
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label
                                className="text-sm font-medium text-foreground"
                                htmlFor="email"
                            >
                                Work email
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@company.com"
                                className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                                    errors.email
                                        ? "border-destructive focus:ring-destructive/20"
                                        : "border-input"
                                }`}
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label
                                    className="text-sm font-medium text-foreground"
                                    htmlFor="password"
                                >
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-primary hover:underline"
                                >
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
                                        errors.password
                                            ? "border-destructive focus:ring-destructive/20"
                                            : "border-input"
                                    }`}
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4.5 h-4.5" />
                                    ) : (
                                        <Eye className="w-4.5 h-4.5" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-destructive">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Auth error */}
                        {authError && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                <span className="text-xs text-destructive">
                                    {authError}
                                </span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Register link */}
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        New to DocuFlow?{" "}
                        <Link
                            href="/register"
                            className="text-primary font-medium hover:underline"
                        >
                            Create an organization
                        </Link>
                    </p>

                    {/* Demo credentials */}
                    <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Demo credentials
                        </p>
                        <div className="space-y-2">
                            {[
                                {
                                    role: "Admin",
                                    email: "admin@docuflow.com",
                                    color: "text-blue-600",
                                },
                                {
                                    role: "Manager",
                                    email: "manager@docuflow.com",
                                    color: "text-violet-600",
                                },
                                {
                                    role: "Approver",
                                    email: "approver@docuflow.com",
                                    color: "text-emerald-600",
                                },
                                {
                                    role: "Submitter",
                                    email: "employee@docuflow.com",
                                    color: "text-amber-600",
                                },
                            ].map((d) => (
                                <div
                                    key={d.role}
                                    className="flex items-center justify-between text-xs"
                                >
                                    <span
                                        className={`font-semibold ${d.color}`}
                                    >
                                        {d.role}
                                    </span>
                                    <span className="text-muted-foreground font-mono">
                                        {d.email}
                                    </span>
                                    {d.role === "Admin" ? (
                                        <span className="text-muted-foreground">
                                            {" "}
                                            admin123
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            {" "}
                                            password123
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
