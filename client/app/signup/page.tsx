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

export default function SignupPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
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

    const res = await register(email, password, role);
    if (!res.success) {
      setErrorMsg(res.error || "Registration failed");
      setIsSubmitting(false);
    } else {
      router.push("/studio");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl bg-[#090d16] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Brand Hero */}
        <div className="w-full md:w-5/12 bg-gradient-to-b from-[#0c1424] via-[#090e1a] to-[#060a12] p-8 border-b md:border-b-0 md:border-r border-[#1a2333] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-300 flex items-center justify-center p-1 shadow-lg shadow-sky-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-extrabold text-lg tracking-tight font-sans">
                LatentCraft <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/80 font-semibold ml-1">Studio</span>
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950/70 border border-sky-800/60 text-sky-400 text-[10px] font-mono font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              PRD US-11 • DETERMINISTIC AUTH
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              Instant workspace onboarding with <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-200">50 GPU Seconds</span>.
            </h1>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Synthesize production-ready spatial mockups with isolated user sessions and verified non-Markovian DDIM samplers.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Encrypted JWT session keys + automatic token rotation</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Bcrypt work factor 12 cryptographic hash resistance</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Dedicated gallery isolation per workspace tenant</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/60 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              FastAPI /api/v1/auth
            </span>
            <span>0.08ms SLA</span>
          </div>
        </div>

        {/* Right Side: Signup Form */}
        <div className="w-full md:w-7/12 p-8 flex flex-col justify-center bg-[#090d16]">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-mono text-sky-400 font-semibold">
                WORKSPACE ACCESS
              </span>
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> PRD NFR-04 Safe
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              Create Studio Account
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Register your workspace for 50 free GPU inference seconds and isolated gallery sync.
            </p>

            {/* Nav switcher between Login and Signup */}
            <div className="grid grid-cols-2 p-1 bg-[#121927] border border-[#202d44] rounded-xl mb-6">
              <Link
                href="/login"
                className="py-2 text-center text-xs font-semibold rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                Sign In
              </Link>
              <div className="py-2 text-center text-xs font-semibold rounded-lg bg-[#1f2b42] text-white shadow-sm">
                Create Account
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  WORK EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="architect@latentspace.ai"
                    className="w-full bg-[#121927] border border-[#202d44] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-slate-300">
                    CREATE PASSWORD (MIN 6 CHARS)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#121927] border border-[#202d44] focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  WORKSPACE ROLE
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#121927] border border-[#202d44] focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                >
                  <option value="user">User (Spatial Designer)</option>
                  <option value="researcher">Researcher (Diffusion Sampler Analysis)</option>
                  <option value="admin">Administrator (Compute Cluster Control)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Workspace...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Studio Workspace</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-sky-400 hover:underline font-semibold">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
