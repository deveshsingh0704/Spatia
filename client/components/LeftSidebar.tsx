"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Wand2,
  BarChart2,
  Image as ImageIcon,
  Code2,
  Moon,
  Sun,
  Shield,
  LogOut,
  LogIn,
  Sparkles,
  Settings,
  Type,
  Palette,
  Check,
  X,
  History
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  AppearanceSettings,
  COLOR_THEMES,
  ColorThemeId,
  FONT_PRESETS,
  FONT_SCALE_OPTIONS,
  FontPresetId,
  FontScaleId,
  ThemeMode,
  applyAppearanceSettings,
  loadAppearanceSettings
} from "@/lib/appearance";

interface LeftSidebarProps {
  activeTab?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeTab }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();

  const [isHovered, setIsHovered] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: "dark",
    colorTheme: "teal-tangerine",
    fontPreset: "jakarta-inter",
    fontScale: "default"
  });
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const loaded = loadAppearanceSettings();
      setAppearance(loaded);
      applyAppearanceSettings(loaded);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateAppearance = (patch: Partial<AppearanceSettings>) => {
    setAppearance((prev) => {
      const next = { ...prev, ...patch };
      applyAppearanceSettings(next);
      return next;
    });
  };

  const toggleTheme = (newTheme: ThemeMode) => updateAppearance({ theme: newTheme });
  const selectColorTheme = (colorTheme: ColorThemeId) => updateAppearance({ colorTheme });
  const selectFontPreset = (fontPreset: FontPresetId) => updateAppearance({ fontPreset });
  const selectFontScale = (fontScale: FontScaleId) => updateAppearance({ fontScale });

  const navItems = [
    { id: "studio", label: "Studio", path: "/studio", icon: Wand2, badge: "Chat" },
    { id: "chats", label: "Chat History", path: "/chats", icon: History, badge: null },
    { id: "benchmark", label: "Benchmark Lab", path: "/benchmark", icon: BarChart2, badge: null },
    { id: "gallery", label: "Gallery", path: "/gallery", icon: ImageIcon, badge: null },
    { id: "api", label: "API Reference", path: "/api", icon: Code2, badge: null }
  ];

  const currentTab =
    activeTab ||
    (pathname.includes("chats")
      ? "chats"
      : pathname.includes("benchmark")
      ? "benchmark"
      : pathname.includes("gallery")
      ? "gallery"
      : pathname.includes("api")
      ? "api"
      : "studio");

  return (
    <>
      {/* Floating Apple Liquid Glass Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsProfileOpen(false);
        }}
        aria-label="Primary Navigation"
        className={`fixed top-3 left-3 bottom-3 z-40 rounded-2xl flex flex-col justify-between py-3.5 px-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none liquid-glass ${
          isHovered ? "w-64" : "w-16"
        }`}
      >
        {/* Top: Brand Mark & Navigation */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push("/")}
            aria-label="LatentCraft Home"
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[var(--surface-overlay)] transition-all text-left group overflow-hidden cursor-pointer"
          >
            <div
              className="w-9 h-9 min-w-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
              style={{
                background: "var(--brand-accent)",
                color: "var(--brand-accent-fg)"
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div
              className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isHovered ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-bold text-sm tracking-tight text-[var(--foreground)]">
                  LatentCraft
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                Spatial Diffusion
              </p>
            </div>
          </button>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id || pathname === item.path;

              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.path)}
                  aria-label={item.label}
                  title={!isHovered ? item.label : undefined}
                  style={
                    isActive
                      ? {
                          background: "var(--brand-accent)",
                          color: "var(--brand-accent-fg)"
                        }
                      : undefined
                  }
                  className={`relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group overflow-hidden text-left ${
                    isActive
                      ? "font-semibold"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)]"
                  }`}
                >
                  <div className="min-w-6 flex items-center justify-center">
                    <Icon className="w-4 h-4 transition-transform duration-150" />
                  </div>

                  <div
                    className={`flex items-center justify-between flex-1 transition-all duration-200 whitespace-nowrap overflow-hidden ${
                      isHovered ? "opacity-100 max-w-[170px]" : "opacity-0 max-w-0"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Settings, Theme & Profile */}
        <div className="relative flex flex-col gap-1.5" ref={profileRef}>
          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Studio Settings"
            title={!isHovered ? "Themes, Fonts & Settings" : undefined}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-all overflow-hidden text-left"
          >
            <div className="min-w-6 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <span
              className={`whitespace-nowrap transition-all duration-200 overflow-hidden ${
                isHovered ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
              }`}
            >
              Settings
            </span>
          </button>

          {/* Theme Mode Toggle */}
          {!isHovered ? (
            <button
              onClick={() => toggleTheme(appearance.theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${appearance.theme === "dark" ? "Light" : "Dark"} Mode`}
              title={`Switch to ${appearance.theme === "dark" ? "Light" : "Dark"} Mode`}
              className="w-full flex items-center justify-center p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-overlay)] transition-colors"
            >
              {appearance.theme === "dark" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface-overlay)] mb-1">
              <button
                onClick={() => toggleTheme("dark")}
                style={
                  appearance.theme === "dark"
                    ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                    : undefined
                }
                className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  appearance.theme === "dark"
                    ? "font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => toggleTheme("light")}
                style={
                  appearance.theme === "light"
                    ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                    : undefined
                }
                className={`flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  appearance.theme === "light"
                    ? "font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </button>
            </div>
          )}

          {isAuthenticated && user ? (
            <div>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="Account Menu"
                className="w-full flex items-center gap-3 p-1.5 rounded-xl hover:bg-[var(--surface-overlay)] transition-all text-left overflow-hidden group"
              >
                <div
                  className="w-8 h-8 min-w-8 rounded-xl flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "var(--brand-accent-soft)",
                    color: "var(--brand-accent)"
                  }}
                >
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${
                    isHovered ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
                  }`}
                >
                  <div className="text-xs font-medium text-[var(--foreground)] truncate">
                    {user.email.split("@")[0]}
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--brand-secondary)" }}
                    />
                    <span className="truncate">{user.role}</span>
                  </div>
                </div>
              </button>

              {/* Liquid Glass Profile Popover */}
              {isProfileOpen && (
                <div className="absolute left-16 bottom-1 w-64 rounded-2xl liquid-glass-elevated p-3 z-50">
                  <div className="p-2.5 rounded-xl bg-[var(--surface-overlay)] mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                        style={{
                          background: "var(--brand-accent)",
                          color: "var(--brand-accent-fg)"
                        }}
                      >
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                          {user.email.split("@")[0]}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)] truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full px-2.5 py-2 mb-1.5 rounded-xl bg-[var(--surface-overlay)] hover:bg-[var(--surface-elevated)] text-xs text-[var(--foreground)] flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2 text-xs">
                      <Palette className="w-3.5 h-3.5" style={{ color: "var(--brand-tertiary)" }} />
                      Themes &amp; Fonts
                    </span>
                    <span className="text-[11px] font-semibold" style={{ color: "var(--brand-secondary)" }}>
                      Open
                    </span>
                  </button>

                  <div className="px-2.5 py-2 rounded-xl bg-[var(--surface-overlay)] text-xs text-[var(--foreground)] flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-xs">
                      <Shield className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                      Tier
                    </span>
                    <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--brand-accent)" }}>
                      Pro Studio
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-medium flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              aria-label="Sign In"
              title={!isHovered ? "Sign In" : undefined}
              className="w-full flex items-center gap-3 p-2 rounded-xl saas-btn-primary transition-all text-left overflow-hidden"
            >
              <div className="min-w-6 flex items-center justify-center">
                <LogIn className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap transition-all duration-200 overflow-hidden ${
                  isHovered ? "opacity-100 max-w-[140px]" : "opacity-0 max-w-0"
                }`}
              >
                Sign In
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* LIQUID GLASS SETTINGS SHEET: Color Themes (Looka), Fonts, Text Size & Appearance */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Studio Appearance & Theme Settings"
            className="liquid-glass-elevated rounded-3xl max-w-2xl w-full overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between bg-[var(--surface-overlay)]/60">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--brand-accent-soft)",
                    color: "var(--brand-accent)"
                  }}
                >
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Appearance &amp; Theme Studio
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Color themes inspired by Looka palettes, typography &amp; text scale
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close Settings"
                className="p-2 rounded-xl bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[76vh] overflow-y-auto">
              {/* 1. Light / Dark Mode */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Appearance Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--surface-overlay)]">
                  <button
                    onClick={() => toggleTheme("dark")}
                    style={
                      appearance.theme === "dark"
                        ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                        : undefined
                    }
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all ${
                      appearance.theme === "dark"
                        ? "font-semibold"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </button>
                  <button
                    onClick={() => toggleTheme("light")}
                    style={
                      appearance.theme === "light"
                        ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                        : undefined
                    }
                    className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all ${
                      appearance.theme === "light"
                        ? "font-semibold"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                </div>
              </div>

              {/* 2. Looka Color Themes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                    Color Theme Palettes
                  </label>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    Looka.com curated combinations
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COLOR_THEMES.map((ct) => {
                    const active = appearance.colorTheme === ct.id;
                    return (
                      <button
                        key={ct.id}
                        onClick={() => selectColorTheme(ct.id)}
                        style={
                          active
                            ? {
                                background: "var(--brand-accent-soft)",
                              }
                            : undefined
                        }
                        className={`p-3.5 rounded-2xl text-left transition-all flex items-center justify-between gap-3 ${
                          active
                            ? "shadow-md"
                            : "bg-[var(--surface-overlay)] hover:bg-[var(--surface-elevated)]"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                            {ct.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--muted-foreground)]">
                            {ct.swatches.map((hex) => (
                              <span key={hex} className="inline-flex items-center gap-1">
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block"
                                  style={{ backgroundColor: hex }}
                                />
                                <span>{hex}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {active && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: "var(--brand-accent)",
                              color: "var(--brand-accent-fg)"
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Font Size */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] block">
                  Overall Text Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_SCALE_OPTIONS.map((opt) => {
                    const active = appearance.fontScale === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => selectFontScale(opt.id)}
                        style={
                          active
                            ? {
                                background: "var(--brand-accent)",
                                color: "var(--brand-accent-fg)"
                              }
                            : undefined
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                          active
                            ? "font-semibold"
                            : "bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Font Combinations */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
                  Font Combinations (Headings + Body)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {FONT_PRESETS.map((preset) => {
                    const active = appearance.fontPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => selectFontPreset(preset.id)}
                        style={
                          active
                            ? {
                                background: "var(--brand-accent-soft)",
                              }
                            : undefined
                        }
                        className={`p-3.5 rounded-2xl text-left transition-all flex items-start justify-between gap-3 ${
                          active
                            ? "shadow-sm"
                            : "bg-[var(--surface-overlay)] hover:bg-[var(--surface-elevated)]"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-sm font-bold text-[var(--foreground)]"
                              style={{ fontFamily: preset.headingCss }}
                            >
                              {preset.headingLabel} + {preset.bodyLabel}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] text-[var(--muted-foreground)] font-medium">
                              {preset.name}
                            </span>
                          </div>
                          <p
                            className="text-xs text-[var(--muted-foreground)] leading-relaxed"
                            style={{ fontFamily: preset.bodyCss }}
                          >
                            {preset.description} — Crafted typography for studio workflows.
                          </p>
                        </div>

                        {active && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                              background: "var(--brand-accent)",
                              color: "var(--brand-accent-fg)"
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--surface-overlay)]/60 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 saas-btn-primary text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
