"use client";

import React, { useState } from "react";
import {
  Code,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Server,
  Zap
} from "lucide-react";
import { SystemInfo } from "@/types/benchmark";

interface DeveloperApiSectionProps {
  system: SystemInfo;
}

interface EndpointDoc {
  method: "GET" | "POST" | "DELETE";
  path: string;
  title: string;
  description: string;
  prdRef: string;
  parameters?: string;
  requestBody?: string;
  responseBody: string;
  exampleCurl: string;
}

export const DeveloperApiSection: React.FC<DeveloperApiSectionProps> = ({ system }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints: EndpointDoc[] = [
    {
      method: "GET",
      path: "/api/hardware",
      title: "Query Live Hardware Telemetry",
      description: "Directly queries the host system's GPU compute core, VRAM allocation, total RAM, and PyTorch CUDA context status without hardcoding.",
      prdRef: "PRD §4 US-10 • §10.4",
      parameters: "None",
      responseBody: JSON.stringify(
        {
          node: "LOCAL-NODE-01",
          device_name: system.device_name,
          device_type: "cuda",
          cuda_available: true,
          vram_total_gb: system.vram_total_gb,
          vram_used_gb: system.vram_used_gb,
          vram_ready_percent: system.vram_ready_percent,
          total_ram_gb: system.total_ram_gb || 15.71,
          used_ram_gb: system.used_ram_gb || 8.6,
          pytorch_version: system.pytorch_version,
          prd_spec: system.prd_spec
        },
        null,
        2
      ),
      exampleCurl: `curl -X GET "http://localhost:8001/api/hardware" -H "Accept: application/json"`
    },
    {
      method: "POST",
      path: "/api/generate",
      title: "Synthesize Spatial Environment Mockup",
      description: "Executes diffusion denoising using either custom DDIM (deterministic ODE) or DDPM baseline Markov formulation. Features real-time CUDA timing, peak VRAM profiling, and step callbacks.",
      prdRef: "PRD §4 US-01 • US-02 • §12",
      requestBody: JSON.stringify(
        {
          prompt: "A modern luxury penthouse master bedroom with floor-to-ceiling glass windows",
          negative_prompt: "ugly, blurry, distorted, low quality",
          model_name: "Stable Diffusion v1.5",
          sampler_name: "DDIM",
          steps: 20,
          guidance_scale: 7.5,
          seed: 42,
          resolution: "512x512"
        },
        null,
        2
      ),
      responseBody: JSON.stringify(
        {
          status: "completed",
          image_url: "http://localhost:8001/outputs/generated/SD15_DDIM_s20_seed42_1791834968.png",
          seed: 42,
          steps: 20,
          sampler: "DDIM",
          model: "Stable Diffusion v1.5",
          latency_sec: 2.84,
          peak_vram_mb: 2675.1,
          device: system.device_name
        },
        null,
        2
      ),
      exampleCurl: `curl -X POST "http://localhost:8001/api/generate" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Luxury bedroom penthouse", "sampler_name": "DDIM", "steps": 20, "seed": 42}'`
    },
    {
      method: "GET",
      path: "/api/generate/stream/{job_id}",
      title: "Real-Time Server-Sent Events (SSE) Generation & Benchmark Stream",
      description: "Persistent SSE stream emitting real-time percentage completed, active denoising step count, elapsed wall-clock seconds, and dynamic ETA estimation on every UNet iteration.",
      prdRef: "PRD §4 US-01 • §14 NFR-06",
      parameters: "job_id (string, path parameter): Unique tracking ID for the dispatched generation or benchmark job.",
      responseBody: `data: {"status": "running", "step": 12, "total_steps": 20, "percent": 60, "elapsed_sec": 1.72, "eta_sec": 1.15}\n\ndata: {"status": "completed", "percent": 100, "image_url": "http://localhost:8001/outputs/generated/..."}`,
      exampleCurl: `curl -N -H "Accept: text/event-stream" "http://localhost:8001/api/generate/stream/job_1791834968"`
    },
    {
      method: "POST",
      path: "/api/benchmark/run-custom",
      title: "Multi-Step Sampler Benchmark Matrix Execution",
      description: "Dispatches comparative sweeps across chosen samplers (DDIM and DDPM) across multiple step budgets (e.g. 5, 10, 15, 20, 30, 50). Measures wall-clock execution time, computes FID scores, and streams live progress.",
      prdRef: "PRD §4 US-04 • §6.5 • §12",
      requestBody: JSON.stringify(
        {
          samplers: ["DDIM", "DDPM"],
          steps_list: [10, 20, 30, 50],
          model_name: "Stable Diffusion v1.5",
          prompt: "A modern minimalist luxury bedroom interior, floor-to-ceiling windows",
          negative_prompt: "ugly, blurry, distorted, low quality",
          seed: 42
        },
        null,
        2
      ),
      responseBody: JSON.stringify(
        {
          status: "completed",
          results: [
            { id: "run_DDIM_10", sampler: "DDIM", steps: 10, latency: 1.52, fid: 10.3, image_url: "..." },
            { id: "run_DDPM_10", sampler: "DDPM", steps: 10, latency: 2.19, fid: 16.7, image_url: "..." }
          ],
          graph_data: [
            { steps: 10, ddim_latency: 1.52, ddpm_latency: 2.19, ddim_fid: 10.3, ddpm_fid: 16.7 }
          ]
        },
        null,
        2
      ),
      exampleCurl: `curl -X POST "http://localhost:8001/api/benchmark/run-custom" \\
  -H "Content-Type: application/json" \\
  -d '{"samplers": ["DDIM", "DDPM"], "steps_list": [10, 20, 30], "seed": 42}'`
    },
    {
      method: "GET",
      path: "/api/benchmark/history",
      title: "Query Historical Benchmark Runs Archive",
      description: "Retrieves past empirical evaluations stored on disk (outputs/experiments/experiment_results.csv) alongside live session checkpoints, complete with wall-clock latency, steps, and FID ratings.",
      prdRef: "PRD §4 US-08 • §10.4",
      parameters: "None",
      responseBody: JSON.stringify(
        {
          history: [
            {
              id: "hist_102_1791835000",
              model: "Stable Diffusion v1.5",
              sampler: "DDIM",
              steps: 20,
              generation_time: 3.9,
              seed: 44,
              fid: 7.75,
              status: "COMPLETED"
            }
          ]
        },
        null,
        2
      ),
      exampleCurl: `curl -X GET "http://localhost:8001/api/benchmark/history"`
    },
    {
      method: "GET",
      path: "/api/benchmark",
      title: "Convergence Telemetry & Curated Baseline Checkpoints",
      description: "Returns pre-computed LSUN Bedrooms validation convergence curves, speedup indices, and qualitative checkpoint comparisons.",
      prdRef: "PRD §4 US-09 • §8.3",
      parameters: "model (string, query parameter, optional): Defaults to 'Stable Diffusion v1.5'",
      responseBody: JSON.stringify(
        {
          system: { node: "LOCAL-NODE-01", device_name: system.device_name },
          kpis: { optimal_operating_point: "DDIM @ 50", fid_score: 4.82, speedup: "10.1x" },
          fid_curve: [{ steps: 50, ddim_fid: 4.82, ddpm_fid: 9.4, optimal: true }]
        },
        null,
        2
      ),
      exampleCurl: `curl -X GET "http://localhost:8001/api/benchmark"`
    },
    {
      method: "GET",
      path: "/api/health",
      title: "API Engine Health & Environment Diagnostic",
      description: "Performs quick liveness check of the LatentCraft engine, active GPU hardware, and package manager state.",
      prdRef: "PRD §4 US-10 • §12",
      parameters: "None",
      responseBody: JSON.stringify(
        {
          status: "healthy",
          engine: "LatentCraft v2.4.1",
          gpu: system.device_name,
          vram_total_gb: system.vram_total_gb,
          package_manager: "uv"
        },
        null,
        2
      ),
      exampleCurl: `curl -X GET "http://localhost:8001/api/health"`
    }
  ];

  return (
    <div className="my-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f1728]/95 border border-[#1e293b] rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold">
                FastAPI 0.115 • uv runtime
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">OpenAPI Spec / Swagger Interactive Docs</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight font-sans">
              LatentCraft Developer REST API Reference
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-sans mt-1 max-w-2xl leading-relaxed">
              Programmatic interface for generative design synthesis, live step progress telemetry, and deterministic non-Markovian diffusion benchmarks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:8001/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-sans transition-all shadow-md shadow-sky-500/20"
            >
              <span>Interactive Swagger UI</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Quick Spec Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#131b2c] border border-[#23324d]">
            <span className="text-[10px] text-slate-400 uppercase block">Host Server</span>
            <span className="text-white font-bold">http://localhost:8001</span>
          </div>

          <div className="p-3 rounded-lg bg-[#131b2c] border border-[#23324d]">
            <span className="text-[10px] text-slate-400 uppercase block">Active Device</span>
            <span className="text-sky-400 font-bold">{system.device_name}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#131b2c] border border-[#23324d]">
            <span className="text-[10px] text-slate-400 uppercase block">Authentication</span>
            <span className="text-emerald-400 font-bold">JWT Bearer (Optional / Dev)</span>
          </div>

          <div className="p-3 rounded-lg bg-[#131b2c] border border-[#23324d]">
            <span className="text-[10px] text-slate-400 uppercase block">Streaming Protocol</span>
            <span className="text-amber-300 font-bold">Server-Sent Events (SSE)</span>
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {endpoints.map((ep, idx) => (
          <div
            key={idx}
            className="bg-[#0f1728]/95 border border-[#1e293b] rounded-xl p-5 hover:border-slate-700 transition-colors"
          >
            {/* Header: Method, Path, Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    ep.method === "GET"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : ep.method === "POST"
                      ? "bg-sky-950 text-sky-400 border border-sky-800"
                      : "bg-red-950 text-red-400 border border-red-800"
                  }`}
                >
                  {ep.method}
                </span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">
                  {ep.path}
                </span>
                <span className="text-xs text-slate-400 font-sans hidden md:inline">
                  — {ep.title}
                </span>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131b2c] border border-[#23324d] text-slate-400">
                {ep.prdRef}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 font-sans my-3 leading-relaxed">
              {ep.description}
            </p>

            {/* Parameters / Request Body */}
            {ep.parameters && (
              <div className="mb-3 text-xs font-mono">
                <span className="text-slate-400 text-[10px] uppercase block mb-1">Query / Path Parameters:</span>
                <div className="p-2.5 rounded bg-[#131b2c] border border-[#23324d] text-slate-300 text-[11px]">
                  {ep.parameters}
                </div>
              </div>
            )}

            {ep.requestBody && (
              <div className="mb-3 text-xs font-mono">
                <span className="text-slate-400 text-[10px] uppercase block mb-1">Request Payload (JSON):</span>
                <pre className="p-3 rounded-lg bg-[#070b14] border border-[#1e293b] text-sky-300 text-[11px] overflow-x-auto">
                  {ep.requestBody}
                </pre>
              </div>
            )}

            {/* Response Body */}
            <div className="mb-3 text-xs font-mono">
              <span className="text-slate-400 text-[10px] uppercase block mb-1">Response Body:</span>
              <pre className="p-3 rounded-lg bg-[#070b14] border border-[#1e293b] text-emerald-300 text-[11px] overflow-x-auto max-h-48">
                {ep.responseBody}
              </pre>
            </div>

            {/* cURL Command with Copy Button */}
            <div className="mt-3 pt-3 border-t border-[#1e293b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 font-mono text-xs">
              <div className="truncate text-slate-400 text-[11px]">
                <strong className="text-slate-300">cURL:</strong> {ep.exampleCurl}
              </div>

              <button
                onClick={() => copyToClipboard(ep.exampleCurl, idx)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-[#131b2c] border border-[#23324d] hover:border-sky-400 text-sky-400 hover:text-white transition-colors text-xs flex-shrink-0"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy cURL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
