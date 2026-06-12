/**
 * DataCenterVideo — the production datacenter section: a pre-rendered loop
 * of the rack-aisle scene (captured offline by scripts/og/capture-scene.mjs
 * with AO + supersampling restored) played as a plain <video>.
 *
 * Owns the story machine (stages, module refs, DOM driver) and the DOM
 * overlays (DataCenterHUD, DataCenterCaption) so they stay LIVE over the
 * video — crisp text, real sim numbers — while the pixels come from the
 * capture. DataCenterScene imports all of this from here; this module must
 * stay three-free (it ships in the initial page graph).
 *
 * The 36 s loop is seam-safe: the pullback stage gives the thermal sim ~8 s
 * of idle decay (≫ tauCool), so sim state at the loop point matches t=0.
 */
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ThermalSim,
  H100_SXM,
  PHASE_SEQUENCE,
  thermalCss,
  fmtRth,
  fmtLead,
  type Phase,
  type Telemetry,
} from './thermalModel';

const T = {
  bg: '#06060A',
  s1: '#111117',
  border: '#232330',
  text: '#ECE6D8',
  muted: '#9A9285',
  critical: '#B83030',
  bp: '#C9A84C',
};
const FM = "'JetBrains Mono', ui-monospace, monospace";

const VIDEO_SRC = '/media/datacenter-loop.mp4';
const POSTER_SRC = '/media/datacenter-poster.jpg';

/* ── Story machine (moved from DataCenterScene — single source of truth) ── */

export type Stage = 'establishing' | 'flythrough' | 'focus' | 'incident' | 'pullback';

export const DC_LOOP_SECONDS = 36;

export const STAGE_SEQUENCE: { stage: Stage; at: number }[] = [
  { stage: 'establishing', at: 0 },
  { stage: 'flythrough',   at: 6 },
  { stage: 'focus',        at: 14 },
  { stage: 'incident',     at: 18 },
  { stage: 'pullback',     at: 28 },
];

export function stageAt(t: number): Stage {
  let s: Stage = STAGE_SEQUENCE[0].stage;
  for (const row of STAGE_SEQUENCE) {
    if (t >= row.at) s = row.stage;
  }
  return s;
}

export function spring(cur: number, target: number, delta: number, k: number): number {
  return cur + (target - cur) * (1 - Math.exp(-k * delta));
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

// Module-level mutable refs — written once per frame by whichever driver is
// active (NarrativeDirector inside the GL Canvas, or the DOM driver below),
// read by the HUD/Caption overlays.
export const _stage: { current: Stage } = { current: 'establishing' };
export const _storyT = { current: 0 };
export const _hudOpacity = { current: 0 };
export const _alertPulse = { current: 0 };
export const _dcTelemetry: { current: Telemetry | null } = { current: null };

/* ── Shared story step — the exact NarrativeDirector logic, DOM-portable ── */

export interface StoryDriverState {
  sim: ThermalSim;
  phaseIdx: number;
  phaseStart: number;
}

export function makeStoryState(): StoryDriverState {
  return { sim: new ThermalSim(H100_SXM), phaseIdx: 0, phaseStart: 0 };
}

/** Advance the story by one frame. Returns thermal level (glow) for callers
 *  that drive scene effects (bloom); DOM users can ignore it. */
export function stepStory(
  s: StoryDriverState,
  elapsedAbs: number,
  delta: number,
  phaseRef: { current: Phase },
  valuesRef: { current: { level: number; progress: number } },
): number {
  const t = elapsedAbs % DC_LOOP_SECONDS;
  _storyT.current = t;
  const stage = stageAt(t);
  _stage.current = stage;

  const hudTarget = stage === 'focus' || stage === 'incident' ? 1 : 0;
  _hudOpacity.current = clamp(
    _hudOpacity.current + (hudTarget - _hudOpacity.current) * Math.min(1, delta * 2.2), 0, 1);

  let level: number;
  if (stage === 'incident' || stage === 'focus') {
    const cur = PHASE_SEQUENCE[s.phaseIdx];
    const elapsed = t - s.phaseStart;
    const progress = clamp(elapsed / cur.dur, 0, 1);
    phaseRef.current = cur.phase;
    const telem = s.sim.step(cur.phase, progress, delta, elapsedAbs);
    _dcTelemetry.current = telem;
    level = telem.glow;
    valuesRef.current = { level, progress };
    _alertPulse.current = cur.phase === 'anomaly' || cur.phase === 'critical' ? 1 : 0.3;
    if (elapsed >= cur.dur && stage === 'incident') {
      s.phaseIdx = (s.phaseIdx + 1) % PHASE_SEQUENCE.length;
      s.phaseStart = t;
    }
  } else {
    s.phaseIdx = 0;
    s.phaseStart = STAGE_SEQUENCE.find((x) => x.stage === 'incident')!.at;
    phaseRef.current = 'idle';
    const telem = s.sim.step('idle', 1, delta, elapsedAbs);
    _dcTelemetry.current = telem;
    level = telem.glow;
    valuesRef.current = { level, progress: 0 };
    _alertPulse.current = spring(_alertPulse.current, 0, delta, 2);
  }
  return level;
}

/* ── DOM overlays (moved from DataCenterScene) ──────────────────────────── */

export function DataCenterHUD({
  phaseRef,
  valuesRef,
  scale = 1,
}: {
  phaseRef: React.MutableRefObject<Phase>;
  valuesRef: React.MutableRefObject<{ level: number; progress: number }>;
  scale?: number;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 120);
    return () => clearInterval(id);
  }, []);

  const phase = phaseRef.current;
  const { level, progress } = valuesRef.current;
  const telem = _dcTelemetry.current;
  const isCritical = phase === 'critical';
  const tColor = thermalCss(level);

  // Physically-derived readouts: integer-°C NVML-style sensor values, and
  // R_θ computed as (T_j − T_ref)/P so the numbers on screen always satisfy
  // the formula the page teaches. Falls back to idle figures pre-first-frame.
  const Tj     = telem ? `${telem.tjSensor}` : '37';
  const Rtheta = telem ? fmtRth(telem.rthSensor) : '0.072';
  const Pw     = telem ? `${telem.pSensor}` : '84';
  const lead   = telem ? fmtLead(telem.leadMin) : '—';

  const labelMap: Record<Phase, string> = {
    idle: 'NOMINAL', load: 'UNDER LOAD', anomaly: 'R_θ DRIFT DETECTED',
    critical: 'INCIDENT — ACTING', recovery: 'RESOLVING',
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 24 * scale,
      right: 24 * scale,
      width: 248 * scale,
      padding: `${10 * scale}px ${12 * scale}px`,
      background: 'rgba(6,6,10,0.88)',
      backdropFilter: 'blur(8px)',
      border: `1px solid ${isCritical ? T.critical : T.border}`,
      borderRadius: 6,
      fontFamily: FM,
      color: T.text,
      fontSize: 9 * scale,
      lineHeight: 1.7,
      boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
      opacity: _hudOpacity.current,
      transition: 'opacity 0.6s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: T.muted, fontSize: 8 * scale, letterSpacing: '0.14em' }}>THETA · NODE B07-04</span>
        <span style={{ color: isCritical ? T.critical : tColor, fontWeight: 700, fontSize: 9 * scale, letterSpacing: '0.06em' }}>
          ● {labelMap[phase]}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: T.muted }}>T_junction</span>
        <span style={{ color: tColor }}>{Tj} °C</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: T.muted }}>Power</span>
        <span style={{ color: T.text }}>{Pw} W{telem?.throttled ? ' · DVFS' : ''}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: T.muted }}>R_θ_eff{telem?.rthStale ? ' · settling' : ''}</span>
        <span style={{ color: telem?.rthStale ? T.muted : T.text }}>{Rtheta} °C/W</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ color: T.muted }}>Est. lead time</span>
        <span style={{ color: T.bp }}>{lead}</span>
      </div>
      <div style={{ height: 2, background: T.s1, borderRadius: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: tColor, transition: 'width 0.12s linear' }} />
      </div>
    </div>
  );
}

