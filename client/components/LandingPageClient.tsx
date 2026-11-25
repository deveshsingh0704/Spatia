"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import {
  Sparkles,
  Wand2,
  Sliders,
  BarChart2,
  Image as ImageIcon,
  History,
  Share2,
  Palette,
  Type,
  Shield,
  Code2,
  Download,
  ArrowRight,
  Check,
  ChevronRight,
  Cpu,
  Layers,
  Dice5,
  Eye,
  ExternalLink,
  Sun,
  Moon,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  GraphiteCard,
  GraphiteBadge,
  GraphiteButton,
} from "@/components/ui/graphite-primitives";
import {
  COLOR_THEMES,
  FONT_PRESETS,
  FONT_SCALE_OPTIONS,
  ColorThemeId,
  FontPresetId,
  FontScaleId,
  ThemeMode,
  applyAppearanceSettings,
  loadAppearanceSettings,
} from "@/lib/appearance";

type PreviewTabId = "studio" | "matrix" | "benchmark";

interface FeatureItem {
  id: string;
  title: string;
  route: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  capabilities: string[];
}

const FEATURES: FeatureItem[] = [
  {
    id: "studio",
    title: "Conversational Studio & Fine-Tuned Diffusion",
    route: "/studio",
    category: "Generation",
    icon: Wand2,
    summary:
      "Multi-turn spatial diffusion chat with Fine-Tuned SD v1.5 (LSUN Bedrooms) and Base SD v1.5, plus real-time Server-Sent Events (SSE) step streaming.",
    capabilities: [
      "DDIM & DDPM schedulers with custom step counts",
      "Prompt, negative tag chips, CFG guidance, seed RNG & resolution",
      "Embedded PNG metadata chunks (prompt, sampler, seed, latency)",
    ],
  },
  {
    id: "chats",
    title: "Persistent Chat Projects & Public Sharing",
    route: "/chats",
    category: "Collaboration",
    icon: History,
    summary:
      "Every Studio conversation persists as a UUID-backed project with its full parameter snapshot, thumbnails, bookmark state, and shareable links.",
    capabilities: [
      "Search, filter by saved or shared, rename & delete threads",
      "One-click public read-only /share/[token] links for anyone",
      "Restore exact sampler, prompt, seed, and history in one click",
    ],
  },
  {
    id: "matrix",
    title: "Interactive Sampler Matrix Sweep",
    route: "/studio",
    category: "Experimentation",
    icon: Sliders,
    summary:
      "Compare DDIM vs DDPM across 10, 20, 30, 50, 75, 100, or custom step counts up to 1000 using the same prompt, guidance scale, and RNG seed.",
    capabilities: [
      "Custom sweep prompt, CFG slider, and dice-randomized RNG seed",
      "Live Recharts latency & FID convergence curves",
      "All Generated Images grid with full-size modal preview",
    ],
  },
  {
    id: "benchmark",
    title: "Empirical Benchmark Lab & CSV Export",
    route: "/benchmark",
    category: "Telemetry",
    icon: BarChart2,
    summary:
      "Real PostgreSQL-persisted benchmark runs with live GPU/VRAM and host RAM telemetry—zero mock data.",
    capabilities: [
      "Grouped Benchmark Runs Archive indexed by unique batch_id",
      "Color-coded DDIM (blue) vs DDPM (amber) badges & View Image modal",
      "Export per-config, per-run, or full benchmark archive to CSV",
    ],
  },
  {
    id: "gallery",
    title: "Architectural Design Gallery & Collections",
    route: "/gallery",
    category: "Curation",
    icon: ImageIcon,
    summary:
      "Browse every rendered output in a searchable, filterable masonry-ready archive with custom Libraries/Collections and favorites.",
    capabilities: [
      "Filter by model, sampler, favorites, and chronological sort",
      "Create custom collections, rename titles, or delete outputs",
      "Inspect full telemetry or reload any image into Studio (?gen=...)",
    ],
  },
  {
    id: "personalize",
    title: "Personalize Theme, Typography & Scale",
    route: "/studio",
    category: "Personalization",
    icon: Palette,
    summary:
      "Tailor the entire workspace in real time with 7 curated palettes (including Apple Graphite), Light/Dark mode, 4 font pairings, and 3 text scales.",
    capabilities: [
      "Apple Graphite, Teal & Tangerine, Prussian & Mustard & 4 more",
      "4 Google Font pairings: Plus Jakarta Sans, Playfair, Syne, Poppins",
      "Dynamic Type scaling: Standard (16px), Comfort (18px), Large (19.5px)",
    ],
  },
  {
    id: "isolation",
    title: "Per-User Data Isolation & JWT Auth",
    route: "/login",
    category: "Security",
    icon: Lock,
    summary:
      "Strict account-level isolation across chats, gallery images, collections, and benchmark runs powered by JWT access tokens and refresh cookies.",
    capabilities: [
      "User-scoped PostgreSQL queries on all private endpoints",
      "Silent token refresh with Fetch-with-Auth wrapper",
      "Per-user active chat state & public-only /share/[token] exception",
    ],
  },
  {
    id: "infra",
    title: "REST API Reference, S3 & Serverless GPU",
    route: "/api",
    category: "Architecture",
    icon: Code2,
    summary:
      "Production FastAPI backend supporting local PyTorch CUDA execution or Modal Serverless GPU offloading, plus AWS S3 / local storage.",
    capabilities: [
      "Interactive /api documentation covering every endpoint",
      "Presigned AWS S3 media URLs with local fallback",
      "Real-time SSE progress stream at /api/generate/stream/{job_id}",
    ],
  },
];

