import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

const TowerUnit = React.lazy(() => import('./TowerUnit'));
const OperatorPanel = React.lazy(() => import('./OperatorPanel'));

const T = {
  bg: '#06060A',
  s1: '#111117',
  border: '#232330',
  text: '#ECE6D8',
  muted: '#9A9285',
};
const FM = "'JetBrains Mono', ui-monospace, monospace";

// ──────────────────────────────────────────────────────────────────────────
// Website wrapper — visibility-gated exactly like DataCenterShowcase, so the
// WebGL context only mounts near-viewport and the dashboard mockup (which
// reads TowerUnit's shared refs) only renders once the scene has actually
// started driving them.
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

export default function OperatorViewShowcase() {
  const [ref, near] = useNearViewport();
  const [everSeen, setEverSeen] = useState(false);
  useEffect(() => {
    if (near) setEverSeen(true);
  }, [near]);

  return (
    <section
      ref={ref}
      id="operator-view"
      className="tos-section-glow-green"
      style={{ borderTop: `1px solid ${T.border}`, position: 'relative' }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '88px 24px 28px' }}>
        <div style={{ marginBottom: 28, maxWidth: 640 }}>
          <div style={{ fontFamily: FM, fontSize: 11, letterSpacing: '0.16em', color: T.muted, marginBottom: 10 }}>
            WHAT THE OPERATOR SEES
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.15, color: T.text, fontWeight: 600, margin: 0 }}>
            The hardware on the left. The screen your on-call is watching on the right.
          </h2>
          <p style={{ marginTop: 14, color: T.muted, fontSize: 15, lineHeight: 1.6, maxWidth: 640 }}>
            Same incident, two views — Theta watching a node drift toward trouble, and the
            live readout, node grid, and alert feed an operator would actually see the
            instant R<sub>θ</sub> starts to climb. They're driven by the same clock: watch
            the glow on the left and the numbers on the right move together.
          </p>
        </div>

        <div className="tos-two-col" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 24, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.border}`, minHeight: 440, background: T.bg }}>
            {near || everSeen ? (
              <React.Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />}>
                {near ? <TowerUnit /> : <div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />}
              </React.Suspense>
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />
            )}
          </div>

          <div style={{ minHeight: 440 }}>
            {everSeen ? (
              <React.Suspense fallback={<div style={{ height: '100%', minHeight: 440, border: `1px solid ${T.border}`, borderRadius: 10, background: T.s1 }} />}>
                <OperatorPanel />
              </React.Suspense>
            ) : (
              <div style={{ height: '100%', minHeight: 440, border: `1px solid ${T.border}`, borderRadius: 10, background: T.s1 }} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
