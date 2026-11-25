"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LeftSidebar } from "@/components/LeftSidebar";
import { KpiCards } from "@/components/KpiCards";
import { ChartsSection } from "@/components/ChartsSection";
import { QualitativeSection } from "@/components/QualitativeSection";
import { BenchmarkHistorySection } from "@/components/BenchmarkHistorySection";
import { BenchmarkData } from "@/types/benchmark";
import { Play, RefreshCw } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const EMPTY_BENCHMARK_DATA: BenchmarkData = {
  system: {
    node: "LOCAL-NODE",
    device_name: "Loading telemetry...",
    vram_total_gb: 0,
    vram_ready_percent: 0,
    vram_used_gb: 0,
    pytorch_version: "",
    prd_spec: "",
  },
  kpis: {
    optimal_operating_point: "Loading...",
    time_saved_percent: 0,
    tradeoff: "Fetching real runs",
    fid_score: 0,
    fid_target: 5.0,
    fid_delta_from_baseline: 0,
    perceptual_quality_index: 0,
    speedup: "0x",
    wall_clock_time_sec: 0,
    baseline_time_sec: 0,
    compute_cost: "$0.00",
    dataset: "Real-Time Inference",
    features_count: "0 Runs",
    eval_eta: 0,
  },
  fid_curve: [],
  latency_profile: [],
  qualitative_comparison: [],
  checkpoints: [],
};

export default function BenchmarkPage() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState<BenchmarkData>(EMPTY_BENCHMARK_DATA);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function syncBackendData() {
      try {
        const res = await fetchWithAuth(apiUrl("/api/benchmark"));
        if (res.ok) {
          const remoteData: BenchmarkData = await res.json();
          setData(remoteData);
        }
      } catch (e) {
        console.warn("Could not connect to FastAPI server:", e);
      }
    }

    syncBackendData();
    const interval = setInterval(syncBackendData, 15000);
    return () => clearInterval(interval);
  }, [fetchWithAuth]);

  const handleRerunTestBatch = async () => {
    setIsRunningBatch(true);
    setNotification("Dispatching empirical diffusion benchmark sweep...");
    try {
      const res = await fetchWithAuth(apiUrl("/api/benchmark/run"), {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const updatedData = await res.json();
        if (updatedData.kpis) setData(updatedData);
        setNotification("Empirical benchmark run dispatched successfully.");
      } else {
        setNotification("Failed to trigger benchmark run. Ensure server is active.");
      }
    } catch (e) {
      console.warn("Error running batch test", e);
      setNotification("Could not reach benchmark worker endpoint.");
    } finally {
      setIsRunningBatch(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen text-[var(--foreground)] flex font-sans">
        <LeftSidebar activeTab="benchmark" />
        <main className="flex-1 pl-20 sm:pl-[88px] w-full min-h-screen">
          <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
            {notification && (
              <div
                className="p-4 rounded-2xl text-xs flex items-center justify-between"
                style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
              >
                <span>{notification}</span>
                <button onClick={() => setNotification(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm">
                  ×
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                  Empirical Benchmark Lab
                </h1>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Diffusion trajectory dynamics, latency analysis &amp; FID validation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRerunTestBatch}
                  disabled={isRunningBatch}
                  className="px-4 py-2 saas-btn-primary text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                >
                  {isRunningBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunningBatch ? "Executing Sweep..." : "Run Benchmark Sweep"}</span>
                </button>
              </div>
            </div>

            <KpiCards kpis={data.kpis} system={data.system} />
            <ChartsSection latencyData={data.latency_profile} fidData={data.fid_curve} />
            <QualitativeSection cards={data.qualitative_comparison} />
            <BenchmarkHistorySection />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
