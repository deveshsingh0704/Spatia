"use client";

import React from "react";
import Image from "next/image";
import { CheckpointItem } from "@/types/benchmark";
import { X } from "lucide-react";

interface InspectModalProps {
  checkpoint: CheckpointItem | null;
  onClose: () => void;
}

export const InspectModal: React.FC<InspectModalProps> = ({ checkpoint, onClose }) => {
  if (!checkpoint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="liquid-glass-elevated rounded-3xl max-w-2xl w-full overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between bg-[var(--surface-overlay)]/60">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: checkpoint.pipeline_type === "DDIM" ? "var(--brand-accent)" : "#a1a1aa" }}
            />
            <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
              {checkpoint.pipeline} — Checkpoint Inspection
            </h3>
            {checkpoint.badge && (
              <span
                className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase"
                style={{ background: "var(--brand-accent-soft)", color: "var(--brand-accent)" }}
              >
                {checkpoint.badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close Checkpoint Inspection"
            className="w-8 h-8 rounded-xl bg-[var(--surface-overlay)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black">
            <Image
              src={checkpoint.qualitative_image || "/benchmark-samples/bedroom_ddim_50.png"}
              alt={checkpoint.qualitative_title || "Bedroom Benchmark"}
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full apple-glass text-xs font-mono text-white">
              {checkpoint.qualitative_tag} • FID{" "}
              {typeof checkpoint.fid === "number" ? checkpoint.fid.toFixed(2) : checkpoint.fid}
            </div>
          </div>

          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            {checkpoint.qualitative_desc}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-[var(--surface-overlay)] p-3 rounded-2xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase block">
                Inference Steps
              </span>
              <span className="text-base font-bold text-[var(--foreground)] font-mono">
                {checkpoint.steps}
              </span>
            </div>

            <div className="bg-[var(--surface-overlay)] p-3 rounded-2xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase block">
                FID Metric
              </span>
              <span className="text-base font-bold font-mono" style={{ color: "var(--brand-accent)" }}>
                {typeof checkpoint.fid === "number" ? checkpoint.fid.toFixed(2) : checkpoint.fid}
              </span>
            </div>

            <div className="bg-[var(--surface-overlay)] p-3 rounded-2xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase block">
                Wall-Clock Latency
              </span>
              <span className="text-base font-bold text-[var(--foreground)] font-mono">
                {typeof checkpoint.latency === "number" ? `${checkpoint.latency.toFixed(2)}s` : checkpoint.latency}
              </span>
            </div>

            <div className="bg-[var(--surface-overlay)] p-3 rounded-2xl">
              <span className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase block">
                Speedup Factor
              </span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {checkpoint.latency_index}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 flex items-center justify-between bg-[var(--surface-overlay)]/60 text-[11px] font-mono text-[var(--muted-foreground)]">
          <span>Engine Calibration: Deterministic Eta η = 0.00</span>
          <button onClick={onClose} className="px-4 py-1.5 rounded-xl saas-btn-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
