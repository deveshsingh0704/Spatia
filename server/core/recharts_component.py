"""
recharts_component.py - Generates an interactive, responsive React + Recharts comparison dashboard
for DDPM vs. DDIM sampling dynamics and model benchmarks across SD 1.5, SD 2.1, and SDXL.
"""

def get_recharts_html() -> str:
    """
    Returns self-contained HTML/CSS/JS embedding React, ReactDOM, and Recharts via CDN (with Babel standalone)
    to render an interactive analytics dashboard for diffusion model sampling comparison.
    """
    html_code = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DDPM vs DDIM Diffusion Comparison Analytics</title>
  
  <!-- React & Babel CDNs -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/prop-types@15/prop-types.min.js"></script>
  <script crossorigin src="https://unpkg.com/recharts@2.12.7/umd/Recharts.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <style>
    :root {
      --bg-surface: #0f172a;
      --bg-card: #1e293b;
      --bg-card-hover: #24344d;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: #334155;
      --primary: #38bdf8;
      --secondary: #a78bfa;
      --accent: #f43f5e;
      --ddpm-color: #f97316;
      --ddim-color: #06b6d4;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    body {
      background-color: var(--bg-surface);
      color: var(--text-main);
      padding: 16px;
    }

    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header-card {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      border: 1px solid #4338ca;
      border-radius: 12px;
      padding: 20px 24px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }

    .header-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #e0e7ff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-top: 6px;
      line-height: 1.4;
    }

    .metrics-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .stat-card:hover {
      background: var(--bg-card-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    }

    .stat-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #38bdf8;
    }
    .stat-tag {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 12px;
      align-self: flex-start;
      font-weight: 600;
    }
    .tag-blue { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .tag-purple { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
    .tag-orange { background: rgba(249, 115, 22, 0.15); color: #f97316; }
    .tag-cyan { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }

    .control-bar {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .btn-group {
      display: flex;
      gap: 8px;
      background: #0b1329;
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .btn-toggle {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-toggle.active {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    }
    .btn-toggle:hover:not(.active) {
      color: var(--text-main);
      background: rgba(255,255,255,0.05);
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
    }
    @media (max-width: 600px) {
      .chart-grid { grid-template-columns: 1fr; }
    }

    .chart-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .chart-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    .chart-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .chart-wrapper {
      width: 100%;
      height: 320px;
    }

    .custom-tooltip {
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 10px 14px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.5);
      font-size: 0.85rem;
    }
    .tooltip-title {
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 6px;
      border-bottom: 1px solid #334155;
      padding-bottom: 4px;
    }
    .tooltip-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 3px 0;
    }

    .comparison-table-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    th {
      background: #0f172a;
      padding: 10px 12px;
      color: #94a3b8;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #1e293b;
      color: #e2e8f0;
    }
    tr:hover td {
      background: rgba(255,255,255,0.02);
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-ddpm { background: rgba(249, 115, 22, 0.2); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.4); }
    .badge-ddim { background: rgba(6, 182, 212, 0.2); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.4); }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useMemo } = React;
    const {
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
      RadarChart,
      Radar,
      PolarGrid,
      PolarAngleAxis,
      PolarRadiusAxis
    } = Recharts;

    // Empirical Benchmark Dataset from EXPERIMENT_REPORT.md (RTX 4050 6GB)
    const BENCHMARK_DATA = [
      // SD 1.5
      { model: "SD 1.5", sampler: "DDPM", steps: 10, time: 2.150, rate: 0.215, vram: 2675.1, qualityScore: 6.8, status: "SUCCESS" },
      { model: "SD 1.5", sampler: "DDPM", steps: 20, time: 3.924, rate: 0.196, vram: 2675.1, qualityScore: 8.4, status: "SUCCESS" },
      { model: "SD 1.5", sampler: "DDPM", steps: 30, time: 5.672, rate: 0.189, vram: 2675.1, qualityScore: 8.9, status: "SUCCESS" },
      { model: "SD 1.5", sampler: "DDIM", steps: 10, time: 2.033, rate: 0.203, vram: 2675.1, qualityScore: 7.9, status: "SUCCESS" },
      { model: "SD 1.5", sampler: "DDIM", steps: 20, time: 3.921, rate: 0.196, vram: 2675.1, qualityScore: 9.1, status: "SUCCESS" },
      { model: "SD 1.5", sampler: "DDIM", steps: 30, time: 5.848, rate: 0.195, vram: 2675.1, qualityScore: 9.2, status: "SUCCESS" },

      // SD 2.1
      { model: "SD 2.1", sampler: "DDPM", steps: 10, time: 2.541, rate: 0.254, vram: 3099.8, qualityScore: 6.5, status: "SUCCESS" },
      { model: "SD 2.1", sampler: "DDPM", steps: 20, time: 4.745, rate: 0.237, vram: 3099.8, qualityScore: 8.2, status: "SUCCESS" },
      { model: "SD 2.1", sampler: "DDPM", steps: 30, time: 6.978, rate: 0.233, vram: 3099.8, qualityScore: 8.7, status: "SUCCESS" },
      { model: "SD 2.1", sampler: "DDIM", steps: 10, time: 2.539, rate: 0.254, vram: 3099.8, qualityScore: 7.8, status: "SUCCESS" },
      { model: "SD 2.1", sampler: "DDIM", steps: 20, time: 4.721, rate: 0.236, vram: 3099.8, qualityScore: 8.9, status: "SUCCESS" },
      { model: "SD 2.1", sampler: "DDIM", steps: 30, time: 6.948, rate: 0.232, vram: 3099.8, qualityScore: 9.0, status: "SUCCESS" },

      // SDXL Base 1.0
      { model: "SDXL Base 1.0", sampler: "DDPM", steps: 10, time: 10.224, rate: 1.022, vram: 5121.5, qualityScore: 2.0, status: "FAIL (Banding)" },
      { model: "SDXL Base 1.0", sampler: "DDPM", steps: 20, time: 11.663, rate: 0.583, vram: 5121.5, qualityScore: 8.8, status: "SUCCESS" },
      { model: "SDXL Base 1.0", sampler: "DDPM", steps: 30, time: 15.196, rate: 0.507, vram: 5121.5, qualityScore: 9.5, status: "SUCCESS" },
      { model: "SDXL Base 1.0", sampler: "DDIM", steps: 10, time: 8.193, rate: 0.819, vram: 5121.5, qualityScore: 8.3, status: "SUCCESS" },
      { model: "SDXL Base 1.0", sampler: "DDIM", steps: 20, time: 10.859, rate: 0.543, vram: 5121.5, qualityScore: 9.4, status: "SUCCESS" },
      { model: "SDXL Base 1.0", sampler: "DDIM", steps: 30, time: 14.373, rate: 0.479, vram: 5121.5, qualityScore: 9.7, status: "SUCCESS" }
    ];

    // Multi-dimensional comparison radar data
    const RADAR_DATA = [
      { metric: "Low-Step Coherence (10-20)", DDPM: 55, DDIM: 95 },
      { metric: "Speed & ODE Skipping", DDPM: 65, DDIM: 92 },
      { metric: "Deterministic Replay", DDPM: 40, DDIM: 98 },
      { metric: "VRAM Stability", DDPM: 85, DDIM: 88 },
      { metric: "High-Step Quality (30+)", DDPM: 92, DDIM: 94 },
      { metric: "UI Interactivity Fit", DDPM: 60, DDIM: 96 }
    ];

    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="custom-tooltip">
            <div className="tooltip-title">{label ? `${label}` : "Metric Details"}</div>
            {payload.map((item, idx) => (
              <div key={idx} className="tooltip-row" style={{ color: item.color || "#38bdf8" }}>
                <span>{item.name}:</span>
                <strong>{typeof item.value === 'number' ? (item.value > 100 ? `${item.value} MB` : `${item.value} s`) : item.value}</strong>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };

    function App() {
      const [selectedModel, setSelectedModel] = useState("ALL");
      const [chartMetric, setChartMetric] = useState("time"); // 'time' or 'rate'

      // Filtered data for step curves
      const stepCurveData = useMemo(() => {
        const steps = [10, 20, 30];
        return steps.map(step => {
          const row = { step: `${step} Steps` };
          
          if (selectedModel === "ALL") {
            // Average across models
            const ddpmItems = BENCHMARK_DATA.filter(d => d.sampler === "DDPM" && d.steps === step);
            const ddimItems = BENCHMARK_DATA.filter(d => d.sampler === "DDIM" && d.steps === step);
            
            const ddpmAvg = ddpmItems.reduce((acc, c) => acc + (chartMetric === "time" ? c.time : c.rate), 0) / ddpmItems.length;
            const ddimAvg = ddimItems.reduce((acc, c) => acc + (chartMetric === "time" ? c.time : c.rate), 0) / ddimItems.length;
            
            row["DDPM"] = parseFloat(ddpmAvg.toFixed(3));
            row["DDIM"] = parseFloat(ddimAvg.toFixed(3));
          } else {
            const ddpmItem = BENCHMARK_DATA.find(d => d.model === selectedModel && d.sampler === "DDPM" && d.steps === step);
            const ddimItem = BENCHMARK_DATA.find(d => d.model === selectedModel && d.sampler === "DDIM" && d.steps === step);
            
            if (ddpmItem) row["DDPM"] = chartMetric === "time" ? ddpmItem.time : ddpmItem.rate;
            if (ddimItem) row["DDIM"] = chartMetric === "time" ? ddimItem.time : ddimItem.rate;
          }
          return row;
        });
      }, [selectedModel, chartMetric]);

      // Side-by-side grouped bar chart per model at 20 steps (Production baseline)
      const modelComparison20Steps = useMemo(() => {
        const models = ["SD 1.5", "SD 2.1", "SDXL Base 1.0"];
        return models.map(m => {
          const ddpm = BENCHMARK_DATA.find(d => d.model === m && d.sampler === "DDPM" && d.steps === 20);
          const ddim = BENCHMARK_DATA.find(d => d.model === m && d.sampler === "DDIM" && d.steps === 20);
          return {
            model: m,
            "DDPM (20 steps)": ddpm ? ddpm.time : 0,
            "DDIM (20 steps)": ddim ? ddim.time : 0,
            vram: ddpm ? ddpm.vram : 0
          };
        });
      }, []);

      // VRAM comparison data
      const vramData = [
        { model: "SD 1.5", vram: 2675.1, vramGB: 2.61, limit: 6144, offload: "Direct GPU" },
        { model: "SD 2.1", vram: 3099.8, vramGB: 3.03, limit: 6144, offload: "Direct GPU" },
        { model: "SDXL Base 1.0", vram: 5121.5, vramGB: 5.00, limit: 6144, offload: "CPU Offload" }
      ];

      return (
        <div className="dashboard-container">
          {/* Header */}
          <div className="header-card">
            <div className="header-title">
              <span>⚡ DDPM vs. DDIM Comparative Diffusion Analytics</span>
            </div>
            <div className="header-subtitle">
              Interactive Recharts visualization comparing Stochastic Markovian Sampling (DDPM) vs. Deterministic Non-Markovian ODE Inversion (DDIM) across Stable Diffusion 1.5, 2.1, and SDXL on RTX 4050 (6GB VRAM).
            </div>
          </div>

          {/* Key Stat Cards */}
          <div className="metrics-summary-grid">
            <div className="stat-card">
              <span className="stat-label">Optimal Interactive Pairing</span>
              <span className="stat-value">SD 1.5 + DDIM</span>
              <span className="stat-tag tag-cyan">3.92s @ 20 Steps (2.61 GB)</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Low-Step Convergence</span>
              <span className="stat-value">DDIM Dominant</span>
              <span className="stat-tag tag-blue">Coherent @ 10-20 steps</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">SDXL DDPM 10-Step Failure</span>
              <span className="stat-value">Artifacting Alert</span>
              <span className="stat-tag tag-orange">DDPM requires ≥20 steps</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Max Peak VRAM Headroom</span>
              <span className="stat-value">5,121.5 MB</span>
              <span className="stat-tag tag-purple">Safely within 6,144 MB</span>
            </div>
          </div>

          {/* Controls */}
          <div className="control-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Filter Model:</span>
              <div className="btn-group">
                {["ALL", "SD 1.5", "SD 2.1", "SDXL Base 1.0"].map(m => (
                  <button
                    key={m}
                    className={`btn-toggle ${selectedModel === m ? 'active' : ''}`}
                    onClick={() => setSelectedModel(m)}
                  >
                    {m === "ALL" ? "All Models (Avg)" : m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Metric:</span>
              <div className="btn-group">
                <button
                  className={`btn-toggle ${chartMetric === "time" ? 'active' : ''}`}
                  onClick={() => setChartMetric("time")}
                >
                  Total Time (seconds)
                </button>
                <button
                  className={`btn-toggle ${chartMetric === "rate" ? 'active' : ''}`}
                  onClick={() => setChartMetric("rate")}
                >
                  Step Rate (s/step)
                </button>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="chart-grid">
            {/* Step Trajectory Line Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Inference Latency vs. Step Schedule</div>
                  <div className="chart-desc">
                    {selectedModel === "ALL" ? "Average across SD 1.5, SD 2.1, and SDXL" : `Direct empirical curve for ${selectedModel}`}
                  </div>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stepCurveData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="step" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" unit={chartMetric === "time" ? "s" : "s"} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="DDPM"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={{ r: 6, fill: '#f97316' }}
                      activeDot={{ r: 8 }}
                      name="DDPM (Stochastic)"
                    />
                    <Line
                      type="monotone"
                      dataKey="DDIM"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ r: 6, fill: '#06b6d4' }}
                      activeDot={{ r: 8 }}
                      name="DDIM (Deterministic ODE)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Comparison Bar Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Sampler Latency Across Foundation Models (20 Steps)</div>
                  <div className="chart-desc">Production sweet spot comparison at 512×512 resolution</div>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelComparison20Steps} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="model" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" unit="s" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Bar dataKey="DDPM (20 steps)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="DDIM (20 steps)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="chart-grid">
            {/* Algorithm Trade-Off Radar */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">DDPM vs DDIM Algorithmic Capability Radar</div>
                  <div className="chart-desc">Multi-dimensional capability rating (0-100 scale)</div>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={RADAR_DATA}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                    <Radar name="DDPM" dataKey="DDPM" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                    <Radar name="DDIM" dataKey="DDIM" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* VRAM Utilization Bar */}
            <div className="chart-card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Peak VRAM Memory Allocation (6GB Envelope)</div>
                  <div className="chart-desc">Direct GPU loading vs. Model CPU Offloading headroom</div>
                </div>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vramData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="model" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" unit=" MB" domain={[0, 7000]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Bar dataKey="vram" name="Peak VRAM Allocated" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="limit" name="Hardware VRAM Capacity (6144 MB)" fill="#334155" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Empirical Data Summary Table */}
          <div className="comparison-table-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#f8fafc' }}>
              📋 Empirical Benchmark Matrix (RTX 4050 Laptop GPU, 512×512)
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Sampler</th>
                  <th>Steps</th>
                  <th>Execution Time (s)</th>
                  <th>Step Rate (s/step)</th>
                  <th>Peak VRAM</th>
                  <th>Status & Notes</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARK_DATA.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{row.model}</td>
                    <td>
                      <span className={`badge ${row.sampler === 'DDPM' ? 'badge-ddpm' : 'badge-ddim'}`}>
                        {row.sampler}
                      </span>
                    </td>
                    <td>{row.steps} steps</td>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>{row.time.toFixed(3)} s</td>
                    <td>{row.rate.toFixed(3)} s/step</td>
                    <td>{row.vram.toFixed(1)} MB</td>
                    <td>
                      <span style={{ color: row.status.includes('FAIL') ? '#f87171' : '#4ade80' }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);
  </script>
</body>
</html>
"""
    return html_code


def get_recharts_iframe() -> str:
    """
    Wraps the Recharts HTML into an iframe data URI or direct iframe element
    so that Gradio renders and executes client-side scripts seamlessly.
    """
    import html as html_lib
    html_raw = get_recharts_html()
    escaped = html_lib.escape(html_raw, quote=True)
    return f'<iframe srcdoc="{escaped}" style="width:100%; height:880px; border:none; border-radius:12px; background:#0f172a;" title="DDPM vs DDIM Recharts Analytics"></iframe>'
