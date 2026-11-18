"use client";

import React, { useState, useEffect } from "react";
import { History, RefreshCw, Clock, CheckCircle2, Sliders, ChevronDown } from "lucide-react";

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
      const res = await fetch("http://localhost:8001/api/benchmark/history");
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
    fetchHistory();
  }, []);

  const filtered = history.filter((r) => {
    if (filterSampler === "ALL") return true;
    return r.sampler.toUpperCase().includes(filterSampler);
  });

  return (
    <div className="bg-[#0f1728]/95 border border-[#1e293b] rounded-lg p-5 my-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            Historical Benchmark Runs Archive
          </h3>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            Audit trail of empirical evaluations, wall-clock latencies, and convergence metrics executed on this node.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Sampler */}
          <div className="flex items-center p-0.5 rounded-md bg-[#131b2c] border border-[#23324d] text-xs font-mono">
            {["ALL", "DDIM", "DDPM"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterSampler(mode)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterSampler === mode
                    ? "bg-sky-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-1.5 rounded-md bg-[#131b2c] border border-[#23324d] text-slate-400 hover:text-white transition-colors"
            title="Refresh past runs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* History Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-xs font-mono text-slate-500">
          No past benchmark logs found. Run a benchmark in Studio Generator to see results recorded here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#23324d] text-[10px] text-slate-400 uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#1e293b]">
              {filtered.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 text-[11px] font-mono">
                    {row.id.length > 15 ? `${row.id.slice(0, 15)}...` : row.id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 font-sans font-medium">
                    {row.model}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.sampler.includes("DDIM")
                          ? "bg-sky-950 text-sky-400 border border-sky-800"
                          : "bg-indigo-950 text-indigo-300 border border-indigo-800"
                      }`}
                    >
                      {row.sampler}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-white font-bold">
                    {row.steps} steps
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">
                    {row.generation_time}s
                  </td>
                  <td className="py-2.5 px-3 text-amber-300">
                    {row.fid}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {row.seed}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
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
