"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  X,
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

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    if (tab === "signin") {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.error || "Authentication failed");
      } else {
        setSuccessMsg("Signed in successfully! Session key authenticated.");
      }
    } else {
      const res = await register(email, password, role);
      if (!res.success) {
        setErrorMsg(res.error || "Registration failed");
      } else {
        setSuccessMsg("Account created successfully with 50 GPU inference seconds!");
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#090d16] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[#131b2c] border border-[#23324d] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Side: Brand & Spatial Engine Highlights */}
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

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              The fastest generative pipeline for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-200">spatial environments</span>.
            </h2>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Accelerate photorealistic architectural synthesis and level layout exploration with verified non-Markovian DDIM samplers. 50 GPU inference seconds allocated on onboarding.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>JWT Access tokens (15m) + HttpOnly Refresh Rotation (7d)</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Bcrypt work factor 12 cryptographic hash resistance</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <Terminal className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>PostgreSQL relational data isolation per workspace</span>
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

        {/* Right Side: Auth Form (Sign In / Register) */}
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

            <h3 className="text-2xl font-bold text-white tracking-tight">
              {tab === "signin" ? "Welcome to Studio" : "Create Studio Account"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              {tab === "signin"
                ? "Authenticate to access saved spatial generations, API keys, and custom samplers."
                : "Register your workspace for 50 free GPU inference seconds and isolated gallery sync."}
            </p>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-[#121927] border border-[#202d44] rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signin"
                    ? "bg-[#1f2b42] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  tab === "register"
                    ? "bg-[#1f2b42] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Success Alerts */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
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
                    SESSION KEY / PASSWORD
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

              {tab === "register" && (
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
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#202d44] bg-[#121927] text-sky-500 focus:ring-0"
                  />
                  <span>Remember me for 30 days</span>
                </label>
                {tab === "signin" && (
                  <button
                    type="button"
                    className="text-sky-400 hover:text-sky-300 hover:underline"
                    onClick={() => alert("Please contact admin to reset your session credentials.")}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating Credentials...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {tab === "signin"
                        ? "Sign In to Studio Workspace"
                        : "Create Studio Workspace"}
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              {tab === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("register");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-sky-400 hover:underline font-semibold"
                  >
                    Sign up free (50 GPU Secs Included)
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("signin");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-sky-400 hover:underline font-semibold"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
