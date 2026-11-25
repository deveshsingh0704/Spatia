"use client";

import React from "react";
import { BenchmarkKpis, SystemInfo } from "@/types/benchmark";
import { TrendingDown, Zap, ArrowDownRight } from "lucide-react";

interface KpiCardsProps {
  kpis: BenchmarkKpis;
  system: SystemInfo;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
      {/* 1. Optimal Operating Point */}
      <div className="saas-card p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Optimal Operating Point
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
          >
            Recommended
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--foreground)] tracking-tight font-heading">
            {kpis.optimal_operating_point}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] font-mono">steps</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs font-mono" style={{ color: "var(--brand-accent)" }}>
          <Zap className="w-3.5 h-3.5" />
          <span className="font-semibold">{kpis.time_saved_percent}% Time Saved</span>
          <span className="text-[var(--muted-foreground)] text-[11px]">vs DDPM-1000</span>
        </div>

        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)] font-mono leading-relaxed">
          Tradeoff: {kpis.tradeoff}
        </p>
      </div>

      {/* 2. Fréchet Inception Distance */}
      <div className="saas-card p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Fréchet Inception Distance
          </span>
          <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
            Target &lt; {kpis.fid_target.toFixed(1)}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--foreground)] tracking-tight font-heading">
            {kpis.fid_score.toFixed(2)}
          </span>
          <span className="text-xs font-mono font-bold tracking-wider" style={{ color: "var(--brand-accent)" }}>
            FID
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--foreground)] font-mono">
          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
          <span>Δ {kpis.fid_delta_from_baseline.toFixed(2)} from 1000-step baseline</span>
        </div>

        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)] font-mono leading-relaxed">
          Perceptual quality index: {kpis.perceptual_quality_index}% equivalent
        </p>
      </div>

      {/* 3. Inference Acceleration */}
      <div className="saas-card p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Inference Acceleration
          </span>
          <span className="text-[11px] font-mono font-medium" style={{ color: "var(--brand-accent)" }}>
            Batch=4 (512×512)
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--foreground)] tracking-tight font-heading">
            {kpis.speedup}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] font-mono">speedup</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--foreground)] font-mono">
          <TrendingDown className="w-3.5 h-3.5" style={{ color: "var(--brand-accent)" }} />
          <span>
            {kpis.wall_clock_time_sec.toFixed(2)}s vs {kpis.baseline_time_sec.toFixed(2)}s baseline
          </span>
        </div>

        <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)] font-mono leading-relaxed">
          Compute cost: {kpis.compute_cost}
        </p>
      </div>

      {/* 4. Evaluation Protocol */}
      <div className="saas-card p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            Evaluation Protocol
          </span>
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--brand-accent)" }} />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-[var(--foreground)] tracking-tight font-heading">
            {kpis.dataset}
          </span>
        </div>

        <p className="text-[11px] text-[var(--muted-foreground)] font-mono mt-0.5">
          {kpis.features_count}
        </p>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--muted-foreground)] font-mono">
          <span>FP16 Precision</span>
          <span>•</span>
          <span>Deterministic Schedule</span>
        </div>

        <p className="mt-1.5 text-[11px] font-mono font-medium" style={{ color: "var(--brand-accent)" }}>
          Deterministic Eta (η) = {kpis.eval_eta.toFixed(2)}
        </p>
      </div>
    </div>
  );
};
