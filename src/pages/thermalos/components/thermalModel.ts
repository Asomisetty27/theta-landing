/**
 * thermalModel.ts — shared physically-grounded GPU thermal simulation.
 *
 * Single source of truth for the thermal arc that GPUHeroScene,
 * DataCenterScene, TowerUnit and OperatorPanel all render. Previously each
 * scene carried its own copy of PHASE_SEQUENCE + ad-hoc readout formulas
 * (`0.071 + level * 0.024` style), which had two physics errors an infra
 * engineer would catch instantly:
 *
 *   1. R_θ rose with the LOAD phase. Theta's entire thesis is the opposite:
 *      in a healthy GPU R_θ = (T_j − T_ref)/P stays flat as power rises —
 *      it only climbs when the cooling path degrades. The demo was
 *      contradicting the product's headline claim.
 *   2. The displayed T_j, R_θ and P were three independent linear maps of
 *      one "level" scalar — they never satisfied R_θ = ΔT/P, the formula
 *      printed two sections above on the same page.
 *
 * This module fixes both by simulating two INDEPENDENT channels and deriving
 * everything else:
 *
 *   workload channel     P(t)   — phase-scripted power draw with utilization
 *                                 ripple and discrete DVFS throttle steps
 *   degradation channel  R_θ(t) — the cooling path itself; flat in idle/load,
 *                                 drifting up through anomaly/critical,
 *                                 exponentially recovering after
 *
 *   junction temp        dT_j/dt = (T_ref + R_θ·P − T_j) / τ   (first-order RC)
 *   sensor model         NVML-style: 4 Hz sample-and-hold, integer °C,
 *                                 integer W, deterministic jitter
 *   displayed R_θ        (T_j_sensor − T_ref) / P_sensor — self-consistent
 *                                 with the other two numbers BY CONSTRUCTION
 *
 * The demo loop is time-compressed (~14 s standing in for ~minutes), so the
 * RC time constants are scaled to preserve the *shape* of real thermal
 * transients (fast attack, slow tail) at demo pace.
 *
 * Hardware anchor points (H100 SXM5, liquid cold plate):
 *   idle    ~84 W,  R_θ 0.072 → T_j ≈ 37 °C
 *   load    ~672 W, R_θ 0.072 → T_j ≈ 79 °C   (healthy: R_θ unchanged)
 *   anomaly ~672 W, R_θ →0.085 → T_j ≈ 88 °C  (power flat, temp rising = drift)
 *   critical R_θ →0.097, DVFS steps 672→470 W → T_j spikes ~96 then eases
 *   recovery job drained, R_θ decays to ~0.073 (slight hysteresis — TIM
 *            never quite returns to day-one)
 */

// Deliberately three-free: this module also feeds the DOM-only video hero
// (GPUHeroVideo) and OperatorPanel, which must not pull the three.js chunk.
// The GL scenes wrap thermalRgb() in a local THREE.Color adapter.

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export type Phase = 'idle' | 'load' | 'anomaly' | 'critical' | 'recovery';

// Timing unchanged from the original scenes — all visual pacing is preserved.
export const PHASE_SEQUENCE: { phase: Phase; dur: number }[] = [
  { phase: 'idle',     dur: 3.0 },
  { phase: 'load',     dur: 3.2 },
  { phase: 'anomaly',  dur: 2.6 },
  { phase: 'critical', dur: 2.4 },
  { phase: 'recovery', dur: 2.8 },
];

export const PHASE_STARTS: number[] = (() => {
  let acc = 0;
  return PHASE_SEQUENCE.map((p) => { const s = acc; acc += p.dur; return s; });
})();

export const LOOP_SECONDS =
  PHASE_STARTS[PHASE_STARTS.length - 1] + PHASE_SEQUENCE[PHASE_SEQUENCE.length - 1].dur;

