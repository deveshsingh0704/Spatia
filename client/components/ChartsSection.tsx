"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import { FidPoint, LatencyPoint } from "@/types/benchmark";

interface ChartsSectionProps {
  fidData: FidPoint[];
  latencyData: LatencyPoint[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  fidData,
  latencyData
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 my-4">
      {/* FID Score vs Sampling Steps */}
      <div className="bg-[#0f1728]/95 border border-[#1e293b] rounded-lg p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              FID Score vs Sampling Steps
            </h3>
            {/* Custom Legend */}
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#38bdf8]" />
                <span className="text-sky-400">DDIM (η=0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-slate-400" />
                <span className="text-slate-400">DDPM Markov</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mb-4">
            Validation benchmark (Lower is Better ↓)
          </p>

          {/* Chart Canvas */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fidData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="steps"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  domain={[0, 18]}
                  ticks={[0, 4, 8, 12, 16]}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1220",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#f8fafc"
                  }}
                />
                <ReferenceLine
                  y={5.0}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{
                    value: "Target Threshold: 5.0",
                    fill: "#38bdf8",
                    fontSize: 10,
                    position: "insideTopRight",
                    fontFamily: "monospace"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ddim_fid"
                  name="DDIM (η=0)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0f1728", stroke: "#38bdf8", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#38bdf8" }}
                />
                <Line
                  type="monotone"
                  dataKey="ddpm_fid"
                  name="DDPM Markov"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#94a3b8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer annotation */}
        <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div>
            Critical Finding: <span className="text-slate-300 font-medium">DDIM achieves 93.4% asymptote convergence at Step 50.</span>
          </div>
          <div className="text-sky-400 font-semibold">
            Slope d(FID)/d(Steps) → 0.013
          </div>
        </div>
      </div>

      {/* Wall-Clock Latency Profile */}
      <div className="bg-[#0f1728]/95 border border-[#1e293b] rounded-lg p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Wall-Clock Latency Profile
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              ☵ Linear Complexity O(T)
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mb-4">
            (Batch Size = 4 • RTX 4090 FP16/Seconds)
          </p>

          {/* Chart Canvas */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} margin={{ top: 20, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  domain={[0, 32]}
                  ticks={[0, 2, 10, 20, 30]}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1220",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#f8fafc"
                  }}
                  formatter={(value: any) => [`${value}s`, "Latency"]}
                />
                <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
                  {latencyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.baseline
                          ? "#fda4af"
                          : entry.highlight
                          ? "#38bdf8"
                          : "#1e3a5f"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer annotation */}
        <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div>
            Inference throughput: <span className="text-slate-300">1.41 frames/sec vs 0.14 frames/sec</span>
          </div>
          <div className="text-slate-300">
            Memory footprint: <span className="text-sky-400 font-semibold">Flat 7.8 GB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
