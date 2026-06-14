/**
 * ThetaField — the Theta brand pattern.
 *
 * The identity is the θ construction: an ellipse bisected by a horizontal
 * crossbar. Read three ways at once it is (1) the glyph, (2) a thermal
 * contour map — concentric isotherm rings around a heat source, which IS
 * the product — and (3) the fraction bar in R_θ = ΔT / P.
 *
 * Rendered as concentric champagne hairline ellipses around a crossbar,
 * with calibration ticks where rings cross the bar. Always monochrome
 * champagne-on-obsidian at low opacity: the pattern carries the brand,
 * color stays reserved for data (design rule #1 on the landing page).
 *
 * Three scales of the same construction:
 *   <ThetaField>   — section background field
 *   <ThetaDivider> — section-top hairline through a small ellipse
 *   <ThetaGlyph>   — eyebrow/inline mark
 */

import * as React from 'react';

const GOLD = '#D4AF37';

/* Deterministic per-ring jitter (no Math.random — the pattern must render
 * identically everywhere it appears; sameness is what builds recognition). */
const RING_TILT = [0, -2.5, 3, -1.5, 2, -3, 1.5, -2];

export function ThetaField({
  rings = 6,
  baseR = 70,
  growth = 1.42,
  cx = '50%',
  cy = '50%',
  opacity = 0.5,
  glow = true,
  style,
}: {
  rings?: number;
  baseR?: number;
  growth?: number;
  /** field center, as % of the section box */
  cx?: string;
  cy?: string;
  /** overall pattern strength — keep ≤ 0.6; the field must never compete with text */
  opacity?: number;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  const W = 1600;
  const H = 1000;
  const cxN = (parseFloat(cx) / 100) * W;
  const cyN = (parseFloat(cy) / 100) * H;

  const ringEls: React.ReactNode[] = [];
  const tickEls: React.ReactNode[] = [];

  for (let i = 0; i < rings; i++) {
    const r = baseR * Math.pow(growth, i);
    const ry = r * 1.32;                       // θ is taller than wide
    const o = 0.55 * Math.pow(0.78, i);        // fade outward
    const dashed = i >= rings - 2;             // outer rings read as dial calibration
    ringEls.push(
      <ellipse
        key={i}
        cx={cxN} cy={cyN} rx={r} ry={ry}
        fill="none"
        strokeWidth={1.2}
        strokeDasharray={dashed ? '5 11' : undefined}
        opacity={o}
        transform={`rotate(${RING_TILT[i % RING_TILT.length]} ${cxN} ${cyN})`}
      />,
    );
    // calibration ticks where the ring crosses the bar
    for (const sx of [-1, 1]) {
      tickEls.push(
        <line
          key={`${i}${sx}`}
          x1={cxN + sx * r} y1={cyN - 5}
          x2={cxN + sx * r} y2={cyN + 5}
          strokeWidth={1.2} opacity={o * 0.9}
        />,
      );
    }
  }

  const gradId = React.useId();
  const foilId = React.useId();
  const maxR = baseR * Math.pow(growth, rings - 1) * 1.32;

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0, opacity, ...style }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          {/* metallic light-from-above: strokes catch champagne highlight at
              the top of the field and fall to deep gold below — gold as a
              material, not a flat color */}
          <linearGradient id={foilId} gradientUnits="userSpaceOnUse"
            x1={cxN} y1={cyN - maxR} x2={cxN} y2={cyN + maxR}>
            <stop offset="0%" stopColor="#F5D98A" />
            <stop offset="45%" stopColor={GOLD} />
            <stop offset="100%" stopColor="#7A6526" />
          </linearGradient>
          {glow && (
            <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={GOLD} stopOpacity="0.10" />
              <stop offset="60%" stopColor={GOLD} stopOpacity="0.03" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
          )}
        </defs>
        {glow && <ellipse cx={cxN} cy={cyN} rx={baseR * 3.4} ry={baseR * 4.2} fill={`url(#${gradId})`} />}
        {/* the crossbar — full-bleed hairline through the field center */}
        <line x1={0} y1={cyN} x2={W} y2={cyN} stroke={`url(#${foilId})`} strokeWidth={1} opacity={0.32} />
        <g stroke={`url(#${foilId})`}>
          {ringEls}
          {tickEls}
        </g>
      </svg>
    </div>
  );
}

/** Section-top divider: hairline passing through a small ellipse — the
 *  crossbar construction at divider scale. Drop directly under a section's
 *  top border, centered. */
export function ThetaDivider({ width = 260, color = GOLD, opacity = 0.55 }: {
  width?: number;
  color?: string;
  opacity?: number;
}) {
  const h = 22;
  const rx = 11; const ry = 7.5;
  const mid = h / 2;
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3, opacity }}>
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
        {/* single crisp hairline — showroom-clean, no print flourishes */}
        <line x1={0} y1={mid} x2={width / 2 - rx - 6} y2={mid} stroke={color} strokeWidth={1} opacity={0.65} />
        <line x1={width / 2 + rx + 6} y1={mid} x2={width} y2={mid} stroke={color} strokeWidth={1} opacity={0.65} />
        {/* the θ ellipse, champagne highlight on the upper arc — reads as
            studio light catching brushed metal */}
        <ellipse cx={width / 2} cy={mid} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={1} />
        <path d={`M ${width / 2 - rx * 0.72} ${mid - ry * 0.62} A ${rx} ${ry} 0 0 1 ${width / 2 + rx * 0.72} ${mid - ry * 0.62}`}
          fill="none" stroke="#F5D98A" strokeWidth={1} strokeLinecap="round" opacity={0.9} />
        <line x1={width / 2 - rx + 3} y1={mid} x2={width / 2 + rx - 3} y2={mid} stroke={color} strokeWidth={1} />
      </svg>
    </div>
  );
}

/** Inline θ-construction mark for eyebrows/labels: two nested rings + bar. */
export function ThetaGlyph({ size = 13, color = GOLD, opacity = 0.9 }: {
  size?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0, opacity }}>
      <ellipse cx="8" cy="8" rx="5.2" ry="6.6" fill="none" stroke={color} strokeWidth="1.1" />
      <ellipse cx="8" cy="8" rx="2.4" ry="3.1" fill="none" stroke={color} strokeWidth="0.9" opacity="0.55" />
      <line x1="1" y1="8" x2="15" y2="8" stroke={color} strokeWidth="1" opacity="0.8" />
    </svg>
  );
}