export function DataCenterCaption() {
  const [stage, setStage] = useState<Stage>('establishing');
  useEffect(() => {
    const id = setInterval(() => setStage(_stage.current), 200);
    return () => clearInterval(id);
  }, []);
  const copy: Record<Stage, string> = {
    establishing: 'A fleet of GPUs, running flat out.',
    flythrough:   'Theta watches every node — not just util and power.',
    focus:        'One node’s thermal path is starting to drift.',
    incident:     'R_θ catches it before throttling does — with lead time to act.',
    pullback:     'Theta is watching every node like this, all the time.',
  };
  return (
    <div style={{
      position: 'absolute', bottom: 24, left: 24,
      fontFamily: FM, fontSize: 11, letterSpacing: '0.02em',
      color: T.text, opacity: 0.8, maxWidth: 360,
      pointerEvents: 'none', textShadow: '0 2px 12px rgba(0,0,0,0.7)',
      transition: 'opacity 0.6s ease',
    }}>
      {copy[stage]}
    </div>
  );
}

/* ── Video section ───────────────────────────────────────────────────────── */

// Heavy GL scene, loaded ONLY if the video can't play.
const DataCenterScene = React.lazy(() => import('./DataCenterScene'));

export default function DataCenterVideo({ hudScale = 1 }: { hudScale?: number }) {
  const phaseRef = useRef<Phase>('idle');
  const valuesRef = useRef({ level: 0.1, progress: 0 });
  const [failed, setFailed] = useState(false);
  const [reduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // DOM driver — the same story step the GL NarrativeDirector runs, so the
  // HUD/caption stay in lockstep with the video's authored 36 s loop.
  useEffect(() => {
    if (failed) return; // the GL scene runs its own driver
    _stage.current = 'establishing';
    _storyT.current = 0;
    _hudOpacity.current = 0;
    _alertPulse.current = 0;
    const s = makeStoryState();
    let raf = 0;
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      const elapsedAbs = (now - start) / 1000;
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      stepStory(s, elapsedAbs, delta, phaseRef, valuesRef);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [failed]);

  if (failed) {
    return (
      <React.Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />}>
        <DataCenterScene hudScale={hudScale} />
      </React.Suspense>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: T.bg }}>
      {reduced ? (
        <img src={POSTER_SRC} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <video
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay muted loop playsInline
          aria-hidden
          onError={() => setFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <DataCenterHUD phaseRef={phaseRef} valuesRef={valuesRef} scale={hudScale} />
      <DataCenterCaption />
    </div>
  );
}
