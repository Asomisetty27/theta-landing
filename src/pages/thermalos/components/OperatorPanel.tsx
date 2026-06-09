import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  _towerLevel,
  _towerPhase,
  _towerProgress,
  _alertLog,
  thermalHex,
  rthetaAt,
  tjAt,
  HERO_NODE_ID,
  type Phase,
  type AlertLogEntry,
} from './TowerUnit';

// Same T/FM tokens as Landing/DataCenterScene/GPUHeroScene — duplicated by
// convention (each scene file is a self-contained unit; see GPUHeroScene).
const T = {
  bg: '#06060A',
  s0: '#0C0C11',
  s1: '#111117',
  s2: '#17171E',
  border: '#232330',
  text: '#ECE6D8',
  muted: '#9A9285',
  faint: '#3A332A',
  healthy: '#D4AF37',
  caution: '#C8942A',
  rising: '#C85F2A',
  critical: '#B83030',
  bp: '#C9A84C',
};
const FM = "'JetBrains Mono', ui-monospace, monospace";

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'NOMINAL', load: 'UNDER LOAD', anomaly: 'R_θ DRIFT DETECTED',
  critical: 'INCIDENT — ACTING', recovery: 'RESOLVING',
};

// ──────────────────────────────────────────────────────────────────────────
// Reads the same module-level refs TowerUnit's ThermalDriver writes, on a
// plain rAF-driven interval — this is how DataCenterHUD/Caption stay in
// sync with a Canvas scene from outside it. No React state in the hot path;
// just a periodic force-render so the DOM catches up to the shared clock.
// ──────────────────────────────────────────────────────────────────────────

function useDriverTick(hz = 12) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}

// Companion nodes hold steady near baseline — small fixed per-node offsets
// so the grid doesn't look like four copies of the same number.
const BASELINE_NODES = [
  { id: 'G-01', offset: 0.01 },
  { id: 'G-02', offset: -0.015 },
  { id: 'G-05', offset: 0.02 },
];

function StatusDot({ color, hot }: { color: string; hot?: boolean }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
      ...(hot ? { boxShadow: `0 0 6px ${color}` } : {}),
    }} />
  );
}

function NodeCard({ id, level, isHero }: { id: string; level: number; isHero: boolean }) {
  const tColor = thermalHex(level).getStyle();
  const hot = level > 0.55;
  return (
    <div style={{
      background: T.s2,
      border: `1px solid ${hot ? tColor + '55' : T.border}`,
      borderRadius: 6,
      padding: '9px 11px',
      transition: 'border-color .35s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontFamily: FM, fontSize: 9.5, color: isHero ? T.muted : T.faint, letterSpacing: '.08em' }}>
          {id}{isHero && <span style={{ color: T.bp }}> · live</span>}
        </span>
        <StatusDot color={tColor} hot={hot} />
      </div>
      <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 600, color: tColor, fontVariantNumeric: 'tabular-nums', transition: 'color .35s ease' }}>
        {rthetaAt(level)}
      </div>
      <div style={{ fontFamily: FM, fontSize: 9, color: T.muted, marginTop: 3 }}>
        {tjAt(level)}°C · {(178 + level * 42).toFixed(0)}W
      </div>
    </div>
  );
}

