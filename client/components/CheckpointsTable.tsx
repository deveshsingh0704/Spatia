"use client";

import React, { useState } from "react";
import { CheckpointItem } from "@/types/benchmark";
import { Search, Filter, ShieldCheck, AlertTriangle, Eye } from "lucide-react";

interface CheckpointsTableProps {
  checkpoints: CheckpointItem[];
  onInspect: (item: CheckpointItem) => void;
}

export const CheckpointsTable: React.FC<CheckpointsTableProps> = ({
  checkpoints,
  onInspect
}) => {
  const [filterType, setFilterType] = useState<"ALL" | "DDIM" | "DDPM">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = checkpoints.filter((item) => {
    const matchesFilter =
      filterType === "ALL" || item.pipeline_type === filterType;
    const matchesSearch =
      item.pipeline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.steps.toString().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-[#0f1728]/95 border border-[#1e293b] rounded-lg p-5 my-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pipeline (e.g. DDIM, 50, RTX)..."
            className="w-full bg-[#131b2c] border border-[#23324d] rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter Pills & Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 rounded-md bg-[#131b2c] border border-[#23324d]">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                filterType === "ALL"
                  ? "bg-sky-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Runs
            </button>
            <button
              onClick={() => setFilterType("DDIM")}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                filterType === "DDIM"
                  ? "bg-sky-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              DDIM
            </button>
            <button
              onClick={() => setFilterType("DDPM")}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                filterType === "DDPM"
                  ? "bg-sky-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              DDPM
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>
              Showing <span className="text-slate-200 font-semibold">{filtered.length}</span> validated checkpoints
            </span>
            <span>•</span>
            <span>Batch Size: 4</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1e293b] text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Sampler Pipeline</th>
              <th className="py-2.5 px-3 text-right">Steps</th>
              <th className="py-2.5 px-3 text-right">FID Score (↓)</th>
              <th className="py-2.5 px-3 text-right">Latency (s)</th>
              <th className="py-2.5 px-3 text-right">Throughput</th>
              <th className="py-2.5 px-3 text-right">VRAM</th>
              <th className="py-2.5 px-3 text-center">RNG Seed</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/60 text-xs font-mono">
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[#131b2c]/80 transition-colors group cursor-pointer"
                onClick={() => onInspect(item)}
              >
                {/* Pipeline name & Badge */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.pipeline_type === "DDIM" ? "bg-sky-400" : "bg-slate-400"
                      }`}
                    />
                    <span className="text-white font-medium group-hover:text-sky-300 transition-colors">
                      {item.pipeline}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider font-bold ${
                          item.badge === "OPTIMAL"
                            ? "bg-sky-950 text-sky-400 border border-sky-800"
                            : item.badge === "DRAFT"
                            ? "bg-indigo-950 text-indigo-400 border border-indigo-800"
                            : item.badge === "GROUND TRUTH"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </td>

                {/* Steps */}
                <td className="py-3 px-3 text-right text-slate-300">
                  {item.steps}
                </td>

                {/* FID Score */}
                <td className="py-3 px-3 text-right">
                  <span
                    className={`font-semibold ${
                      Number(item.fid) <= 5.0
                        ? "text-sky-400"
                        : Number(item.fid) > 10.0
                        ? "text-rose-400"
                        : "text-slate-300"
                    }`}
                  >
                    {typeof item.fid === "number" ? item.fid.toFixed(2) : item.fid}
                  </span>
                </td>

                {/* Latency */}
                <td className="py-3 px-3 text-right">
                  <span
                    className={
                      Number(item.latency) <= 3.0 ? "text-sky-400 font-semibold" : "text-slate-300"
                    }
                  >
                    {typeof item.latency === "number" ? `${item.latency.toFixed(2)}s` : item.latency}
                  </span>
                </td>

                {/* Throughput */}
                <td className="py-3 px-3 text-right text-slate-300">
                  {typeof item.throughput === "number" ? `${item.throughput.toFixed(2)} f/s` : item.throughput}
                </td>

                {/* VRAM */}
                <td className="py-3 px-3 text-right text-slate-300">
                  {typeof item.vram === "number" ? `${item.vram.toFixed(2)} GB` : item.vram}
                </td>

                {/* RNG Seed */}
                <td className="py-3 px-3 text-center text-slate-400">
                  {item.rng_seed}
                </td>

                {/* Status */}
                <td className="py-3 px-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.status === "PASSED"
                        ? "bg-sky-950/70 text-sky-400 border border-sky-800/60"
                        : item.status === "REFERENCE"
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : "bg-rose-950/70 text-rose-400 border border-rose-800/60"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>

                {/* Action */}
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspect(item);
                    }}
                    className="text-xs text-sky-400 hover:text-sky-200 transition-colors font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Calibration Notice */}
      <div className="mt-4 pt-3 border-t border-[#1e293b] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>
            All FID computations calibrated on Inception-v3 (torchvision-0.19.1)
          </span>
        </div>
        <div>
          95% Confidence Interval: ±0.12 FID • Deterministic Seed Guarantee verified
        </div>
      </div>
    </div>
  );
};
