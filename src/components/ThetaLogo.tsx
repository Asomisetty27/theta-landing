/**
 * Theta logo mark — Greek Θ with calibration tick marks at the bar/circle
 * intersections, referencing R_θ as a precision measurement instrument.
 *
 * Design rules:
 *  - Circle stroke and bar are identical weight (2.2px at 40×40 base)
 *  - Bar is full diameter (chord at equator) — canonical Θ
 *  - Two perpendicular ticks at each intersection: reads as calibration marks
 *  - Monochromatic: `color` prop propagates as CSS currentColor
 *  - Scales cleanly from 14px favicon to billboard
 */

import type { CSSProperties } from 'react';

interface ThetaLogoProps {
  size?: number;
  color?: string;
  /** 'mark' = icon only, 'full' = icon + wordmark, 'wordmark' = text only */
  variant?: 'mark' | 'full' | 'wordmark';
  style?: CSSProperties;
  className?: string;
}

export function ThetaMark({ size = 32, color = 'currentColor' }: { size?: number; color?: string }) {
  // Geometry (40×40 unit grid)
  // Circle: cx=20, cy=20, r=16 → touches at (4,20) and (36,20) on equator
  // Bar: full diameter chord (x1=4, x2=36, y=20)
  // Ticks: 3.5px tall, centered on bar endpoints — calibration marks
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer circle */}
      <circle
        cx="20"
        cy="20"
        r="16"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Equatorial bar — full diameter */}
      <line
        x1="4"
        y1="20"
        x2="36"
        y2="20"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Left calibration tick */}
      <line x1="4" y1="16.5" x2="4" y2="23.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Right calibration tick */}
      <line x1="36" y1="16.5" x2="36" y2="23.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const BRAND_GREEN = '#27A05A';

export default function ThetaLogo({
  size = 32,
  color = BRAND_GREEN,
  variant = 'full',
  style,
  className,
}: ThetaLogoProps) {
  const wordmarkSize = Math.round(size * 0.45);

  if (variant === 'mark') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', ...style }} className={className}>
        <ThetaMark size={size} color={color} />
      </span>
    );
  }

  if (variant === 'wordmark') {
    return (
      <span
        style={{
          fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: wordmarkSize,
          letterSpacing: '-0.03em',
          color,
          ...style,
        }}
        className={className}
      >
        Theta
      </span>
    );
  }

  // 'full' — mark + wordmark
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.28), ...style }}
      className={className}
    >
      <ThetaMark size={size} color={color} />
      <span
        style={{
          fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: wordmarkSize,
          letterSpacing: '-0.03em',
          color,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Theta
      </span>
    </span>
  );
}
