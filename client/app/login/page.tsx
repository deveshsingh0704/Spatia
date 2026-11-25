"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
} from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/studio");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const res = await login(email, password);
    if (!res.success) {
      setErrorMsg(res.error || "Invalid email or password");
      setIsSubmitting(false);
    } else {
      router.push("/studio");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-accent)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--foreground)] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl saas-card rounded-3xl overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-5/12 bg-[var(--surface-overlay)] p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center p-1"
                style={{ background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[var(--foreground)] font-extrabold text-lg tracking-tight font-heading">
                LatentCraft
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight leading-snug">
              The fastest generative pipeline for{" "}
              <span style={{ color: "var(--brand-accent)" }}>spatial environments</span>.
            </h1>

            <p className="text-xs text-[var(--muted-foreground)] mt-3 leading-relaxed">
              Accelerate photorealistic architectural synthesis and level layout exploration with verified non-Markovian DDIM samplers.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-[var(--foreground)]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>JWT Access tokens + HttpOnly Refresh Rotation</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-[var(--foreground)]">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--brand-accent)" }} />
                <span>Bcrypt work factor 12 cryptographic hash resistance</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-[var(--foreground)]">
                <Terminal className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--brand-secondary)" }} />
                <span>Isolated workspace sessions with saved metadata</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 text-[11px] font-mono text-[var(--muted-foreground)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              FastAPI /api/v1/auth
            </span>
            <span>0.08ms SLA</span>
          </div>
        </div>

        <div className="w-full md:w-7/12 p-8 flex flex-col justify-center bg-[var(--card)]">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
              Welcome to Studio
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 mb-6">
              Authenticate to access saved spatial generations, API keys, and custom samplers.
            </p>

            <div className="grid grid-cols-2 p-1 bg-[var(--surface-overlay)] rounded-xl mb-6">
              <div
                className="py-2 text-center text-xs font-semibold rounded-lg"
                style={{ background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }}
              >
                Sign In
              </div>
              <Link
                href="/signup"
                className="py-2 text-center text-xs font-semibold rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Create Account
              </Link>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--foreground)] mb-1.5">
                  WORK EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="architect@latentspace.ai"
                    className="w-full saas-input pl-10 pr-4 py-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-[var(--foreground)]">
                    SESSION KEY / PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full saas-input pl-10 pr-10 py-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-[var(--muted-foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: "var(--brand-accent)" }}
                  />
                  <span>Remember me for 30 days</span>
                </label>
                <button
                  type="button"
                  style={{ color: "var(--brand-accent)" }}
                  className="hover:underline"
                  onClick={() => alert("Please contact admin to reset session credentials.")}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl saas-btn-primary text-xs tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating Credentials...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Sign In to Studio Workspace</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" style={{ color: "var(--brand-accent)" }} className="hover:underline font-semibold">
                Sign up free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
