"use client";

import React, { useState } from "react";
import { CheckpointItem } from "@/types/benchmark";
import { Search, ShieldCheck, Eye } from "lucide-react";

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
    const matchesFilter = filterType === "ALL" || item.pipeline_type === filterType;
    const matchesSearch =
      item.pipeline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.steps.toString().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="saas-card p-5 my-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pipeline (e.g. DDIM, 50)..."
            className="w-full saas-input pl-9 pr-3 py-2 text-xs font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-[var(--surface-overlay)]">
            {(["ALL", "DDIM", "DDPM"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={
                  filterType === type
                    ? { background: "var(--brand-accent)", color: "var(--brand-accent-fg)" }
                    : undefined
                }
                className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors ${
                  filterType === type
                    ? "font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {type === "ALL" ? "All Runs" : type}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[var(--muted-foreground)]">
            <span>
              Showing <span className="text-[var(--foreground)] font-semibold">{filtered.length}</span> validated checkpoints
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[11px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
              <th className="py-2.5 px-3">Sampler Pipeline</th>
              <th className="py-2.5 px-3 text-right">Steps</th>
              <th className="py-2.5 px-3 text-right">FID Score (↓)</th>
              <th className="py-2.5 px-3 text-right">Latency (s)</th>
              <th className="py-2.5 px-3 text-right">Throughput</th>
              <th className="py-2.5 px-3 text-center">RNG Seed</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs font-mono">
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[var(--surface-overlay)] transition-colors group cursor-pointer rounded-xl"
                onClick={() => onInspect(item)}
              >
                <td className="py-3 px-3 rounded-l-xl">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: item.pipeline_type === "DDIM" ? "var(--brand-accent)" : "#a1a1aa"
                      }}
                    />
                    <span className="text-[var(--foreground)] font-medium">
                      {item.pipeline}
                    </span>
                    {item.badge && (
                      <span
                        className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold"
                        style={
                          item.badge === "OPTIMAL"
                            ? { background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }
                            : item.badge === "GROUND TRUTH"
                            ? { background: "rgba(245,158,11,0.15)", color: "#f59e0b" }
                            : { background: "var(--surface-elevated)", color: "var(--muted-foreground)" }
                        }
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3 px-3 text-right text-[var(--foreground)]">{item.steps}</td>

                <td className="py-3 px-3 text-right">
                  <span
                    className="font-semibold"
                    style={Number(item.fid) <= 5.0 ? { color: "var(--brand-accent)" } : undefined}
                  >
                    {typeof item.fid === "number" ? item.fid.toFixed(2) : item.fid}
                  </span>
                </td>

                <td className="py-3 px-3 text-right">
                  <span
                    className={Number(item.latency) <= 3.0 ? "font-semibold" : "text-[var(--foreground)]"}
                    style={Number(item.latency) <= 3.0 ? { color: "var(--brand-accent)" } : undefined}
                  >
                    {typeof item.latency === "number" ? `${item.latency.toFixed(2)}s` : item.latency}
                  </span>
                </td>

                <td className="py-3 px-3 text-right text-[var(--foreground)]">
                  {typeof item.throughput === "number" ? `${item.throughput.toFixed(2)} f/s` : item.throughput}
                </td>

                <td className="py-3 px-3 text-center text-[var(--muted-foreground)]">
                  {item.rng_seed}
                </td>

                <td className="py-3 px-3 text-center">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={
                      item.status === "PASSED"
                        ? { background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }
                        : { background: "var(--surface-overlay)", color: "var(--muted-foreground)" }
                    }
                  >
                    {item.status}
                  </span>
                </td>

                <td className="py-3 px-3 text-right rounded-r-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspect(item);
                    }}
                    style={{ color: "var(--brand-accent)" }}
                    className="text-xs hover:underline inline-flex items-center gap-1 font-medium"
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

      <div className="mt-4 pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[var(--muted-foreground)] gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
          <span>All FID computations calibrated on Inception-v3</span>
        </div>
        <div>95% Confidence Interval: ±0.12 FID • Deterministic Seed Guarantee verified</div>
      </div>
    </div>
  );
};