function ReadoutHero({ level, phase, progress }: { level: number; phase: Phase; progress: number }) {
  const tColor = thermalHex(level).getStyle();
  const isCritical = phase === 'critical';
  const lead = (27 - level * 9).toFixed(0);
  return (
    <div style={{
      background: T.s1,
      border: `1px solid ${isCritical ? T.critical : T.border}`,
      borderRadius: 8,
      padding: '14px 16px',
      transition: 'border-color .4s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: '.16em', color: T.muted, textTransform: 'uppercase' }}>
          Theta · node {HERO_NODE_ID}
        </span>
        <span style={{ fontFamily: FM, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: isCritical ? T.critical : tColor }}>
          ● {PHASE_LABEL[phase]}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <div>
          <div style={{ fontFamily: FM, fontSize: 9, color: T.faint, letterSpacing: '.1em', marginBottom: 2 }}>R_θ_EFF · °C/W</div>
          <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 600, color: tColor, fontVariantNumeric: 'tabular-nums', transition: 'color .35s ease' }}>
            {rthetaAt(level)}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FM, fontSize: 9, color: T.faint, letterSpacing: '.1em', marginBottom: 2 }}>T_JUNCTION</div>
          <div style={{ fontFamily: FM, fontSize: 16, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{tjAt(level)} °C</div>
        </div>
        <div>
          <div style={{ fontFamily: FM, fontSize: 9, color: T.faint, letterSpacing: '.1em', marginBottom: 2 }}>EST. LEAD TIME</div>
          <div style={{ fontFamily: FM, fontSize: 16, color: T.bp, fontVariantNumeric: 'tabular-nums' }}>~{lead} min</div>
        </div>
      </div>
      <div style={{ height: 2, background: T.s2, borderRadius: 1, overflow: 'hidden', marginTop: 12 }}>
        <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: tColor, transition: 'width .12s linear' }} />
      </div>
    </div>
  );
}

const SEVERITY_COLOR: Record<Phase, string> = {
  idle: T.muted, load: T.bp, anomaly: T.caution, critical: T.critical, recovery: T.rising,
};

function AlertFeed({ entries }: { entries: AlertLogEntry[] }) {
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: '.16em', color: T.faint, textTransform: 'uppercase', marginBottom: 8 }}>
        Alert feed
      </div>
      {entries.length === 0 ? (
        <div style={{ fontFamily: FM, fontSize: 10.5, color: T.faint, padding: '14px 0' }}>
          Watching every node — nothing to report yet…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {entries.map((e) => (
            <div key={e.id} style={{
              display: 'flex', gap: 10, alignItems: 'baseline',
              padding: '7px 0', borderBottom: `1px solid ${T.border}`,
              fontFamily: FM, fontSize: 10.5,
            }}>
              <span style={{ color: T.faint, fontSize: 9, flexShrink: 0 }}>{e.t}</span>
              <span style={{ color: SEVERITY_COLOR[e.phase], fontSize: 8.5, letterSpacing: '.08em', textTransform: 'uppercase', flexShrink: 0 }}>
                {e.phase}
              </span>
              <span style={{ color: T.muted, flex: 1, lineHeight: 1.4 }}>{e.msg} · {e.node}</span>
              <span style={{ color: T.text, flexShrink: 0 }}>{e.rtheta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Root — the operator-dashboard mockup. Driven entirely by TowerUnit's
// shared thermal-arc refs so it transitions in lockstep with the 3D pane.
// ──────────────────────────────────────────────────────────────────────────

export default function OperatorPanel() {
  useDriverTick();

  const level = _towerLevel.current;
  const phase = _towerPhase.current;
  const progress = _towerProgress.current;
  const entries = _alertLog.current;

  return (
    <div style={{
      height: '100%',
      minHeight: 420,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      background: T.s0,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.18em', color: T.muted, textTransform: 'uppercase' }}>
          Θ Theta · fleet view
        </span>
        <span style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.08em', color: T.faint }}>
          simulated demo
        </span>
      </div>

      <ReadoutHero level={level} phase={phase} progress={progress} />

      <div>
        <div style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: '.16em', color: T.faint, textTransform: 'uppercase', marginBottom: 8 }}>
          Rack R-1 · nodes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <NodeCard id={HERO_NODE_ID} level={level} isHero />
          {BASELINE_NODES.map((n) => (
            <NodeCard key={n.id} id={n.id} level={Math.max(0.05, 0.1 + n.offset)} isHero={false} />
          ))}
        </div>
      </div>

      <AlertFeed entries={entries} />
    </div>
  );
}
