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
import { GlassSelect } from "@/components/ui/GlassSelect";

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
        setSuccessMsg("Account created successfully!");
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl liquid-glass-elevated rounded-3xl overflow-hidden flex flex-col md:flex-row">
        <button
          onClick={closeAuthModal}
          aria-label="Close Authentication Dialog"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-full md:w-5/12 bg-[var(--surface-overlay)]/75 p-8 flex flex-col justify-between">
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

            <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight leading-snug">
              The generative workspace for{" "}
              <span style={{ color: "var(--brand-accent)" }}>spatial environments</span>.
            </h2>

            <p className="text-xs text-[var(--muted-foreground)] mt-3 leading-relaxed">
              Accelerate photorealistic architectural synthesis and layout exploration with verified non-Markovian DDIM samplers.
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
                <span>PostgreSQL relational metadata &amp; gallery sync</span>
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

        <div className="w-full md:w-7/12 p-8 flex flex-col justify-center bg-[var(--card)]/90">
          <div className="max-w-md w-full mx-auto">
            <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
              {tab === "signin" ? "Welcome to Studio" : "Create Studio Account"}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 mb-6">
              {tab === "signin"
                ? "Authenticate to access saved spatial generations and custom samplers."
                : "Register your workspace for isolated gallery and metadata persistence."}
            </p>

            <div className="grid grid-cols-2 p-1 bg-[var(--surface-overlay)] rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={
                  tab === "signin"
                    ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                    : undefined
                }
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signin"
                    ? ""
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
                style={
                  tab === "register"
                    ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                    : undefined
                }
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  tab === "register"
                    ? ""
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                Create Account
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
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

              {tab === "register" && (
                <div>
                  <label className="block text-xs font-mono text-[var(--foreground)] mb-1.5">
                    WORKSPACE ROLE
                  </label>
                  <GlassSelect
                    ariaLabel="Workspace Role"
                    value={role}
                    onChange={setRole}
                    buttonClassName="font-mono"
                    options={[
                      { value: "user", label: "User (Spatial Designer)" },
                      { value: "researcher", label: "Researcher (Diffusion Sampler Analysis)" },
                      { value: "admin", label: "Administrator" }
                    ]}
                  />
                </div>
              )}

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
                {tab === "signin" && (
                  <button
                    type="button"
                    style={{ color: "var(--brand-accent)" }}
                    className="hover:underline"
                    onClick={() => alert("Please contact admin to reset your session credentials.")}
                  >
                    Forgot password?
                  </button>
                )}
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
                    <span>
                      {tab === "signin" ? "Sign In to Studio Workspace" : "Create Studio Workspace"}
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
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
                    style={{ color: "var(--brand-accent)" }}
                    className="hover:underline font-semibold"
                  >
                    Sign up free
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
                    style={{ color: "var(--brand-accent)" }}
                    className="hover:underline font-semibold"
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
