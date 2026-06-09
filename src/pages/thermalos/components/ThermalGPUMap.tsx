/**
 * ThermalGPUMap — Live animated GPU core thermal visualization
 *
 * Renders a 12×4 SM-core grid with a time-driven thermal state machine:
 *   Phase 0 (idle):   cool blue-teal baseline
 *   Phase 1 (ramp):   wave of warmth, left → right
 *   Phase 2 (load):   steady healthy-green load
 *   Phase 3 (anomaly):SM-7 rises to critical red
 *   Phase 4 (alert):  ring + readout, other SMs cooling
 *   Phase 5 (reset):  fade back to idle, loop
 *
 * Updates DOM directly via refs — zero React re-renders at 60fps.
 */

import { useEffect, useRef, useCallback } from 'react';

const COLS = 12;
const ROWS = 4;
const N = COLS * ROWS;
const ANOMALY_IDX = 7 * ROWS + 2; // col 7, row 2

// Duration of each phase in seconds
const PHASES = [2.5, 3.0, 3.5, 2.0, 3.5, 1.5]; // sum = 16s loop
const LOOP = PHASES.reduce((a, b) => a + b, 0);

function thermalColor(t: number): string {
  // t in [0,1] — 0=cold, 1=critical
  const stops: [number, [number, number, number]][] = [
    [0.00, [15, 28, 52]],
    [0.18, [21, 68, 94]],
    [0.38, [30, 115, 100]],
    [0.52, [47, 179, 107]],
    [0.65, [155, 200, 55]],
    [0.76, [230, 175, 55]],
    [0.87, [228, 112, 52]],
    [1.00, [210, 55, 55]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) {
      const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
      return `rgb(${~~(c0[0] + u * (c1[0] - c0[0]))},${~~(c0[1] + u * (c1[1] - c0[1]))},${~~(c0[2] + u * (c1[2] - c0[2]))})`;
    }
  }
  return 'rgb(210,55,55)';
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function getPhase(t: number): { phase: number; phaseT: number } {
  let acc = 0;
  for (let i = 0; i < PHASES.length; i++) {
    if (t < acc + PHASES[i]) return { phase: i, phaseT: (t - acc) / PHASES[i] };
    acc += PHASES[i];
  }
  return { phase: PHASES.length - 1, phaseT: 1 };
}

export default function ThermalGPUMap() {
  const cellRefs = useRef<(SVGRectElement | null)[]>(Array(N).fill(null));
  const alertRingRef = useRef<SVGGElement | null>(null);
  const alertLabelRef = useRef<HTMLDivElement | null>(null);
  const readTmaxRef = useRef<HTMLSpanElement | null>(null);
  const readRthetaRef = useRef<HTMLSpanElement | null>(null);
  const readStatusRef = useRef<HTMLSpanElement | null>(null);
  const timestampRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const temps = useRef<number[]>(Array(N).fill(0.15));

  const animate = useCallback((now: number) => {
    if (!startRef.current) startRef.current = now;
    const elapsed = ((now - startRef.current) / 1000) % LOOP;
    const { phase, phaseT } = getPhase(elapsed);

    const pt = easeInOut(phaseT);
    const t = temps.current;

    // Target temperatures per phase
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const idx = col * ROWS + row;
        const isAnomaly = idx === ANOMALY_IDX;
        // Small per-cell variation using stable offsets
        const noise = ((idx * 137 + row * 31) % 100) / 1000; // 0–0.1

        let target: number;
        switch (phase) {
          case 0: // idle
            target = 0.12 + noise * 0.4;
            break;
          case 1: { // ramp — wave left→right
            const wavePos = col / (COLS - 1);
            const waveAmt = Math.max(0, pt - wavePos * 0.6);
            target = lerp(0.12 + noise * 0.4, 0.52 + noise * 0.4, Math.min(1, waveAmt * 2.5));
            break;
          }
          case 2: // steady load
            target = 0.52 + noise * 0.4;
            if (isAnomaly) target = 0.56;
            break;
          case 3: // anomaly rising
            target = 0.52 + noise * 0.4;
            if (isAnomaly) target = lerp(0.56, 1.0, pt);
            break;
          case 4: // alert — anomaly stays hot, others persist
            target = 0.48 + noise * 0.35;
            if (isAnomaly) target = lerp(1.0, 0.88, pt * 0.3); // anomaly barely cools
            break;
          case 5: // reset — all cool
            target = lerp(0.48 + noise * 0.35, 0.12 + noise * 0.4, pt);
            if (isAnomaly) target = lerp(0.88, 0.22, pt);
            break;
          default:
            target = 0.12;
        }
        // Smooth toward target at different rates
        const rate = isAnomaly ? 0.04 : 0.025;
        t[idx] = lerp(t[idx], target, rate);
      }
    }

    // Update cell fills
    for (let i = 0; i < N; i++) {
      const el = cellRefs.current[i];
      if (el) el.setAttribute('fill', thermalColor(t[i]));
    }

    // Alert ring — show in phases 3+4
    const showAlert = (phase === 3 && pt > 0.5) || phase === 4;
    if (alertRingRef.current) {
      alertRingRef.current.style.opacity = showAlert ? '1' : '0';
      // Pulse scale
      const pulseT = (now / 1000) * 1.4;
      const pulse = 1 + Math.sin(pulseT * Math.PI * 2) * 0.08;
      alertRingRef.current.style.transform = `scale(${pulse})`;
    }
    if (alertLabelRef.current) {
      alertLabelRef.current.style.opacity = showAlert ? '1' : '0';
    }

    // Readouts
    const tmax = Math.max(...t);
    const tmaxC = Math.round(37 + tmax * 58); // map 0-1 to 37-95°C
    const rtheta = (2.1 - tmax * 1.4).toFixed(2);
    const status = phase >= 3 && pt > 0.4
      ? '⚠ DRIFT'
      : phase >= 1 && phase <= 4
        ? '● LOAD'
        : '○ IDLE';

    if (readTmaxRef.current) readTmaxRef.current.textContent = `${tmaxC}°C`;
    if (readRthetaRef.current) readRthetaRef.current.textContent = `${rtheta} C/W`;
    if (readStatusRef.current) {
      readStatusRef.current.textContent = status;
      readStatusRef.current.style.color = status.startsWith('⚠')
        ? '#D63D3D'
        : status.startsWith('●')
          ? '#9FCB3B'
          : '#525a55';
    }
    if (timestampRef.current) {
      const d = new Date(now);
      const pad2 = (n: number) => String(n).padStart(2, '0');
      timestampRef.current.textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  // Layout constants
  const CW = 36, CH = 28, GAP = 5;
  const svgW = COLS * CW + (COLS - 1) * GAP;
  const svgH = ROWS * CH + (ROWS - 1) * GAP;

  // Anomaly cell center
  const anomalyCol = Math.floor(ANOMALY_IDX / ROWS);
  const anomalyRow = ANOMALY_IDX % ROWS;
  const ax = anomalyCol * (CW + GAP) + CW / 2;
  const ay = anomalyRow * (CH + GAP) + CH / 2;

  return (
    <div style={{
      background: 'linear-gradient(160deg, #0C0C14 0%, #080810 100%)',
      border: '1px solid #1C1C28',
      borderRadius: 8,
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px',
        borderBottom: '1px solid #1C1C28',
        background: 'rgba(255,255,255,.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#D4AF37',
            boxShadow: '0 0 6px #D4AF37',
            animation: 'tos-blip 1.6s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 9.5, letterSpacing: '.15em', textTransform: 'uppercase', color: '#525a55' }}>
            SM Core Thermal Map
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 9.5, color: '#3A332A' }}>
          <span>Tesla T4 · 2560 CUDA</span>
          <span ref={timestampRef} style={{ color: '#525a55' }}>—</span>
        </div>
      </div>

      {/* SVG heatmap grid */}
      <div style={{ padding: '14px 16px 10px', position: 'relative' }}>
        {/* Column labels */}
        <div style={{ display: 'flex', marginBottom: 5, paddingLeft: 0, gap: GAP }}>
          {Array.from({ length: COLS }, (_, i) => (
            <div key={i} style={{ width: CW, textAlign: 'center', fontSize: 8, color: '#2E2E3E', letterSpacing: '.04em', flexShrink: 0 }}>
              SM{i}
            </div>
          ))}
        </div>

        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', width: '100%' }}>
          {Array.from({ length: N }, (_, i) => {
            const col = Math.floor(i / ROWS);
            const row = i % ROWS;
            const x = col * (CW + GAP);
            const y = row * (CH + GAP);
            return (
              <rect
                key={i}
                ref={el => { cellRefs.current[i] = el; }}
                x={x} y={y}
                width={CW} height={CH}
                rx={3}
                fill={thermalColor(0.15)}
                style={{ transition: 'none' }}
              />
            );
          })}

          {/* Alert ring around anomaly cell */}
          <g
            ref={alertRingRef}
            style={{ opacity: 0, transition: 'opacity 0.4s ease', transformOrigin: `${ax}px ${ay}px` }}
          >
            <rect
              x={anomalyCol * (CW + GAP) - 3}
              y={anomalyRow * (CH + GAP) - 3}
              width={CW + 6} height={CH + 6}
              rx={5}
              fill="none"
              stroke="#D63D3D"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.85"
            />
            <rect
              x={anomalyCol * (CW + GAP) - 7}
              y={anomalyRow * (CH + GAP) - 7}
              width={CW + 14} height={CH + 14}
              rx={7}
              fill="none"
              stroke="#D63D3D"
              strokeWidth="0.6"
              opacity="0.3"
            />
          </g>
        </svg>

        {/* Alert label */}
        <div
          ref={alertLabelRef}
          style={{
            position: 'absolute',
            left: anomalyCol * (CW + GAP) / (svgW / 100) + 2 + '%',
            top: '18px',
            transform: 'translateX(-50%)',
            background: 'rgba(180,30,30,.90)',
            border: '1px solid rgba(210,55,55,.5)',
            borderRadius: 3,
            padding: '2px 7px',
            fontSize: 8.5,
            color: '#FFD0D0',
            letterSpacing: '.06em',
            whiteSpace: 'nowrap',
            opacity: 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
          }}
        >
          DRIFT · SM-7 · R_θ ↑
        </div>
      </div>

      {/* Bottom readout bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        borderTop: '1px solid #1C1C28',
        padding: '8px 14px',
        background: 'rgba(0,0,0,.25)',
      }}>
        {/* Color scale legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          {['#12203A', '#1E7A6E', '#D4AF37', '#E8B23A', '#E8743A', '#D63D3D'].map((c, i) => (
            <div key={i} style={{ width: 18, height: 4, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: 8.5, color: '#2E2E3E', marginLeft: 4 }}>cold → critical</span>
        </div>

        {/* Live readouts */}
        <div style={{ display: 'flex', gap: 20, fontSize: 9.5 }}>
          <div>
            <span style={{ color: '#3A332A', marginRight: 5 }}>T_max</span>
            <span ref={readTmaxRef} style={{ color: '#ECE6D8', fontVariantNumeric: 'tabular-nums' }}>—</span>
          </div>
          <div>
            <span style={{ color: '#3A332A', marginRight: 5 }}>R_θ</span>
            <span ref={readRthetaRef} style={{ color: '#ECE6D8', fontVariantNumeric: 'tabular-nums' }}>—</span>
          </div>
          <div>
            <span ref={readStatusRef} style={{ fontVariantNumeric: 'tabular-nums' }}>—</span>
          </div>
        </div>
      </div>
    </div>
  );
}
