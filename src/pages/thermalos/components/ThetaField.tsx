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
        stroke={GOLD}
        strokeWidth={0.8}
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
          stroke={GOLD} strokeWidth={0.8} opacity={o * 0.9}
        />,
      );
    }
  }

  const gradId = React.useId();

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0, opacity, ...style }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {glow && (
          <>
            <defs>
              <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={GOLD} stopOpacity="0.10" />
                <stop offset="60%" stopColor={GOLD} stopOpacity="0.03" />
                <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx={cxN} cy={cyN} rx={baseR * 3.4} ry={baseR * 4.2} fill={`url(#${gradId})`} />
          </>
        )}
        {/* the crossbar — full-bleed hairline through the field center */}
        <line x1={0} y1={cyN} x2={W} y2={cyN} stroke={GOLD} strokeWidth={0.7} opacity={0.22} />
        {ringEls}
        {tickEls}
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
  const h = 18;
  const rx = 11; const ry = 7.5;
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 3, opacity }}>
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
        <line x1={0} y1={h / 2} x2={width / 2 - rx - 4} y2={h / 2} stroke={color} strokeWidth={1} opacity={0.6} />
        <line x1={width / 2 + rx + 4} y1={h / 2} x2={width} y2={h / 2} stroke={color} strokeWidth={1} opacity={0.6} />
        <ellipse cx={width / 2} cy={h / 2} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={1} />
        <line x1={width / 2 - rx + 3} y1={h / 2} x2={width / 2 + rx - 3} y2={h / 2} stroke={color} strokeWidth={1} />
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
