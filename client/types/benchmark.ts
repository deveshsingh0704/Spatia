export interface SystemInfo {
  node: string;
  device_name: string;
  device_type?: string;
  cuda_available?: boolean;
  vram_total_gb: number;
  vram_used_gb: number;
  vram_reserved_gb?: number;
  vram_ready_percent: number;
  total_ram_gb?: number;
  used_ram_gb?: number;
  ram_usage_percent?: number;
  pytorch_version: string;
  prd_spec: string;
}

export interface BenchmarkKpis {
  optimal_operating_point: string;
  time_saved_percent: number;
  tradeoff: string;
  fid_score: number;
  fid_target: number;
  fid_delta_from_baseline: number;
  perceptual_quality_index: number;
  speedup: string;
  wall_clock_time_sec: number;
  baseline_time_sec: number;
  compute_cost: string;
  dataset: string;
  features_count: string;
  eval_eta: number;
}

export interface FidPoint {
  steps: number;
  ddim_fid: number;
  ddpm_fid: number;
  optimal?: boolean;
  label?: string;
}

export interface LatencyPoint {
  steps: number;
  latency: number;
  label: string;
  speedup: string;
  highlight?: boolean;
  baseline?: boolean;
}

export interface QualitativeCard {
  title: string;
  subtitle: string;
  tag: string;
  tag_type: "gold" | "warning" | "optimal" | "draft";
  image: string;
  fid: string;
  latency: string;
  description: string;
  latency_index: string;
}

export interface CheckpointItem {
  id: string;
  pipeline: string;
  pipeline_type: "DDIM" | "DDPM";
  steps: number;
  fid: number;
  latency: number;
  throughput: number;
  vram: number;
  rng_seed: number;
  status: "PASSED" | "REFERENCE" | "HIGH NOISE";
  badge?: string;
  qualitative_image: string;
  qualitative_title: string;
  qualitative_tag: string;
  qualitative_tag_type: "gold" | "warning" | "optimal" | "draft";
  qualitative_desc: string;
  latency_index: string;
}

export interface BenchmarkData {
  system: SystemInfo;
  kpis: BenchmarkKpis;
  fid_curve: FidPoint[];
  latency_profile: LatencyPoint[];
  qualitative_comparison: QualitativeCard[];
  checkpoints: CheckpointItem[];
}
