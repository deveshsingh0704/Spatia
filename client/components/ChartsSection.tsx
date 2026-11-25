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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4">
      {/* FID Score vs Sampling Steps */}
      <div className="saas-card p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
              FID Score vs Sampling Steps
            </h3>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5" style={{ background: "var(--brand-accent)" }} />
                <span style={{ color: "var(--brand-accent)" }}>DDIM (η=0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed border-[var(--muted-foreground)]" />
                <span className="text-[var(--muted-foreground)]">DDPM Markov</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] font-mono text-[var(--muted-foreground)] mb-4">
            Validation benchmark (Lower is Better ↓)
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fidData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="rgba(128,128,140,0.16)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="steps"
                  stroke="#71717a"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  domain={[0, 18]}
                  ticks={[0, 4, 8, 12, 16]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "none",
                    borderRadius: "12px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "var(--foreground)",
                    boxShadow: "var(--glass-shadow)"
                  }}
                />
                <ReferenceLine
                  y={5.0}
                  stroke="var(--brand-secondary)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Target Threshold: 5.0",
                    fill: "var(--brand-accent)",
                    fontSize: 10,
                    position: "insideTopRight",
                    fontFamily: "monospace"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ddim_fid"
                  name="DDIM (η=0)"
                  stroke="var(--brand-accent)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--card)", stroke: "var(--brand-accent)", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "var(--brand-accent)" }}
                />
                <Line
                  type="monotone"
                  dataKey="ddpm_fid"
                  name="DDPM Markov"
                  stroke="#a1a1aa"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#a1a1aa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 pt-3 flex items-center justify-between text-[11px] font-mono text-[var(--muted-foreground)]">
          <div>
            Critical Finding: <span className="text-[var(--foreground)] font-medium">DDIM achieves 93.4% asymptote convergence at Step 50.</span>
          </div>
          <div className="font-semibold" style={{ color: "var(--brand-accent)" }}>
            Slope d(FID)/d(Steps) → 0.013
          </div>
        </div>
      </div>

      {/* Wall-Clock Latency Profile */}
      <div className="saas-card p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
              Wall-Clock Latency Profile
            </h3>
            <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
              Linear Complexity O(T)
            </span>
          </div>
          <p className="text-[11px] font-mono text-[var(--muted-foreground)] mb-4">
            (Batch Size = 4 • FP16 / Seconds)
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} margin={{ top: 20, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="rgba(128,128,140,0.16)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#71717a"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fill: "#71717a", fontSize: 10, fontFamily: "monospace" }}
                  domain={[0, 32]}
                  ticks={[0, 2, 10, 20, 30]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "none",
                    borderRadius: "12px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "var(--foreground)",
                    boxShadow: "var(--glass-shadow)"
                  }}
                  formatter={(value) => [`${value ?? ""}s`, "Latency"]}
                />
                <Bar dataKey="latency" radius={[8, 8, 0, 0]}>
                  {latencyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.baseline
                          ? "var(--brand-secondary)"
                          : entry.highlight
                          ? "var(--brand-accent)"
                          : "var(--surface-elevated)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 pt-3 flex items-center justify-between text-[11px] font-mono text-[var(--muted-foreground)]">
          <div>
            Inference throughput: <span className="text-[var(--foreground)]">1.41 frames/sec vs 0.14 frames/sec</span>
          </div>
          <div className="text-[var(--foreground)]">
            Status: <span className="font-semibold" style={{ color: "var(--brand-accent)" }}>Deterministic Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