const SHOWCASE_SAMPLES = [
  {
    id: "penthouse",
    label: "Penthouse Twilight",
    model: "SD v1.5 Fine-Tuned",
    sampler: "DDIM • 50 steps",
    latency: "2.84s",
    fid: "4.82 FID",
    image: "/photorealistic_modern_luxury_architectural_penthouse_master_bedroom_interior.png",
    prompt:
      "Photorealistic modern luxury architectural penthouse master bedroom interior with floor-to-ceiling panoramic glass windows overlooking a twilight metropolis.",
  },
  {
    id: "minimalist",
    label: "Minimalist Oak",
    model: "SD v1.5 Fine-Tuned",
    sampler: "DDIM • 50 steps",
    latency: "2.84s",
    fid: "4.82 FID",
    image: "/comparisons/comparison_1_modern_minimalist_bedroom.png",
    prompt:
      "Minimalist Scandinavian bedroom suite, warm oak timber ceiling, soft indirect cove lighting, linen drapes, architectural digest photography.",
  },
  {
    id: "cabin",
    label: "Walnut Cabin",
    model: "SD v1.5 Fine-Tuned",
    sampler: "DDIM • 50 steps",
    latency: "2.91s",
    fid: "4.90 FID",
    image: "/comparisons/comparison_2_cozy_dark_wood_cabin_bedroom.png",
    prompt:
      "Dark walnut wood cabin bedroom, warm bedside brass sconces, wool throw blanket, floor-to-ceiling forest view window at twilight.",
  },
  {
    id: "hotel",
    label: "Luxury Suite",
    model: "SD v1.5 Fine-Tuned",
    sampler: "DDIM • 50 steps",
    latency: "2.88s",
    fid: "4.85 FID",
    image: "/comparisons/comparison_3_luxury_suite_hotel_bedroom.png",
    prompt:
      "Five-star architectural hotel master suite with travertine accents, recessed warm LED wash, textured boucle headboard, 8k interior.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "Step 01",
    title: "Sign In & Personalize Your Workspace",
    route: "/login",
    cta: "Sign In / Create Account",
    description:
      "Authenticate with your private account so every chat thread, image, collection, and benchmark run stays isolated to you. Open Sidebar Appearance to pick Apple Graphite (or 6 other palettes), Dark/Light mode, font pairing, and text size.",
    highlights: [
      "JWT authentication with silent cookie refresh",
      "7 palettes + 4 typography pairings + 3 Dynamic Type scales",
      "Settings persist instantly across the entire workspace",
    ],
  },
  {
    step: "Step 02",
    title: "Generate & Iterate in Conversational Studio",
    route: "/studio",
    cta: "Open Studio Chat",
    description:
      "Enter an architectural prompt and negative tags in Studio. Tune sampler (DDIM / DDPM), step count, guidance scale (CFG), RNG seed, and resolution, then watch live SSE step-by-step progress as your image renders with embedded PNG metadata.",
    highlights: [
      "Fine-Tuned SD v1.5 (LSUN Bedrooms) & Base SD v1.5 models",
      "Real-time SSE progress bar with ETA & VRAM telemetry",
      "Auto-saved UUID chat sessions with one-click /share/[token] links",
    ],
  },
  {
    step: "Step 03",
    title: "Sweep & Benchmark Across Samplers",
    route: "/benchmark",
    cta: "Open Benchmark Lab",
    description:
      "Switch to the Sampler Matrix tab in Studio to run multi-sampler (DDIM vs DDPM) sweeps across 10 to 1000 steps with fixed RNG seed and CFG. Inspect the Latency & FID charts, view all generated images full-screen, and reopen any sweep anytime via its unique batch ID.",
    highlights: [
      "Unique batch_id per sweep (/studio?bench=...) just like chats",
      "Grouped Benchmark Runs Archive with View Image & View Run",
      "One-click CSV export per config, per run, or entire archive",
    ],
  },
  {
    step: "Step 04",
    title: "Curate Gallery Collections & Integrate via API",
    route: "/gallery",
    cta: "Browse Gallery",
    description:
      "Organize renders into custom Libraries/Collections, favorite top outputs, search by prompt or sampler, reload any generation back into Studio, or inspect the interactive FastAPI endpoints in the API Reference.",
    highlights: [
      "Custom collections, favorites, rename, delete & inspect modal",
      "Load any gallery item back into Studio (?gen=...)",
      "Complete REST API Reference at /api",
    ],
  },
];

