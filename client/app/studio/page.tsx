"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { StudioGenerator } from "@/components/StudioGenerator";
import FineTunedComparisonSection from "@/components/FineTunedComparisonSection";
import { INITIAL_BENCHMARK_DATA } from "@/data/benchmarkData";
import { BenchmarkData } from "@/types/benchmark";

export default function StudioPage() {
  const [data, setData] = useState<BenchmarkData>(INITIAL_BENCHMARK_DATA);

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
    const interval = setInterval(syncBackendData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-black">
        <Header activeTab="studio" setActiveTab={() => {}} system={data.system} />
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-5">
          <StudioGenerator system={data.system} />
          <FineTunedComparisonSection />
        </main>
      </div>
    </ProtectedRoute>
  );
}
