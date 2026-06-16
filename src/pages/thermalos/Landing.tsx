/**
 * Theta — Landing page (v2)
 *
 * Design principles:
 *   · No neon glows. Color encodes information only.
 *   · Precision instrument aesthetic: oscilloscope / DAQ / PCB.
 *   · Custom named-area CSS grids. No generic span-N bento.
 *   · Animations: line-draw, bar-fill, count-up. Nothing decorative.
 *   · Typography drives the page. Graphics serve the data.
 */

import * as React from 'react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FLEET_BASE, RESEARCH_ORIGIN, researchPath } from './config';
import { ChevronRight } from 'lucide-react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { animate, stagger } from 'animejs';
// Hero is a pre-rendered video loop (GPUHeroVideo) — render-farm quality,
// zero WebGL cost. It lazy-falls-back to the live three.js scene on video
// error. Static import: the module is tiny (video element + DOM HUD + sim).
import GPUHeroVideo from './components/GPUHeroVideo';
const DataCenterShowcase = React.lazy(() => import('./components/DataCenterShowcase'));
const OperatorViewShowcase = React.lazy(() => import('./components/OperatorViewShowcase'));
import ThetaLogo from '../../components/ThetaLogo';
import { ThetaField, ThetaDivider, ThetaGlyph } from './components/ThetaField';
import { COLORS, TYPOGRAPHY, COMPONENTS, EASING } from './design-system';

/* ─── Design tokens (Industrial Instrument aesthetic) ───────────────────── */
const T = {
  bg:        COLORS.bg.deep,
  s0:        COLORS.bg.panel,
  s1:        COLORS.bg.surface,
  s2:        COLORS.bg.raised,
  s3:        '#2C2738',
  border:    COLORS.steel.faint,
  borderHi:  '#5A5142',
  text:      COLORS.steel.bright,
  muted:     COLORS.steel.muted,
  // Caption tier: was steel.faint (#48402F, ~1.9:1 — invisible). Decoupled
  // from the border tier and lifted to a warm gray that clears WCAG AA
  // (~5:1 on obsidian) while still reading clearly as tertiary text.
  faint:     '#8A8073',
  healthy:   COLORS.thermal.healthy,
  caution:   COLORS.thermal.caution,
  rising:    COLORS.thermal.rising,
  critical:  COLORS.thermal.critical,
  bp:        COLORS.accent,
  amber:     COLORS.amber.medium,
  copper:    COLORS.copper,
  platinum:  COLORS.platinum,
  ink:       COLORS.ink,
};

const FD = TYPOGRAPHY.display.fontFamily;
const FM = TYPOGRAPHY.labels.fontFamily;
const EASE = EASING.snappy;

function rm() {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ─── Primitive icons ─────────────────────────────────────────────────────── */
const ArrowRight = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const GithubIcon = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
  </svg>
);

/* ─── Shared primitives ───────────────────────────────────────────────────── */
function Eyebrow({ children }: { children: React.ReactNode }) {
  // Every section opens with the θ-construction mark — the brand glyph at
  // its smallest scale (see ThetaField.tsx for the identity rules).
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FM, fontSize: 10, fontWeight: 500, letterSpacing: '.26em', textTransform: 'uppercase', color: '#A08A4E' }}>
      <ThetaGlyph size={13} opacity={0.85} />
      <span style={{ display: 'block', width: 14, height: 1, background: 'linear-gradient(90deg, #8A6F2E, transparent)', flexShrink: 0 }} />
      {children}
    </div>
  );
}

/* Showroom ceiling wash — a soft champagne light cone from the section's
 * top edge, like gallery lighting pooling onto a showroom floor. Pure
 * gradient, no blur cost. Strength stays whisper-quiet (≤.08 peak). */
function ShowroomLight({ intensity = 1 }: { intensity?: number }) {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      background: `
        radial-gradient(ellipse 46% 38% at 50% -6%, rgba(245,217,138,${0.07 * intensity}), transparent 72%),
        radial-gradient(ellipse 70% 24% at 50% 0%, rgba(240,234,220,${0.03 * intensity}), transparent 80%)
      `,
    }} />
  );
}

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FM, fontSize: 10, letterSpacing: '.03em', padding: '3px 7px', borderRadius: 3, border: `1px solid ${accent ? T.healthy + '55' : T.border}`, color: accent ? T.healthy : T.muted, background: accent ? T.healthy + '0C' : T.s2 }}>
      {children}
    </span>
  );
}

