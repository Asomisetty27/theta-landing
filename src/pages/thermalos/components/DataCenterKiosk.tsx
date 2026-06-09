import * as React from 'react';
import { useEffect } from 'react';

const DataCenterScene = React.lazy(() => import('./DataCenterScene'));

const T = { bg: '#06060A', text: '#ECE6D8', muted: '#9A9285' };
const FM = "'JetBrains Mono', ui-monospace, monospace";

// ──────────────────────────────────────────────────────────────────────────
// Kiosk wrapper — fullscreen, no page chrome, larger HUD for viewing-distance
// legibility on a lab display. Same <DataCenterScene> as the website showcase
// so the two never drift apart; only sizing/scale/chrome differ here.
// Route: /theta/kiosk/datacenter (registered in App.tsx)
// ──────────────────────────────────────────────────────────────────────────

export default function DataCenterKiosk() {
  useEffect(() => {
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.title = 'Theta — Live Fleet View';
    return () => {
      document.documentElement.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, overflow: 'hidden' }}>
      <React.Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: T.bg }} aria-hidden />}>
        <DataCenterScene hudScale={1.7} />
      </React.Suspense>

      {/* Lab-context corner mark — tells visitors what they're looking at
          without competing with the in-scene HUD/caption. */}
      <div style={{
        position: 'absolute', top: 28, left: 28,
        fontFamily: FM, fontSize: 13, letterSpacing: '0.18em',
        color: T.text, opacity: 0.55, pointerEvents: 'none',
      }}>
        Θ THETA · LIVE FLEET VIEW
        <div style={{ marginTop: 4, fontSize: 10, letterSpacing: '0.08em', color: T.muted }}>
          simulated demo · cal poly ai factory
        </div>
      </div>
    </div>
  );
}
