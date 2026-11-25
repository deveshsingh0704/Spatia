"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LeftSidebar } from "@/components/LeftSidebar";
import { KpiCards } from "@/components/KpiCards";
import { ChartsSection } from "@/components/ChartsSection";
import { QualitativeSection } from "@/components/QualitativeSection";
import FineTunedComparisonSection from "@/components/FineTunedComparisonSection";
import { CheckpointsTable } from "@/components/CheckpointsTable";
import { InspectModal } from "@/components/InspectModal";
import { BenchmarkHistorySection } from "@/components/BenchmarkHistorySection";
import { INITIAL_BENCHMARK_DATA } from "@/data/benchmarkData";
import { BenchmarkData, CheckpointItem } from "@/types/benchmark";
import { Play, Download, RefreshCw } from "lucide-react";

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkData>(INITIAL_BENCHMARK_DATA);
  const [inspectedCheckpoint, setInspectedCheckpoint] = useState<CheckpointItem | null>(null);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    async function syncBackendData() {
      try {
        const res = await fetch("http://localhost:8001/api/benchmark");
        if (res.ok) {
          const remoteData: BenchmarkData = await res.json();
          setData(remoteData);
        }
      } catch (e) {
        console.warn("Could not connect to FastAPI server at localhost:8001", e);
      }
    }

    syncBackendData();
    const interval = setInterval(syncBackendData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRerunTestBatch = async () => {
    setIsRunningBatch(true);
    setNotification("Dispatching empirical diffusion benchmark sweep...");
    try {
      const res = await fetch("http://localhost:8001/api/benchmark/run", {
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

  const handleExportCsv = () => {
    const headers = ["ID", "Pipeline", "Steps", "Latency (s)", "FID", "Throughput (img/s)"];
    const rows = data.checkpoints.map((c) => [
      c.id,
      `"${c.pipeline}"`,
      c.steps,
      c.latency,
      c.fid,
      c.throughput
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `latentcraft_benchmark_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 saas-btn-secondary text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
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
            <FineTunedComparisonSection />
            <CheckpointsTable checkpoints={data.checkpoints} onInspect={setInspectedCheckpoint} />
            <BenchmarkHistorySection />

            {inspectedCheckpoint && (
              <InspectModal checkpoint={inspectedCheckpoint} onClose={() => setInspectedCheckpoint(null)} />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
