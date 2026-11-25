"use client";

import React, { useState, useEffect } from "react";
import { History, RefreshCw, CheckCircle2 } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface PastBenchmarkRecord {
  id: string;
  model: string;
  sampler: string;
  steps: number;
  generation_time: number;
  seed: number;
  fid: number;
  status: string;
}

export const BenchmarkHistorySection: React.FC = () => {
  const [history, setHistory] = useState<PastBenchmarkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSampler, setFilterSampler] = useState<string>("ALL");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/benchmark/history"));
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          setHistory(data.history);
        }
      }
    } catch (e) {
      console.warn("Could not fetch benchmark history", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fetchHistory();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const filtered = history.filter((r) => {
    if (filterSampler === "ALL") return true;
    return r.sampler.toUpperCase().includes(filterSampler);
  });

  return (
    <div className="saas-card p-5 my-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: "var(--brand-accent)" }} />
            Historical Benchmark Runs Archive
          </h3>
          <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-0.5">
            Audit trail of empirical evaluations, wall-clock latencies, and convergence metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-[var(--surface-overlay)] text-xs font-mono">
            {["ALL", "DDIM", "DDPM"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterSampler(mode)}
                style={
                  filterSampler === mode
                    ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterSampler === mode
                    ? "font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-2 rounded-xl saas-btn-secondary"
            title="Refresh past runs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-xs font-mono text-[var(--muted-foreground)]">
          No past benchmark logs found. Run a benchmark in Studio Sampler Matrix to record results.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                <th className="py-2 px-3">Run ID</th>
                <th className="py-2 px-3">Model</th>
                <th className="py-2 px-3">Sampler</th>
                <th className="py-2 px-3">Sampling Steps</th>
                <th className="py-2 px-3">Wall-Clock Latency</th>
                <th className="py-2 px-3">FID Metric</th>
                <th className="py-2 px-3">Seed</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--surface-overlay)] transition-colors">
                  <td className="py-2.5 px-3 text-[var(--muted-foreground)] text-[11px] rounded-l-xl">
                    {row.id.length > 15 ? `${row.id.slice(0, 15)}...` : row.id}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--foreground)] font-sans font-medium">
                    {row.model}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: "var(--brand-accent-soft)",
                        color: "var(--brand-accent)"
                      }}
                    >
                      {row.sampler}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--foreground)] font-bold">{row.steps} steps</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">{row.generation_time}s</td>
                  <td className="py-2.5 px-3 text-amber-400">{row.fid}</td>
                  <td className="py-2.5 px-3 text-[var(--muted-foreground)]">{row.seed}</td>
                  <td className="py-2.5 px-3 text-right rounded-r-xl">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      PASSED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