// The brand's signature gesture (brand_system.md): a ring expanding from a
// point and fading as it grows — "the thermal pulse." The core dot keeps its
// gentle breathing; a hairline ring ripples outward like an isotherm front.
function Pulse({ color = T.healthy }: { color?: string }) {
  return (
    <span className="tos-pulse-wrap" style={{ position: 'relative', display: 'inline-flex', width: 6, height: 6, flexShrink: 0 }}>
      <span className="tos-pulse-ring" aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${color}` }} />
      <span className="tos-pulse" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color }} />
    </span>
  );
}

function Panel({ children, label, corner, style, glass }: {
  children: React.ReactNode;
  label?: string;
  corner?: React.ReactNode;
  style?: React.CSSProperties;
  glass?: boolean;
}) {
  return (
    <div className={glass ? 'tos-glass' : ''} style={{ border: `1px solid ${glass ? 'rgba(255,255,255,.06)' : T.border}`, borderRadius: 6, background: glass ? undefined : T.s1, overflow: 'hidden', transition: 'border-color .2s', boxShadow: glass ? undefined : 'inset 0 1px 0 rgba(245,217,138,.06), 0 14px 40px -18px rgba(0,0,0,.6)', ...style }}>
      {(label || corner) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: `1px solid ${glass ? 'rgba(255,255,255,.05)' : T.border}`, background: glass ? 'rgba(0,0,0,.18)' : T.s0 }}>
          {label && <span style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: T.faint }}>{label}</span>}
          {corner}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Section header ──────────────────────────────────────────────────────── */
function SectionHead({ eyebrow, title, body, center }: {
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div style={{ maxWidth: 540, ...(center ? { margin: '0 auto', textAlign: 'center' } : {}) }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 style={{ fontFamily: "'Clash Display', 'Satoshi', Inter, system-ui, sans-serif", fontSize: 'clamp(30px,3.6vw,50px)', fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.04, color: T.text, margin: '18px 0 14px' }}>
        {title}
      </h2>
      {body && <p style={{ fontFamily: FD, fontSize: 15, lineHeight: 1.75, color: T.muted }}>{body}</p>}
    </div>
  );
}

/* ─── R_theta trace (hero visualization) ─────────────────────────────────── */
/*
 * Schematic trace of R_theta over a single E003-style experiment:
 *   Segments: pre_load (flat ~1.28) → load (ramp down to 0.72) → recovery (spike to 2.1, decay)
 * Drawn with stroke-dashoffset animation — no glows, just hairline paths.
 */
function RthetaTrace() {
  const svgRef  = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView  = useInView(wrapRef, { once: true, amount: 0.4 });

  /* Trace path points (viewport: 480w × 140h, y-domain 0–2.6 C/W) */
  const W = 480; const H = 140; const pad = { t: 16, b: 28, l: 44, r: 16 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  function py(v: number): number { return pad.t + ch - (v / 2.6) * ch; }
  function px(t: number): number { return pad.l + (t / 1) * cw; }     // t ∈ [0,1]

  /* Key waypoints as [t, rtheta] pairs */
  const trace: [number, number][] = [
    [0,     1.28], [0.18,  1.28], [0.22,  1.14], [0.26, 0.90],
    [0.30,  0.72], [0.52,  0.72], [0.56,  1.35], [0.60, 1.90],
    [0.63,  2.10], [0.70,  1.95], [0.78,  1.72], [0.86, 1.50],
    [0.92,  1.38], [0.97,  1.30], [1.00,  1.28],
  ];

  const pts = trace.map(([t, v]) => `${px(t).toFixed(1)},${py(v).toFixed(1)}`).join(' ');

  /* Region boundaries */
  const regions = [
    { label: 'PRE-LOAD', x0: 0, x1: 0.22, color: T.bp },
    { label: 'LOAD', x0: 0.22, x1: 0.56, color: T.healthy },
    { label: 'RECOVERY', x0: 0.56, x1: 1.0, color: T.rising },
  ];

  /* Y-axis ticks */
  const yTicks = [0.5, 1.0, 1.5, 2.0, 2.5];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !inView || rm()) return;

    const path = svg.querySelector<SVGPolylineElement>('[data-trace]');
    if (!path) return;
    const len = path.getTotalLength?.() ?? 600;
    path.style.strokeDasharray  = String(len);
    path.style.strokeDashoffset = String(len);
    path.style.opacity = '1';

    animate(path, {
      strokeDashoffset: [len, 0],
      duration: 1400,
      ease: 'inOutSine',
    });
  }, [inView]);

  return (
    <div ref={wrapRef}>
      <Panel label="RΘEFF TRACE · SINGLE EXPERIMENT · SCHEMATIC" corner={
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag><Pulse color={T.bp} />&nbsp;clean_idle</Tag>
          <Tag accent><Pulse />&nbsp;under_load</Tag>
          <Tag><Pulse color={T.rising} />&nbsp;recovery</Tag>
        </div>
      }>
        <div className="tos-trace-live" style={{ background: T.s0, padding: '0 0 4px' }}>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-label="R-theta time series trace">
            {/* Fine grid lines */}
            {yTicks.map(v => (
              <line key={v} x1={pad.l} x2={W - pad.r} y1={py(v)} y2={py(v)} stroke={T.border} strokeWidth="0.5" />
            ))}

            {/* Region labels */}
            {regions.map(r => (
              <g key={r.label}>
                <line x1={px(r.x0)} x2={px(r.x0)} y1={pad.t} y2={H - pad.b} stroke={T.border} strokeWidth="0.5" strokeDasharray="3 2" />
                <text x={(px(r.x0) + px(r.x1)) / 2} y={pad.t - 4} textAnchor="middle" fontFamily={FM} fontSize="8" fill={r.color} opacity="0.7">{r.label}</text>
              </g>
            ))}

            {/* Threshold lines */}
            <line x1={pad.l} x2={W - pad.r} y1={py(1.28)} y2={py(1.28)} stroke={T.bp} strokeWidth="0.6" strokeDasharray="4 3" opacity="0.5" />
            <line x1={pad.l} x2={W - pad.r} y1={py(0.72)} y2={py(0.72)} stroke={T.healthy} strokeWidth="0.6" strokeDasharray="4 3" opacity="0.5" />

            {/* Y-axis labels */}
            {yTicks.map(v => (
              <text key={v} x={pad.l - 6} y={py(v) + 3.5} textAnchor="end" fontFamily={FM} fontSize="8.5" fill={T.faint}>{v.toFixed(1)}</text>
            ))}
            <text x={pad.l - 6} y={py(2.6) + 3} textAnchor="end" fontFamily={FM} fontSize="8" fill={T.faint}>C/W</text>

            {/* The trace */}
            <polyline
              data-trace
              points={pts}
              fill="none"
              stroke={T.text}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ opacity: 0 }}
            />

            {/* Highlight markers */}
            <circle cx={px(0.3)} cy={py(0.72)} r="3" fill={T.healthy} />
            <text x={px(0.3) + 6} y={py(0.72) - 4} fontFamily={FM} fontSize="9" fill={T.healthy}>0.72</text>
            <circle cx={px(0.63)} cy={py(2.10)} r="3" fill={T.rising} />
            <text x={px(0.63) + 5} y={py(2.10) - 4} fontFamily={FM} fontSize="9" fill={T.rising}>2.10</text>
            <circle cx={px(0)} cy={py(1.28)} r="3" fill={T.bp} />
            <text x={px(0) + 6} y={py(1.28) - 4} fontFamily={FM} fontSize="9" fill={T.bp}>1.28</text>
          </svg>
          <div style={{ padding: '8px 16px 10px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 20 }}>
            <span style={{ fontFamily: FM, fontSize: 10, color: T.faint }}>77.9% separation idle→load</span>
            <span style={{ fontFamily: FM, fontSize: 10, color: T.faint }}>·</span>
            <span style={{ fontFamily: FM, fontSize: 10, color: T.faint }}>recovery R_θ &gt; clean idle — thermal memory</span>
            <span style={{ fontFamily: FM, fontSize: 10, color: T.faint }}>·</span>
            <span style={{ fontFamily: FM, fontSize: 10, color: T.faint }}>E001–E004 · Tesla T4</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ─── Nav ─────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <nav className="tos-nav" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,.07)' : 'transparent'}`, background: scrolled ? 'rgba(9,9,13,.82)' : 'transparent', backdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(160%)' : 'none', transition: 'border-color .3s, background .3s, backdrop-filter .3s', boxShadow: scrolled ? '0 1px 0 rgba(255,255,255,.04)' : 'none' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', height: 54, padding: '0 32px', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <ThetaLogo size={22} variant="full" color={T.healthy} />
          <span style={{ fontFamily: FM, fontSize: 9.5, color: T.bp, border: `1px solid ${T.border}`, borderRadius: 3, padding: '2px 5px' }}>v0</span>
        </div>
        <div className="tos-nav-links" style={{ display: 'flex', gap: 26 }}>
          {['signal', 'engine', 'evidence', 'gap', 'pricing'].map(l => (
            <a key={l} href={`#${l}`} style={{ fontFamily: FM, fontSize: 10.5, letterSpacing: '.04em', color: T.muted, textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.text)}
              onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
              {l}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="https://github.com/Asomisetty27/theta" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FM, fontSize: 10.5, padding: '6px 10px', borderRadius: 4, border: `1px solid ${T.border}`, color: T.muted, textDecoration: 'none', transition: 'border-color .15s, color .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLAnchorElement).style.color = T.text; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = T.border; (e.currentTarget as HTMLAnchorElement).style.color = T.muted; }}>
            <GithubIcon s={12} /> github
          </a>
          <a href="https://pypi.org/project/runtheta/" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FD, fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 4, background: 'linear-gradient(180deg, #F2D788 0%, #D4AF37 55%, #A8852B 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4), inset 0 -1px 0 rgba(0,0,0,.25), 0 2px 12px rgba(212,175,55,.2)', color: '#1A1408', textDecoration: 'none', transition: 'filter .15s, transform .15s, box-shadow .2s' }}
            onMouseEnter={e => { const t = e.currentTarget as HTMLAnchorElement; t.style.filter = 'brightness(1.07)'; t.style.transform = 'translateY(-1px)'; t.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(0,0,0,.25), 0 6px 20px rgba(212,175,55,.38)'; }}
            onMouseLeave={e => { const t = e.currentTarget as HTMLAnchorElement; t.style.filter = 'none'; t.style.transform = 'none'; t.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.4), inset 0 -1px 0 rgba(0,0,0,.25), 0 2px 12px rgba(212,175,55,.2)'; }}>
            install <ArrowRight s={11} />
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ─── Install command — copy-on-click with caret blink ──────────────────── */
function InstallBlock() {
  const [copied, setCopied] = useState(false);
  const cmd = 'pip install runtheta';
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, []);

  return (
    <button
      onClick={copy}
      style={{
        display: 'flex', alignItems: 'center', width: '100%', maxWidth: 440,
        padding: '13px 17px', borderRadius: 6,
        border: `1px solid rgba(212,175,55,.22)`,
        background: 'linear-gradient(135deg, rgba(12,12,18,.9) 0%, rgba(9,9,13,.9) 100%)',
        backdropFilter: 'blur(12px)',
        cursor: 'pointer', fontFamily: FM, fontSize: 13, color: T.text,
        position: 'relative', overflow: 'hidden', textAlign: 'left',
        transition: 'border-color .2s, box-shadow .2s',
        boxShadow: '0 0 0 0.5px rgba(212,175,55,.08) inset',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = T.healthy + '55'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px rgba(212,175,55,.12), 0 0 0 0.5px rgba(212,175,55,.12) inset`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(212,175,55,.22)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0.5px rgba(212,175,55,.08) inset'; }}
      aria-label="Copy install command"
    >
      {/* shimmer sweep */}
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(212,175,55,.06) 50%, transparent 70%)', backgroundSize: '200%', animation: 'tos-shimmer 3s linear infinite', pointerEvents: 'none' }} />
      <span style={{ color: T.healthy, marginRight: 12, userSelect: 'none' }}>$</span>
      <span style={{ flex: 1, color: T.text }}>{cmd}</span>
      <span className="tos-caret" style={{ display: 'inline-block', width: 7, height: 14, background: T.healthy, marginLeft: 4, verticalAlign: 'middle' }} />
      <span style={{
        marginLeft: 14, fontSize: 10, letterSpacing: '.08em',
        color: copied ? T.healthy : T.faint,
        transition: 'color .2s',
        textTransform: 'uppercase',
      }}>
        {copied ? '✓ copied' : 'copy'}
      </span>
    </button>
  );
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */
const HERO_STATS = [
  { v: '3',        l: 'degraded H100s blind-flagged', s: 'production cluster · z up to +15.6' },
  { v: '5 min',    l: 'to detection',        s: '0 false positives · 61 healthy GPUs' },
  { v: '100%',     l: 'classifier acc.',     s: 'Decision Tree + steady-state window' },
];

function Hero() {
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const fadeOut = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  useEffect(() => {
    const root = heroRef.current;
    if (!root || rm()) return;
    animate(root.querySelectorAll('[data-h]'), {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 720,
      delay: stagger(80),
      ease: 'outExpo',
    });
  }, []);

  return (
    <motion.section ref={heroRef} id="hero" style={{ position: 'relative', opacity: fadeOut }}>
      {/* ── Full-width 3D GPU scene (lazy: streams in after first paint) ── */}
      <div style={{ position: 'relative' }}>
        <GPUHeroVideo />
        {/* Top/bottom fades blend canvas into page bg */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to bottom, ${T.bg}, transparent)`, pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: `linear-gradient(to bottom, transparent, ${T.bg})`, pointerEvents: 'none', zIndex: 5 }} />

        {/* ── Left gradient — locks text legibility over any 3D content ── */}
        <div aria-hidden style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: '58%', pointerEvents: 'none', zIndex: 8,
          background: 'linear-gradient(to right, rgba(6,6,10,1) 0%, rgba(6,6,10,0.92) 38%, rgba(6,6,10,0.5) 62%, transparent 100%)',
        }} />

        {/* ── LEFT TEXT PANEL overlaid on canvas ── */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 'clamp(40px, 5.5%, 84px)',
          transform: 'translateY(-50%)',
          zIndex: 10,
          maxWidth: 490,
        }}>
          <div data-h style={{ opacity: 0, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="tos-shimmer-wrap" style={{ display: 'inline-flex', borderRadius: 3 }}>
              <Tag accent><Pulse />&nbsp;v0.1.10 live on PyPI</Tag>
            </span>
            <Tag>MIT licensed · single-node free forever</Tag>
          </div>
          {/* One display family for the whole headline (no mixed faces inside
              an element), floating clean over the scene — showroom text, not
              boxed UI chrome. The corner bracket stays as the calibration mark. */}
          <h1 data-h style={{
            opacity: 0,
            fontFamily: "'Clash Display', 'Satoshi', Inter, system-ui, sans-serif",
            fontSize: 'clamp(38px,4.8vw,66px)',
            fontWeight: 600,
            letterSpacing: '-.035em',
            lineHeight: 0.98,
            marginBottom: 20,
            position: 'relative',
            paddingLeft: 20,
            paddingTop: 12,
          }}>
            <span style={{ position: 'absolute', top: 0, left: 0, width: 16, height: 16, border: `1px solid ${T.amber}`, borderRight: 'none', borderBottom: 'none' }} />
            Thermal forensics<br />for <span className="tos-grad-text">GPU clusters.</span>
          </h1>
          <p data-h style={{
            opacity: 0,
            fontFamily: FD,
            fontSize: 15,
            lineHeight: 1.62,
            color: T.muted,
            maxWidth: 420,
            marginBottom: 18,
          }}>
            Temperature alone is ambiguous — a hot GPU could be busy or failing.
            Theta computes{' '}
            <span style={{ fontFamily: FM, color: T.text, fontSize: 13.5 }}>R_θ = ΔT / P</span>{' '}
            in real time from your DCGM telemetry.
          </p>
          <div data-h style={{ opacity: 0, marginBottom: 14 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: FM, fontSize: 10, letterSpacing: '.04em',
              color: T.healthy, padding: '4px 10px', borderRadius: 4,
              border: `1px solid ${T.healthy}30`,
              background: `${T.healthy}08`,
            }}>
              ● Production-validated · 72× H100 · blind-flagged 3 degraded units
            </span>
          </div>
          <div data-h style={{ opacity: 0, marginBottom: 12 }}>
            <InstallBlock />
          </div>
          <div data-h style={{ opacity: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="https://github.com/Asomisetty27/theta" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 5, border: `1px solid ${T.borderHi}`, background: 'rgba(17,17,23,.85)', backdropFilter: 'blur(8px)', color: T.text, fontFamily: FD, fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'border-color .15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = T.muted)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = T.borderHi)}>
              <GithubIcon /> github
            </a>
            <a href="https://pypi.org/project/runtheta/" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 5, border: `1px solid ${T.borderHi}`, background: 'rgba(17,17,23,.85)', backdropFilter: 'blur(8px)', color: T.text, fontFamily: FD, fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'border-color .15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = T.muted)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = T.borderHi)}>
              pypi
            </a>
          </div>
        </div>
      </div>

      {/* ── STATS ROW — sits below canvas ── */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 80px' }}>
        <div data-h style={{ opacity: 0 }}>
          <div className="tos-hero-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, borderRadius: 6, overflow: 'hidden', background: T.s2 }}>
            {HERO_STATS.map((s, i) => (
              <div key={s.l} style={{
                background: T.s1,
                border: `1px solid ${T.border}`,
                padding: '20px 24px',
                position: 'relative',
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.4)`,
              }}>
                {/* Calibration label */}
                <div style={{ fontFamily: FM, fontSize: 7.5, letterSpacing: '0.22em', color: T.amber, textTransform: 'uppercase', marginBottom: 12, opacity: 0.7 }}>
                  θ {String(i + 1).padStart(2, '0')} / {String(HERO_STATS.length).padStart(2, '0')}
                </div>
                <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', background: 'linear-gradient(135deg, #F0EADC 0%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.v}</div>
                <div style={{ fontFamily: FM, fontSize: 9, color: T.healthy, marginTop: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>{s.l}</div>
                <div style={{ fontFamily: FM, fontSize: 9, color: T.faint, marginTop: 2, letterSpacing: '.02em' }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Signal section ──────────────────────────────────────────────────────── */
const STATE_TABLE = [
  { state: 'clean_idle',          r: '1.28', sub: '±0.21',  pwr: '11.4W', util: '0%',  ps: 'P8', note: 'T_j lags cool junction' },
  { state: 'under_load',          r: '0.72', sub: '±0.08',  pwr: '68.0W', util: '97%', ps: 'P0', note: 'thermal equilibrium' },
  { state: 'zombie_recovery',     r: '1.54', sub: '±0.05',  pwr: '31.6W', util: '0%',  ps: 'P0', note: 'CUDA context retained' },
  { state: 'child_exit_recovery', r: '2.04', sub: '±0.46',  pwr: '12.6W', util: '0%',  ps: '~P8', note: 'T_j lags power drop' },
];

function Signal() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-r]'), { opacity: [0, 1], translateY: [14, 0], duration: 680, delay: stagger(65), ease: 'outExpo' });
  }, [inView]);

  return (
    <section ref={ref} id="signal" className="tos-section-glow-blue" style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
      <ThetaDivider />
      <ShowroomLight intensity={0.7} />
      <ThetaField rings={5} baseR={64} cx="14%" cy="72%" opacity={0.4} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 72, alignItems: 'start' }} className="tos-two-col">
          <div>
            <div data-r style={{ opacity: 0, marginBottom: 16 }}>
              <SectionHead eyebrow="The Signal" title={<>One equation.<br />Four states.<br />Zero hardware.</>}
                body="DCGM exposes T_junction and P_GPU as separate fields and never divides them. R_θ is the one derived quantity every telemetry stack has the ingredients for — and no incumbent computes it." />
            </div>
            <div data-r style={{ opacity: 0, marginTop: 28 }}>
              <Panel label="Why utilization fails" style={{ marginTop: 0 }}>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['zombie_recovery', '0%', '31W', 'CUDA zombie — invisible to util'],
                    ['child_exit_recovery', '0%', '13W', 'clean recovery — invisible to util'],
                    ['clean_idle', '0%', '11W', 'true idle'],
                  ].map(([state, util, pwr, note]) => (
                    <div key={state} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontFamily: FM, fontSize: 10.5, color: T.muted }}>{note}</span>
                      <span style={{ fontFamily: FM, fontSize: 10.5, color: T.text, fontVariantNumeric: 'tabular-nums' }}>util={util}</span>
                      <span style={{ fontFamily: FM, fontSize: 10.5, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{pwr}</span>
                    </div>
                  ))}
                  <p style={{ fontFamily: FM, fontSize: 9.5, color: T.faint, lineHeight: 1.7, marginTop: 4 }}>
                    Three states, identical utilization readings. R_θ separates all three.
                  </p>
                </div>
              </Panel>
            </div>
          </div>
          <div data-r style={{ opacity: 0 }}>
            <Panel label="Rθeff · Formula + Class-Conditional Means · Naive Bayes" corner={<Tag accent>NB acc 99.9%</Tag>}>
              <div style={{ padding: '20px 18px' }}>
                {/* Formula display — clean, no glow */}
                <div style={{ borderRadius: 4, border: `1px solid ${T.border}`, background: T.s0, padding: '20px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 400 80" style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-label="R theta eff formula">
                    <text x="0" y="46" fontFamily={FM} fontSize="22" fill={T.text}>R</text>
                    <text x="14" y="54" fontFamily={FM} fontSize="10" fill={T.muted}>θ,eff</text>
                    <text x="48" y="46" fontFamily={FM} fontSize="17" fill={T.muted}>(t)</text>
                    <text x="80" y="46" fontFamily={FM} fontSize="20" fill={T.text}>=</text>
                    <text x="196" y="32" textAnchor="middle" fontFamily={FM} fontSize="15" fill={T.text}>
                      T<tspan fontSize="9" baselineShift="-30%" fill={T.muted}>junction</tspan>
                      <tspan dx="6">−</tspan>
                      <tspan dx="6">T<tspan fontSize="9" baselineShift="-30%" fill={T.muted}>ref</tspan></tspan>
                    </text>
                    <line x1="106" y1="42" x2="286" y2="42" stroke={T.borderHi} strokeWidth="0.7" />
                    <text x="196" y="66" textAnchor="middle" fontFamily={FM} fontSize="15" fill={T.text}>
                      P<tspan fontSize="9" baselineShift="-30%" fill={T.muted}>GPU</tspan>(t)
                    </text>
                    <text x="302" y="50" fontFamily={FM} fontSize="11" fill={T.faint}>[ °C/W ]</text>
                  </svg>
                </div>
                {/* State table — scroll container so 6 columns can't blow out
                    the single-column mobile grid (grid children min-width: 0) */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontFamily: FM, fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: T.s0 }}>
                      {['STATE', 'R_θ (μ±σ)', 'POWER', 'UTIL', 'P-STATE', 'INTERPRETATION'].map(h => (
                        <th key={h} style={{ borderBottom: `1px solid ${T.border}`, padding: '7px 8px', textAlign: 'left', fontWeight: 400, fontSize: 9, letterSpacing: '.12em', color: T.faint, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {STATE_TABLE.map((row, i) => (
                      <tr key={row.state}
                        className="tos-state-row"
                        style={{ background: i % 2 === 0 ? 'transparent' : T.s0, transition: 'background .2s' }}>
                        <td style={{ padding: '9px 8px', color: T.text, borderBottom: `1px solid ${T.border}`, fontSize: 10.5 }}>{row.state}</td>
                        <td style={{ padding: '9px 8px', color: T.healthy, borderBottom: `1px solid ${T.border}`, fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 500 }}>
                          {row.r}<span style={{ color: T.faint, fontWeight: 400, fontSize: 10 }}> {row.sub}</span>
                        </td>
                        <td style={{ padding: '9px 8px', color: T.muted, borderBottom: `1px solid ${T.border}`, fontVariantNumeric: 'tabular-nums' }}>{row.pwr}</td>
                        <td style={{ padding: '9px 8px', color: T.muted, borderBottom: `1px solid ${T.border}` }}>{row.util}</td>
                        <td style={{ padding: '9px 8px', color: T.muted, borderBottom: `1px solid ${T.border}` }}>{row.ps}</td>
                        <td style={{ padding: '9px 8px', color: T.faint, borderBottom: `1px solid ${T.border}`, fontSize: 10 }}>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Evidence section ────────────────────────────────────────────────────── */
/*
 * Shows the thermal-memory finding from the 7-trial E004 rerun:
 * trials 1–2 (cool start) vs 3–7 (warm start) produce different R_theta.
 * Visualized as horizontal bars — no glow, just fill + border.
 */
const E004_TRIALS = [
  { t: 1, start: 43, loadR: 0.442, recR: 2.28,  pwrRec: 36.6, group: 'A' as const },
  { t: 2, start: 39, loadR: 0.426, recR: 2.69,  pwrRec: 24.5, group: 'A' as const },
  { t: 3, start: 49, loadR: 0.601, recR: 3.13,  pwrRec: 26.5, group: 'B' as const },
  { t: 4, start: 49, loadR: 0.587, recR: 3.15,  pwrRec: 25.5, group: 'B' as const },
  { t: 5, start: 49, loadR: 0.596, recR: 3.12,  pwrRec: 21.4, group: 'B' as const },
  { t: 6, start: 49, loadR: 0.590, recR: 3.11,  pwrRec: 12.3, group: 'B' as const },
  { t: 7, start: 48, loadR: 0.570, recR: 3.10,  pwrRec: 10.3, group: 'B' as const },
];

/* v2 trials — 1800s wait protocol. All trials completed 2026-06-05.
 * T1+T2 at 37°C (cold-start cohort, fresh Colab session).
 * T3 disconnected mid-gate.
 * T4-T8 at 39°C (warm-start cohort, neighbor-tenant warming).
 * The 2°C cohort delta produces a 3.5× recovery-time difference. */
type V2Trial = { t: number; start: number; pwrRec: number | null; pstateRec: number | null; status?: 'disconnect' };
const E004_V2_TRIALS: V2Trial[] = [
  { t: 1, start: 37, pwrRec: 3.2,  pstateRec: 3.0 },
  { t: 2, start: 37, pwrRec: 5.2,  pstateRec: 5.1 },
  { t: 3, start: 41, pwrRec: null, pstateRec: null, status: 'disconnect' },
  { t: 4, start: 39, pwrRec: 15.4, pstateRec: 2.0 },
  { t: 5, start: 39, pwrRec: 16.3, pstateRec: 5.1 },
  { t: 6, start: 39, pwrRec: 14.3, pstateRec: 5.1 },
  { t: 7, start: 39, pwrRec: 14.3, pstateRec: 5.1 },
  { t: 8, start: 39, pwrRec: 13.3, pstateRec: 5.1 },
];

function TrialChart({ metric, max, label, unit }: {
  metric: 'loadR' | 'recR';
  max: number;
  label: string;
  unit: string;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(barRef, { once: true, amount: 0.3 });

  useEffect(() => {
    const root = barRef.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-bar]'), {
      scaleX: [0, 1],
      opacity: [0.2, 1],
      duration: 580,
      delay: stagger(55),
      ease: 'outExpo',
    });
  }, [inView]);

  return (
    <div ref={barRef}>
      <div style={{ fontFamily: FM, fontSize: 9.5, color: T.faint, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>{label}</div>
      {E004_TRIALS.map(tr => {
        const val = tr[metric];
        const pct = (val / max) * 100;
        const isA = tr.group === 'A';
        const barColor = isA ? T.bp : T.healthy;
        return (
          <div key={tr.t} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 52px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: FM, fontSize: 10, color: isA ? T.bp : T.muted }}>T{tr.t} · {tr.start}°</span>
            <div style={{ height: 18, background: T.s3, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
              <div
              data-bar
              title={`Trial ${tr.t} · start ${tr.start}°C · ${metric === 'loadR' ? 'load' : 'recovery'} R_θ = ${val.toFixed(4)} C/W · power recovery ${tr.pwrRec}s`}
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: barColor, borderRadius: 2, transformOrigin: 'left center', cursor: 'help', transition: 'filter .15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.25)')}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.filter = 'brightness(1)')}
            />
            </div>
            <span style={{ fontFamily: FM, fontSize: 11, color: T.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{val.toFixed(3)}{unit}</span>
          </div>
        );
      })}
      <div style={{ fontFamily: FM, fontSize: 9, color: T.faint, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
        <span style={{ color: T.bp }}>■</span> Group A (cool start, 39–43°C) &nbsp;
        <span style={{ color: T.healthy }}>■</span> Group B (warm start, 48–49°C)
      </div>
    </div>
  );
}

/* v2 power-recovery comparison chart — v1 vs v2 side-by-side bars */
function V2PowerRecoveryChart() {
  const barRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(barRef, { once: true, amount: 0.3 });
  const MAX = 40;  // axis max in seconds

  useEffect(() => {
    const root = barRef.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-bar]'), {
      scaleX: [0, 1],
      opacity: [0.2, 1],
      duration: 620,
      delay: stagger(45),
      ease: 'outExpo',
    });
  }, [inView]);

  return (
    <div ref={barRef}>
      <div style={{ fontFamily: FM, fontSize: 9.5, color: T.faint, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>
        Power recovery time (s) · v1 vs v2 · lower is better
      </div>

      {/* v1 row — completed reference */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: FM, fontSize: 10, color: T.bp, marginBottom: 6 }}>v1 · 60s cooldown · 7 trials</div>
        {E004_TRIALS.map(tr => {
          const pct = (tr.pwrRec / MAX) * 100;
          return (
            <div key={`v1-${tr.t}`} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 48px', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: FM, fontSize: 9.5, color: T.faint }}>T{tr.t}</span>
              <div style={{ height: 12, background: T.s3, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <div data-bar
                  title={`v1 T${tr.t} · start ${tr.start}°C · power recovery ${tr.pwrRec}s`}
                  style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: T.bp, borderRadius: 2, transformOrigin: 'left center', cursor: 'help' }} />
              </div>
              <span style={{ fontFamily: FM, fontSize: 10.5, color: T.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{tr.pwrRec}s</span>
            </div>
          );
        })}
      </div>

      {/* v2 row — complete dataset, two thermal-start cohorts */}
      <div>
        <div style={{ fontFamily: FM, fontSize: 10, color: T.healthy, marginBottom: 6 }}>
          v2 · 1800s wait · 7 successful trials &nbsp;
          <span style={{ color: T.healthy, fontSize: 9, letterSpacing: '.06em' }}>
            <span style={{ display: 'inline-block', width: 5, height: 5, background: T.healthy, borderRadius: '50%', marginRight: 4, verticalAlign: 'middle' }} />
            complete · 2026-06-05
          </span>
        </div>
        {E004_V2_TRIALS.map(tr => {
          const hasData = tr.pwrRec !== null;
          const pct = hasData ? (tr.pwrRec! / MAX) * 100 : 0;
          const isDisconnect = tr.status === 'disconnect';
          const cohortColor = hasData && tr.start <= 37 ? T.bp : T.healthy;
          return (
            <div key={`v2-${tr.t}`} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 48px', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: FM, fontSize: 9.5, color: hasData ? cohortColor : T.faint }}>T{tr.t}</span>
              <div style={{
                height: 12, background: T.s3, borderRadius: 2, overflow: 'hidden', position: 'relative',
                border: isDisconnect ? `1px dashed ${T.faint}88` : 'none',
              }}>
                {hasData ? (
                  <div data-bar
                    title={`v2 T${tr.t} · start ${tr.start}°C · power recovery ${tr.pwrRec}s`}
                    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: cohortColor, borderRadius: 2, transformOrigin: 'left center', cursor: 'help' }} />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    fontFamily: FM, fontSize: 9, color: T.faint,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                  }}>disconnect</div>
                )}
              </div>
              <span style={{ fontFamily: FM, fontSize: 10.5, color: hasData ? T.text : T.faint, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {hasData ? `${tr.pwrRec}s` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ fontFamily: FM, fontSize: 9, color: T.faint, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`, lineHeight: 1.6 }}>
        v2 cold-start (37°C, n=2): <span style={{ color: T.bp }}>4.2s</span>. v2 warm-start (39°C, n=5): <span style={{ color: T.healthy }}>14.7s ± 1.1s</span>.&nbsp;
        <span style={{ color: T.healthy, fontWeight: 600 }}>2°C ambient delta → 3.5× recovery time difference.</span>&nbsp;
        Single-variable controlled experiment. Within-condition T&lt;55°C CV: 1.8%.
      </div>
    </div>
  );
}

function Evidence() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-e]'), { opacity: [0, 1], translateY: [14, 0], duration: 680, delay: stagger(70), ease: 'outExpo' });
  }, [inView]);

  return (
    <section ref={ref} id="evidence" className="tos-section-glow-green" style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
      <ThetaDivider />
      <ShowroomLight intensity={0.8} />
      <ThetaField rings={6} baseR={58} cx="86%" cy="16%" opacity={0.44} />
      <div className="tos-grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3, zIndex: 1 }} />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div data-e style={{ opacity: 0, marginBottom: 48 }}>
          <SectionHead eyebrow="Stage 1 Evidence · controlled-variable thermal memory" title={<>2°C ambient delta<br /><span className="tos-grad-text">3.5× recovery</span> time difference.<br />n=8 trials, single-variable design.</>}
            body="E004 v2 (complete 2026-06-11, 8 trials at three thermal-start conditions): 1800s pre-trial wait + uniform start temperature within each cohort. Cold-start cohort (37°C, n=2): 4.2s power recovery. Warm-start cohort (39°C, n=5): 14.7s ± 1.1s — 3.5× within-session. Coldest trial (35°C, n=1, separate session): 8.2s. Within-condition reproducibility T<55°C CV 1.8%, T<42°C CV 1.6% — publication-grade. Same hardware, same workload. The thermal memory effect F1 hypothesized is demonstrated with a designed experiment." />
        </div>
        {/* Evidence grid: custom named areas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: 16 }} className="tos-evidence-grid">
          {/* Top left: load R_theta bars */}
          <div data-e style={{ opacity: 0 }}>
            <Panel glass label="Under-load R_θ · E004 v1 · 7 trials">
              <div style={{ padding: '16px 18px' }}>
                <TrialChart metric="loadR" max={0.8} label="Load R_theta (C/W)" unit=" C/W" />
              </div>
            </Panel>
          </div>
          {/* Top right: recovery R_theta bars */}
          <div data-e style={{ opacity: 0 }}>
            <Panel glass label="Recovery R_θ · post child-exit · 7 trials">
              <div style={{ padding: '16px 18px' }}>
                <TrialChart metric="recR" max={3.6} label="Recovery R_theta (C/W)" unit=" C/W" />
              </div>
            </Panel>
          </div>
          {/* Middle row: v2 power-recovery comparison */}
          <div data-e style={{ opacity: 0, gridColumn: '1 / -1' }}>
            <Panel glass label="F1 dim-2 · controlled-variable: 2°C start-temp delta → 3.5× recovery time">
              <div style={{ padding: '18px 20px' }}>
                <V2PowerRecoveryChart />
              </div>
            </Panel>
          </div>
          {/* Bottom: key numbers — prominent glass card */}
          <div data-e style={{ opacity: 0, gridColumn: '1 / -1' }}>
            <div className="tos-glass" style={{ borderRadius: 6, border: '1px solid rgba(212,175,55,.15)', overflow: 'hidden' }}>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(212,175,55,.1)', background: 'rgba(212,175,55,.04)' }}>
                <span style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: T.faint }}>Key numbers · thermal memory demonstration</span>
              </div>
              <div className="tos-keynum-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
                {[
                  { v: '3.5×',  l: 'recovery delta',    s: '2°C ambient · controlled (F1)' },
                  { v: '1.8%',  l: 'within-group CV',   s: 'T<55°C · warm-start cohort n=5' },
                  { v: '35%',   l: 'R_θ delta',         s: 'cool vs warm start temp (F1)' },
                  { v: '15',    l: 'child-exit trials',  s: 'v1 (7) + v2 (8, cohort complete)' },
                  { v: '9,050', l: 'telemetry rows',    s: 'Stage 1 complete · Tesla T4' },
                ].map((k, i) => (
                  <div key={k.l} style={{ padding: '18px 20px', borderLeft: i > 0 ? `1px solid rgba(255,255,255,.05)` : 'none' }}>
                    <div style={{ fontFamily: FD, fontSize: 30, fontWeight: 600, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums', background: 'linear-gradient(135deg, #e8e8f0 0%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{k.v}</div>
                    <div style={{ fontFamily: FM, fontSize: 10, color: T.text, marginTop: 5 }}>{k.l}</div>
                    <div style={{ fontFamily: FM, fontSize: 9.5, color: T.faint, marginTop: 2 }}>{k.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Production validation (E009 · 72× H100, anonymized pending operator OK) ── */
function ProductionProof() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-p]'), { opacity: [0, 1], translateY: [14, 0], duration: 680, delay: stagger(70), ease: 'outExpo' });
  }, [inView]);

  return (
    // overflow stays visible so the ThetaDivider can straddle the top border;
    // the flow texture below has its own radial mask so nothing bleeds
    <section ref={ref} id="production" className="tos-section-glow-green" style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
      <ThetaDivider />
      <ShowroomLight intensity={1.2} />
      {/* isotherm flow field — behind the glass panels, edge-faded */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 1,
        backgroundImage: "url('/textures/thermal-flow.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: .6,
        maskImage: 'radial-gradient(ellipse 95% 85% at 50% 45%, black 50%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 95% 85% at 50% 45%, black 50%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div data-p style={{ opacity: 0, marginBottom: 48 }}>
          <SectionHead eyebrow="Production validation · 72× H100 SXM5 · June 2026"
            title={<>Blind-tested on a production<br />H100 cluster. <span className="tos-grad-text">It worked.</span></>}
            body="Telemetry from a major US research university's H100 cluster, captured during a real cooling incident. Without access to maintenance records, peer-relative R_θ flagged 3 degraded units — including one at 72°C that no temperature threshold can catch, because dozens of healthy GPUs in the same fleet run hotter. Detection used only the temp/power/util metrics SLURM/jobstats already exports to Prometheus — runnable today on a job ID with theta report." />
        </div>

        {/* stat row */}
        <div data-p style={{ opacity: 0, marginBottom: 16 }}>
          <div className="tos-glass" style={{ borderRadius: 6, border: '1px solid rgba(212,175,55,.15)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
              {[
                { v: '3',      l: 'units blind-flagged',  s: 'z = +15.6 / +4.4 / +3.2 · bootstrap-robust' },
                { v: '5 min',  l: 'to detection',         s: 'of steady load · severe unit at z=+17' },
                { v: '0',      l: 'false positives',      s: '61 healthy GPUs · 36-config sweep' },
                { v: '−3%',    l: 'sim vs silicon',       s: 'predicted H100 R_θ confirmed at matched load' },
                { v: '72°C',   l: 'the invisible fault',  s: '+16% R_θ vs peers · no temp alert fires' },
              ].map((k, i) => (
                <div key={k.l} style={{ padding: '18px 20px', borderLeft: i > 0 ? `1px solid rgba(255,255,255,.05)` : 'none' }}>
                  <div style={{ fontFamily: FD, fontSize: 30, fontWeight: 600, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums', background: 'linear-gradient(135deg, #e8e8f0 0%, #D4AF37 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{k.v}</div>
                  <div style={{ fontFamily: FM, fontSize: 10, color: T.text, marginTop: 5 }}>{k.l}</div>
                  <div style={{ fontFamily: FM, fontSize: 9.5, color: T.faint, marginTop: 2 }}>{k.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* case + attribution + ops cost */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div data-p style={{ opacity: 0 }}>
            <Panel glass label="The case that proves the thesis">
              <div style={{ padding: '16px 18px' }}>
                <p style={{ fontFamily: FD, fontSize: 13, lineHeight: 1.65, color: T.muted, marginBottom: 14 }}>
                  One unit ran at 72°C — within 1°C of healthy GPUs elsewhere in the fleet.
                  Temperature-based monitoring is structurally blind to it. R_θ vs board-mates flagged it immediately:
                </p>
                <Codeblock lines={[
                  { p: '!', t: 'GPU 6 · cooling degradation', tone: 'caution' },
                  { p: '·', t: 'T=72°C · looks healthy fleet-wide' },
                  { p: '·', t: 'R_θ +16% vs node peers · z=+4.4' },
                  { p: '·', t: 'power draw NORMAL → cooling, not silicon' },
                  { p: '→', t: 'inspect airflow / TIM before throttle', tone: 'healthy' },
                ]} />
              </div>
            </Panel>
          </div>
          <div data-p style={{ opacity: 0 }}>
            <Panel glass label="Fault type from curve shape — before opening the chassis">
              <div style={{ padding: '16px 18px' }}>
                <p style={{ fontFamily: FD, fontSize: 13, lineHeight: 1.65, color: T.muted, marginBottom: 14 }}>
                  The three flagged units have three distinct R_θ signatures — constant offset
                  (airflow fault), slope increase (TIM/contact fault), heavy-tailed noise
                  (intermittent) — so the alert ships with a probable cause:
                </p>
                <Codeblock lines={[
                  { p: '1', t: 'offset +22°C, slope normal → airflow/inlet', tone: 'critical' },
                  { p: '2', t: 'slope +15% vs peers → TIM / die contact', tone: 'caution' },
                  { p: '3', t: 'heavy tails, mild offset → intermittent' },
                ]} />
              </div>
            </Panel>
          </div>
          <div data-p style={{ opacity: 0 }}>
            <Panel glass label="What an undetected unit costs">
              <div style={{ padding: '16px 18px' }}>
                <p style={{ fontFamily: FD, fontSize: 13, lineHeight: 1.65, color: T.muted, marginBottom: 10 }}>
                  Per-GPU digital twin (calibrated on the measured data): the severe unit hits
                  the 85°C slowdown at full TDP with inlet ≥28°C — <span style={{ color: T.text }}>inside the 5–30°C
                  facility spec</span>. In synchronous training the slowest GPU gates all 64:
                </p>
                <Codeblock lines={[
                  { p: '·', t: 'inlet 30°C → job at 96.7% · ~$3.0k/mo wasted', tone: 'caution' },
                  { p: '·', t: 'inlet 35°C → job at 86.8% · ~$12.2k/mo', tone: 'critical' },
                  { p: '·', t: 'runs 3.0× thermal aging vs fleet median' },
                  { p: '→', t: 'detected in 5 min · replaced on schedule', tone: 'healthy' },
                ]} />
              </div>
            </Panel>
          </div>
        </div>

        <div data-p style={{ opacity: 0, marginTop: 18 }}>
          <p style={{ fontFamily: FM, fontSize: 10.5, lineHeight: 1.7, color: T.faint, maxWidth: 760 }}>
            Honesty footnote: the 3 flags are blind predictions — confirmation against the operator's
            RMA records is pending. Cluster identity withheld pending operator approval. Cost figures are
            modeled (twin RMSE 3.9°C, R²=0.81), assumptions: $2/GPU-hr, 85°C slowdown onset, perf ∝ P^0.45.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Features grid (named-area layout) ──────────────────────────────────── */
function FeaturesGrid() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-f]'), { opacity: [0, 1], translateY: [12, 0], duration: 640, delay: stagger(60), ease: 'outExpo' });
  }, [inView]);

  return (
    <section ref={ref} id="features" className="tos-section-glow-blue" style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
      <ThetaDivider />
      <ShowroomLight intensity={0.8} />
      <ThetaField rings={5} baseR={66} cx="82%" cy="80%" opacity={0.42} glow={false} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div data-f style={{ opacity: 0, marginBottom: 48 }}>
          <SectionHead eyebrow="Capabilities" title={<>Built for fleets<br />NVIDIA won&apos;t serve.</>}
            body="Mission Control ships only on Blackwell DGX/GB200 systems. The long tail of mixed-vendor, older-gen neocloud fleets is structurally out of reach. That's the lane." />
        </div>
        {/* 12-column named-area bento */}
        <div className="tos-features-grid" style={{ display: 'grid', gap: 12 }}>
          {/* Row 1: drift (7) + zombie (5) */}
          <div data-f className="tos-feat-drift" style={{ opacity: 0 }}>
            <FeatureCard title="Drift detection, not thresholds" index="01">
              <p style={{ fontFamily: FD, fontSize: 13, lineHeight: 1.65, color: T.muted, marginBottom: 16 }}>
                <span style={{ fontFamily: FM, color: T.text }}>baseline_mean + k·σ</span>{' '}
                sustained over a steady-state window. Flags cooling degradation relative to the GPU's own healthy baseline — no hard-coded absolutes that go stale by generation.
              </p>
              <DriftViz />
            </FeatureCard>
          </div>
          <div data-f className="tos-feat-zombie" style={{ opacity: 0 }}>
            <FeatureCard title="Zombie-GPU detection (F6)" index="02" tone="critical">
              <p style={{ fontFamily: FD, fontSize: 13, lineHeight: 1.65, color: T.muted, marginBottom: 14 }}>
                CUDA context retention keeps GPUs drawing 30–31W at 0% utilization. Invisible to DCGM. R_θ catches the stuck P-state directly.
              </p>
              <Codeblock lines={[
                { p: '!', t: 'GPU 2 · stuck P0', tone: 'critical' },
                { p: '·', t: 'util=0% · P=31.2W · ΔT=41°C' },
                { p: '·', t: 'R_θ=1.54 · expected ≤0.80' },
                { p: '→', t: 'release CUDA context', tone: 'caution' },
              ]} />
            </FeatureCard>
          </div>
          {/* Row 2: ambient (4) + cross-vendor (4) + oss (4) */}
          <div data-f className="tos-feat-ambient" style={{ opacity: 0 }}>
            <FeatureCard title="Virtual ambient" index="03">
              <p style={{ fontFamily: FD, fontSize: 13, lineHeight: 1.65, color: T.muted, marginBottom: 14 }}>
                T_reference derived from the GPU's own idle windows. No thermocouples, no rack mods.
              </p>
              <Codeblock lines={[
                { p: '>', t: 'theta baseline --gpu 0' },
                { p: '·', t: 'T_ref locked @ 41.2°C σ=0.18' },
                { p: '✓', t: 'no thermocouple required', tone: 'healthy' },
              ]} />
            </FeatureCard>
          </div>
          <div data-f className="tos-feat-vendor" style={{ opacity: 0 }}>
            <FeatureCard title="Cross-vendor" index="04">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { v: 'NVIDIA', p: 'DCGM / pynvml',  s: 'live',         c: T.healthy },
                  { v: 'AMD',    p: 'ROCm / amd-smi', s: 'v1 · q4 2026', c: T.caution },
                  { v: 'Intel',  p: 'oneAPI / xpu-smi', s: 'scoped',       c: T.faint },
                ].map(row => (
                  <div key={row.v} style={{ display: 'flex', justifyContent: 'space-between', borderRadius: 3, border: `1px solid ${T.border}`, background: T.s2, padding: '7px 10px', fontFamily: FM, fontSize: 11 }}>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: T.text }}>{row.v}</span>
                      <span style={{ color: T.faint }}>{row.p}</span>
                    </span>
                    <span style={{ color: row.c }}>{row.s}</span>
                  </div>
                ))}
              </div>
            </FeatureCard>
          </div>
          <div data-f className="tos-feat-oss" style={{ opacity: 0 }}>
            <FeatureCard title="OSS agent — single node free" index="05" tone="healthy">
              <p style={{ fontFamily: FD, fontSize: 13, lineHeight: 1.65, color: T.muted, marginBottom: 14 }}>
                <span style={{ fontFamily: FM, color: T.text }}>pip install runtheta</span> — 60 seconds to first R_θ reading.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {['Free · single node · live readout', 'Paid · per-job R_θ reports (SLURM/jobstats)', 'Paid · cross-node peer detection + alerts'].map((f, i) => (
                  <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: FM, fontSize: 10.5, color: T.muted }}>
                    <span style={{ color: i === 0 ? T.healthy : T.faint, fontSize: 9 }}>▶</span>
                    {f}
                  </div>
                ))}
              </div>
            </FeatureCard>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Agent pipeline — "how it works" ─────────────────────────────────────────
 *
 * The seven real processing stages of the agent, every 5 s. Higgsfield-rendered
 * pipeline plate as the atmospheric band; the stages stagger in on scroll and a
 * champagne pulse travels the flow line beneath them. Copy is accurate to the
 * shipped agent (collector → R_θ → steady-state window → classifier → detectors
 * → governor → surfaces).
 */
const PIPELINE_STAGES = [
  {
    n: '01', name: 'Collect', code: 'pynvml / DCGM · 5s',
    desc: 'T_junction, power, util, P-state — NVIDIA & AMD, no kernel module.',
    deep: 'A hardware-abstraction layer picks the backend at startup — pynvml/DCGM for NVIDIA, amdsmi for AMD — and streams one sample per GPU every 5 seconds on an async loop. A self-healing layer re-initializes a GPU handle after 3 consecutive read failures instead of dying, and per-GPU poll latency is tracked as an early hang signal. MIG and vGPU are detected at init, so R_θ is computed per physical die and never fabricated for a guest that can’t read power.',
    spec: [
      'HAL → NVMLCollector | ROCmCollector | demo',
      'RawSample { temp_junction, power_w, util_pct,',
      '            perf_state, clock_sm/mem, ecc_sbit/dbit,',
      '            throttle_reasons, poll_latency_s }',
      'interval 5s · async · self-heal after 3 misses',
      'MIG → per physical die · vGPU → TelemetryUnavailable',
    ],
  },
  {
    n: '02', name: 'Compute R_θ', code: 'ΔT / P', glyph: true,
    desc: 'Effective thermal resistance. Virtual ambient T_ref from the GPU’s own idle — no thermocouple.',
    deep: 'R_θ is thermal resistance — how many degrees the die heats per watt it burns. The hard part is T_ref (inlet/ambient): there’s usually no sensor, so Theta derives a virtual ambient from the GPU’s own stable idle windows and locks it. The computation refuses to return nonsense — below 5 W or under 0.5 °C of ΔT it yields no value rather than a garbage ratio. R_θ is most T_ref-sensitive at idle (a 5 °C error swings it ~35%) and robust under load (~10%), so detection leans on under-load and peer-relative comparison, where T_ref cancels entirely.',
    spec: [
      'R_θ = (T_junction − T_ref) / P_GPU      [°C/W]',
      'T_ref = virtual ambient, locked from idle windows',
      'guards: P ≥ 5 W and ΔT ≥ 0.5 °C, else skip',
      'sensitivity (F2): 5 °C T_ref error',
      '  → 35% swing idle · 10% under load',
    ],
  },
  {
    n: '03', name: 'Steady-state window', code: 'σ < 0.03 C/W',
    desc: 'Classify only on stable windows — lifts accuracy 84% → 99.8%, kills transients.',
    deep: 'R_θ only means something at thermal equilibrium — during a load ramp it’s transiently inflated and meaningless. So classification runs on a 15-second rolling window and only fires when that window is stable: standard deviation under 0.03 °C/W. On the Stage-1 Tesla T4 data this single gate took Naive Bayes accuracy from 84% to 99.8% and eliminated transient false positives — the cheapest, highest-leverage filter in the pipeline.',
    spec: [
      'window = 15 s rolling, per GPU',
      'stable iff σ(R_θ) < 0.03 °C/W',
      'classification runs ONLY on stable windows',
      'measured effect: NB accuracy 84% → 99.8%',
    ],
  },
  {
    n: '04', name: 'Classify', code: 'Decision Tree', states: true,
    desc: 'Four states: clean idle · under load · CUDA zombie · recovery.',
    deep: 'A Decision Tree — chosen because its rules are human-readable and publishable, not a black box — maps a stable window to one of four states. Trained on 4,570 rows of Stage-1 T4 telemetry, it reaches 100% 5-fold cross-validation accuracy on steady-state samples. The thresholds are T4-specific; on other silicon `theta calibrate` measures the hardware’s own R_θ thresholds, so a healthy B200 (R_θ ≈ 0.27) isn’t misread as permanently idle against a T4’s 0.87 cut.',
    spec: [
      'IF R_θ ≤ 0.87          → under_load',
      'IF R_θ > 0.87 ∧ P0     → zombie_recovery',
      'IF R_θ > 1.50 ∧ P8     → child_exit_recovery',
      'ELSE                   → clean_idle / recovery',
      'trained 4,570 rows · 100% 5-fold CV',
      'non-T4 hardware → theta calibrate',
    ],
  },
  {
    n: '05', name: 'Detect', code: 'temporal + peer',
    desc: 'Drift vs the GPU’s own baseline, plus peer-relative vs node-mates — no warm-up.',
    deep: 'Two complementary detectors. The temporal one compares each GPU to its OWN rolling healthy baseline and flags R_θ above mean + k·σ sustained over consecutive windows, with a robust Theil-Sen slope projecting an ETA to the threshold. Its blind spot — it needs warm-up and can’t see a unit degraded since startup — is closed by the peer-relative detector: cross-sectional, comparing each GPU to its matched-power node-mates via median/MAD robust-z, no warm-up. Across a fleet, two-way (node × ordinal) median polish first removes HGX baseboard-position structure. On real Princeton H100s this blind-flagged 3 degraded units — one invisible to any temperature threshold.',
    spec: [
      'temporal: R_θ > μ + k·σ sustained',
      '  k_warn 2.0 · k_crit 3.5 · baseline ≥ 20 samples',
      '  Theil-Sen slope → ETA-to-threshold',
      'peer: robust-z = (R_θ − median)/(1.4826·MAD)',
      '  matched power ±15% · self-disables < 4 peers',
      'fleet: node×ordinal median polish (E009: 3/3, 0 FP)',
    ],
  },
  {
    n: '06', name: 'Govern', code: 'trust layer',
    desc: 'First-run warming + a false-positive circuit breaker — zero false alarms hour-one.',
    deep: 'Before any inferential alert reaches a human it passes the governor — the layer that earns first-run trust. On a freshly-seen GPU, R_θ-derived alerts are HELD while the baseline establishes (“learning, not yet confident”); ground-truth hardware faults (ECC, Xid, throttle) bypass and fire immediately. An active critical inhibits lower-severity alerts on the same GPU. And a false-positive circuit breaker watches the per-GPU alert rate — exceed the budget and that’s evidence of miscalibration, so the agent goes quiet on that GPU and fires exactly ONE meta-alert recommending `theta calibrate`, instead of spraying wrong alarms. One false-alarm thread kills OSS adoption; this is the discipline that prevents it.',
    spec: [
      'warming: hold inferential alerts until baseline set',
      'inhibit: active critical suppresses sub-critical',
      'FP budget: > 12 inferential/hr/GPU → trip breaker',
      '  → suppress + 1 meta-alert "run theta calibrate"',
      'ground-truth (ECC/Xid/throttle) bypass — always fire',
    ],
  },
  {
    n: '07', name: 'Surface', code: 'act on it',
    desc: 'Alerts (Slack · PagerDuty · Opsgenie), health conditions, Prometheus & OTLP.',
    deep: 'What survives the governor fans out. Alerts route to stdout, Slack, a generic webhook, PagerDuty (Events API v2) and Opsgenie (Alert API) — with sliding-window dedup and stable keys, so a re-fire updates one incident instead of spawning new ones. Orthogonally, per-GPU health conditions (the node-problem-detector pattern) hand schedulers a single `schedulable` flag plus the reason and since-when. Every signal also exports to Prometheus and OpenTelemetry/OTLP, and an MCP server lets an operator’s LLM copilot ask “which GPUs are degrading, and why.”',
    spec: [
      'alerts: stdout · Slack · webhook · PagerDuty · Opsgenie',
      '  sliding-window dedup + stable keys → one incident',
      'health: /api/v1/conditions · schedulable flag (NPD)',
      'metrics: Prometheus + OpenTelemetry / OTLP',
      'ai-native: MCP server for LLM ops copilots',
    ],
  },
];

function AgentPipeline() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-ap]'), {
      opacity: [0, 1], translateY: [14, 0], duration: 560,
      delay: stagger(70), ease: 'outExpo',
    });
    const pulse = root.querySelector('[data-ap-pulse]');
    if (pulse) animate(pulse, { offsetDistance: ['0%', '100%'], opacity: [0, 1, 1, 0], duration: 2600, delay: 500, ease: 'inOutSine', loop: true });
  }, [inView]);

  return (
    <section ref={ref} id="engine" className="tos-section-glow-green" style={{ borderTop: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
      <ThetaDivider />
      <ShowroomLight intensity={0.7} />
      {/* Higgsfield-rendered pipeline plate — telemetry converging at the R_θ core */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <img src="/textures/agent-pipeline.png" alt="" loading="lazy"
          style={{
            position: 'absolute', top: '7%', left: '50%', transform: 'translateX(-50%)',
            width: 'min(1180px, 92%)', opacity: 0.5,
            maskImage: 'radial-gradient(ellipse 70% 80% at 50% 42%, #000 35%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 42%, #000 35%, transparent 78%)',
          }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div data-ap style={{ opacity: 0, marginBottom: 56 }}>
          <SectionHead eyebrow="Inside the engine"
            title={<>From raw telemetry to a<br /><span className="tos-grad-text">verdict</span>, every 5 seconds.</>}
            body="No black box. R_θ is computed and audited through seven deterministic stages — each one publishable, each one a place the agent earns trust before it ever fires an alert." />
        </div>

        {/* the flow line + traveling pulse (behind the stage row, desktop only) */}
        <div className="tos-pipe-flow" aria-hidden>
          <span data-ap-pulse className="tos-pipe-pulse" />
        </div>

        <div className="tos-pipe-grid">
          {PIPELINE_STAGES.map((s, i) => {
            const isOpen = active === i;
            return (
              <button
                key={s.n} data-ap type="button"
                aria-expanded={isOpen}
                onClick={() => setActive(isOpen ? null : i)}
                className={`tos-pipe-stage${isOpen ? ' is-active' : ''}`}
                style={{ opacity: 0 }}
              >
                <div className="tos-pipe-node">
                  {s.glyph ? <ThetaGlyph size={16} /> : <span style={{ fontFamily: FM, fontSize: 11, color: T.amber, letterSpacing: '.04em' }}>{s.n}</span>}
                </div>
                <div style={{ fontFamily: "'Clash Display','Satoshi',Inter,sans-serif", fontSize: 15, fontWeight: 600, color: T.text, letterSpacing: '-.02em', marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontFamily: FM, fontSize: 9, color: T.amber, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 9 }}>{s.code}</div>
                <div style={{ fontFamily: FD, fontSize: 12, lineHeight: 1.55, color: T.muted }}>{s.desc}</div>
                {s.states && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {[T.bp, T.healthy, T.critical, T.caution].map((c, j) => (
                      <span key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}55` }} />
                    ))}
                  </div>
                )}
                <span className="tos-pipe-expand" aria-hidden>{isOpen ? '− close' : '+ how it works'}</span>
              </button>
            );
          })}
        </div>

        {/* detail panel — opens on click, exact mechanism of the chosen stage */}
        {active !== null && (() => {
          const s = PIPELINE_STAGES[active];
          return (
            <div key={active} className="tos-pipe-detail" role="region" aria-label={`${s.name} — detail`}>
              <Panel glass label={`Stage ${s.n} · ${s.name} — exact mechanism`}>
                <div className="tos-pipe-detail-grid" style={{ padding: '20px 22px' }}>
                  <p style={{ fontFamily: FD, fontSize: 14, lineHeight: 1.72, color: T.muted, margin: 0 }}>{s.deep}</p>
                  <div style={{
                    fontFamily: FM, fontSize: 11.5, lineHeight: 1.85, color: T.platinum,
                    background: '#08080C', border: `1px solid ${T.border}`, borderRadius: 5,
                    padding: '14px 16px', whiteSpace: 'pre', overflowX: 'auto',
                  }}>
                    {s.spec.map((line, j) => (
                      <div key={j} style={{ color: line.trim().startsWith('//') || line.startsWith('  ') ? T.faint : T.platinum }}>{line}</div>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          );
        })()}

        {/* engineering-facts strip */}
        <div data-ap style={{ opacity: 0, marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 0, borderRadius: 6, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.s1 }}>
          {[
            { v: '< 1%', l: 'CPU overhead', s: 'no GPU contention' },
            { v: '5 s', l: 'control loop', s: 'per-GPU, async' },
            { v: '214', l: 'tests', s: 'every stage pinned' },
            { v: 'MIT', l: 'licensed', s: 'single node free forever' },
          ].map((k, i) => (
            <div key={k.l} style={{ flex: '1 1 160px', padding: '16px 20px', borderLeft: i > 0 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', background: 'linear-gradient(135deg,#F0EADC,#D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{k.v}</div>
              <div style={{ fontFamily: FM, fontSize: 9.5, color: T.text, marginTop: 5, letterSpacing: '.06em', textTransform: 'uppercase' }}>{k.l}</div>
              <div style={{ fontFamily: FM, fontSize: 9, color: T.faint, marginTop: 2 }}>{k.s}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, index, tone, children }: {
  title: string;
  index: string;
  tone?: 'critical' | 'healthy';
  children: React.ReactNode;
}) {
  const accent = tone === 'critical' ? T.critical : tone === 'healthy' ? T.healthy : T.bp;
  return (
    <div className="tos-feat-card tos-shimmer-wrap" style={{
      height: '100%',
      border: `1px solid ${T.border}`,
      borderTop: `1.5px solid ${accent}55`,
      borderRadius: 6,
      background: `linear-gradient(160deg, ${T.s1} 0%, ${T.s0} 100%)`,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Subtle gradient tint behind the top edge */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: `radial-gradient(ellipse 60% 60% at 50% -20%, ${accent}0D, transparent)`, pointerEvents: 'none' }} />
      <div style={{ padding: 22, position: 'relative' }}>
        <div className="tos-feat-index" style={{ fontFamily: FM, fontSize: 9.5, color: accent, letterSpacing: '.12em', marginBottom: 10, transition: 'color .2s' }}>{index} · CAPABILITY</div>
        <h3 style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, letterSpacing: '-.01em', color: T.text, marginBottom: 14 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function DriftViz() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const samples = [40, 40, 41, 41, 42, 43, 44, 46, 50, 56, 64, 74, 82, 90];
  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-bar]'), { scaleY: [0, 1], opacity: [0.15, 1], duration: 580, delay: stagger(28), ease: 'outExpo' });
  }, [inView]);
  return (
    <div ref={ref} style={{ borderRadius: 4, border: `1px solid ${T.border}`, background: T.s2, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: FM, fontSize: 9.5, color: T.faint }}>R_θ · 14-sample window</span>
        <span style={{ fontFamily: FM, fontSize: 9.5, color: T.rising }}>+38% drift detected</span>
      </div>
      <div style={{ position: 'relative', height: 70 }}>
        <svg viewBox="0 0 280 70" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}>
          <line x1="0" y1={70 - 50} x2="280" y2={70 - 50} stroke={T.caution} strokeWidth="0.7" strokeDasharray="3 2" opacity="0.5" />
          <line x1="0" y1={70 - 42} x2="280" y2={70 - 42} stroke={T.healthy} strokeWidth="0.7" strokeDasharray="2 2" opacity="0.4" />
          {samples.map((v, i) => {
            const c = v > 80 ? T.critical : v > 60 ? T.rising : v > 48 ? T.caution : T.healthy;
            return <rect data-bar key={i} x={4 + i * 20} y={70 - v} width={13} height={v} fill={c} opacity="0.9" rx="1" style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }} />;
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontFamily: FM, fontSize: 9, color: T.faint }}>baseline 0.72</span>
        <span style={{ fontFamily: FM, fontSize: 9, color: T.faint }}>k·σ alert</span>
        <span style={{ fontFamily: FM, fontSize: 9, color: T.critical }}>1.85 critical</span>
      </div>
    </div>
  );
}

function Codeblock({ lines }: { lines: Array<{ p: string; t: string; tone?: string }> }) {
  const toneColor: Record<string, string> = { healthy: T.healthy, critical: T.critical, caution: T.caution };
  return (
    <div style={{ borderRadius: 4, border: `1px solid ${T.border}`, background: T.s0, padding: '11px 13px', fontFamily: FM, fontSize: 11, lineHeight: 1.7 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: l.tone ? toneColor[l.tone] : T.faint, width: 12, flexShrink: 0 }}>{l.p}</span>
          <span style={{ color: l.tone ? toneColor[l.tone] : T.muted }}>{l.t}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Competitor table ────────────────────────────────────────────────────── */
type Mark = 'yes' | 'no' | 'partial';
const CMP_COLS = ['DCGM', 'Mission Control', 'Phaidra', 'In-house', 'Theta'];
const CMP_ROWS: { cap: string; cells: Mark[] }[] = [
  { cap: 'Exposes T_junction + P_GPU',         cells: ['yes', 'yes', 'partial', 'partial', 'yes'] },
  { cap: 'Computes R_θ (ΔT / P)',              cells: ['no', 'no', 'no', 'no', 'yes'] },
  { cap: 'Separates busy-hot vs failing-hot',  cells: ['no', 'no', 'no', 'no', 'yes'] },
  { cap: 'Drift detector (baseline + k·σ)',    cells: ['no', 'no', 'partial', 'no', 'yes'] },
  { cap: 'CUDA-context aware (zombie GPU)',     cells: ['no', 'no', 'no', 'no', 'yes'] },
  { cap: 'Cross-vendor (NVIDIA live, AMD roadmap)', cells: ['no', 'no', 'partial', 'partial', 'partial'] },
  { cap: 'Peer-relative fleet detection',       cells: ['no', 'no', 'no', 'no', 'yes'] },
  { cap: 'Per-job R_θ report (SLURM/jobstats)', cells: ['no', 'no', 'no', 'no', 'yes'] },
  { cap: 'Virtual ambient (zero hardware)',     cells: ['no', 'no', 'no', 'no', 'yes'] },
  { cap: 'Serves neocloud / mixed fleets',     cells: ['yes', 'no', 'no', 'partial', 'yes'] },
  { cap: 'Open-source agent',                  cells: ['yes', 'no', 'no', 'no', 'yes'] },
];

function MarkCell({ m, us }: { m: Mark; us: boolean }) {
  if (m === 'yes') return <span style={{ fontFamily: FM, fontSize: us ? 14 : 12, color: us ? T.healthy : T.muted, fontWeight: us ? 600 : 400 }}>●</span>;
  if (m === 'no')  return <span style={{ fontFamily: FM, fontSize: 12, color: T.faint }}>○</span>;
  return <span style={{ fontFamily: FM, fontSize: 12, color: T.caution }}>◐</span>;
}

function CompetitorTable() {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-c]'), { opacity: [0, 1], translateY: [12, 0], duration: 640, delay: stagger(65), ease: 'outExpo' });
  }, [inView]);
  const us = CMP_COLS.length - 1;
  return (
    <section ref={ref} id="gap" style={{ borderTop: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
      <ThetaDivider />
      {/* Dramatic signature backdrop — Higgsfield-rendered isotherm field: the
          θ construction as a real thermal contour map (champagne rings + the
          calibration crossbar through a center ellipse). Used ONLY on this
          emotional beat ("none compute R_θ"); the data-dense sections keep the
          lighter SVG ThetaField. The asset's own bg is obsidian, so it blends
          seamlessly; the radial mask fades it into the section. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <img
          src="/textures/isotherm-field.png"
          alt=""
          loading="lazy"
          style={{
            position: 'absolute', top: '50%', right: '-6%', transform: 'translateY(-50%)',
            width: 'min(1180px, 78%)', opacity: 0.6,
            maskImage: 'radial-gradient(ellipse 62% 70% at 56% 50%, #000 30%, transparent 74%)',
            WebkitMaskImage: 'radial-gradient(ellipse 62% 70% at 56% 50%, #000 30%, transparent 74%)',
          }}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div data-c style={{ opacity: 0, marginBottom: 48 }}>
          <SectionHead eyebrow="The Gap" title={<>NVIDIA ships three<br />telemetry products.<br />None compute R<sub>θ</sub>.</>}
            body="DCGM, Mission Control, and NVIDIA's newest fleet agent all expose T and P as separate fields. The ratio — the signal — is absent from every incumbent." />
        </div>
        <div data-c style={{ opacity: 0 }}>
          <Panel label="Capability matrix · 2026-06">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FM, fontSize: 11.5 }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: `1px solid ${T.border}`, padding: '14px 20px', textAlign: 'left', fontWeight: 400, fontSize: 9.5, color: T.faint, textTransform: 'uppercase', letterSpacing: '.12em' }}>CAPABILITY</th>
                    {CMP_COLS.map((c, i) => (
                      <th key={c} className={i === us ? 'tos-cmp-us' : undefined} style={{ borderBottom: `1px solid ${i === us ? T.healthy : T.border}`, padding: '14px 12px', textAlign: 'center', fontWeight: 400, fontSize: 9.5, color: i === us ? T.healthy : T.faint, background: i === us ? T.healthy + '08' : 'transparent', textTransform: 'uppercase', letterSpacing: '.1em' }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CMP_ROWS.map((row, ri) => (
                    <tr key={row.cap} style={{ background: ri % 2 === 1 ? T.s0 : 'transparent' }}>
                      <td style={{ borderBottom: `1px solid ${T.border}`, padding: '12px 20px', color: T.text }}>{row.cap}</td>
                      {row.cells.map((m, ci) => (
                        <td key={ci} className={ci === us ? 'tos-cmp-us' : undefined} style={{ borderBottom: `1px solid ${ci === us ? T.healthy + '44' : T.border}`, padding: '12px', textAlign: 'center', background: ci === us ? T.healthy + '06' : 'transparent' }}>
                          <MarkCell m={m} us={ci === us} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, padding: '12px 20px', display: 'flex', gap: 20 }}>
              {[{ m: 'yes' as Mark, l: 'shipped' }, { m: 'partial' as Mark, l: 'partial' }, { m: 'no' as Mark, l: 'absent' }].map(({ m, l }) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FM, fontSize: 10, color: T.faint }}>
                  <MarkCell m={m} us={false} /> {l}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */
const PRICING_FEATS = ['Fleet R_θ dashboard', 'Drift alerts + incident log', 'Cross-node correlation', 'Power-cap optimization', 'Telemetry dataset access', 'Priority Slack support'];

function useCountUp(value: number, fmt: (n: number) => string) {
  const el = useRef<HTMLDivElement | null>(null);
  const prev = useRef(value);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (rm()) { node.textContent = fmt(value); prev.current = value; return; }
    const state = { v: prev.current };
    animate(state, { v: value, duration: 380, ease: 'outCubic', onUpdate: () => { node.textContent = fmt(state.v); }, onComplete: () => { prev.current = value; node.textContent = fmt(value); } });
  }, [value, fmt]);
  return el;
}

function Pricing() {
  const ref = useRef<HTMLElement | null>(null);
  // amount kept low: the section is ~1000px tall, so a 0.2 threshold left the
  // header + card invisible for most of the first viewport of scrolling
  const inView = useInView(ref, { once: true, amount: 0.05 });
  const [annual, setAnnual] = useState(true);
  const [gpus, setGpus] = useState(80);
  const { price, period, saved } = useMemo(() => {
    const mo = gpus * 4;
    if (annual) { const yr = Math.round(mo * 12 * 0.75); return { price: yr, period: 'year', saved: mo * 12 - yr }; }
    return { price: mo, period: 'month', saved: 0 };
  }, [annual, gpus]);
  const fmt = useCallback((n: number) => `$${Math.round(n).toLocaleString()}`, []);
  const priceRef = useCountUp(price, fmt);

  useEffect(() => {
    const root = ref.current;
    if (!root || !inView || rm()) return;
    animate(root.querySelectorAll('[data-p]'), { opacity: [0, 1], translateY: [12, 0], duration: 640, delay: stagger(60), ease: 'outExpo' });
  }, [inView]);

  return (
    <section ref={ref} id="pricing" style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
      <ThetaDivider />
      {/* pricing card sits at the center of the contour field — the product
          at the heat source */}
      <ShowroomLight />
      <ThetaField rings={7} baseR={72} cx="50%" cy="52%" opacity={0.42} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div data-p style={{ opacity: 0, marginBottom: 48, textAlign: 'center' }}>
          <SectionHead center eyebrow="Pricing" title="Free forever for one node."
            body="Fleet dashboard and alerting for operators managing multiple GPUs. No signup until you scale." />
        </div>
        <div data-p style={{ opacity: 0, maxWidth: 460, margin: '0 auto' }}>
          <Panel label="Fleet tier · interactive">
            <div style={{ padding: 22 }}>
              {/* Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <div>
                  <div style={{ fontFamily: FD, fontSize: 13.5, fontWeight: 500, color: T.text }}>Fleet tier</div>
                  <div style={{ fontFamily: FM, fontSize: 9.5, color: T.faint, marginTop: 3 }}>single-node agent is always free</div>
                </div>
                <div style={{ display: 'flex', borderRadius: 4, border: `1px solid ${T.border}`, background: T.s2, padding: 2, gap: 2 }}>
                  {[{ l: 'monthly', v: false }, { l: 'annual', v: true }].map(o => (
                    <button key={o.l} onClick={() => setAnnual(o.v)}
                      style={{ borderRadius: 3, padding: '5px 10px', border: 'none', cursor: 'pointer', background: annual === o.v ? T.s1 : 'transparent', color: annual === o.v ? T.text : T.muted, fontFamily: FM, fontSize: 10, letterSpacing: '.03em', transition: 'background .15s, color .15s' }}>
                      {o.l}{o.v && <span style={{ color: T.healthy, marginLeft: 4 }}>−25%</span>}
                    </button>
                  ))}
                </div>
              </div>
              {/* Slider */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontFamily: FM, fontSize: 9.5, color: T.faint }}>GPU count</span>
                  <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: T.text }}>{gpus} GPUs</span>
                </div>
                <input type="range" min={10} max={500} step={10} value={gpus} onChange={e => setGpus(+e.target.value)}
                  className="tos-range"
                  style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', height: 2, background: `linear-gradient(to right,${T.healthy} ${((gpus - 10) / 490) * 100}%,${T.border} 0)`, borderRadius: 1, outline: 'none', cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontFamily: FM, fontSize: 9, color: T.faint }}>10</span>
                  <span style={{ fontFamily: FM, fontSize: 9, color: T.faint }}>500+</span>
                </div>
              </div>
              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20, borderTop: `1px solid ${T.border}`, paddingTop: 20 }}>
                <div ref={priceRef} style={{ fontFamily: FD, fontSize: 48, fontWeight: 500, letterSpacing: '-.035em', lineHeight: 1, color: T.text }}>{fmt(price)}</div>
                <div style={{ paddingBottom: 5 }}>
                  <div style={{ fontFamily: FM, fontSize: 10, color: T.muted }}>/ {period}</div>
                  {annual && saved > 0 && <div style={{ fontFamily: FM, fontSize: 9.5, color: T.healthy }}>saves ${saved.toLocaleString()}/yr</div>}
                </div>
              </div>
              {/* Features */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 16px', marginBottom: 18 }}>
                {PRICING_FEATS.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: FM, fontSize: 10.5, color: T.muted }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.healthy, flexShrink: 0, display: 'inline-block' }} />
                    {f}
                  </div>
                ))}
              </div>
              <a href="mailto:asomisetty27@gmail.com?subject=Theta fleet tier"
                style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 4, background: 'linear-gradient(180deg, #F2D788 0%, #D4AF37 55%, #A8852B 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4), inset 0 -1px 0 rgba(0,0,0,.25), 0 4px 18px rgba(212,175,55,.22)', color: '#1A1408', fontFamily: FD, fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'filter .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1.08)')}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.filter = 'none')}>
                Request fleet tier <ArrowRight />
              </a>
              {/* Academia free-support note */}
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 4, border: `1px solid ${T.border}`, background: T.s0 }}>
                <div style={{ fontFamily: FM, fontSize: 9.5, color: T.healthy, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>University &amp; AI Lab</div>
                <div style={{ fontFamily: FM, fontSize: 10.5, color: T.muted, lineHeight: 1.6 }}>
                  Academic deployments are free — always. If you're at a university AI lab or research institution,{' '}
                  <a href="mailto:asomisetty27@gmail.com?subject=Theta academic deployment" style={{ color: T.healthy, textDecoration: 'none' }}>reach out</a>{' '}
                  and we'll help you get running at no cost.
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  // Research links are cross-domain now (amogh.site hosts the research
  // surfaces) — plain anchors, not router Links.
  const COLS = [
    { t: 'product',  ls: [{ l: 'overview', h: '#signal' }, { l: 'production validation', h: '#production' }, { l: 'github', h: 'https://github.com/Asomisetty27/theta' }, { l: 'live fleet demo', h: `${RESEARCH_ORIGIN}${FLEET_BASE}` }, { l: 'changelog', h: 'https://github.com/Asomisetty27/theta/releases' }] },
    { t: 'research', ls: [{ l: 'stage 1 findings', h: researchPath('findings') }, { l: 'R_θ metric', h: '#signal' }, { l: 'lead-time testbed', h: researchPath('lab') }, { l: 'publication', h: researchPath('publication') }] },
    { t: 'company',  ls: [{ l: 'about', h: '#' }, { l: 'contact', h: 'mailto:asomisetty27@gmail.com' }, { l: 'privacy', h: '#' }, { l: 'MIT license', h: '#' }] },
  ];
  return (
    <footer style={{ borderTop: `1px solid ${T.border}`, background: T.s0, position: 'relative', overflow: 'hidden' }}>
      <ThetaField rings={6} baseR={90} cx="92%" cy="110%" opacity={0.4} glow={false} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '56px 32px' }}>
        <div className="tos-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 36 }}>
          <div>
            <div style={{ marginBottom: 10 }}>
              <ThetaLogo size={20} variant="full" color={T.healthy} />
            </div>
            <p style={{ fontFamily: FM, fontSize: 10.5, color: T.faint, lineHeight: 1.7, marginBottom: 18 }}>GPU thermal-power forensics.<br />Built at Cal Poly · MIT License.</p>
            <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden', maxWidth: 260 }}>
              <input type="email" placeholder="stay updated" style={{ flex: 1, background: 'transparent', border: 'none', padding: '7px 10px', color: T.text, fontFamily: FM, fontSize: 10, outline: 'none' }} />
              <button type="submit" style={{ padding: '7px 10px', background: T.s2, border: 'none', borderLeft: `1px solid ${T.border}`, color: T.muted, fontFamily: FM, fontSize: 10, cursor: 'pointer', transition: 'color .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = T.healthy)}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = T.muted)}>
                subscribe →
              </button>
            </form>
          </div>
          {COLS.map(col => (
            <div key={col.t}>
              <div style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: T.text, marginBottom: 14 }}>{col.t}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {col.ls.map(link => (
                  <li key={link.l}>
                    {'int' in link && link.int ? (
                      <Link to={link.h} style={{ fontFamily: FM, fontSize: 11, color: T.muted, textDecoration: 'none', transition: 'color .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>{link.l}</Link>
                    ) : (
                      <a href={link.h} target={link.h.startsWith('http') ? '_blank' : undefined} rel={link.h.startsWith('http') ? 'noreferrer' : undefined}
                        style={{ fontFamily: FM, fontSize: 11, color: T.muted, textDecoration: 'none', transition: 'color .15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = T.text)}
                        onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = T.muted)}>{link.l}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid #8A6F2E55`, marginTop: 44, paddingTop: 18, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontFamily: FM, fontSize: 10, color: T.faint }}>© 2026 Theta · MIT License</span>
          <span style={{ fontFamily: FM, fontSize: 10, color: T.faint }}>R_θ = ΔT / P — the one ratio nobody else ships.</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Global styles ───────────────────────────────────────────────────────── */
const STYLES = `
html { scroll-behavior: smooth; }
.tos-root { background: ${T.bg}; color: ${T.text}; font-family: ${FD}; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; min-height: 100vh; overflow-x: clip; }
.tos-root a { text-decoration: none; color: inherit; }
.tos-root * { box-sizing: border-box; }
.tos-root button { box-sizing: border-box; }
/* anchors land clear of the sticky nav */
.tos-root section[id] { scroll-margin-top: 66px; }
/* keyboard focus is a designed state, not a browser default */
.tos-root a:focus-visible,
.tos-root button:focus-visible,
.tos-root input:focus-visible,
.tos-root [tabindex]:focus-visible {
  outline: 2px solid rgba(212,175,55,.85);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ── Blueprint grid ─────────────────────────────────────────────────────── */
.tos-grid-bg {
  background-image:
    linear-gradient(rgba(201,168,76,.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(201,168,76,.07) 1px, transparent 1px),
    linear-gradient(rgba(201,168,76,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(201,168,76,.04) 1px, transparent 1px);
  background-size: 96px 96px, 96px 96px, 24px 24px, 24px 24px;
  background-position: -1px -1px;
}

/* ── Film grain overlay ─────────────────────────────────────────────────── */
.tos-grain {
  position: relative;
}
.tos-grain::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  opacity: .012;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 180px;
  mix-blend-mode: overlay;
}

/* ── Glassmorphism panels ───────────────────────────────────────────────── */
.tos-glass {
  background: rgba(12,12,18,.62) !important;
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  border: 1px solid rgba(255,255,255,.085) !important;
  box-shadow:
    inset 0 1px 0 rgba(245,217,138,.08),
    0 0 0 0.5px rgba(255,255,255,.04) inset,
    0 16px 48px -16px rgba(0,0,0,.55);
}

/* ── Gradient border via mask ───────────────────────────────────────────── */
.tos-grad-border {
  position: relative;
  border: 1px solid transparent !important;
  background-clip: padding-box;
}
.tos-grad-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(212,175,55,.45) 0%, rgba(201,168,76,.18) 50%, rgba(212,175,55,.08) 100%);
  pointer-events: none;
  z-index: 0;
}
.tos-grad-border > * { position: relative; z-index: 1; }

/* ── Gradient text ──────────────────────────────────────────────────────── */
.tos-grad-text {
  background: linear-gradient(120deg, #ECE6D8 0%, #D4AF37 55%, #C9A84C 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Shimmer sweep — for CTAs and install block ─────────────────────────── */
@keyframes tos-shimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
.tos-shimmer-wrap {
  position: relative;
  overflow: hidden;
}
.tos-shimmer-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,.07) 50%, transparent 70%);
  background-size: 200%;
  animation: tos-shimmer 2.8s linear infinite;
  pointer-events: none;
}

/* ── Blur-in reveal (Framer scroll animation) ────────────────────────────── */
@keyframes tos-blur-in {
  from { filter: blur(6px); opacity: 0; transform: translateY(18px) scale(.99); }
  to   { filter: blur(0);   opacity: 1; transform: translateY(0)    scale(1); }
}
.tos-blur-reveal { animation: tos-blur-in .65s cubic-bezier(.22,.68,0,1.2) both; }

/* ── Section ambient glow (top-center radial) ────────────────────────────── */
.tos-section-glow-green::before {
  content: '';
  position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 80%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,175,55,.3), transparent);
  pointer-events: none;
}
.tos-section-glow-blue::before {
  content: '';
  position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 80%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,.3), transparent);
  pointer-events: none;
}

/* ── Feature card hover glow ─────────────────────────────────────────────── */
/* ── Agent pipeline ("how it works") ─────────────────────────────────────── */
.tos-pipe-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 14px;
  position: relative;
  z-index: 1;
}
.tos-pipe-stage {
  position: relative;
  padding: 18px 14px 30px 0;
  border-top: 1px solid rgba(212,175,55,.22);
  /* button reset */
  appearance: none;
  background: transparent;
  font: inherit;
  color: inherit;
  text-align: left;
  width: 100%;
  cursor: pointer;
  border-left: none; border-right: none; border-bottom: none;
  transition: background .2s, border-color .2s;
}
.tos-pipe-stage::before {           /* the calibration tick at each stage start */
  content: '';
  position: absolute;
  top: -1px; left: 0;
  width: 22px; height: 2px;
  background: linear-gradient(90deg, #F5D98A, #D4AF37);
  transition: width .25s ease;
}
.tos-pipe-stage:hover { border-top-color: rgba(212,175,55,.55); }
.tos-pipe-stage:hover::before { width: 40px; }
.tos-pipe-stage:hover .tos-pipe-node { border-color: rgba(212,175,55,.8); }
.tos-pipe-stage.is-active { border-top-color: #F5D98A; }
.tos-pipe-stage.is-active::before { width: 100%; }
.tos-pipe-stage.is-active .tos-pipe-node {
  border-color: #F5D98A;
  background: radial-gradient(circle at 50% 35%, rgba(245,217,138,.28), transparent 70%), #181522;
  box-shadow: 0 0 14px rgba(212,175,55,.3);
}
.tos-pipe-expand {
  position: absolute;
  bottom: 10px; left: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--t-faint, #8A8073);
  opacity: .65; transition: opacity .2s, color .2s;
}
.tos-pipe-stage:hover .tos-pipe-expand,
.tos-pipe-stage.is-active .tos-pipe-expand { opacity: 1; color: #D4AF37; }
.tos-pipe-detail { margin-top: 22px; animation: tos-pipe-open .4s cubic-bezier(.22,.68,0,1) both; }
@keyframes tos-pipe-open {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tos-pipe-detail-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 22px;
  align-items: start;
}
@media (max-width: 760px) {
  .tos-pipe-detail-grid { grid-template-columns: 1fr; }
}
.tos-pipe-node {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(212,175,55,.4);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, rgba(212,175,55,.12), transparent 70%), #0E0C12;
  margin-bottom: 14px;
}
/* the flow line + traveling pulse, sitting just under the stage row top border */
.tos-pipe-flow {
  position: relative; z-index: 0;
  height: 0; margin: 0 11px;
}
.tos-pipe-pulse {
  position: absolute; top: 0; left: 0;
  width: 64px; height: 1px;
  background: linear-gradient(90deg, transparent, #F5D98A, transparent);
  offset-path: path('M 0 0 H 1180');
  offset-rotate: 0deg;
  opacity: 0;
}
@media (max-width: 900px) {
  .tos-pipe-grid { grid-template-columns: 1fr 1fr; }
  .tos-pipe-flow { display: none; }
}
@media (max-width: 560px) {
  .tos-pipe-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .tos-pipe-pulse { display: none; }
  .tos-pipe-detail { animation: none; }
  .tos-pipe-stage, .tos-pipe-stage::before { transition: none; }
}

.tos-feat-card {
  transition: border-color .2s, box-shadow .25s, transform .25s cubic-bezier(.22,.68,0,1);
}
.tos-feat-card:hover {
  border-color: rgba(212,175,55,.25) !important;
  box-shadow: 0 0 0 1px rgba(212,175,55,.08), 0 18px 36px -12px rgba(0,0,0,.45);
  transform: translateY(-3px);
}
@media (prefers-reduced-motion: reduce) {
  .tos-feat-card:hover { transform: none; }
  html { scroll-behavior: auto; }
}
.tos-feat-card:hover .tos-feat-index { color: ${T.healthy} !important; }

/* ── Pulse dot ───────────────────────────────────────────────────────────── */
@keyframes tos-pulse { 0%,100% { opacity:.3 } 50% { opacity:.9 } }
.tos-pulse { animation: tos-pulse 1.8s ease-in-out infinite; }
/* thermal pulse — the signature gesture: a hairline ring expands from the dot
   and fades, like an isotherm front moving outward. */
@keyframes tos-pulse-ring {
  0%   { transform: scale(1);   opacity: .55; }
  70%  { opacity: 0; }
  100% { transform: scale(2.8); opacity: 0; }
}
.tos-pulse-ring { animation: tos-pulse-ring 2.6s cubic-bezier(.16,1,.3,1) infinite; }

/* ── Terminal caret blink ────────────────────────────────────────────────── */
@keyframes tos-caret-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
.tos-caret { animation: tos-caret-blink 1.06s steps(1) infinite; }

/* ── Trace live-data breathe ─────────────────────────────────────────────── */
@keyframes tos-trace-breathe { 0%, 100% { opacity: 1 } 50% { opacity: .94 } }
.tos-trace-live { animation: tos-trace-breathe 5s ease-in-out infinite; }

/* ── Signal state table ──────────────────────────────────────────────────── */
.tos-state-row:hover { background: ${T.s2} !important; }
.tos-state-row:hover td:first-child { color: ${T.healthy} !important; }

/* ── CRT scanline ────────────────────────────────────────────────────────── */
.tos-scanline {
  background-image: repeating-linear-gradient(
    0deg,
    transparent 0,
    transparent 2px,
    rgba(150, 200, 255, 0.04) 2px,
    rgba(150, 200, 255, 0.04) 3px
  );
}

/* ── Scrolling row ───────────────────────────────────────────────────────── */
@keyframes tos-scroll-up {
  0%   { transform: translateY(0) }
  100% { transform: translateY(-50%) }
}
.tos-scroll-up { animation: tos-scroll-up 22s linear infinite; will-change: transform; }
.tos-scroll-up:hover { animation-play-state: paused; }

/* Range thumb — no glow ring */
.tos-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${T.healthy}; border: 2px solid ${T.s0}; cursor: pointer; }
.tos-range::-moz-range-thumb { width: 14px; height: 14px; border: 2px solid ${T.s0}; border-radius: 50%; background: ${T.healthy}; cursor: pointer; }

/* Features named-area grid */
.tos-features-grid {
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto auto;
}
.tos-feat-drift   { grid-column: 1 / 8; grid-row: 1; }
.tos-feat-zombie  { grid-column: 8 / 13; grid-row: 1; }
.tos-feat-ambient { grid-column: 1 / 5; grid-row: 2; }
.tos-feat-vendor  { grid-column: 5 / 9; grid-row: 2; }
.tos-feat-oss     { grid-column: 9 / 13; grid-row: 2; }

/* Responsive */
/* Grid children default to min-width:auto — a wide table inside a 1fr column
   forces the column past the viewport (the mobile signal-table blowout). */
.tos-two-col > *, .tos-evidence-grid > *, .tos-features-grid > * { min-width: 0; }
@media (max-width: 960px) {
  .tos-hero-layout { grid-template-columns: 1fr !important; gap: 48px !important; }
  .tos-two-col { grid-template-columns: 1fr !important; gap: 48px !important; }
  .tos-features-grid { grid-template-columns: 1fr 1fr !important; }
  .tos-feat-drift, .tos-feat-zombie, .tos-feat-ambient, .tos-feat-vendor, .tos-feat-oss { grid-column: span 1 !important; grid-row: auto !important; }
  .tos-evidence-grid { grid-template-columns: 1fr !important; }
  .tos-footer-grid { grid-template-columns: 1fr 1fr !important; }
  .tos-nav-links { display: none !important; }
  /* Capability matrix scrolls horizontally — keep the Theta column (the
     point of the table) pinned and readable while the middle scrolls. */
  .tos-cmp-us {
    position: sticky; right: 0;
    background: #211D17 !important;
    box-shadow: -10px 0 14px -6px rgba(0,0,0,.55);
  }
  .tos-keynum-grid { grid-template-columns: 1fr 1fr !important; }
  .tos-keynum-grid > div { border-left: none !important; border-top: 1px solid rgba(255,255,255,.05); }
}
@media (max-width: 600px) {
  .tos-features-grid { grid-template-columns: 1fr !important; }
  .tos-hero-stats { grid-template-columns: 1fr !important; }
  /* Reclaim a screenful of mobile scroll — the terminal types to fit rather
     than reserving desktop height while mostly empty. */
  .tos-term-body { min-height: 260px !important; max-height: 360px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .tos-pulse, .tos-pulse-ring, [data-bar], [data-trace], [data-h], [data-r], [data-e], [data-f], [data-c], [data-p] {
    animation: none !important; opacity: 1 !important; transform: none !important;
    stroke-dasharray: none !important; stroke-dashoffset: 0 !important;
  }
}
`;

/* ─── Terminal demo ──────────────────────────────────────────────────────────
 *
 * Realistic typewriter terminal showing the actual onboarding flow.
 * Loop: pip install → theta setup → GPU inventory → first R_theta readout.
 * Pauses on hover, restarts after ~3s idle. Respects prefers-reduced-motion.
 *
 * Lines are typed character-by-character at variable speed (with brief jitter
 * so it doesn't feel mechanical). Output blocks render instantly with a brief
 * fade. Re-entry into viewport restarts the sequence.
 */

type TermLine =
  | { kind: 'cmd';    text: string; delay?: number }        // typed at user speed
  | { kind: 'out';    text: string; color?: string }        // instant output
  | { kind: 'wait';   ms: number }                          // pause
  | { kind: 'clear' };                                      // wipe screen

const DEMO_SCRIPT: TermLine[] = [
  { kind: 'cmd', text: 'pip install runtheta' },
  { kind: 'wait', ms: 400 },
  { kind: 'out', text: 'Collecting runtheta', color: T.muted },
  { kind: 'out', text: '  Downloading runtheta-0.1.10-py3-none-any.whl (52.3 kB)', color: T.faint },
  { kind: 'out', text: '  Installing collected packages: runtheta', color: T.faint },
  { kind: 'out', text: 'Successfully installed runtheta-0.1.10', color: T.healthy },
  { kind: 'wait', ms: 700 },
  { kind: 'cmd', text: 'theta setup' },
  { kind: 'wait', ms: 500 },
  { kind: 'out', text: '  ✓  Python 3.12.1', color: T.healthy },
  { kind: 'out', text: '  ✓  pynvml  ·  driver 535.183.06  ·  4 GPUs detected', color: T.healthy },
  { kind: 'out', text: '  ✓  prometheus_client — metrics export available', color: T.healthy },
  { kind: 'wait', ms: 600 },
  { kind: 'out', text: '  ━━━━━━  step 2/6  GPU inventory', color: T.bp },
  { kind: 'out', text: '  GPU 0  Tesla T4    16 GB   42°C    11.4W   P8   ● online', color: T.muted },
  { kind: 'out', text: '  GPU 1  Tesla T4    16 GB   70°C    68.0W   P0   ● online', color: T.muted },
  { kind: 'out', text: '  GPU 2  Tesla T4    16 GB   67°C    31.2W   P0   ● online', color: T.muted },
  { kind: 'out', text: '  GPU 3  Tesla T4    16 GB   55°C    12.6W   P8   ● online', color: T.muted },
  { kind: 'wait', ms: 700 },
  { kind: 'out', text: '  ━━━━━━  step 4/6  First R_θ reading', color: T.bp },
  { kind: 'wait', ms: 500 },
  { kind: 'out', text: '  GPU 0  R_θ=1.281 C/W  ● clean_idle           conf=1.00', color: T.bp },
  { kind: 'out', text: '  GPU 1  R_θ=0.724 C/W  ● under_load           conf=0.99', color: T.healthy },
  { kind: 'out', text: '  GPU 2  R_θ=1.541 C/W  ● zombie_recovery      conf=1.00', color: T.critical },
  { kind: 'out', text: '  GPU 3  R_θ=2.104 C/W  ● child_exit_recovery  conf=0.98', color: T.caution },
  { kind: 'wait', ms: 900 },
  { kind: 'out', text: '  ! GPU 2 — CUDA context retained at 31W. Release stale context.', color: T.critical },
  { kind: 'wait', ms: 2200 },
];

function TerminalDemo() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inView  = useInView(wrapRef, { amount: 0.3 });
  const [lines, setLines] = useState<{ text: string; color?: string; cmd?: boolean }[]>([]);
  const [typing, setTyping] = useState<{ text: string; color?: string; cmd?: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  const cancelRef = useRef(false);

  // The script is taller than the terminal box (overflow: hidden) — without
  // this the payoff (R_θ readings + zombie alert) renders below the clip and
  // is never seen. overflow:hidden boxes still scroll programmatically.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typing]);

  useEffect(() => {
    if (!inView || rm()) {
      // Reduced motion: render the script as instant output, no animation
      if (rm()) {
        setLines(DEMO_SCRIPT
          .filter(l => l.kind === 'cmd' || l.kind === 'out')
          .map(l => l.kind === 'cmd'
            ? { text: (l as { text: string }).text, cmd: true }
            : { text: (l as { text: string; color?: string }).text, color: (l as { color?: string }).color }
          ));
      }
      return;
    }

    cancelRef.current = false;

    async function run() {
      while (!cancelRef.current) {
        setLines([]);
        setTyping(null);

        for (const step of DEMO_SCRIPT) {
          if (cancelRef.current) return;

          // Wait while paused
          while (paused && !cancelRef.current) await sleep(120);

          if (step.kind === 'clear') {
            setLines([]);
            continue;
          }
          if (step.kind === 'wait') {
            await sleep(step.ms);
            continue;
          }
          if (step.kind === 'cmd') {
            // Typewriter
            const full = step.text;
            for (let i = 1; i <= full.length; i++) {
              if (cancelRef.current) return;
              setTyping({ text: full.slice(0, i), cmd: true });
              // Variable speed for natural feel
              const ch     = full[i - 1];
              const jitter = ch === ' ' ? 25 : ch === '-' ? 55 : 32 + Math.random() * 38;
              await sleep(jitter);
            }
            await sleep(280);
            setLines(prev => [...prev, { text: full, cmd: true }]);
            setTyping(null);
            continue;
          }
          if (step.kind === 'out') {
            setLines(prev => [...prev, { text: step.text, color: step.color }]);
            await sleep(70);
            continue;
          }
        }

        // Idle pause then loop
        await sleep(2000);
      }
    }

    run();
    return () => { cancelRef.current = true; };
  }, [inView, paused]);

  return (
    <section style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}>
      <div className="tos-grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35 }} />
      <div ref={wrapRef} style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '120px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 72, alignItems: 'center' }} className="tos-two-col">
          <div>
            <SectionHead eyebrow="See it run" title={<>90 seconds from<br />pip install to first<br />R_θ reading.</>}
              body={<>The setup wizard walks you through GPU detection, virtual ambient locking, and first classification — all from your terminal. Run <span style={{ fontFamily: FM, color: T.text }}>theta setup</span> after install.</>} />
            <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="https://pypi.org/project/runtheta/" target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 4, border: `1px solid ${T.borderHi}`, background: T.s1, color: T.text, fontFamily: FD, fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'border-color .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = T.healthy)}
                onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = T.borderHi)}>
                <Pulse />&nbsp;view on PyPI
              </a>
              <a href="https://github.com/Asomisetty27/theta#quick-start" target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 4, border: `1px solid ${T.border}`, background: 'transparent', color: T.muted, fontFamily: FD, fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'color .15s, border-color .15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = T.borderHi; (e.currentTarget as HTMLAnchorElement).style.color = T.text; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = T.border; (e.currentTarget as HTMLAnchorElement).style.color = T.muted; }}>
                docs <ChevronRight />
              </a>
            </div>
          </div>

          {/* Terminal window */}
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            style={{
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: '#08080C',
              boxShadow: '0 24px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)',
              overflow: 'hidden',
              fontFamily: FM,
              fontSize: 12.5,
              lineHeight: 1.7,
            }}
          >
            {/* Window chrome */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: '10px 14px',
              borderBottom: `1px solid ${T.border}`,
              background: '#0E0E14',
              gap: 8,
            }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E1554F', border: '0.5px solid rgba(0,0,0,0.3)' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E1A446', border: '0.5px solid rgba(0,0,0,0.3)' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#56C156', border: '0.5px solid rgba(0,0,0,0.3)' }} />
              <span style={{ flex: 1, textAlign: 'center', fontFamily: FM, fontSize: 10.5, color: T.faint, letterSpacing: '.04em' }}>
                amogh@thermalos · zsh — 84×26
              </span>
              <span style={{ fontFamily: FM, fontSize: 9.5, color: paused ? T.caution : T.healthy, letterSpacing: '.1em' }}>
                {paused ? 'PAUSED' : '● REC'}
              </span>
            </div>

            {/* Terminal body */}
            <div ref={bodyRef} className="tos-term-body" style={{
              padding: '18px 22px 22px',
              minHeight: 380,
              maxHeight: 440,
              overflow: 'hidden',
              position: 'relative',
              background: 'linear-gradient(180deg, #08080C 0%, #0A0A0F 100%)',
            }}>
              {/* CRT scanline texture — extremely subtle */}
              <div className="tos-scanline" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.08 }} />

              {lines.map((l, i) => (
                <div key={i} style={{
                  whiteSpace: 'pre',
                  color: l.cmd ? T.text : (l.color || T.muted),
                  fontFamily: FM,
                  fontSize: 12.5,
                  letterSpacing: '0.005em',
                }}>
                  {l.cmd && <span style={{ color: T.healthy, marginRight: 8, userSelect: 'none' }}>$</span>}
                  {l.text}
                </div>
              ))}
              {typing && (
                <div style={{
                  whiteSpace: 'pre',
                  color: T.text,
                  fontFamily: FM,
                  fontSize: 12.5,
                  letterSpacing: '0.005em',
                }}>
                  <span style={{ color: T.healthy, marginRight: 8, userSelect: 'none' }}>$</span>
                  {typing.text}
                  <span className="tos-caret" style={{
                    display: 'inline-block', width: 7, height: 13, background: T.healthy,
                    marginLeft: 1, verticalAlign: 'text-top', marginTop: 2,
                  }} />
                </div>
              )}
              {!typing && lines.length === DEMO_SCRIPT.filter(l => l.kind === 'cmd' || l.kind === 'out').length && (
                <div style={{ color: T.healthy, marginTop: 8 }}>
                  <span style={{ color: T.healthy, marginRight: 8, userSelect: 'none' }}>$</span>
                  <span className="tos-caret" style={{ display: 'inline-block', width: 7, height: 13, background: T.healthy, verticalAlign: 'text-top', marginTop: 2 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function ThermalOSLanding() {
  return (
    <main className="tos-root tos-grain">
      <style>{STYLES}</style>
      <Nav />
      <Hero />
      <TerminalDemo />
      <Signal />
      <ProductionProof />
      <Evidence />
      <FeaturesGrid />
      <AgentPipeline />
      <React.Suspense fallback={null}>
        <DataCenterShowcase />
      </React.Suspense>
      <React.Suspense fallback={null}>
        <OperatorViewShowcase />
      </React.Suspense>
      <CompetitorTable />
      <Pricing />
      <Footer />
    </main>
  );
}
