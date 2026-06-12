/**
 * GPUHeroVideo — the production hero: a pre-rendered loop of the GPU runway
 * scene (captured offline by scripts/og/capture-hero.mjs at settings far past
 * realtime budget: 8× MSAA, ultra AO, 4k shadows) played as a plain <video>.
 *
 * Visitors get render-farm image quality with zero WebGL cost — no shader
 * compile stall, no GPU heat, no frame drops on integrated graphics. The
 * THREE-backed live scene (GPUHeroScene) remains the fallback if the video
 * fails, and is reachable directly at /capture/hero.
 *
 * IMPORTANT: this module must stay three-free — it is the whole point.
 * The DOM HUD stays live (same ThermalSim, pure math) so the readout is
 * crisp text, not baked pixels.
 */
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ThermalSim,
  H100_SXM,
  phaseAt,
  fmtRth,
  heroTelem,
  heroFanDuty,
  type Phase,
} from './thermalModel';

const FM = "'JetBrains Mono', ui-monospace, monospace";
const BG = '#0A0A0B'; // matches the scene's CINE.voidDeep

const VIDEO_SRC = '/media/hero-loop.mp4';
const POSTER_SRC = '/media/hero-poster.jpg';

/* ── HUD — shared with GPUHeroScene (it imports these) ──────────────────── */

export function PhaseHUD({ phaseRef }: { phaseRef: React.MutableRefObject<Phase>; valuesRef?: React.MutableRefObject<{ level: number; progress: number }> }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 120);
    return () => clearInterval(id);
  }, []);

  const phase = phaseRef.current;
  const telem = heroTelem.current;
  const isCritical = phase === 'critical';
  // NVML-style sensor readouts from the shared sim: integer °C / integer W,
  // R_θ = (T_j − T_ref)/P so the three numbers are mutually consistent —
  // and R_θ stays flat through the load ramp (healthy), only drifting up
  // when the anomaly begins. That flat-then-drift signature IS the product.
  const Tj = telem ? `${telem.tjSensor}` : '37';
  const Pw = telem ? `${telem.pSensor}` : '84';
  const Rtheta = telem ? fmtRth(telem.rthSensor) : '0.072';
  const throttled = telem?.throttled ?? false;
  // Stable-window gate (the agent's window.py analogue): during power
  // transients R_θ holds its last steady-state value and renders dimmed —
  // a live ΔT/P mid-transient would read thermal memory, not the cooling path.
  const rthStale = telem?.rthStale ?? false;
  const labelMap: Record<Phase, string> = {
    idle: 'IDLE', load: 'UNDER LOAD', anomaly: 'ANOMALY DETECTED', critical: 'THERMAL CRITICAL', recovery: 'RECOVERING',
  };

  // Luxury palette — platinum text, champagne accents, amber-gold for
  // critical (instead of harsh red) to keep the warm color harmony.
  const PLATINUM = '#E2E8F0';
  const CHAMPAGNE = '#D4AF37';
  const AMBER_WARN = '#F2B441';
  const accentColor = isCritical ? AMBER_WARN : CHAMPAGNE;

  // R_θ drift vs healthy baseline — the alert signal itself. Tick at +10% =
  // alert threshold; fill turns amber once crossed.
  const drift = telem && !rthStale ? (telem.rthSensor - H100_SXM.rthBase) / H100_SXM.rthBase : 0;
  const driftPct = Math.max(0, drift * 100);
  const past = driftPct >= 10;

  return (
    <div style={{
      position: 'absolute', bottom: 24, right: 24, width: 232, padding: '12px 14px',
      background: 'rgba(10,10,11,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: `0.5px solid rgba(212,175,55,0.22)`, borderRadius: 4,
      fontFamily: FM, color: PLATINUM, fontSize: 9, lineHeight: 1.8, fontWeight: 300,
      boxShadow: '0 10px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,232,188,0.04)', pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'rgba(226,232,240,0.5)', fontSize: 8, letterSpacing: '0.18em', fontWeight: 400 }}>THETA · DAQ · H100-04</span>
        <span style={{ color: accentColor, fontWeight: 500, fontSize: 9, letterSpacing: '0.08em' }}>{labelMap[phase]}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(226,232,240,0.45)' }}>T_junction</span><span style={{ color: PLATINUM, fontVariantNumeric: 'tabular-nums' }}>{Tj} °C</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(226,232,240,0.45)' }}>Power</span><span style={{ color: PLATINUM, fontVariantNumeric: 'tabular-nums' }}>{Pw} W{throttled ? ' ▾' : ''}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'rgba(226,232,240,0.45)' }}>R_θ_eff{rthStale ? ' · settling' : ''}</span><span style={{ color: rthStale ? 'rgba(226,232,240,0.4)' : PLATINUM, fontVariantNumeric: 'tabular-nums' }}>{Rtheta} °C/W</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}><span style={{ color: 'rgba(226,232,240,0.45)' }}>Watching</span><span style={{ color: CHAMPAGNE }}>5 / 5 nodes</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'rgba(226,232,240,0.45)' }}>R_θ drift</span>
        <span style={{ color: past ? AMBER_WARN : rthStale ? 'rgba(226,232,240,0.4)' : PLATINUM, fontVariantNumeric: 'tabular-nums' }}>
          {rthStale ? '· · ·' : `+${driftPct.toFixed(1)}%`}
        </span>
      </div>
      <div style={{ position: 'relative', height: 3, background: 'rgba(226,232,240,0.08)', borderRadius: 1, overflow: 'visible', marginTop: 3 }}>
        <div style={{ height: '100%', width: `${Math.min(100, (driftPct / 20) * 100)}%`, background: past ? AMBER_WARN : CHAMPAGNE, borderRadius: 1, transition: 'width 0.25s ease, background 0.25s ease', opacity: rthStale ? 0.3 : 1 }} />
        {/* alert threshold tick: +10% of a 0–20% scale */}
        <div style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 7, background: 'rgba(226,232,240,0.35)' }} />
      </div>
    </div>
  );
}

