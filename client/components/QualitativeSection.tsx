"use client";

import React from "react";
import Image from "next/image";
import { QualitativeCard } from "@/types/benchmark";

interface QualitativeSectionProps {
  cards: QualitativeCard[];
}

export const QualitativeSection: React.FC<QualitativeSectionProps> = ({ cards }) => {
  const getBadgeStyle = (type: QualitativeCard["tag_type"]) => {
    switch (type) {
      case "gold":
        return "bg-black/70 text-amber-300";
      case "warning":
        return "bg-rose-950/80 text-rose-300";
      case "optimal":
        return "bg-black/70 text-white";
      default:
        return "bg-black/70 text-zinc-200";
    }
  };

  return (
    <div className="my-6">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
            Empirical Qualitative Comparison
          </h2>
          <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-0.5">
            Uniform evaluation latent vector (RNG Seed: 42) across varying step budgets
          </p>
        </div>
        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[var(--surface-overlay)] text-[var(--muted-foreground)]">
          LSUN Bedroom Synthesis
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="saas-card overflow-hidden flex flex-col justify-between group">
            <div className="relative aspect-[4/3] w-full bg-zinc-950 overflow-hidden">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 25vw"
              />

              <div className="absolute top-2.5 left-2.5 z-10">
                <span
                  className={`text-[9.5px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase apple-glass ${getBadgeStyle(
                    card.tag_type
                  )}`}
                >
                  {card.tag}
                </span>
              </div>

              <div className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-0.5 rounded-full apple-glass text-[10px] font-mono text-zinc-100">
                <span>{card.latency}</span>
                <span className="opacity-50 mx-1">•</span>
                <span style={{ color: "var(--brand-accent)" }} className="font-bold">
                  FID {card.fid}
                </span>
              </div>
            </div>

            <div className="p-4 flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-[var(--foreground)] tracking-tight">
                    {card.title}
                  </h4>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                    {card.subtitle}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed mb-3 line-clamp-3">
                  {card.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[var(--muted-foreground)]">Latency index:</span>
                <span
                  className="font-semibold"
                  style={
                    card.tag_type === "optimal"
                      ? { color: "var(--brand-accent)" }
                      : card.tag_type === "warning"
                      ? { color: "#fb7185" }
                      : undefined
                  }
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
