/**
 * FilmGrain — adds micro-texture noise over a section.
 *
 * Uses an SVG turbulence filter as a data-URI background. Pure CSS, no JS.
 * Apply at the section level above content: <FilmGrain /> as the first child.
 */

interface Props {
  /** 0-1, default .025 */
  opacity?: number;
  /** when true, fixes grain to viewport */
  fixed?: boolean;
}

const NOISE_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23g)"/></svg>`
)}`;

export default function FilmGrain({ opacity = 0.025, fixed = false }: Props) {
  return (
    <div
      aria-hidden
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        opacity,
        backgroundImage: `url("${NOISE_DATA_URI}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: 180,
        mixBlendMode: 'overlay',
      }}
    />
  );
}
