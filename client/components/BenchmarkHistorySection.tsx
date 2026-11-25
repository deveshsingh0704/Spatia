"use client";

import React, { useState, useEffect, useMemo } from "react";
import { History, RefreshCw, CheckCircle2, Download, ChevronDown, ChevronRight, Image as ImageIcon, X, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiUrl, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface PastBenchmarkRecord {
  id: string;
  batch_id?: string;
  model: string;
  sampler: string;
  steps: number;
  generation_time: number;
  throughput_ips?: number;
  seed: number;
  fid: number;
  prompt?: string;
  image_url?: string | null;
  created_at?: string | null;
  status: string;
}

interface BenchmarkBatchGroup {
  batchId: string;
  model: string;
  prompt: string;
  seed: number;
  createdAt: string | null;
  runs: PastBenchmarkRecord[];
}

export const BenchmarkHistorySection: React.FC = () => {
  const router = useRouter();
  const { fetchWithAuth } = useAuth();
  const [history, setHistory] = useState<PastBenchmarkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSampler, setFilterSampler] = useState<string>("ALL");
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(apiUrl("/api/benchmark/history"));
      if (res.ok) {
        const data = await res.json();
        if (data.history) {
          setHistory(data.history);
          // Auto-expand the most recent batch
          if (data.history.length > 0) {
            const firstBatch = data.history[0].batch_id || data.history[0].id;
            setExpandedBatches((prev) => ({ [firstBatch]: true, ...prev }));
          }
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

  const exportRunsToCsv = (runs: PastBenchmarkRecord[], filename: string) => {
    const headers = ["Run ID", "Batch ID", "Model", "Sampler", "Steps", "Latency (s)", "FID", "Seed", "Status"];
    const rows = runs.map((r) => [
      r.id,
      r.batch_id || r.id,
      `"${r.model}"`,
      r.sampler,
      r.steps,
      r.generation_time,
      r.fid,
      r.seed,
      r.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = useMemo(() => {
    return history.filter((r) => {
      if (filterSampler === "ALL") return true;
      return r.sampler.toUpperCase().includes(filterSampler);
    });
  }, [history, filterSampler]);

  const batches: BenchmarkBatchGroup[] = useMemo(() => {
    const map = new Map<string, BenchmarkBatchGroup>();
    for (const r of filtered) {
      const bId = r.batch_id || r.id;
      if (!map.has(bId)) {
        map.set(bId, {
          batchId: bId,
          model: r.model,
          prompt: r.prompt || "Empirical diffusion sweep",
          seed: r.seed,
          createdAt: r.created_at || null,
          runs: [],
        });
      }
      map.get(bId)!.runs.push(r);
    }
    return Array.from(map.values());
  }, [filtered]);

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  const getSamplerBadgeStyle = (sampler: string) => {
    if (sampler.toUpperCase().includes("DDIM")) {
      return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    }
    return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
  };

  return (
    <div className="saas-card p-5 my-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: "var(--brand-accent)" }} />
            Benchmark Runs Archive
          </h3>
          <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-0.5">
            Grouped by benchmark run ID with per-step latency, FID, generated images, and CSV export.
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
            onClick={() => exportRunsToCsv(filtered, `latentcraft_benchmarks_${Date.now()}.csv`)}
            disabled={filtered.length === 0}
            className="px-3 py-1.5 rounded-xl saas-btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
            title="Export all benchmark runs to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export All CSV</span>
          </button>

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

      {batches.length === 0 ? (
        <div className="text-center py-8 text-xs font-mono text-[var(--muted-foreground)]">
          No benchmark runs recorded yet. Run a sweep in Studio Sampler Matrix to record results.
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const isExpanded = Boolean(expandedBatches[batch.batchId]);
            return (
              <div
                key={batch.batchId}
                className="rounded-2xl bg-[var(--surface-overlay)] overflow-hidden"
              >
                <div
                  onClick={() => toggleBatch(batch.batchId)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-[var(--surface-elevated)] text-[var(--muted-foreground)]">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-[var(--foreground)]">
                          Run: {batch.batchId}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--muted-foreground)]">
                          {batch.runs.length} {batch.runs.length === 1 ? "config" : "configs"}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                          Seed: {batch.seed}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                        {batch.model} • {batch.prompt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/studio?bench=${encodeURIComponent(batch.batchId)}`)}
                      className="px-3 py-1.5 rounded-xl saas-btn-primary text-xs flex items-center gap-1.5"
                      title={`Open benchmark ${batch.batchId} in Studio`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Run</span>
                    </button>
                    <button
                      onClick={() => exportRunsToCsv(batch.runs, `benchmark_${batch.batchId}.csv`)}
                      className="px-3 py-1.5 rounded-xl saas-btn-secondary text-xs flex items-center gap-1.5"
                      title={`Export run ${batch.batchId} to CSV`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                          <th className="py-2 px-3">Config ID</th>
                          <th className="py-2 px-3">Sampler</th>
                          <th className="py-2 px-3">Steps</th>
                          <th className="py-2 px-3">Latency</th>
                          <th className="py-2 px-3">FID</th>
                          <th className="py-2 px-3">Image</th>
                          <th className="py-2 px-3 text-right">Status</th>
                          <th className="py-2 px-3 text-right">Export</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batch.runs.map((row) => (
                          <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3 text-[var(--muted-foreground)] text-[11px] rounded-l-xl">
                              {row.id.slice(0, 8)}...
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getSamplerBadgeStyle(
                                  row.sampler
                                )}`}
                              >
                                {row.sampler}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[var(--foreground)] font-bold">{row.steps} steps</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-semibold">{row.generation_time}s</td>
                            <td className="py-2.5 px-3 text-amber-400">{row.fid}</td>
                            <td className="py-2.5 px-3">
                              {row.image_url ? (
                                <button
                                  onClick={() =>
                                    setPreviewImage({
                                      url: resolveMediaUrl(row.image_url!) || "",
                                      title: `${row.sampler} • ${row.steps} steps (Seed ${row.seed})`,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg saas-btn-secondary text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>View Image</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-[var(--muted-foreground)]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                PASSED
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right rounded-r-xl">
                              <button
                                onClick={() => exportRunsToCsv([row], `benchmark_${row.id}.csv`)}
                                className="px-2.5 py-1 rounded-lg saas-btn-secondary text-[11px] inline-flex items-center gap-1"
                                title={`Export config ${row.id} to CSV`}
                              >
                                <Download className="w-3 h-3" />
                                <span>CSV</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="saas-card max-w-xl w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-[var(--foreground)]">
                {previewImage.title}
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg saas-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black/30">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
