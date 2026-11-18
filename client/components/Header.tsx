"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Shield,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  Settings,
  Monitor
} from "lucide-react";
import { SystemInfo } from "@/types/benchmark";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  system: SystemInfo;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, system }) => {
  const router = useRouter();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  // User Profile Dropdown / Modal State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  return (
    <header className="w-full bg-[#0d121d] border-b border-[#1f293d] px-6 py-2.5 flex items-center justify-between select-none relative z-40">
      {/* Brand & Hardware telemetry */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-300 flex items-center justify-center p-0.5 shadow-md shadow-sky-500/20">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base tracking-tight font-sans">
                LatentCraft
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-semibold">
                Studio v2.4
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Hardware Status Pill */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#131b2c] border border-[#23324d] text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              system.cuda_available ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-slate-200 font-semibold">{system.device_name}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            {system.vram_total_gb > 0 ? (
              <>
                {system.vram_total_gb}GB VRAM (
                <span className="text-sky-400 font-semibold">{system.vram_ready_percent}% Ready</span>
                )
              </>
            ) : (
              <span className="text-amber-400">CPU Mode</span>
            )}
          </span>
        </div>
      </div>

      {/* Center Navigation */}
      <nav className="flex items-center gap-1.5 bg-[#0f1728] p-1 rounded-lg border border-[#1f293d]">
        <button
          onClick={() => {
            setActiveTab("generate");
            router.push("/studio");
          }}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "generate" || activeTab === "studio"
              ? "bg-[#38bdf8] text-[#071322] font-semibold shadow-sm shadow-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]"
          }`}
        >
          Studio Generator
        </button>

        <button
          onClick={() => {
            setActiveTab("benchmark");
            router.push("/benchmark");
          }}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "benchmark"
              ? "bg-[#38bdf8] text-[#071322] font-semibold shadow-sm shadow-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]"
          }`}
        >
          Benchmark Lab
        </button>

        <button
          onClick={() => {
            setActiveTab("gallery");
            router.push("/gallery");
          }}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "gallery"
              ? "bg-[#38bdf8] text-[#071322] font-semibold shadow-sm shadow-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]"
          }`}
        >
          Design Gallery
        </button>

        <button
          onClick={() => {
            setActiveTab("api");
            router.push("/api");
          }}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "api"
              ? "bg-[#38bdf8] text-[#071322] font-semibold shadow-sm shadow-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#131b2c]"
          }`}
        >
          Developer API
        </button>
      </nav>

      {/* Right Controls: Unified User Profile & Preferences Modal Dropdown */}
      <div className="flex items-center gap-3 relative" ref={menuRef}>
        {/* Right Controls: Compact Single Avatar Button with Profile & Preferences Dropdown */}
        {isAuthenticated && user ? (
          <div>
            {/* Compressed Single Circular Avatar Icon Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title={`${user.email} (${user.role})`}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-500 to-cyan-400 p-[1.5px] hover:scale-105 transition-all shadow-md shadow-sky-500/20 focus:outline-none flex items-center justify-center cursor-pointer"
            >
              <div className="w-full h-full rounded-full bg-[#0d121d] flex items-center justify-center text-white text-xs font-bold hover:bg-transparent transition-colors">
                {user.email.charAt(0).toUpperCase()}
              </div>
            </button>

            {/* Unified Modal / Popover Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 top-11 w-72 rounded-2xl bg-[#0b1220]/95 backdrop-blur-xl border border-[#22324f] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Identity Header Card */}
                <div className="p-3 rounded-xl bg-[#131c2e] border border-[#1e2a42] mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-sky-500/20">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate font-sans">
                        {user.email.split("@")[0]}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        {user.email}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[9px] font-mono font-bold uppercase">
                          {user.role}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Authenticated
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Theme Selector (Dark / Light Mode) */}
                <div className="px-2 py-2 mb-2 border-b border-[#1c2840]">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
                    Appearance &amp; Theme
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#121929] p-1 rounded-lg border border-[#202d45]">
                    <button
                      onClick={() => toggleTheme("dark")}
                      className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono rounded-md transition-all ${
                        theme === "dark"
                          ? "bg-sky-500 text-black font-bold shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      Dark
                    </button>
                    <button
                      onClick={() => toggleTheme("light")}
                      className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono rounded-md transition-all ${
                        theme === "light"
                          ? "bg-sky-500 text-black font-bold shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      Light
                    </button>
                  </div>
                </div>

                {/* Quick Preferences & Rights Links */}
                <div className="space-y-1 mb-2">
                  <div className="px-2.5 py-1.5 rounded-lg text-xs text-slate-300 font-mono flex items-center justify-between bg-[#111827]/50 border border-transparent">
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-sky-400" />
                      Permissions
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Full GPU Access</span>
                  </div>

                  <div className="px-2.5 py-1.5 rounded-lg text-xs text-slate-300 font-mono flex items-center justify-between bg-[#111827]/50 border border-transparent">
                    <span className="flex items-center gap-2">
                      <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                      Node Engine
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      RTX 4050 Laptop
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                <div className="pt-2 border-t border-[#1c2840]">
                  <button
                    onClick={async () => {
                      setIsMenuOpen(false);
                      await logout();
                      router.push("/login");
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-900/60 text-xs font-semibold font-mono transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out of LatentCraft
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-sky-500/20"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
