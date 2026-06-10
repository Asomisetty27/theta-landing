/**
 * Theta logo mark — the lowercase Greek letter θ, set in serif type,
 * referencing R_θ as the product's core metric.
 *
 * Design rules:
 *  - Rendered as the actual θ glyph (not a custom shape) for maximum legibility at any size
 *  - Serif face (Georgia) gives the glyph its characteristic oval-with-bar form
 *  - Monochromatic: `color` prop propagates directly
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
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontWeight: 400,
        fontSize: size * 1.15,
        lineHeight: 1,
        color,
        userSelect: 'none',
      }}
    >
      θ
    </span>
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