export const LandingPageClient: React.FC = () => {
  const { isAuthenticated, user, openAuthModal } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Top Scroll Progress Bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 30,
    restDelta: 0.001,
  });
  const [remainingPct, setRemainingPct] = useState<number>(100);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const pctLeft = Math.max(0, Math.min(100, Math.round((1 - latest) * 100)));
    setRemainingPct(pctLeft);
  });

  // Interactive Hero Preview State
  const [previewTab, setPreviewTab] = useState<PreviewTabId>("studio");
  const [activeSampleIdx, setActiveSampleIdx] = useState<number>(0);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  // Interactive Personalization Sandbox State (defaults to Apple Graphite)
  const [sandboxThemeId, setSandboxThemeId] = useState<ColorThemeId>("graphite");
  const [sandboxMode, setSandboxMode] = useState<ThemeMode>("dark");
  const [sandboxFontId, setSandboxFontId] = useState<FontPresetId>("jakarta-inter");
  const [sandboxScaleId, setSandboxScaleId] = useState<FontScaleId>("default");
  const [appliedToast, setAppliedToast] = useState<boolean>(false);

  const selectedPalette =
    COLOR_THEMES.find((t) => t.id === sandboxThemeId) ||
    COLOR_THEMES[COLOR_THEMES.length - 1];
  const paletteTokens =
    sandboxMode === "light" ? selectedPalette.light : selectedPalette.dark;
  const selectedFont =
    FONT_PRESETS.find((f) => f.id === sandboxFontId) || FONT_PRESETS[0];
  const selectedScale =
    FONT_SCALE_OPTIONS.find((s) => s.id === sandboxScaleId) ||
    FONT_SCALE_OPTIONS[1];

  const handleApplyToApp = () => {
    const current = loadAppearanceSettings();
    applyAppearanceSettings({
      ...current,
      theme: sandboxMode,
      colorTheme: sandboxThemeId,
      fontPreset: sandboxFontId,
      fontScale: sandboxScaleId,
    });
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 3000);
  };

  const activeSample = SHOWCASE_SAMPLES[activeSampleIdx];
  const activeWorkflow = WORKFLOW_STEPS[activeStepIdx];

  const motionTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 28 };

  return (
    <div
      id="top"
      className="min-h-screen bg-[#09090B] text-[#F4F4F5] selection:bg-[#F4F4F5] selection:text-[#09090B] relative overflow-x-clip"
    >
      {/* Top Fixed Scroll Progress Bar showing remaining page */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-50 bg-[#1A1A1F]"
        role="progressbar"
        aria-label="Page reading progress"
        aria-valuenow={100 - remainingPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-[#A1A1AA] via-[#E4E4E7] to-[#FFFFFF]"
          style={{ scaleX }}
        />
      </div>

      {/* Subtle ambient radial luminance in Graphite neutral spectrum */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[480px] rounded-full bg-white/[0.035] blur-[140px]" />
        <div className="absolute top-[42%] -right-40 w-[520px] h-[520px] rounded-full bg-zinc-400/[0.03] blur-[140px]" />
      </div>

      {/* Floating Liquid Glass Header (Glass ONLY on floating functional navigation layer per HIG) */}
      <header className="sticky top-4 z-40 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-2xl backdrop-blur-2xl bg-[#16161A]/75 border border-white/[0.1] shadow-[0_18px_48px_-12px_rgba(0,0,0,0.75)] px-4 sm:px-5 py-2.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group focus-visible:outline-none">
            <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] text-[#09090B] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-[#F4F4F5] block leading-none">
                LatentCraft
              </span>
              <span className="text-[11px] font-mono text-[#A1A1AA]">
                Spatia Diffusion Engine
              </span>
            </div>
          </Link>

          <nav
            aria-label="Landing sections"
            className="hidden md:flex items-center gap-1 text-xs text-[#D4D4D8]"
          >
            {[
              { label: "Capabilities", href: "#capabilities" },
              { label: "Gallery & Renders", href: "#showcase" },
              { label: "Personalize", href: "#personalize" },
              { label: "How to Use", href: "#how-to-use" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-xl hover:bg-white/[0.07] hover:text-[#F4F4F5] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#09090B]/60 border border-white/[0.08] text-[11px] font-mono text-[#D4D4D8]"
              title="Scroll remaining on page"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F4F4F5]" />
              <span>{remainingPct}% left</span>
            </div>

            {isAuthenticated ? (
              <Link href="/studio">
                <GraphiteButton size="sm">
                  <span>Open Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </GraphiteButton>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal()}
                  className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-medium text-[#D4D4D8] hover:text-[#F4F4F5] hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <Link href="/studio">
                  <GraphiteButton size="sm">
                    <span>Launch Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </GraphiteButton>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 space-y-28">
        {/* HERO SECTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-4">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTransition}
            className="lg:col-span-6 space-y-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <GraphiteBadge variant="subtle">
                <Cpu className="w-3.5 h-3.5 text-[#E4E4E7]" />
                <span>Fine-Tuned SD v1.5 • DDIM &amp; DDPM</span>
              </GraphiteBadge>
              <GraphiteBadge variant="outline">
                <span>Apple Graphite Edition</span>
              </GraphiteBadge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight leading-[1.07] text-[#F4F4F5]">
              Spatial diffusion,{" "}
              <span className="text-[#A1A1AA]">engineered for full control.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#D4D4D8] leading-relaxed max-w-[60ch]">
              LatentCraft is a complete AI creative &amp; benchmarking studio. Generate
              architectural interiors in conversational threads, sweep DDIM vs DDPM
              samplers up to 1000 steps, curate gallery collections, personalize fonts
              and themes live, share public sessions, and export empirical CSV telemetry.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isAuthenticated ? (
                <Link href="/studio">
                  <GraphiteButton size="lg">
                    <Wand2 className="w-4 h-4" />
                    <span>Continue as {user?.email?.split("@")[0] || "Creator"}</span>
                  </GraphiteButton>
                </Link>
              ) : (
                <Link href="/signup">
                  <GraphiteButton size="lg">
                    <Sparkles className="w-4 h-4" />
                    <span>Get Started Free</span>
                  </GraphiteButton>
                </Link>
              )}

              <Link href="/benchmark">
                <GraphiteButton variant="secondary" size="lg">
                  <BarChart2 className="w-4 h-4" />
                  <span>Explore Benchmark Lab</span>
                </GraphiteButton>
              </Link>
            </div>

            {/* Concise capability readout strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.08]">
              {[
                { label: "Workspace Modules", value: "6 Integrated" },
                { label: "Appearance Engine", value: "7 Themes • 4 Fonts" },
                { label: "Benchmark Persistence", value: "PostgreSQL + CSV" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-sm sm:text-base font-semibold text-[#F4F4F5] font-mono">
                    {stat.value}
                  </div>
                  <div className="text-xs text-[#A1A1AA] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Interactive Hero Preview Card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionTransition, delay: shouldReduceMotion ? 0 : 0.08 }}
            className="lg:col-span-6"
          >
            <GraphiteCard className="p-4 sm:p-5 space-y-4 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)]">
              {/* Segmented Pill Control with Framer Motion layoutId */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div
                  className="inline-flex p-1 rounded-xl bg-[#09090B] border border-white/[0.07]"
                  role="tablist"
                  aria-label="Preview workspace mode"
                >
                  {(
                    [
                      { id: "studio", label: "Studio Chat", icon: Wand2 },
                      { id: "matrix", label: "Sampler Matrix", icon: Sliders },
                      { id: "benchmark", label: "Benchmark Lab", icon: BarChart2 },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const active = previewTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setPreviewTab(tab.id)}
                        className={`relative px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                          active
                            ? "text-[#09090B]"
                            : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="heroPreviewTab"
                            transition={motionTransition}
                            className="absolute inset-0 rounded-lg bg-[#F4F4F5]"
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <span className="text-[11px] font-mono text-[#A1A1AA]">
                  Live Interactive Preview
                </span>
              </div>

              <AnimatePresence mode="wait">
                {previewTab === "studio" && (
                  <motion.div
                    key="studio"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#09090B]">
                      <img
                        src="/photorealistic_modern_luxury_architectural_penthouse_master_bedroom_interior.png"
                        alt="Fine-Tuned Spatial Diffusion bedroom output"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#09090B]/80 backdrop-blur-md border border-white/10 text-xs font-mono">
                        <span className="text-[#F4F4F5]">DDIM • 50 steps • CFG 7.5</span>
                        <span className="text-[#D4D4D8]">Seed: 42 • 2.84s</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1A1A1F] text-xs text-[#D4D4D8] flex items-center justify-between gap-3">
                      <span className="truncate">
                        &ldquo;Photorealistic modern luxury architectural penthouse master bedroom...&rdquo;
                      </span>
                      <Link
                        href="/studio"
                        className="shrink-0 text-[#F4F4F5] font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Try in Studio <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                )}

                {previewTab === "matrix" && (
                  <motion.div
                    key="matrix"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          label: "DDIM • 50 Steps",
                          sub: "2.84s • 4.82 FID",
                          img: "/benchmark-samples/bedroom_ddim_50.png",
                          tone: "text-blue-400",
                        },
                        {
                          label: "DDPM • 100 Steps",
                          sub: "6.20s • 6.20 FID",
                          img: "/benchmark-samples/bedroom_ddpm_100.png",
                          tone: "text-amber-400",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl overflow-hidden bg-[#1A1A1F]"
                        >
                          <div className="aspect-square w-full bg-[#09090B]">
                            <img
                              src={item.img}
                              alt={item.label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-2.5 flex items-center justify-between text-[11px] font-mono">
                            <span className={`font-semibold ${item.tone}`}>
                              {item.label}
                            </span>
                            <span className="text-[#D4D4D8]">{item.sub}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-xl bg-[#1A1A1F] text-xs text-[#D4D4D8] flex items-center justify-between gap-2">
                      <span>Custom steps (10–1000), CFG slider, Dice RNG &amp; batch_id URL</span>
                      <Link
                        href="/studio"
                        className="shrink-0 text-[#F4F4F5] font-semibold hover:underline"
                      >
                        Run Sweep →
                      </Link>
                    </div>
                  </motion.div>
                )}

                {previewTab === "benchmark" && (
                  <motion.div
                    key="benchmark"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="p-4 rounded-xl bg-[#1A1A1F] space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#F4F4F5] font-semibold">
                          Run: bench_1795644747765
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#24242B] text-[#D4D4D8]">
                          4 configs • Seed 42
                        </span>
                      </div>
                      <div className="space-y-2">
                        {[
                          {
                            sampler: "DDIM",
                            steps: 50,
                            lat: "2.84s",
                            fid: "4.82",
                            badge: "bg-blue-500/15 text-blue-400",
                          },
                          {
                            sampler: "DDPM",
                            steps: 50,
                            lat: "3.10s",
                            fid: "9.40",
                            badge: "bg-amber-500/15 text-amber-400",
                          },
                          {
                            sampler: "DDIM",
                            steps: 100,
                            lat: "5.68s",
                            fid: "3.85",
                            badge: "bg-blue-500/15 text-blue-400",
                          },
                        ].map((row, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#121215]"
                          >
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.badge}`}
                            >
                              {row.sampler}
                            </span>
                            <span className="text-[#F4F4F5]">{row.steps} steps</span>
                            <span className="text-emerald-400">{row.lat}</span>
                            <span className="text-[#D4D4D8]">FID {row.fid}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#1A1A1F] text-xs text-[#D4D4D8] flex items-center justify-between gap-2">
                      <span>PostgreSQL history • View Image • Re-open in Studio • CSV</span>
                      <Link
                        href="/benchmark"
                        className="shrink-0 text-[#F4F4F5] font-semibold hover:underline"
                      >
                        Open Lab →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GraphiteCard>
          </motion.div>
        </section>

        {/* WHAT CAN THE APPLICATION DO — COMPLETE FEATURE GRID */}
        <section id="capabilities" className="space-y-8 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <GraphiteBadge variant="subtle">What LatentCraft Can Do</GraphiteBadge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
                Every tool from prompt to empirical benchmark.
              </h2>
              <p className="text-sm sm:text-base text-[#A1A1AA] max-w-[65ch]">
                Built end-to-end across Next.js, FastAPI, PostgreSQL, and PyTorch/Modal —
                every workflow is private per user and accessible from one unified Graphite workspace.
              </p>
            </div>
            <Link href="/api" className="shrink-0">
              <GraphiteButton variant="secondary" size="sm">
                <Code2 className="w-3.5 h-3.5" />
                <span>Inspect API Reference</span>
              </GraphiteButton>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    ...motionTransition,
                    delay: shouldReduceMotion ? 0 : idx * 0.04,
                  }}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                >
                  <GraphiteCard className="p-5 h-full flex flex-col justify-between gap-4 hover:border-white/20">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-[#1A1A1F] border border-white/[0.08] flex items-center justify-center text-[#F4F4F5]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-mono text-[#A1A1AA]">
                          {feat.category}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[#F4F4F5] leading-snug">
                        {feat.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                        {feat.summary}
                      </p>
                      <ul className="space-y-1.5 pt-1">
                        {feat.capabilities.map((cap) => (
                          <li
                            key={cap}
                            className="text-xs text-[#D4D4D8] flex items-start gap-2"
                          >
                            <Check className="w-3.5 h-3.5 text-[#F4F4F5] shrink-0 mt-0.5" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href={feat.route}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4F4F5] hover:text-[#D4D4D8] pt-2"
                    >
                      <span>Open {feat.route}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </GraphiteCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* INTERACTIVE RENDER SHOWCASE */}
        <section id="showcase" className="space-y-6 scroll-mt-24">
          <div className="space-y-2">
            <GraphiteBadge variant="subtle">Fine-Tuned Spatial Outputs</GraphiteBadge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              Inspect real renders from the diffusion pipeline.
            </h2>
          </div>

          <GraphiteCard className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSample.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#09090B]"
                  >
                    <img
                      src={activeSample.image}
                      alt={activeSample.label}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="lg:col-span-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {SHOWCASE_SAMPLES.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSampleIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        idx === activeSampleIdx
                          ? "bg-[#F4F4F5] text-[#09090B] font-semibold"
                          : "bg-[#1A1A1F] text-[#D4D4D8] hover:bg-[#24242B]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 p-4 rounded-2xl bg-[#1A1A1F]">
                  <div className="flex items-center justify-between text-xs font-mono text-[#A1A1AA]">
                    <span>{activeSample.model}</span>
                    <span>{activeSample.sampler}</span>
                  </div>
                  <p className="text-sm text-[#F4F4F5] leading-relaxed">
                    &ldquo;{activeSample.prompt}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-[#121215] text-emerald-400">
                      Latency: {activeSample.latency}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#121215] text-[#D4D4D8]">
                      {activeSample.fid}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link href="/gallery">
                    <GraphiteButton size="md">
                      <Eye className="w-4 h-4" />
                      <span>Open Full Gallery</span>
                    </GraphiteButton>
                  </Link>
                  <Link href="/studio">
                    <GraphiteButton variant="secondary" size="md">
                      <Share2 className="w-4 h-4" />
                      <span>Generate &amp; Share</span>
                    </GraphiteButton>
                  </Link>
                </div>
              </div>
            </div>
          </GraphiteCard>
        </section>

        {/* INTERACTIVE PERSONALIZATION SANDBOX */}
        <section id="personalize" className="space-y-6 scroll-mt-24">
          <div className="space-y-2">
            <GraphiteBadge variant="subtle">
              <Palette className="w-3.5 h-3.5" />
              <span>Live Theme &amp; Typography Engine</span>
            </GraphiteBadge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              Personalize colors, font pairings, and Dynamic Type scale.
            </h2>
            <p className="text-sm sm:text-base text-[#A1A1AA] max-w-[65ch]">
              Test the exact appearance engine available in the sidebar Settings popover —
              switch between 7 palettes (defaulting here to Apple Graphite), 4 font
              pairings, and Light/Dark modes, or apply your selection directly to your workspace.
            </p>
          </div>

          <GraphiteCard className="p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Controls */}
              <div className="lg:col-span-6 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#D4D4D8]">
                    <span>Appearance Mode</span>
                    <span className="font-mono text-[#A1A1AA] uppercase">{sandboxMode}</span>
                  </div>
                  <div className="inline-flex p-1 rounded-xl bg-[#09090B] border border-white/[0.08]">
                    {(["dark", "light"] as ThemeMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSandboxMode(m)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                          sandboxMode === m
                            ? "bg-[#F4F4F5] text-[#09090B] font-semibold"
                            : "text-[#A1A1AA] hover:text-[#F4F4F5]"
                        }`}
                      >
                        {m === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                        <span className="capitalize">{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#D4D4D8] block">
                    Color Palette ({COLOR_THEMES.length} Built-In)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSandboxThemeId(theme.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border cursor-pointer transition-all ${
                          sandboxThemeId === theme.id
                            ? "bg-[#24242B] border-[#F4F4F5]/60 text-[#F4F4F5] font-semibold"
                            : "bg-[#1A1A1F] border-white/[0.06] text-[#A1A1AA] hover:text-[#F4F4F5]"
                        }`}
                      >
                        <span className="flex -space-x-1">
                          {theme.swatches.map((hex) => (
                            <span
                              key={hex}
                              className="w-3 h-3 rounded-full ring-1 ring-black/40"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </span>
                        <span>{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#D4D4D8] flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    Font Pairing ({FONT_PRESETS.length} Options)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FONT_PRESETS.map((fp) => (
                      <button
                        key={fp.id}
                        onClick={() => setSandboxFontId(fp.id)}
                        className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                          sandboxFontId === fp.id
                            ? "bg-[#24242B] border-[#F4F4F5]/60 text-[#F4F4F5]"
                            : "bg-[#1A1A1F] border-white/[0.06] text-[#A1A1AA] hover:text-[#F4F4F5]"
                        }`}
                      >
                        <div className="text-xs font-semibold text-[#F4F4F5]">
                          {fp.name}
                        </div>
                        <div className="text-[11px] text-[#A1A1AA] mt-0.5">
                          {fp.headingLabel} + {fp.bodyLabel}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5">
                    {FONT_SCALE_OPTIONS.map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => setSandboxScaleId(sc.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                          sandboxScaleId === sc.id
                            ? "bg-[#F4F4F5] text-[#09090B] font-semibold"
                            : "bg-[#1A1A1F] text-[#A1A1AA] hover:text-[#F4F4F5]"
                        }`}
                      >
                        {sc.px}
                      </button>
                    ))}
                  </div>

                  <GraphiteButton size="sm" onClick={handleApplyToApp}>
                    {appliedToast ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Applied to Workspace</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply Theme to App</span>
                      </>
                    )}
                  </GraphiteButton>
                </div>
              </div>

              {/* Live Sandbox Card Preview */}
              <div className="lg:col-span-6">
                <motion.div
                  layout
                  transition={motionTransition}
                  className="rounded-2xl p-6 border transition-colors"
                  style={{
                    backgroundColor: paletteTokens.bg,
                    borderColor:
                      sandboxMode === "light"
                        ? "rgba(0,0,0,0.1)"
                        : "rgba(255,255,255,0.1)",
                    color: sandboxMode === "light" ? "#111827" : "#F4F4F5",
                    fontFamily: selectedFont.bodyCss,
                  }}
                >
                  <div
                    className="rounded-xl p-5 space-y-4"
                    style={{ backgroundColor: paletteTokens.surface1 }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{
                          backgroundColor: paletteTokens.accent,
                          color: paletteTokens.accentFg,
                        }}
                      >
                        {selectedPalette.name}
                      </span>
                      <span className="text-xs font-mono opacity-75">
                        {selectedScale.label}
                      </span>
                    </div>

                    <h3
                      className="text-xl font-bold tracking-tight"
                      style={{ fontFamily: selectedFont.headingCss }}
                    >
                      Minimalist Architectural Penthouse
                    </h3>
                    <p className="text-sm opacity-80 leading-relaxed">
                      Previewing {selectedFont.headingLabel} headings paired with{" "}
                      {selectedFont.bodyLabel} body copy on a {sandboxMode} surface.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold"
                        style={{
                          backgroundColor: paletteTokens.accent,
                          color: paletteTokens.accentFg,
                        }}
                      >
                        Generate Render
                      </span>
                      <span
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium"
                        style={{ backgroundColor: paletteTokens.surface2 }}
                      >
                        Seed: 42
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </GraphiteCard>
        </section>

        {/* HOW TO USE THE APPLICATION */}
        <section id="how-to-use" className="space-y-6 scroll-mt-24">
          <div className="space-y-2">
            <GraphiteBadge variant="subtle">
              <Layers className="w-3.5 h-3.5" />
              <span>How to Use LatentCraft</span>
            </GraphiteBadge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
              From prompt to reproducible benchmark in four steps.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-2.5">
              {WORKFLOW_STEPS.map((item, idx) => {
                const active = idx === activeStepIdx;
                return (
                  <button
                    key={item.step}
                    onClick={() => setActiveStepIdx(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      active
                        ? "bg-[#1A1A1F] border-white/20 text-[#F4F4F5]"
                        : "bg-[#121215] border-white/[0.06] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#16161B]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider">
                        {item.step}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          active ? "translate-x-0.5 text-[#F4F4F5]" : "opacity-50"
                        }`}
                      />
                    </div>
                    <div className="text-sm font-semibold mt-1 text-[#F4F4F5]">
                      {item.title}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-7">
              <GraphiteCard elevated className="p-6 sm:p-7 h-full flex flex-col justify-between gap-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeWorkflow.step}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <GraphiteBadge variant="default">{activeWorkflow.step}</GraphiteBadge>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F4F4F5]">
                      {activeWorkflow.title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed">
                      {activeWorkflow.description}
                    </p>
                    <ul className="space-y-2.5 pt-2">
                      {activeWorkflow.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-2.5 text-sm text-[#D4D4D8]"
                        >
                          <Check className="w-4 h-4 text-[#F4F4F5] shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
                  <div className="flex items-center gap-3 text-xs font-mono text-[#A1A1AA]">
                    <span className="inline-flex items-center gap-1">
                      <Dice5 className="w-3.5 h-3.5" /> Reproducible Seeds
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> CSV &amp; PNG Metadata
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> Private per User
                    </span>
                  </div>

                  <Link href={activeWorkflow.route}>
                    <GraphiteButton size="md">
                      <span>{activeWorkflow.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </GraphiteButton>
                  </Link>
                </div>
              </GraphiteCard>
            </div>
          </div>
        </section>
      </main>

      {/* GRAPHITE FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#09090B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F4F4F5] text-[#09090B] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-[#F4F4F5]">
                LatentCraft
              </span>
              <span className="text-xs font-mono text-[#A1A1AA]">
                • Spatia Diffusion Studio
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] max-w-md">
              Fine-tuned spatial diffusion studio, empirical sampler benchmarking lab,
              gallery collections, and customizable Graphite interface.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#D4D4D8]">
            <Link href="/studio" className="hover:text-[#F4F4F5] transition-colors">
              Studio
            </Link>
            <Link href="/chats" className="hover:text-[#F4F4F5] transition-colors">
              Chat History
            </Link>
            <Link href="/benchmark" className="hover:text-[#F4F4F5] transition-colors">
              Benchmark Lab
            </Link>
            <Link href="/gallery" className="hover:text-[#F4F4F5] transition-colors">
              Gallery
            </Link>
            <Link href="/api" className="hover:text-[#F4F4F5] transition-colors">
              API Docs
            </Link>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <a
              href="https://github.com/deveshsingh0704/Spatia"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121215] border border-white/[0.1] hover:bg-[#1A1A1F] text-xs font-mono text-[#F4F4F5] transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>deveshsingh0704 / Spatia</span>
              <ExternalLink className="w-3 h-3 text-[#A1A1AA]" />
            </a>
            <a
              href="https://github.com/deveshsingh0704"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors"
            >
              GitHub: @deveshsingh0704
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
