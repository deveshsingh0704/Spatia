"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { SystemInfo } from "@/types/benchmark";
import { API_BASE_URL, apiUrl } from "@/lib/api";

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

export const DeveloperApiSection: React.FC<DeveloperApiSectionProps> = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints: EndpointDoc[] = [
    {
      method: "POST",
      path: "/api/generate",
      title: "Synthesize Spatial Environment Mockup",
      description:
        "Executes diffusion denoising using DDIM (deterministic ODE) or DDPM baseline Markov formulation. Automatically persists generation metadata to PostgreSQL and embeds metadata inside the saved PNG file.",
      prdRef: "US-01 • US-02",
      requestBody: JSON.stringify(
        {
          prompt: "A modern luxury penthouse master bedroom with floor-to-ceiling glass windows",
          negative_prompt: "blurry, grain, noise, low quality",
          model_name: "Stable Diffusion v1.5 (Fine-Tuned)",
          sampler_name: "DDIM",
          steps: 20,
          guidance_scale: 7.5,
          seed: 42,
          resolution: "768x768"
        },
        null,
        2
      ),
      responseBody: JSON.stringify(
        {
          status: "completed",
          id: "9c3f41a2-...",
          image_url: apiUrl("/outputs/gallery/mockup_abc123.png"),
          seed: 42,
          steps: 20,
          guidance_scale: 7.5,
          resolution: "768x768",
          sampler: "DDIM",
          model: "Stable Diffusion v1.5 (Fine-Tuned)",
          latency_sec: 2.84,
          saved_to_db: true
        },
        null,
        2
      ),
      exampleCurl: `curl -X POST "${apiUrl("/api/generate")}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Luxury bedroom penthouse", "sampler_name": "DDIM", "steps": 20, "resolution": "768x768", "seed": 42}'`
    },
    {
      method: "GET",
      path: "/api/generate/stream/{job_id}",
      title: "Real-Time Server-Sent Events (SSE) Stream",
      description:
        "Persistent SSE stream emitting real-time percentage completed, active denoising step count, elapsed wall-clock seconds, and ETA estimation.",
      prdRef: "US-01 • NFR-06",
      parameters: "job_id (string, path parameter): Unique tracking ID for the generation or benchmark job.",
      responseBody: `data: {"status": "running", "step": 12, "total_steps": 20, "percent": 60, "elapsed_sec": 1.72, "eta_sec": 1.15}\n\ndata: {"status": "completed", "percent": 100, "image_url": "${apiUrl("/outputs/gallery/...")}"}`,
      exampleCurl: `curl -N -H "Accept: text/event-stream" "${apiUrl("/api/generate/stream/job_1791834968")}"`
    },
    {
      method: "GET",
      path: "/api/gallery",
      title: "Query Saved Generations & Metadata",
      description:
        "Returns paginated generated assets from PostgreSQL with complete prompt, negative prompt, seed, model, sampler, resolution, and timing metadata.",
      prdRef: "Gallery Persistence",
      parameters: "page, page_size, search, model_name, sampler_name, is_favorite, library_id, sort_by",
      responseBody: JSON.stringify(
        {
          items: [
            {
              id: "9c3f41a2-...",
              title: "Modern Luxury Master Bedroom",
              image_url: apiUrl("/outputs/gallery/mockup_abc123.png"),
              prompt: "...",
              negative_prompt: "blurry, grain",
              seed: 42,
              steps: 20,
              guidance_scale: 7.5,
              resolution: "768x768"
            }
          ],
          pagination: { page: 1, total_pages: 5, total_records: 42 }
        },
        null,
        2
      ),
      exampleCurl: `curl -X GET "${apiUrl("/api/gallery?page=1&page_size=10")}"`
    },
    {
      method: "POST",
      path: "/api/benchmark/run-custom",
      title: "Multi-Step Sampler Benchmark Matrix Execution",
      description:
        "Dispatches comparative sweeps across selected samplers (DDIM and DDPM) and step budgets. Measures wall-clock execution time and computes FID scores.",
      prdRef: "US-04 • §6.5",
      requestBody: JSON.stringify(
        {
          samplers: ["DDIM", "DDPM"],
          steps_list: [10, 20, 30, 50],
          model_name: "Stable Diffusion v1.5",
          prompt: "A modern minimalist luxury bedroom interior",
          negative_prompt: "blurry, distorted, low quality",
          seed: 42
        },
        null,
        2
      ),
      responseBody: JSON.stringify(
        {
          status: "completed",
          results: [
            { id: "run_DDIM_10", sampler: "DDIM", steps: 10, latency: 1.52, fid: 10.3 },
            { id: "run_DDPM_10", sampler: "DDPM", steps: 10, latency: 2.19, fid: 16.7 }
          ]
        },
        null,
        2
      ),
      exampleCurl: `curl -X POST "${apiUrl("/api/benchmark/run-custom")}" \\
  -H "Content-Type: application/json" \\
  -d '{"samplers": ["DDIM", "DDPM"], "steps_list": [10, 20, 30], "seed": 42}'`
    },
    {
      method: "GET",
      path: "/api/benchmark/history",
      title: "Query Historical Benchmark Runs Archive",
      description: "Retrieves past empirical evaluations stored on disk alongside live session checkpoints.",
      prdRef: "US-08",
      parameters: "None",
      responseBody: JSON.stringify(
        {
          history: [
            {
              id: "hist_102",
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
      exampleCurl: `curl -X GET "${apiUrl("/api/benchmark/history")}"`
    },
    {
      method: "GET",
      path: "/api/health",
      title: "API Engine Health Diagnostic",
      description: "Performs liveness check of the LatentCraft inference engine.",
      prdRef: "US-10",
      parameters: "None",
      responseBody: JSON.stringify({ status: "healthy", engine: "LatentCraft v2.4.1" }, null, 2),
      exampleCurl: `curl -X GET "${apiUrl("/api/health")}"`
    }
  ];

  return (
    <div className="my-2 space-y-6">
      <div className="saas-card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono">
              <span
                className="px-2.5 py-0.5 rounded-full font-bold"
                style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
              >
                FastAPI 0.115 • REST + SSE
              </span>
              <span className="text-[var(--muted-foreground)]">•</span>
              <span className="text-[var(--muted-foreground)]">OpenAPI Spec / Swagger Interactive Docs</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              LatentCraft Developer REST API Reference
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1 max-w-2xl leading-relaxed">
              Programmatic interface for generative design synthesis, live step progress telemetry, and non-Markovian diffusion benchmarks.
            </p>
          </div>

          <a
            href={apiUrl("/docs")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl saas-btn-primary text-xs"
          >
            <span>Interactive Swagger UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 text-xs font-mono">
          <div className="p-3.5 rounded-2xl bg-[var(--surface-overlay)]">
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase block">Host Server</span>
            <span className="text-[var(--foreground)] font-bold truncate block">{API_BASE_URL}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--surface-overlay)]">
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase block">Authentication</span>
            <span className="text-emerald-400 font-bold">JWT Bearer + Refresh</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--surface-overlay)]">
            <span className="text-[10px] text-[var(--muted-foreground)] uppercase block">Streaming Protocol</span>
            <span className="font-bold" style={{ color: "var(--brand-accent)" }}>
              Server-Sent Events (SSE)
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {endpoints.map((ep, idx) => (
          <div key={idx} className="saas-card p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-mono font-bold"
                  style={
                    ep.method === "GET"
                      ? { background: "rgba(16, 185, 129, 0.16)", color: "#34d399" }
                      : ep.method === "POST"
                      ? { background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }
                      : { background: "rgba(244, 63, 94, 0.16)", color: "#fb7185" }
                  }
                >
                  {ep.method}
                </span>
                <span className="text-sm font-mono font-bold text-[var(--foreground)] tracking-tight">
                  {ep.path}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] hidden md:inline">
                  — {ep.title}
                </span>
              </div>

              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--muted-foreground)]">
                {ep.prdRef}
              </span>
            </div>

            <p className="text-xs text-[var(--foreground)] my-2.5 leading-relaxed">{ep.description}</p>

            {ep.parameters && (
              <div className="mb-3 text-xs font-mono">
                <span className="text-[var(--muted-foreground)] text-[10px] uppercase block mb-1">
                  Query / Path Parameters:
                </span>
                <div className="p-3 rounded-xl bg-[var(--surface-overlay)] text-[var(--foreground)] text-[11px]">
                  {ep.parameters}
                </div>
              </div>
            )}

            {ep.requestBody && (
              <div className="mb-3 text-xs font-mono">
                <span className="text-[var(--muted-foreground)] text-[10px] uppercase block mb-1">
                  Request Payload (JSON):
                </span>
                <pre
                  className="p-3.5 rounded-2xl bg-[var(--code-bg)] text-[11px] overflow-x-auto"
                  style={{ color: "var(--brand-accent)" }}
                >
                  {ep.requestBody}
                </pre>
              </div>
            )}

            <div className="mb-3 text-xs font-mono">
              <span className="text-[var(--muted-foreground)] text-[10px] uppercase block mb-1">
                Response Body:
              </span>
              <pre className="p-3.5 rounded-2xl bg-[var(--code-bg)] text-emerald-400 text-[11px] overflow-x-auto max-h-48">
                {ep.responseBody}
              </pre>
            </div>

            <div className="mt-3 pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 font-mono text-xs">
              <div className="truncate text-[var(--muted-foreground)] text-[11px]">
                <strong className="text-[var(--foreground)]">cURL:</strong> {ep.exampleCurl}
              </div>

              <button
                onClick={() => copyToClipboard(ep.exampleCurl, idx)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl saas-btn-secondary text-xs flex-shrink-0"
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
