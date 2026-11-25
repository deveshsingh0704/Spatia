"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LeftSidebar } from "@/components/LeftSidebar";
import { DesignGallery } from "@/components/DesignGallery";
import { INITIAL_BENCHMARK_DATA } from "@/data/benchmarkData";
import { BenchmarkData } from "@/types/benchmark";
import { apiUrl } from "@/lib/api";

export default function GalleryPage() {
  const [data, setData] = useState<BenchmarkData>(INITIAL_BENCHMARK_DATA);

  useEffect(() => {
    async function syncBackendData() {
      try {
        const res = await fetch(apiUrl("/api/benchmark"));
        if (res.ok) {
          const remoteData: BenchmarkData = await res.json();
          setData(remoteData);
        }
      } catch (e) {
        console.warn("Could not connect to FastAPI server:", e);
      }
    }

    syncBackendData();
    const interval = setInterval(syncBackendData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen text-[var(--foreground)] flex font-sans">
        <LeftSidebar activeTab="gallery" />
        <main className="flex-1 pl-20 sm:pl-[88px] w-full min-h-screen">
          <div className="max-w-[1440px] mx-auto px-6 py-6">
            <DesignGallery />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
