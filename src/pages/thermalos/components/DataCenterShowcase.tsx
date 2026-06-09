import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

const DataCenterScene = React.lazy(() => import('./DataCenterScene'));

const T = {
  bg: '#06060A',
  border: '#232330',
  text: '#ECE6D8',
  muted: '#9A9285',
};
const FM = "'JetBrains Mono', ui-monospace, monospace";

// ──────────────────────────────────────────────────────────────────────────
// Website wrapper — visibility-gated so the scene (and its WebGL context)
// only mounts once scrolled near, and unmounts again once scrolled well past.
// Mirrors the Hero's lazy-load-after-first-paint approach in Landing.tsx,
// extended with an IntersectionObserver since this section sits mid-page
// rather than above the fold.
// ──────────────────────────────────────────────────────────────────────────

function useNearViewport(margin = '40% 0px'): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: margin, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [margin]);

  return [ref, near];
}

export default function DataCenterShowcase() {
  const [ref, near] = useNearViewport();
  const [everSeen, setEverSeen] = useState(false);
  useEffect(() => {
    if (near) setEverSeen(true);
  }, [near]);

  return (
    <section
      ref={ref}
      id="datacenter"
      className="tos-section-glow-blue"
      style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '88px 24px 24px' }}>
        <div style={{ marginBottom: 28, maxWidth: 640 }}>
          <div style={{ fontFamily: FM, fontSize: 11, letterSpacing: '0.16em', color: T.muted, marginBottom: 10 }}>
            THETA IN THE FIELD
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.15, color: T.text, fontWeight: 600, margin: 0 }}>
            What it looks like to watch a fleet, not a chip.
          </h2>
          <p style={{ marginTop: 14, color: T.muted, fontSize: 15, lineHeight: 1.6 }}>
            The same R<sub>θ</sub> signal from the Tesla T4 demo above, scaled to a real
            data-center floor — Theta tracking every node, catching a thermal drift with
            enough lead time to act before throttling ever shows up in util or power.
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '78vh', minHeight: 480, background: T.bg }}>
        {near || everSeen ? (
          <React.Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />}>
            {/* Mount only while near; keeps a live WebGL context from idling
                far off-screen on long scroll sessions. */}
            {near ? <DataCenterScene /> : <div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />}
          </React.Suspense>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />
        )}

        {/* Top/bottom fades — same blend treatment as the Hero's GPU scene */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, background: `linear-gradient(to bottom, ${T.bg}, transparent)`, pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: `linear-gradient(to bottom, transparent, ${T.bg})`, pointerEvents: 'none', zIndex: 5 }} />
      </div>
    </section>
  );
}
