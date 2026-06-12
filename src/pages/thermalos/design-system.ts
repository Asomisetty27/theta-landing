// Industrial Instrument Design System
// Lab-grade aesthetic: amber phosphor + brushed steel + oscilloscope rhythm
// Credibility signal: "built by people who understand hardware"
//
// ── BRAND IDENTITY ────────────────────────────────────────────────────────
// Theta must be recognizable from geometry, palette, and pattern alone.
//
// GEOMETRY — the θ construction: an ellipse bisected by a horizontal
//   crossbar. It is simultaneously (1) the glyph, (2) a thermal contour
//   map — concentric isotherm rings around a heat source, i.e. the product,
//   and (3) the fraction bar in R_θ = ΔT / P. One construction, three
//   readings. Rendered at three scales by components/ThetaField.tsx:
//   ThetaField (section background), ThetaDivider (section-top hairline
//   through a small ellipse), ThetaGlyph (eyebrow/inline mark).
//
// PALETTE — champagne gold (#D4AF37) hairlines on obsidian (#050407).
//   The brand pattern is ALWAYS monochrome champagne at low opacity
//   (≤0.5 field strength). Color encodes information only — thermal
//   semantics (healthy/caution/rising/critical) never decorate.
//
// PATTERN RULES —
//   · isotherm rings fade outward (opacity ×0.78 per ring); outer rings
//     dashed like dial calibration; ticks where rings cross the bar
//   · one field per section, positioned off-center, never behind body text
//   · no gradient orbs, no neon glows, no generic mesh backgrounds —
//     if a background could appear on any SaaS site, it's off-brand
//   · supporting motif: corner brackets / calibration ticks (MOTIFS.corner)
// ──────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // Champagne gold — primary brand accent (used sparingly, where it matters)
  amber: {
    bright: '#F5D98A',    // champagne highlight (rare — peak moments)
    medium: '#D4AF37',    // 18k gold — primary CTA, brand mark
    dim: '#8A6F2E',       // deep champagne — secondary borders/labels
  },
  // Warm platinum + obsidian — typographic + bezel hierarchy
  steel: {
    bright: '#F0EADC',    // warm ivory text (highest contrast on obsidian)
    muted: '#A8A092',     // warm muted (body text, secondary)
    faint: '#48402F',     // warm faint border (more lift than before)
  },
  // Canvas backgrounds — clear elevation stepping for depth
  bg: {
    deep: '#050407',      // true obsidian (page bg, deepest)
    panel: '#0E0C12',     // instrument panel (sections)
    surface: '#181522',   // card surface (lifted 1)
    raised: '#221E2E',    // raised surface (lifted 2 — hover/active)
  },
  // Semantic thermal colors — distinguishable, not all gold
  thermal: {
    healthy: '#D4AF37',   // champagne gold — brand / OK
    caution: '#E8B23A',   // amber
    rising: '#C85F2A',    // burnt orange / copper
    critical: '#B83030',  // crimson
  },
  // Accents for differentiation when needed
  accent: '#C9A84C',      // champagne accent (links, focus)
  copper: '#B87333',      // burnished copper (secondary accent — counterpoint to gold)
  platinum: '#D8D2C2',    // bright platinum (highlights, dividers)
  ink: '#6E91C8',         // deep blueprint blue (kept for data/diagram accents only)
};

export const TYPOGRAPHY = {
  // All uppercase, tight tracking — like instrument labels
  labels: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '8px',
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: COLORS.steel.muted,
  },
  // Technical data readouts — monospace, high contrast
  readouts: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: COLORS.steel.bright,
    fontVariantNumeric: 'tabular-nums',
  },
  // Display/hero — technical but legible
  display: {
    fontFamily: "'Space Grotesk', system-ui, -apple-system, sans-serif",
    fontSize: 'clamp(32px, 4.2vw, 56px)',
    fontWeight: 600,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
    color: COLORS.steel.bright,
  },
  // Body copy — calibration-grade clarity
  body: {
    fontFamily: "'Space Grotesk', system-ui, -apple-system, sans-serif",
    fontSize: '15px',
    fontWeight: 400,
    lineHeight: 1.6,
    color: COLORS.steel.muted,
  },
};

export const MOTIFS = {
  // Corner brackets — like measurement reticles
  corner: (size = 8, color = COLORS.steel.faint) => ({
    width: size,
    height: size,
    border: `1px solid ${color}`,
    borderRight: 'none',
    borderBottom: 'none',
  }),
  // Graph-paper grid background (subtle, uses -webkit-mask to avoid perf hit)
  grid: (size = 16, opacity = 0.05) => `
    linear-gradient(0deg, transparent ${size - 1}px, rgba(255,255,255,${opacity}) ${size - 1}px),
    linear-gradient(90deg, transparent ${size - 1}px, rgba(255,255,255,${opacity}) ${size - 1}px)
  `,
  // Crosshair accent
  crosshair: (color = COLORS.amber.dim) => `
    linear-gradient(90deg, transparent calc(50% - 0.5px), ${color} calc(50% - 0.5px), ${color} calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(0deg, transparent calc(50% - 0.5px), ${color} calc(50% - 0.5px), ${color} calc(50% + 0.5px), transparent calc(50% + 0.5px))
  `,
};

export const COMPONENTS = {
  // Bezel frame — like an instrument readout window
  bezel: {
    border: `1px solid ${COLORS.steel.faint}`,
    borderRadius: '3px',
    padding: '1px',
    background: `linear-gradient(135deg,
      ${COLORS.bg.raised} 0%,
      ${COLORS.bg.surface} 50%,
      ${COLORS.bg.panel} 100%)`,
    boxShadow: `
      inset 0 1px 2px rgba(255,255,255,0.05),
      inset 0 -1px 2px rgba(0,0,0,0.5),
      0 2px 8px rgba(0,0,0,0.3)
    `,
  },
  // Calibration label — small badge with a leader line
  calibLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: TYPOGRAPHY.labels.fontSize,
    letterSpacing: TYPOGRAPHY.labels.letterSpacing,
    color: COLORS.steel.muted,
    textTransform: 'uppercase',
  },
};

// EASING (oscilloscope trace smoothness — no springy bounces)
export const EASING = {
  instant: [1, 0, 1, 1],          // no ease
  snappy: [0.25, 0.46, 0.45, 0.94], // standard cubic
  scan: [0.16, 1, 0.3, 1],        // CRT refresh curve
};

// AGENT RISK & CONFIDENCE (5-pillar system visualization)
export const RISK = {
  safe: '#1D9E75',      // green — nominal
  warning: '#EF9F27',   // amber — monitor
  caution: '#D85A30',   // orange — escalating
  critical: '#B83030',  // red — act now
};

export const CONFIDENCE = {
  high: {
    fg: RISK.safe,
    bg: '#1D9E7515',
    border: '#1D9E75',
  },
  medium: {
    fg: RISK.warning,
    bg: '#EF9F2715',
    border: '#EF9F27',
  },
  low: {
    fg: RISK.critical,
    bg: '#B8303015',
    border: '#B83030',
  },
};
