/**
 * GradientOrbs — Framer-style depth layer.
 *
 * Three drifting radial-gradient orbs with mix-blend-mode:screen.
 * Adds depth and luminance to dark sections without changing palette.
 *
 *   <div className="relative">
 *     <GradientOrbs variant="cyan" />
 *     <div className="relative z-10">…content…</div>
 *   </div>
 *
 * variant controls hue:
 *   cyan    — primary brand (170° 80%)
 *   magenta — accent (310° 80%)
 *   amber   — warm accent (38° 90%)
 *   mixed   — cyan + magenta + green (hero / index page)
 *   subtle  — low-opacity version for content sections
 */

import * as React from 'react';

type Variant = 'cyan' | 'magenta' | 'amber' | 'green' | 'mixed' | 'subtle';

interface Orb {
  cls:   'fx-orb-a' | 'fx-orb-b' | 'fx-orb-c';
  color: string;
  w:     number;
  h:     number;
  top:   string;
  left:  string;
  blur:  number;
}

function getOrbs(variant: Variant): Orb[] {
  const HSL = {
    cyan:    'hsl(170 80% 50% / OPACITY)',
    magenta: 'hsl(310 80% 60% / OPACITY)',
    amber:   'hsl(38 90% 55% / OPACITY)',
    green:   'hsl(142 70% 50% / OPACITY)',
  };
  const op = (h: string, o: number) => h.replace('OPACITY', String(o));

  switch (variant) {
    case 'cyan':
      return [
        { cls: 'fx-orb-a', color: op(HSL.cyan, 0.10), w: 620, h: 500, top: '-15%', left: '60%', blur: 120 },
        { cls: 'fx-orb-b', color: op(HSL.cyan, 0.05), w: 380, h: 380, top: '60%',  left: '3%',  blur: 90  },
      ];
    case 'magenta':
      return [
        { cls: 'fx-orb-a', color: op(HSL.magenta, 0.09), w: 580, h: 460, top: '-12%', left: '65%', blur: 110 },
        { cls: 'fx-orb-b', color: op(HSL.magenta, 0.05), w: 340, h: 340, top: '55%',  left: '5%',  blur: 90  },
      ];
    case 'amber':
      return [
        { cls: 'fx-orb-a', color: op(HSL.amber, 0.07), w: 540, h: 460, top: '-10%', left: '55%', blur: 110 },
        { cls: 'fx-orb-b', color: op(HSL.amber, 0.04), w: 320, h: 320, top: '65%',  left: '0%',  blur: 90  },
      ];
    case 'green':
      return [
        { cls: 'fx-orb-a', color: op(HSL.green, 0.10), w: 600, h: 480, top: '-15%', left: '60%', blur: 120 },
        { cls: 'fx-orb-b', color: op(HSL.green, 0.05), w: 360, h: 360, top: '55%',  left: '5%',  blur: 95  },
      ];
    case 'subtle':
      return [
        { cls: 'fx-orb-a', color: op(HSL.cyan, 0.05),    w: 540, h: 440, top: '-10%', left: '60%', blur: 130 },
        { cls: 'fx-orb-b', color: op(HSL.magenta, 0.04), w: 380, h: 380, top: '70%',  left: '0%',  blur: 110 },
      ];
    case 'mixed':
    default:
      return [
        { cls: 'fx-orb-a', color: op(HSL.cyan, 0.10),    w: 600, h: 500, top: '-18%', left: '60%', blur: 130 },
        { cls: 'fx-orb-b', color: op(HSL.magenta, 0.07), w: 420, h: 420, top: '50%',  left: '2%',  blur: 110 },
        { cls: 'fx-orb-c', color: op(HSL.green, 0.05),   w: 280, h: 280, top: '78%',  left: '70%', blur: 90  },
      ];
  }
}

interface Props {
  variant?: Variant;
  /** when true, fixes orbs to viewport (use for body-level backgrounds) */
  fixed?: boolean;
}

export default function GradientOrbs({ variant = 'mixed', fixed = false }: Props) {
  const orbs = getOrbs(variant);
  return (
    <div
      aria-hidden
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {orbs.map((o, i) => (
        <div
          key={i}
          className={o.cls}
          style={{
            position: 'absolute',
            top: o.top,
            left: o.left,
            width: o.w,
            height: o.h,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${o.color} 0%, transparent 70%)`,
            filter: `blur(${o.blur}px)`,
            mixBlendMode: 'screen',
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