export function LineupLabel() {
  return (
    <div style={{ position: 'absolute', bottom: 24, left: 24, fontFamily: FM, fontSize: 8.5, letterSpacing: '0.22em', color: 'rgba(226,232,240,0.45)', fontWeight: 300, pointerEvents: 'none' }}>
      THE FLEET THETA WATCHES · A100 · L40S · H100 · B200 · MI300X
    </div>
  );
}

/* ── Video hero ──────────────────────────────────────────────────────────── */

// Heavy live scene, loaded ONLY if the video can't play.
const GPUHeroScene = React.lazy(() => import('./GPUHeroScene'));

export default function GPUHeroVideo() {
  const phaseRef = useRef<Phase>('idle');
  const [failed, setFailed] = useState(false);
  const [reduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Same sim driver the 3D scene runs — pure math on rAF, keeps the HUD
  // readout live and self-consistent while the video carries the pixels.
  useEffect(() => {
    if (failed) return; // the live scene runs its own driver
    let raf = 0;
    const start = performance.now();
    let last = start;
    const sim = new ThermalSim(H100_SXM);
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { phase, progress } = phaseAt(elapsed);
      const telem = sim.step(phase, progress, dt, elapsed);
      phaseRef.current = phase;
      heroFanDuty.current = telem.fan;
      heroTelem.current = telem;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [failed]);

  if (failed) {
    return (
      <React.Suspense fallback={<div style={{ height: '90vh', background: BG }} aria-hidden />}>
        <GPUHeroScene />
      </React.Suspense>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '90vh', background: BG, overflow: 'hidden' }}>
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
      <PhaseHUD phaseRef={phaseRef} />
      <LineupLabel />
    </div>
  );
}
