// Theta Agent system types — daemon state + API contracts

export type GPUState = 'idle' | 'load' | 'drifting' | 'critical' | 'recovery' | 'unknown';
export type Recommendation = 'ok' | 'watch' | 'drain' | 'evacuate';
export type FaultClass =
  | 'cooling_degradation'
  | 'dust_accumulation'
  | 'thermal_interface_material'
  | 'fan_blockage'
  | 'mounting_issue'
  | 'unknown'
  | null;

export interface GPUStateSnapshot {
  index: number;
  model: string;  // H100-SXM5, A100, B200, MI300X, L40S
  state: GPUState;
  temperature_c: number;
  power_w: number;
  utilization_pct: number;
  rtheta_cw: number;  // current R_θ (°C/W)
  rtheta_baseline: number;  // rolling baseline
  rtheta_k_sigma: number;  // z-score: how many σ above baseline
  risk_score: number;  // 0–1 degradation predictor
  confidence: number;  // 0–1 classifier confidence
  recommendation: Recommendation;
  recovery_eta_sec: number;  // predicted seconds to recovery
  fault_class: FaultClass;
  ecc_sbit_total: number;  // cumulative single-bit errors
  ecc_dbit_any: boolean;  // double-bit error detected?
  micro_throttle_detected: boolean;
  last_state_change: StateTransition;
  decision_log_recent: StateTransition[];  // last 10
}

export interface StateTransition {
  ts: number;  // unix timestamp (ms)
  old_state?: GPUState;
  new_state: GPUState;
  confidence: number;
  reason: string;  // "R_θ rose 2.1σ above baseline" etc
  duration_sec?: number;  // how long was previous state active
}

export interface FleetStatus {
  timestamp: number;
  gpus: GPUStateSnapshot[];
  fleet_metrics: {
    rtheta_avg: number;
    rtheta_max: number;
    anomaly_count: number;
    critical_count: number;
  };
  correlations: FleetCorrelation[];
}

export interface FleetCorrelation {
  gpu_indices: number[];
  correlation: number;  // 0–1 how tightly coupled
  possible_cause: string;  // "inlet_temperature_rise" etc
}

export interface GPUHistory {
  baseline: {
    mean: number;
    std: number;
    seven_day_mean: number;
  };
  recent_samples: HistorySample[];
  incidents: Incident[];
}

export interface HistorySample {
  ts: number;
  rtheta: number;
  power_w: number;
  temp_c: number;
  state: GPUState;
}

export interface Incident {
  ts_start: number;
  ts_end: number;
  duration_sec: number;
  trigger: string;  // "rtheta_drift" etc
  states_visited: GPUState[];
  peak_risk: number;
  diagnosis: FaultClass;
  resolved_by: 'natural_recovery' | 'manual_drain' | 'power_capped' | 'unknown';
}

export interface GPUFingerprint {
  gpu_model: string;
  last_calibrated: string;  // ISO 8601
  calibration_status: 'valid' | 'expired' | 'uncalibrated';
  idle_rtheta: number;
  load_rtheta: number;
  threshold_warning: number;
  threshold_critical: number;
  workload_signatures: WorkloadSignature[];
  aging_signal: number;  // C/W per month
  recommended_actions: string[];
}

export interface WorkloadSignature {
  workload_type: string;  // "resnet50", "llm-inference", etc
  duration_sec: number;
  peak_rtheta: number;
  recovery_time: number;
}

export interface TelemetryBenchmarks {
  gpu_gen: string;  // "h100-class", "a100-class", etc
  fleet_size: number;
  rtheta_p25: number;
  rtheta_p50: number;
  rtheta_p75: number;
  rtheta_p95: number;
  clock_eff_avg: number;
  ecc_dbit_rate_per_day: number;
  installation_opt_in_pct: number;
  last_updated: string;  // ISO 8601
}

export interface AgentCapability {
  name: 'autonomy' | 'reasoning' | 'tool_use' | 'memory' | 'adaptability';
  coverage_pct: number;  // 0–100
  last_activity?: string;
  status: 'ready' | 'partial' | 'unavailable';
}
