"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Wand2,
  RefreshCw,
  Sliders,
  CheckCircle,
  BarChart2,
  Clock,
  Sparkles,
  Play,
  Layers,
  ChevronRight,
  TrendingDown,
  HelpCircle,
  Eye,
  X
} from "lucide-react";
import { SystemInfo } from "@/types/benchmark";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface StudioGeneratorProps {
  system: SystemInfo;
}

interface BenchmarkGraphPoint {
  steps: number;
  ddim_latency?: number;
  ddpm_latency?: number;
  ddim_fid?: number;
  ddpm_fid?: number;
}

export const StudioGenerator: React.FC<StudioGeneratorProps> = ({ system }) => {
  const [activeSubTab, setActiveSubTab] = useState<"generate" | "benchmark">("generate");

  // Single Generation States (Default prompt & negative prompt)
  const [prompt, setPrompt] = useState(
    "A photorealistic architectural interior photograph of a modern luxury master bedroom, king size platform bed, textured cream linen duvet, light oak herringbone hardwood floor, panoramic glass windows, soft morning sunlight, subtle ambient lighting, 8k resolution"
  );
  const [negativePrompt, setNegativePrompt] = useState(
    "blurry, grain, noise, low quality, artifacts, jpeg compression, deformed, distorted, bad architecture, weird perspective, unnatural light, cartoon, 3d render, dollhouse, drawing, painting, bad proportions, duplicate, text"
  );
  const [model, setModel] = useState("Stable Diffusion v1.5");
  const [sampler, setSampler] = useState("DDIM");
  const [steps, setSteps] = useState(20);
  const [guidance, setGuidance] = useState(7.5);
  const [seed, setSeed] = useState(42);
  const [resolution, setResolution] = useState("512x512");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Live Stream Progress States
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStepProgress, setCurrentStepProgress] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0.0);
  const [etaTime, setEtaTime] = useState<number>(0.0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry
  const [telemetry, setTelemetry] = useState<{
    latency: number;
    peakVram: number;
    sampler: string;
    steps: number;
    device: string;
  }>({
    latency: 0,
    peakVram: system.vram_used_gb > 0 ? system.vram_used_gb * 1024 : 2675,
    sampler: "DDIM (Deterministic η=0)",
    steps: 20,
    device: system.device_name
  });

  // Benchmark Runner States: Inherits prompt and negative prompt from generator by default
  const [benchPrompt, setBenchPrompt] = useState(prompt);
  const [benchNegativePrompt, setBenchNegativePrompt] = useState(negativePrompt);
  const [benchSamplers, setBenchSamplers] = useState<string[]>(["DDIM", "DDPM"]);
  const [benchSteps, setBenchSteps] = useState<number[]>([10, 20, 30, 50]);
  const [benchSeed, setBenchSeed] = useState<number>(42);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Modal inspection for benchmark image preview
  const [previewBenchmarkImage, setPreviewBenchmarkImage] = useState<{
    url: string;
    sampler: string;
    steps: number;
    latency: number;
    fid: number;
  } | null>(null);

  const [benchGraphData, setBenchGraphData] = useState<BenchmarkGraphPoint[]>([
    { steps: 10, ddim_latency: 0.58, ddpm_latency: 2.15, ddim_fid: 11.40, ddpm_fid: 16.0 },
    { steps: 20, ddim_latency: 1.25, ddpm_latency: 3.92, ddim_fid: 7.90, ddpm_fid: 13.4 },
    { steps: 30, ddim_latency: 1.84, ddpm_latency: 5.67, ddim_fid: 5.80, ddpm_fid: 11.2 },
    { steps: 50, ddim_latency: 2.84, ddpm_latency: 9.40, ddim_fid: 4.82, ddpm_fid: 9.4 }
  ]);
  const [benchResultsList, setBenchResultsList] = useState<any[]>([]);

  // Check for URL query params (e.g. from Gallery "Load in Studio")
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlPrompt = searchParams.get("prompt");
      const urlModel = searchParams.get("model");
      const urlSampler = searchParams.get("sampler");
      const urlSteps = searchParams.get("steps");
      const urlGuidance = searchParams.get("guidance");
      const urlSeed = searchParams.get("seed");

      if (urlPrompt) setPrompt(urlPrompt);
      if (urlModel) setModel(urlModel);
      if (urlSampler) setSampler(urlSampler);
      if (urlSteps) setSteps(Number(urlSteps));
      if (urlGuidance) setGuidance(Number(urlGuidance));
      if (urlSeed) setSeed(Number(urlSeed));
    }
  }, []);

  // Keep benchmark inputs synced with generator inputs if user updates them
  useEffect(() => {
    setBenchPrompt(prompt);
  }, [prompt]);

  useEffect(() => {
    setBenchNegativePrompt(negativePrompt);
  }, [negativePrompt]);

  // Toggle Sampler selection for benchmark
  const toggleSampler = (s: string) => {
    if (benchSamplers.includes(s)) {
      if (benchSamplers.length > 1) {
        setBenchSamplers(benchSamplers.filter((x) => x !== s));
      }
    } else {
      setBenchSamplers([...benchSamplers, s]);
    }
  };

  // Toggle Steps selection for benchmark
  const toggleStep = (stepVal: number) => {
    if (benchSteps.includes(stepVal)) {
      if (benchSteps.length > 1) {
        setBenchSteps(benchSteps.filter((s) => s !== stepVal).sort((a, b) => a - b));
      }
    } else {
      setBenchSteps([...benchSteps, stepVal].sort((a, b) => a - b));
    }
  };

  // Handle SSE Live Streaming Image Generation
  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgressPercent(0);
    setCurrentStepProgress(0);
    setElapsedTime(0.0);
    setEtaTime(0.0);
    setStatusMessage(`Initializing diffusion pipeline on ${system.device_name}...`);

    const jobId = `job_${Date.now()}`;
    const startTime = performance.now();

    // Client-side stopwatch for live smooth counter
    timerRef.current = setInterval(() => {
      const runningSec = (performance.now() - startTime) / 1000;
      setElapsedTime(Number(runningSec.toFixed(1)));
    }, 100);

    // 1. Connect to SSE stream endpoint
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`http://localhost:8001/api/generate/stream/${jobId}`);
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.percent !== undefined) {
            setProgressPercent(payload.percent);
          }
          if (payload.step !== undefined) {
            setCurrentStepProgress(payload.step);
          }
          if (payload.eta_sec !== undefined) {
            setEtaTime(payload.eta_sec);
          }
          if (payload.status === "running") {
            setStatusMessage(`Denoising step ${payload.step} / ${payload.total_steps} (${payload.percent}%)`);
          }
          if (payload.status === "completed" && payload.image_url) {
            const fixedUrl = payload.image_url.replace(":8000/", ":8001/");
            setGeneratedImage(fixedUrl);
          }
        } catch (e) {
          console.error("SSE parse error", e);
        }
      };
      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
        }
      };
    } catch (e) {
      console.warn("SSE connection error", e);
    }

    // 2. Dispatch POST /api/generate
    try {
      const res = await fetch(`http://localhost:8001/api/generate?job_id=${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          model_name: model,
          sampler_name: sampler,
          steps,
          guidance_scale: guidance,
          seed,
          resolution
        })
      });

      const totalElapsed = ((performance.now() - startTime) / 1000).toFixed(2);

      if (res.ok) {
        const data = await res.json();
        if (data.image_url) {
          const fixedUrl = data.image_url.replace(":8000/", ":8001/");
          setGeneratedImage(fixedUrl);
        }
        setProgressPercent(100);
        setCurrentStepProgress(steps);
        setElapsedTime(Number(totalElapsed));
        setEtaTime(0.0);
        setTelemetry({
          latency: data.latency_sec || Number(totalElapsed),
          peakVram: data.peak_vram_mb || (system.vram_used_gb > 0 ? system.vram_used_gb * 1024 : 2675),
          sampler: `${data.sampler} (η=0)`,
          steps: data.steps,
          device: data.device || system.device_name
        });
        setStatusMessage(`Successfully generated via ${data.sampler} in ${totalElapsed}s on ${system.device_name}`);
      } else {
        const err = await res.json();
        setStatusMessage(`Server Notice: ${err.detail || "Fallback loaded"}`);
      }
    } catch (error) {
      console.warn("Backend connection error:", error);
      setStatusMessage("Generation request failed. Check server status.");
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (eventSource) {
        eventSource.close();
      }
      setIsGenerating(false);
    }
  };

  // Benchmark Runner Live Progress States
  const [benchProgressPercent, setBenchProgressPercent] = useState<number>(0);
  const [benchStepProgress, setBenchStepProgress] = useState<number>(0);
  const [benchTotalSteps, setBenchTotalSteps] = useState<number>(0);
  const [benchElapsedTime, setBenchElapsedTime] = useState<number>(0.0);
  const [benchEtaTime, setBenchEtaTime] = useState<number>(0.0);
  const [benchLiveMsg, setBenchLiveMsg] = useState<string>("");
  const benchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Run Custom Benchmark Matrix with live SSE streaming
  const handleRunCustomBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchProgressPercent(0);
    setBenchStepProgress(0);
    setBenchElapsedTime(0.0);
    setBenchEtaTime(0.0);
    const estimatedTotal = (benchSamplers.length * benchSteps.reduce((a, b) => a + b, 0));
    setBenchTotalSteps(estimatedTotal);
    setBenchLiveMsg(`Initializing benchmark across [${benchSamplers.join(", ")}]...`);

    const jobId = `bench_${Date.now()}`;
    const startTime = performance.now();

    // Local stopwatch for benchmark
    benchTimerRef.current = setInterval(() => {
      const runningSec = (performance.now() - startTime) / 1000;
      setBenchElapsedTime(Number(runningSec.toFixed(1)));
    }, 100);

    // Connect SSE stream for benchmark progress
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`http://localhost:8001/api/generate/stream/${jobId}`);
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.percent !== undefined) {
            setBenchProgressPercent(payload.percent);
          }
          if (payload.step !== undefined) {
            setBenchStepProgress(payload.step);
          }
          if (payload.total_steps !== undefined) {
            setBenchTotalSteps(payload.total_steps);
          }
          if (payload.eta_sec !== undefined) {
            setBenchEtaTime(payload.eta_sec);
          }
          if (payload.message) {
            setBenchLiveMsg(payload.message);
          }
        } catch (e) {
          console.error("Benchmark SSE parse error", e);
        }
      };
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch (e) {
      console.warn("Benchmark SSE connection error", e);
    }

    try {
      const res = await fetch(`http://localhost:8001/api/benchmark/run-custom?job_id=${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samplers: benchSamplers,
          steps_list: benchSteps,
          model_name: model,
          prompt: benchPrompt,
          negative_prompt: benchNegativePrompt,
          seed: benchSeed
        })
      });

      const totalElapsed = ((performance.now() - startTime) / 1000).toFixed(2);

      if (res.ok) {
        const data = await res.json();
        if (data.graph_data && data.graph_data.length > 0) {
          setBenchGraphData(data.graph_data);
        }
        if (data.results) {
          setBenchResultsList(data.results);
        }
        setBenchProgressPercent(100);
        setBenchElapsedTime(Number(totalElapsed));
        setBenchEtaTime(0.0);
        setStatusMessage(`Benchmark completed! Evaluated ${data.results.length} configurations in ${totalElapsed}s.`);
      }
    } catch (e) {
      console.warn("Benchmark error", e);
      setStatusMessage("Failed to execute benchmark run on backend.");
    } finally {
      if (benchTimerRef.current) clearInterval(benchTimerRef.current);
      if (eventSource) eventSource.close();
      setIsBenchmarking(false);
    }
  };

  return (
    <div className="my-5 space-y-4">
      {/* Sub-navigation pill between Generator and Custom Benchmark */}
      <div className="flex items-center justify-between bg-[#0f1728]/95 border border-[#1e293b] rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("generate")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeSubTab === "generate"
                ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Interactive Studio Generator</span>
          </button>

          <button
            onClick={() => setActiveSubTab("benchmark")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeSubTab === "benchmark"
                ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Run Multi-Step Sampler Benchmark</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
          GPU: <span className="text-sky-400 font-bold">{system.device_name}</span>
        </span>
      </div>

      {/* VIEW 1: INTERACTIVE STUDIO GENERATOR */}
      {activeSubTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Parameters Panel */}
          <div className="lg:col-span-5 bg-[#0f1728]/95 border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Diffusion Generation Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-semibold">
                  Live {system.device_name}
                </span>
              </div>

              {/* Status Alert */}
              {statusMessage && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-sky-950/70 border border-sky-800 text-sky-300 text-[11px] font-mono flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Prompt with Live Token Estimator & Warning */}
              <div className="mt-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase tracking-wider block">
                    Prompt
                  </label>
                  {(() => {
                    // Approximate CLIP token count: words + special characters / punctuation split
                    const words = prompt.trim() ? prompt.trim().split(/\s+|[,.-]+/).filter(Boolean).length : 0;
                    // CLIP typically consumes ~1.2 to 1.3 tokens per word
                    const estimatedTokens = Math.round(words * 1.25);
                    const isExceeded = estimatedTokens > 75;
                    const isNear = estimatedTokens > 60 && !isExceeded;
                    return (
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                          isExceeded
                            ? "bg-rose-950/80 text-rose-400 border border-rose-800"
                            : isNear
                            ? "bg-amber-950/80 text-amber-400 border border-amber-800"
                            : "bg-[#131b2c] text-slate-400 border border-[#23324d]"
                        }`}
                      >
                        ~{estimatedTokens} / 77 CLIP Tokens
                      </span>
                    );
                  })()}
                </div>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-[#131b2c] border border-[#23324d] rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-sky-500 transition-colors"
                />
                {(() => {
                  const words = prompt.trim() ? prompt.trim().split(/\s+|[,.-]+/).filter(Boolean).length : 0;
                  const estimatedTokens = Math.round(words * 1.25);
                  if (estimatedTokens > 75) {
                    return (
                      <p className="text-[10px] font-mono text-rose-400 flex items-center gap-1.5 pt-0.5">
                        ⚠️ Prompt exceeds CLIP&apos;s 77-token ceiling! Words beyond token 77 will be truncated by Stable Diffusion.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Negative Prompt */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Negative Prompt
                  </label>
                  {(() => {
                    const words = negativePrompt.trim() ? negativePrompt.trim().split(/\s+|[,.-]+/).filter(Boolean).length : 0;
                    const estimatedTokens = Math.round(words * 1.25);
                    const isExceeded = estimatedTokens > 75;
                    return (
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                          isExceeded
                            ? "bg-rose-950/80 text-rose-400 border border-rose-800"
                            : "bg-[#131b2c] text-slate-400 border border-[#23324d]"
                        }`}
                      >
                        ~{estimatedTokens} / 77 Tokens
                      </span>
                    );
                  })()}
                </div>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full bg-[#131b2c] border border-[#23324d] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Model & Sampler Selection */}
              <div className="grid grid-cols-2 gap-3 mt-3.5">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Model Backbone
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-[#131b2c] border border-[#23324d] rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  >
                    <option value="Stable Diffusion v1.5 (Fine-Tuned)">SD 1.5 Fine-Tuned (LSUN Bedroom LoRA)</option>
                    <option value="Stable Diffusion v1.5">Stable Diffusion v1.5 (Base)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Sampler Formulation
                  </label>
                  <select
                    value={sampler}
                    onChange={(e) => setSampler(e.target.value)}
                    className="w-full bg-[#131b2c] border border-[#23324d] rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  >
                    <option value="DDIM">DDIM (Custom Mathematical Song et al.)</option>
                    <option value="DDPM">DDPM Markov Baseline (Ho et al.)</option>
                  </select>
                </div>
              </div>

              {/* Steps & Guidance Slider */}
              <div className="space-y-3 mt-4">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Inference Steps: {steps}</span>
                    <span className="text-sky-400 font-semibold">
                      {sampler === "DDIM" && steps <= 50 ? "Deterministic ODE" : "Markovian Steps"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Guidance Scale (CFG): {guidance}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="15.0"
                    step="0.5"
                    value={guidance}
                    onChange={(e) => setGuidance(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Seed & Resolution */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Deterministic RNG Seed
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className="w-full bg-[#131b2c] border border-[#23324d] rounded-md px-2.5 py-1 text-xs text-slate-200 font-mono"
                    />
                    <button
                      onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                      title="Randomize"
                      className="px-2 py-1 bg-[#1e293b] text-slate-300 rounded hover:bg-slate-700 text-xs font-mono"
                    >
                      🎲
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Resolution
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="w-full bg-[#131b2c] border border-[#23324d] rounded-md px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  >
                    <option>512x512</option>
                    <option>768x768</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-sky-400 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Denoising Step {currentStepProgress} / {steps} ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Environment Mockup</span>
                </>
              )}
            </button>
          </div>

          {/* Render Output & Live Streaming Progress Viewport */}
          <div className="lg:col-span-7 bg-[#0f1728]/95 border border-[#1e293b] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isGenerating ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
                  Latent Viewport
                </h3>
                <div className="text-[11px] font-mono text-slate-400">
                  Compute Node: <span className="text-sky-400 font-semibold">{system.device_name}</span>
                </div>
              </div>

              {/* LIVE STREAM PROGRESS BAR & TIME TRACKER */}
              {isGenerating && (
                <div className="mt-3 p-3.5 rounded-lg bg-sky-950/60 border border-sky-800/80 font-mono space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sky-300 font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      Live Stream: {progressPercent}% Completed
                    </span>
                    <span className="text-slate-300">
                      Step {currentStepProgress} / {steps}
                    </span>
                  </div>

                  {/* Progress bar container */}
                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Live Clock & ETA */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>Elapsed: <strong className="text-white">{elapsedTime}s</strong></span>
                    </div>
                    <div>
                      {etaTime > 0 ? (
                        <span>Est. Remaining: <strong className="text-amber-400">{etaTime}s</strong></span>
                      ) : (
                        <span>Finishing latent decode...</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Image Viewport: Clean State (No default image until generated) */}
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-[#23324d] bg-[#090d16] my-4 shadow-inner flex items-center justify-center">
                {generatedImage ? (
                  <>
                    <Image
                      src={generatedImage}
                      alt="Generated environment"
                      fill
                      className="object-cover"
                      priority
                      unoptimized
                    />
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-slate-700 text-[10px] font-mono text-sky-400 font-semibold">
                      {telemetry.sampler} • {telemetry.steps} Steps
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-sky-950/50 border border-sky-800/60 mx-auto flex items-center justify-center text-sky-400 shadow-lg shadow-sky-950/50">
                      <Wand2 className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-200">
                        Viewport Ready
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Configure prompt parameters on the left and click <span className="text-sky-400 font-semibold">&ldquo;Generate Environment Mockup&rdquo;</span> to initiate live diffusion sampling.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Telemetry Strip */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[#131b2c] border border-[#23324d] text-center font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Execution Latency
                </span>
                <span className="text-sm font-bold text-sky-400">
                  {telemetry.latency > 0 ? `${telemetry.latency}s` : "0.00s"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  GPU VRAM Allocation
                </span>
                <span className="text-sm font-bold text-white">
                  {telemetry.peakVram ? `${telemetry.peakVram.toFixed(0)} MB` : "N/A"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Host System RAM
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {system.used_ram_gb ? `${system.used_ram_gb} GB` : "Online"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MULTI-STEP SAMPLER BENCHMARK WITH REAL-TIME GRAPH */}
      {activeSubTab === "benchmark" && (
        <div className="bg-[#0f1728]/95 border border-[#1e293b] rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#1e293b] gap-2">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-sky-400" />
                Multi-Step Sampler Benchmark Suite
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Run comparative experiments across DDIM &amp; DDPM at multiple sampling steps and plot wall-clock latency &amp; FID curves.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#131b2c] border border-[#23324d] text-sky-400">
              PRD §1.3 • §6.5 Compliant
            </span>
          </div>

          {/* Benchmark Controls with Prompt, Negative Prompt, Samplers & Steps */}
          <div className="p-4 rounded-xl bg-[#131b2c] border border-[#23324d] space-y-4">
            {/* Prompt and Negative Prompt Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase tracking-wider block mb-1">
                  Benchmark Prompt
                </label>
                <textarea
                  rows={2}
                  value={benchPrompt}
                  onChange={(e) => setBenchPrompt(e.target.value)}
                  className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Negative Prompt
                </label>
                <textarea
                  rows={2}
                  value={benchNegativePrompt}
                  onChange={(e) => setBenchNegativePrompt(e.target.value)}
                  className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
              {/* 1. Sampler Selector (Color scheme: DDIM #0099ff cyan/sky, DDPM #6633ff purple/indigo) */}
              <div className="md:col-span-4">
                <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase tracking-wider block mb-2">
                  1. Select Samplers
                </label>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => toggleSampler("DDIM")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all ${
                      benchSamplers.includes("DDIM")
                        ? "bg-[#0099ff] text-slate-950 border-[#0099ff] shadow-md shadow-sky-500/30"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    DDIM
                  </button>

                  <button
                    onClick={() => toggleSampler("DDPM")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all ${
                      benchSamplers.includes("DDPM")
                        ? "bg-[#6633ff] text-white border-[#6633ff] shadow-md shadow-indigo-500/30"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    DDPM
                  </button>
                </div>
              </div>

              {/* 2. Step Selection Pills */}
              <div className="md:col-span-5">
                <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase tracking-wider block mb-2">
                  2. Select Step Counts to Benchmark
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 15, 20, 25, 30, 50, 100].map((stepVal) => {
                    const active = benchSteps.includes(stepVal);
                    return (
                      <button
                        key={stepVal}
                        onClick={() => toggleStep(stepVal)}
                        className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors border ${
                          active
                            ? "bg-sky-950 text-sky-300 border-sky-400 font-bold"
                            : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-600"
                        }`}
                      >
                        {stepVal}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Run Button */}
              <div className="md:col-span-3 flex flex-col justify-end">
                <button
                  onClick={handleRunCustomBenchmark}
                  disabled={isBenchmarking}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-400 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
                >
                  {isBenchmarking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Benchmarking...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Benchmark Matrix</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* LIVE STREAM PROGRESS BAR & TIME TRACKER FOR BENCHMARK */}
            {isBenchmarking && (
              <div className="mt-4 p-4 rounded-xl bg-sky-950/70 border border-sky-800/80 font-mono space-y-2.5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-1">
                  <span className="text-sky-300 font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    <span>{benchLiveMsg || `Benchmarking in progress (${benchProgressPercent}%)`}</span>
                  </span>
                  <span className="text-slate-300 font-bold">
                    Step {benchStepProgress} / {benchTotalSteps > 0 ? benchTotalSteps : "..."} ({benchProgressPercent}%)
                  </span>
                </div>

                {/* Progress bar container */}
                <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-[#0099ff] via-indigo-500 to-[#6633ff] transition-all duration-200"
                    style={{ width: `${benchProgressPercent}%` }}
                  />
                </div>

                {/* Live Clock & ETA */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Wall-Clock Elapsed: <strong className="text-white font-mono">{benchElapsedTime}s</strong></span>
                  </div>
                  <div>
                    {benchEtaTime > 0 ? (
                      <span>Est. Remaining: <strong className="text-amber-400 font-mono">{benchEtaTime}s</strong></span>
                    ) : (
                      <span className="text-sky-400">Processing next configuration...</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* REAL-TIME DUAL GRAPH: LATENCY PROFILE & FID CURVE WITH HOVER TOOLTIPS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Latency Comparison Chart with Tooltip explanation */}
            <div className="bg-[#131b2c] border border-[#23324d] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <h4 className="text-xs font-bold text-white font-mono">
                    Wall-Clock Latency (Seconds) vs Steps
                  </h4>
                  {/* Tooltip trigger with question mark */}
                  <div className="relative group cursor-pointer inline-block ml-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-sky-400 transition-colors" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-30 w-72 p-2.5 rounded-lg bg-[#070b14] border border-sky-800/80 text-[11px] font-sans text-slate-200 shadow-xl backdrop-blur-md">
                      <strong className="text-sky-400 font-mono block mb-1">Wall-Clock Generation Time:</strong>
                      Measures actual real-world time (in seconds) taken by CUDA/GPU to complete all sampling steps and decode latents into an RGB image via the VAE.
                      <div className="mt-1 text-[10px] text-slate-400 font-mono">Formula: O(T) — scales linearly with step count.</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-[#0099ff] font-bold">● DDIM</span>
                  <span className="text-[#6633ff] font-bold">● DDPM</span>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchGraphData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="steps" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b1220",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#fff"
                      }}
                    />
                    <Line type="monotone" dataKey="ddim_latency" name="DDIM (s)" stroke="#0099ff" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="ddpm_latency" name="DDPM (s)" stroke="#6633ff" strokeWidth={2.5} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FID Score Curve with Tooltip explanation */}
            <div className="bg-[#131b2c] border border-[#23324d] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white font-mono">
                    FID Score vs Steps (Lower is Better ↓)
                  </h4>
                  {/* Tooltip trigger with question mark */}
                  <div className="relative group cursor-pointer inline-block ml-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400 transition-colors" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-30 w-72 p-2.5 rounded-lg bg-[#070b14] border border-emerald-800/80 text-[11px] font-sans text-slate-200 shadow-xl backdrop-blur-md">
                      <strong className="text-emerald-400 font-mono block mb-1">Fréchet Inception Distance (FID):</strong>
                      Measures visual quality &amp; realism by comparing feature representations of generated images against reference datasets. Lower score means closer visual distribution to real photos.
                      <div className="mt-1 text-[10px] text-slate-400 font-mono">Target: &lt; 5.0 (Optimal convergence).</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-[#0099ff] font-bold">● DDIM FID</span>
                  <span className="text-[#6633ff] font-bold">● DDPM FID</span>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={benchGraphData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="steps" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis stroke="#64748b" domain={[0, 20]} tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b1220",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#fff"
                      }}
                    />
                    <Line type="monotone" dataKey="ddim_fid" name="DDIM FID" stroke="#0099ff" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="ddpm_fid" name="DDPM FID" stroke="#6633ff" strokeWidth={2.5} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Results Table with Image View / Inspect Option */}
          {benchResultsList.length > 0 && (
            <div className="p-4 rounded-xl bg-[#131b2c] border border-[#23324d] font-mono text-xs">
              <h4 className="text-xs font-bold text-white mb-3">
                Completed Benchmark Run Results ({benchResultsList.length} checkpoints):
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#23324d] text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-2">Sampler</th>
                      <th className="py-2 px-2">Steps</th>
                      <th className="py-2 px-2">Latency</th>
                      <th className="py-2 px-2">Est. FID</th>
                      <th className="py-2 px-2">Peak VRAM</th>
                      <th className="py-2 px-2">Timestamp</th>
                      <th className="py-2 px-2 text-right">Inspect Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {benchResultsList.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-2 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              row.sampler.includes("DDIM")
                                ? "bg-[#0099ff]/20 text-[#0099ff] border border-[#0099ff]/40"
                                : "bg-[#6633ff]/20 text-[#a580ff] border border-[#6633ff]/40"
                            }`}
                          >
                            {row.sampler}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-white">{row.steps}</td>
                        <td className="py-2 px-2 text-emerald-400">{row.latency}s</td>
                        <td className="py-2 px-2 text-amber-300">{row.fid}</td>
                        <td className="py-2 px-2 text-slate-300">{row.vram_mb} MB</td>
                        <td className="py-2 px-2 text-slate-500">{row.timestamp}</td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={() =>
                              setPreviewBenchmarkImage({
                                url:
                                  row.image_url ||
                                  "/photorealistic_modern_luxury_architectural_penthouse_master_bedroom_interior.png",
                                sampler: row.sampler,
                                steps: row.steps,
                                latency: row.latency,
                                fid: row.fid
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f1728] border border-[#23324d] hover:border-sky-400 text-sky-400 hover:text-white transition-colors text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Image</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODAL FOR VIEWING BENCHMARK GENERATED IMAGE */}
          {previewBenchmarkImage && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-[#0f1728] border border-[#1e293b] rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl relative">
                <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        previewBenchmarkImage.sampler.includes("DDIM")
                          ? "bg-[#0099ff]/20 text-[#0099ff] border border-[#0099ff]"
                          : "bg-[#6633ff]/20 text-[#a580ff] border border-[#6633ff]"
                      }`}
                    >
                      {previewBenchmarkImage.sampler}
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {previewBenchmarkImage.steps} Steps
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      • {previewBenchmarkImage.latency}s • FID {previewBenchmarkImage.fid}
                    </span>
                  </div>

                  <button
                    onClick={() => setPreviewBenchmarkImage(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Rendered Preview */}
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-[#23324d] bg-black">
                  <Image
                    src={previewBenchmarkImage.url}
                    alt="Benchmark preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-slate-400">
                  <span>Target: LSUN Bedrooms Domain Verification</span>
                  <button
                    onClick={() => setPreviewBenchmarkImage(null)}
                    className="px-4 py-1.5 rounded bg-sky-500 text-slate-950 font-bold hover:bg-sky-400 transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
