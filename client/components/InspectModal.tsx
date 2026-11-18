"use client";

import React from "react";
import Image from "next/image";
import { CheckpointItem } from "@/types/benchmark";
import { X, CheckCircle, Zap, Activity, HardDrive, Cpu } from "lucide-react";

interface InspectModalProps {
  checkpoint: CheckpointItem | null;
  onClose: () => void;
}

export const InspectModal: React.FC<InspectModalProps> = ({
  checkpoint,
  onClose
}) => {
  if (!checkpoint) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1728] border border-[#23324d] rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1e293b] flex items-center justify-between bg-[#131b2c]">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                checkpoint.pipeline_type === "DDIM" ? "bg-sky-400" : "bg-slate-400"
              }`}
            />
            <h3 className="text-sm font-bold text-white tracking-tight">
              {checkpoint.pipeline} — Checkpoint Inspection
            </h3>
            {checkpoint.badge && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-bold uppercase">
                {checkpoint.badge}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#0f1728] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-[#1e293b] bg-black">
            <Image
              src={checkpoint.qualitative_image || "/benchmark-samples/bedroom_ddim_50.png"}
              alt={checkpoint.qualitative_title || "Bedroom Benchmark"}
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-slate-700 text-xs font-mono text-white">
              {checkpoint.qualitative_tag} • FID {typeof checkpoint.fid === "number" ? checkpoint.fid.toFixed(2) : checkpoint.fid}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {checkpoint.qualitative_desc}
          </p>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-[#131b2c] p-2.5 rounded border border-[#23324d]">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">
                Inference Steps
              </span>
              <span className="text-base font-bold text-white font-mono">
                {checkpoint.steps}
              </span>
            </div>

            <div className="bg-[#131b2c] p-2.5 rounded border border-[#23324d]">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">
                FID Metric
              </span>
              <span className="text-base font-bold text-sky-400 font-mono">
                {typeof checkpoint.fid === "number" ? checkpoint.fid.toFixed(2) : checkpoint.fid}
              </span>
            </div>

            <div className="bg-[#131b2c] p-2.5 rounded border border-[#23324d]">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">
                Wall-Clock Latency
              </span>
              <span className="text-base font-bold text-white font-mono">
                {typeof checkpoint.latency === "number" ? `${checkpoint.latency.toFixed(2)}s` : checkpoint.latency}
              </span>
            </div>

            <div className="bg-[#131b2c] p-2.5 rounded border border-[#23324d]">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">
                Speedup Factor
              </span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {checkpoint.latency_index}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1e293b] flex items-center justify-between bg-[#131b2c]/80 text-[11px] font-mono text-slate-400">
          <span>Engine Calibration: Deterministic Eta η = 0.00</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#1e293b] text-slate-200 hover:bg-[#283852] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
