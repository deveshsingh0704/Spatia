"use client";

import React from "react";
import Image from "next/image";
import { QualitativeCard } from "@/types/benchmark";

interface QualitativeSectionProps {
  cards: QualitativeCard[];
}

export const QualitativeSection: React.FC<QualitativeSectionProps> = ({
  cards
}) => {
  const getBadgeStyle = (type: QualitativeCard["tag_type"]) => {
    switch (type) {
      case "gold":
        return "bg-black/80 text-amber-300 border-amber-500/40";
      case "warning":
        return "bg-red-950/80 text-rose-400 border-rose-500/50";
      case "optimal":
        return "bg-sky-950/90 text-sky-400 border-sky-400/60";
      case "draft":
        return "bg-indigo-950/80 text-indigo-300 border-indigo-400/40";
      default:
        return "bg-slate-900/80 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="my-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Empirical Qualitative Comparison
          </h2>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            Uniform evaluation latent vector (RNG Seed: 42) across varying step budgets
          </p>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#131b2c] border border-[#23324d] text-slate-400">
          LSUN Bedroom Synthesis
        </span>
      </div>

      {/* 4-Column Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-[#0f1728]/95 border border-[#1e293b] rounded-lg overflow-hidden flex flex-col justify-between group hover:border-[#38bdf8]/40 transition-all"
          >
            {/* Image Container with overlays */}
            <div className="relative aspect-[4/3] w-full bg-[#080d17] overflow-hidden">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 25vw"
              />

              {/* Tag overlay on top */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span
                  className={`text-[9.5px] font-mono font-bold tracking-wider px-2 py-0.5 rounded border uppercase backdrop-blur-md shadow-sm ${getBadgeStyle(
                    card.tag_type
                  )}`}
                >
                  {card.tag}
                </span>
              </div>

              {/* Latency & FID tag on bottom right */}
              <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded bg-black/85 border border-slate-700/80 backdrop-blur-sm text-[10px] font-mono text-slate-200">
                <span>{card.latency}</span>
                <span className="text-slate-500 mx-1">•</span>
                <span className="text-sky-400 font-bold">FID {card.fid}</span>
              </div>
            </div>

            {/* Content description */}
            <div className="p-3.5 flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-white tracking-tight">
                    {card.title}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {card.subtitle}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans mb-3 line-clamp-3">
                  {card.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Latency index:</span>
                <span
                  className={`font-semibold ${
                    card.tag_type === "optimal"
                      ? "text-sky-400"
                      : card.tag_type === "warning"
                      ? "text-rose-400"
                      : "text-slate-300"
                  }`}
                >
                  {card.latency_index}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
