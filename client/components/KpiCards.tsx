"use client";

import React from "react";
import { BenchmarkKpis, SystemInfo } from "@/types/benchmark";
import { TrendingDown, Zap, Target, ArrowDownRight, Layers } from "lucide-react";

interface KpiCardsProps {
  kpis: BenchmarkKpis;
  system: SystemInfo;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, system }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 my-4">
      {/* 1. Optimal Operating Point */}
      <div className="bg-[#0f1728]/90 border border-[#1e293b] rounded-lg p-4 relative overflow-hidden backdrop-blur-sm group hover:border-[#38bdf8]/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Optimal Operating Point
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 font-semibold">
            Recommended
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight font-sans">
            {kpis.optimal_operating_point}
          </span>
          <span className="text-xs text-slate-400 font-mono">steps</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-sky-400 font-mono">
          <Zap className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold">{kpis.time_saved_percent}% Time Saved</span>
          <span className="text-slate-500 text-[11px]">vs DDPM-1000</span>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400 font-mono leading-relaxed">
          Tradeoff: {kpis.tradeoff}
        </p>
      </div>

      {/* 2. Fréchet Inception Distance */}
      <div className="bg-[#0f1728]/90 border border-[#1e293b] rounded-lg p-4 relative overflow-hidden backdrop-blur-sm group hover:border-indigo-500/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Fréchet Inception Distance
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Target &lt; {kpis.fid_target.toFixed(1)}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight font-sans">
            {kpis.fid_score.toFixed(2)}
          </span>
          <span className="text-xs text-sky-400 font-mono font-bold tracking-wider">
            FID
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
          <span>Δ {kpis.fid_delta_from_baseline.toFixed(2)} from 1000-step baseline</span>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400 font-mono leading-relaxed">
          Perceptual quality index: {kpis.perceptual_quality_index}% equivalent
        </p>
      </div>

      {/* 3. Inference Acceleration */}
      <div className="bg-[#0f1728]/90 border border-[#1e293b] rounded-lg p-4 relative overflow-hidden backdrop-blur-sm group hover:border-cyan-500/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Inference Acceleration
          </span>
          <span className="text-[11px] font-mono text-sky-400 font-medium">
            Batch=4 (512x512)
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tracking-tight font-sans">
            {kpis.speedup}
          </span>
          <span className="text-xs text-slate-400 font-mono">speedup</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <TrendingDown className="w-3.5 h-3.5 text-sky-400" />
          <span>
            {kpis.wall_clock_time_sec.toFixed(2)}s vs {kpis.baseline_time_sec.toFixed(2)}s baseline
          </span>
        </div>

        <p className="mt-1.5 text-[11px] text-slate-400 font-mono leading-relaxed">
          Compute cost: {kpis.compute_cost}
        </p>
      </div>

      {/* 4. Evaluation Protocol */}
      <div className="bg-[#0f1728]/90 border border-[#1e293b] rounded-lg p-4 relative overflow-hidden backdrop-blur-sm group hover:border-[#38bdf8]/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Evaluation Protocol
          </span>
          <span className="w-2 h-2 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white tracking-tight font-sans">
            {kpis.dataset}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
          {kpis.features_count}
        </p>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span>⚙ RTX 4090</span>
          <span>•</span>
          <span>FP16 TensorRT</span>
        </div>

        <p className="mt-1.5 text-[11px] text-sky-400 font-mono font-medium">
          Deterministic Eta (η) = {kpis.eval_eta.toFixed(2)}
        </p>
      </div>
    </div>
  );
};