export function phaseAt(t: number): { idx: number; phase: Phase; progress: number } {
  const tt = ((t % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  let idx = PHASE_SEQUENCE.length - 1;
  for (let i = 0; i < PHASE_SEQUENCE.length; i++) {
    if (tt < PHASE_STARTS[i] + PHASE_SEQUENCE[i].dur) { idx = i; break; }
  }
  const cur = PHASE_SEQUENCE[idx];
  const progress = clamp((tt - PHASE_STARTS[idx]) / cur.dur, 0, 1);
  return { idx, phase: cur.phase, progress };
}

// ── Thermal color ramp (single copy — previously duplicated per scene) ─────
// Stored as LINEAR rgb and interpolated in linear space, exactly matching
// what THREE.Color did before (hex → linear on construction, linear lerp).
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}
const RAMP: [number, number, number][] = ['#1c6b3a', '#c8942a', '#c85f2a', '#e0392f'].map(hexToLinear) as [number, number, number][];
const _rgb: [number, number, number] = [0, 0, 0];

/** Linear-space rgb floats for the thermal ramp — feed THREE.Color.setRGB(). */
export function thermalRgb(t: number): [number, number, number] {
  const x = clamp(t, 0, 1);
  let a: [number, number, number], b: [number, number, number], f: number;
  if (x < 0.4)      { a = RAMP[0]; b = RAMP[1]; f = x / 0.4; }
  else if (x < 0.7) { a = RAMP[1]; b = RAMP[2]; f = (x - 0.4) / 0.3; }
  else              { a = RAMP[2]; b = RAMP[3]; f = (x - 0.7) / 0.3; }
  _rgb[0] = lerp(a[0], b[0], f); _rgb[1] = lerp(a[1], b[1], f); _rgb[2] = lerp(a[2], b[2], f);
  return _rgb;
}

/** CSS color string for DOM readouts — sRGB, same as Color.getStyle() was. */
export function thermalCss(t: number): string {
  const [r, g, b] = thermalRgb(t);
  return `rgb(${Math.round(linearToSrgb(r) * 255)},${Math.round(linearToSrgb(g) * 255)},${Math.round(linearToSrgb(b) * 255)})`;
}

// ── Hero telemetry bus — written by whichever hero is mounted (3D scene or
// video), read by PhaseHUD and the scene's fan/glow consumers.
export const heroFanDuty = { current: 0.12 };
export const heroTelem: { current: Telemetry | null } = { current: null };

// ── Hardware profile ────────────────────────────────────────────────────────

export interface HwProfile {
  tRef: number;         // coolant inlet / virtual ambient, °C
  pIdle: number;        // W
  pLoad: number;        // W, sustained training draw
  pThrottleFloor: number; // W, where DVFS staircase bottoms out
  rthBase: number;      // C/W, healthy cooling path
  rthAnomaly: number;   // C/W, end of anomaly drift
  rthCritical: number;  // C/W, peak degradation
  rthRecovered: number; // C/W, post-recovery (slight hysteresis above base)
  tauHeat: number;      // s, heating time constant (demo-compressed)
  tauCool: number;      // s, cooling time constant (slower — thermal mass)
  tauPower: number;     // s, power slew (DVFS/voltage regulators are fast)
  throttleSteps: number; // discrete DVFS steps in the critical staircase
}

// H100 SXM5 on a liquid cold plate. R_θ magnitudes match the cross-vendor
// calibration sims (~0.07 C/W class for direct-liquid H100) rather than the
// old demo's 0.22–0.63 — which was off by ~6× for this hardware class.
export const H100_SXM: HwProfile = {
  tRef: 31,
  pIdle: 84,
  pLoad: 672,
  pThrottleFloor: 470,
  rthBase: 0.072,
  rthAnomaly: 0.085,
  rthCritical: 0.097,
  rthRecovered: 0.0735,
  // Demo-compressed RC constants. Sized so the junction actually REACHES
  // equilibrium within each ~3 s phase — otherwise the steady-window gate
  // below never opens and R_θ reads "settling" forever. (Real silicon:
  // tens of seconds; the 14 s loop stands in for minutes.)
  tauHeat: 0.75,
  tauCool: 1.6,
  tauPower: 0.22,
  throttleSteps: 3,
};

// ── Telemetry (what a HUD shows) ───────────────────────────────────────────

export interface Telemetry {
  tj: number;          // true junction temp, °C (continuous — drives visuals)
  tjSensor: number;    // NVML-style integer °C sample-and-hold
  p: number;           // true power, W
  pSensor: number;     // integer W sample-and-hold
  rthTrue: number;     // the degradation channel itself
  rthSensor: number;   // (tjSensor − tRef)/pSensor from the last STEADY window
  rthStale: boolean;   // true while power/temp are transient (R_θ held, not live)
  glow: number;        // 0..1 normalized for emissive/visual consumers
  fan: number;         // 0..1 fan/pump duty — LAGS temperature (controller filter)
  throttled: boolean;  // DVFS staircase engaged
  leadMin: number | null; // estimated minutes to forced throttle; null = no drift
}

// Deterministic per-sample jitter — hash-noise, not Math.random, so two
// renderers sampling the same sim tick show the same value and the loop is
// reproducible frame-to-frame.
function jitter(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1; // −1..1
}

// Piecewise-linear glow map anchored to the visual language the scenes were
// built around: idle≈0.12 (faint warm), load≈0.5 (healthy green-gold),
// anomaly≈0.75 (orange), peak≈1.0 (red).
const GLOW_PTS: [number, number][] = [[34, 0.06], [37, 0.12], [62, 0.32], [80, 0.52], [89, 0.78], [96, 1.0]];
export function glowFromTj(tj: number): number {
  if (tj <= GLOW_PTS[0][0]) return GLOW_PTS[0][1];
  for (let i = 0; i < GLOW_PTS.length - 1; i++) {
    const [x0, y0] = GLOW_PTS[i];
    const [x1, y1] = GLOW_PTS[i + 1];
    if (tj <= x1) return y0 + ((tj - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 1.0;
}

const SENSOR_PERIOD = 0.25; // 4 Hz — realistic agent polling cadence

export class ThermalSim {
  private hw: HwProfile;
  private tj: number;
  private p: number;
  private rth: number;
  private fan = 0.12;
  private sampleIdx = -1;
  private tjSensor: number;
  private pSensor: number;
  // Steady-state window gate — mirrors the agent's window.py stability
  // filter. R_θ = ΔT/P is only meaningful in thermal equilibrium; during a
  // power transient the junction still carries the PREVIOUS workload's heat
  // (thermal memory — Stage 1 finding F1), so the naive instantaneous
  // division reads absurdly high while cooling / low while heating. The real
  // daemon refuses to update R_θ outside a stable window; the demo does the
  // same: hold the last steady reading and flag it stale.
  private pWindow: number[] = [];
  private rthShown: number;
  private rthStale = false;

  constructor(hw: HwProfile = H100_SXM) {
    this.hw = hw;
    this.rth = hw.rthBase;
    this.p = hw.pIdle;
    this.tj = hw.tRef + hw.rthBase * hw.pIdle;
    this.tjSensor = Math.round(this.tj);
    this.pSensor = Math.round(this.p);
    this.rthShown = (this.tjSensor - hw.tRef) / this.pSensor;
  }

  /**
   * Advance the sim. `time` is scene-clock seconds (drives ripple + sensor
   * cadence), `phase`/`progress` come from the caller's own phase clock so
   * scroll-driven scenes (DataCenterScene) and free-running ones share code.
   */
  step(phase: Phase, progress: number, dt: number, time: number): Telemetry {
    const hw = this.hw;
    const d = Math.min(dt, 0.1); // clamp tab-switch jumps

    // ── Degradation channel: R_θ — flat when healthy, drifts when not ──────
    let rthTarget: number;
    switch (phase) {
      case 'anomaly':
        // slow drift, accelerating — ease-in over the phase
        rthTarget = lerp(hw.rthBase, hw.rthAnomaly, progress * progress);
        break;
      case 'critical':
        rthTarget = lerp(hw.rthAnomaly, hw.rthCritical, 1 - Math.pow(1 - progress, 2));
        break;
      case 'recovery':
        // exponential relaxation toward recovered baseline (slight hysteresis)
        rthTarget = lerp(hw.rthCritical, hw.rthRecovered, 1 - Math.exp(-3.4 * progress));
        break;
      default:
        rthTarget = hw.rthBase; // idle AND load: the healthy promise — flat
    }
    // R_θ itself changes slowly (it's physical hardware state, not a signal)
    this.rth += (rthTarget - this.rth) * (1 - Math.exp(-d / 0.45));

    // ── Workload channel: P — scripted draw + ripple + DVFS staircase ──────
    let pTarget: number;
    let throttled = false;
    switch (phase) {
      case 'idle':
        // housekeeping wander — ±2 W slow drift, never perfectly flat
        pTarget = hw.pIdle + Math.sin(time * 0.7) * 2.0;
        break;
      case 'load':
      case 'anomaly': {
        // utilization ripple: kernels don't draw perfectly steady power.
        // Multi-sine ≈ ±2.5%, plus a slow swell.
        const ripple =
          Math.sin(time * 5.1) * 0.012 +
          Math.sin(time * 1.7 + 1.3) * 0.009 +
          Math.sin(time * 11.7 + 0.4) * 0.004;
        const rampIn = phase === 'load' ? Math.min(1, progress * 3.2) : 1; // job launch ramp
        pTarget = hw.pIdle + (hw.pLoad * (1 + ripple) - hw.pIdle) * rampIn;
        break;
      }
      case 'critical': {
        // First half: full power into a degraded path — T_j spikes.
        // Past 50%: the driver's DVFS staircase bites, power drops in
        // DISCRETE steps (real throttling is quantized, not a smooth fade).
        if (progress < 0.5) {
          pTarget = hw.pLoad * (1 + Math.sin(time * 5.1) * 0.01);
        } else {
          throttled = true;
          const stair = Math.min(hw.throttleSteps, 1 + Math.floor(((progress - 0.5) / 0.5) * hw.throttleSteps));
          pTarget = hw.pLoad - ((hw.pLoad - hw.pThrottleFloor) * stair) / hw.throttleSteps;
        }
        break;
      }
      case 'recovery':
      default:
        // job drained — power falls away fast, then idles
        pTarget = hw.pIdle + (hw.pThrottleFloor - hw.pIdle) * Math.exp(-4.2 * progress) + Math.sin(time * 0.7) * 1.5;
        break;
    }
    this.p += (pTarget - this.p) * (1 - Math.exp(-d / hw.tauPower));

    // ── Junction temperature: first-order RC toward equilibrium ────────────
    // Newton heating/cooling: T_eq = T_ref + R_θ·P. Asymmetric τ — silicon
    // heats faster than the loop sheds heat (thermal mass downstream).
    const tEq = hw.tRef + this.rth * this.p;
    const tau = tEq > this.tj ? hw.tauHeat : hw.tauCool;
    this.tj += (tEq - this.tj) * (1 - Math.exp(-d / tau));

    // ── Fan/pump controller: tracks temperature WITH LAG (never instant) ───
    const fanTarget = clamp((this.tj - 40) / 50, 0.12, 1);
    this.fan += (fanTarget - this.fan) * (1 - Math.exp(-d / 1.6));

    // ── Sensor model: 4 Hz sample-and-hold, integer quantization, jitter ───
    const idx = Math.floor(time / SENSOR_PERIOD);
    if (idx !== this.sampleIdx) {
      this.sampleIdx = idx;
      this.tjSensor = Math.round(this.tj + jitter(idx) * 0.4);          // NVML reports integer °C
      this.pSensor = Math.max(1, Math.round(this.p + jitter(idx + 9000) * 2.2)); // ±2 W supply noise

      // Steady-window gate (window.py analogue): power must hold within
      // ±4% over the last ~1 s AND the junction must be near equilibrium
      // (T_j within 2 °C of T_ref + R_θ·P) before R_θ updates. Otherwise
      // the previous steady value is held and flagged stale — this is what
      // kills the bogus 0.3 C/W readings mid-recovery while the die is
      // still shedding the previous workload's heat.
      this.pWindow.push(this.pSensor);
      if (this.pWindow.length > 4) this.pWindow.shift();
      const pMin = Math.min(...this.pWindow);
      const pMax = Math.max(...this.pWindow);
      const pMean = this.pWindow.reduce((a, b) => a + b, 0) / this.pWindow.length;
      const powerStable = this.pWindow.length >= 4 && (pMax - pMin) / pMean < 0.05;
      // Equilibrium band scaled to R_θ resolution: a temperature residual of
      // x °C shifts measured R_θ by x/P — negligible at 670 W, catastrophic
      // at 84 W (Stage 1 finding F2: ±°C ⇒ ±35% R_θ at idle). So the band
      // is 4% of ΔT_eq with a 0.5 °C sensor floor: ~2.2 °C under load
      // (stays open through the anomaly's slow drift — R_θ rises LIVE at
      // constant power, the product shot), but ~0.5 °C at idle (refuses the
      // low-power regime unless truly settled — like the agent does).
      const dtEq = this.rth * this.p;
      const band = Math.max(0.5, 0.04 * dtEq);
      const nearEquilibrium = Math.abs(this.tj - (hw.tRef + dtEq)) < band;
      if (powerStable && nearEquilibrium) {
        this.rthShown = (this.tjSensor - hw.tRef) / this.pSensor;
        this.rthStale = false;
      } else {
        this.rthStale = true;
      }
    }
    const rthSensor = this.rthShown;

    // ── Lead-time estimate: only exists once drift exists ──────────────────
    let leadMin: number | null = null;
    if (phase === 'anomaly') {
      // estimator refines downward as the drift accelerates
      leadMin = Math.max(4, Math.round(16 - progress * 11 + jitter(idx + 333) * 0.6));
    } else if (phase === 'critical') {
      leadMin = 0;
    }

    return {
      tj: this.tj,
      tjSensor: this.tjSensor,
      p: this.p,
      pSensor: this.pSensor,
      rthTrue: this.rth,
      rthSensor,
      rthStale: this.rthStale,
      glow: glowFromTj(this.tj),
      fan: this.fan,
      throttled,
      leadMin,
    };
  }
}

export function fmtRth(v: number): string { return v.toFixed(3); }
export function fmtLead(leadMin: number | null): string {
  if (leadMin === null) return '—';
  if (leadMin === 0) return 'now';
  return `~${leadMin} min`;
}
