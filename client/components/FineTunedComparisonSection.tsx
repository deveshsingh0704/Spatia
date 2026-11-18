import React from "react";
import Image from "next/image";

export default function FineTunedComparisonSection() {
  const comparisons = [
    {
      title: "Modern Minimalist Bedroom",
      src: "/comparisons/comparison_1_modern_minimalist_bedroom.png",
      prompt: "a photography of a modern minimalist master bedroom, warm morning sunlight, king size bed with crisp white linen, oak wood flooring",
      improvement: "Clean architectural perspective, natural shadow falloff, aligned floorboards and realistic window lighting."
    },
    {
      title: "Cozy Dark Wood Cabin Bedroom",
      src: "/comparisons/comparison_2_cozy_dark_wood_cabin_bedroom.png",
      prompt: "a photography of a cozy bedroom with dark wood paneling, bedside reading lamps, soft wool blanket on bed",
      improvement: "Accurate wood grain texture, cozy ambient bedside light diffusion, elimination of surreal artifacts."
    },
    {
      title: "Luxury Hotel Suite Bedroom",
      src: "/comparisons/comparison_3_luxury_suite_hotel_bedroom.png",
      prompt: "a photography of a luxury hotel suite bedroom, neutral color palette, elegant headboard, nightstands with ambient lamps",
      improvement: "Photorealistic luxury interior proportions, balanced headboard symmetry, and authentic room depth."
    }
  ];

  return (
    <section className="my-8 p-5 bg-[#0e1726]/60 border border-emerald-500/20 rounded-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4 border-b border-[#23324d] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              FINE-TUNED BENCHMARK
            </span>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Base SD 1.5 vs. LSUN Bedroom LoRA Quality Comparison
            </h2>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Deterministic side-by-side evaluation (Seed: 42, DDIM 25 steps, CFG: 7.5, 512x512)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {comparisons.map((item, idx) => (
          <div key={idx} className="bg-[#111927] border border-[#23324d] rounded-lg p-3 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-200 font-mono">
                {idx + 1}. {item.title}
              </h3>
              <span className="text-[10px] font-mono text-emerald-400/90 mt-1 md:mt-0">
                Key Gain: {item.improvement}
              </span>
            </div>

            <div className="relative w-full rounded-md overflow-hidden border border-[#1f2b42] aspect-[2/1]">
              <Image
                src={item.src}
                alt={item.title}
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain bg-black/40"
              />
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-2 truncate">
              <span className="text-slate-500 font-bold">PROMPT: </span> {item.prompt}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

