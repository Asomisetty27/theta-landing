// ThermalOS — Fleet Dashboard (customer-facing product demo).
//
// Implements the "fleet dashboard" UI kit from the Isotherm design system:
// rack grid of GPU cards, live R_theta / temperature telemetry, and an alert
// event log. Distinct from the founder research dashboard (ThermalOSLayout) —
// this is the paid product surface a neocloud operator would see.
//
// Standalone full-screen shell (own topbar + sidebar), so it is domain-portable:
// on a future thermalos.com it becomes the app at "/fleet" or "/app" untouched.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hexagon, TrendingUp, AlertTriangle, ArrowLeft } from 'lucide-react';
import { sitePath } from './config';

// ── Color map (Isotherm tokens; dashboard surface variant #141412) ──────────
const C = {
  abyss: '#0A0E14', s1: '#141412', border: 'rgba(255,255,255,0.07)',
  text: '#F2F5F4', muted: '#8A938F', faint: '#525a55',
  healthy: '#D4AF37', stable: '#1E7A6E', caution: '#E8B23A',
  rising: '#E8743A', critical: '#D63D3D', bp: '#6E91C8',
  tborder: '#1C2630', tborderHi: '#2A3850',
};

const statusColor = (s: string) =>
  s === 'critical' ? C.critical : s === 'caution' ? C.caution :
  s === 'rising' ? C.rising : s === 'offline' ? C.faint : C.healthy;

// ── Demo data ───────────────────────────────────────────────────────────────
type GPU = { id: string; rack: string; r: number; t: number; p: number; util: number; s: string };
const GPUS: GPU[] = [
  { id: 'G-01', rack: 'R-1', r: 0.71, t: 68, p: 185, util: 94, s: 'healthy' },
  { id: 'G-02', rack: 'R-1', r: 0.74, t: 71, p: 190, util: 96, s: 'healthy' },
  { id: 'G-03-B', rack: 'R-1', r: 2.10, t: 89, p: 218, util: 97, s: 'critical' },
  { id: 'G-04', rack: 'R-1', r: 0.73, t: 69, p: 188, util: 93, s: 'healthy' },
  { id: 'G-05', rack: 'R-1', r: 0.76, t: 72, p: 192, util: 95, s: 'healthy' },
  { id: 'G-06', rack: 'R-1', r: 0.72, t: 70, p: 187, util: 94, s: 'healthy' },
  { id: 'G-07', rack: 'R-1', r: 1.28, t: 81, p: 200, util: 96, s: 'caution' },
  { id: 'G-08', rack: 'R-1', r: 0.74, t: 71, p: 189, util: 95, s: 'healthy' },
  { id: 'G-09', rack: 'R-2', r: 0.71, t: 68, p: 183, util: 93, s: 'healthy' },
  { id: 'G-10', rack: 'R-2', r: 0.73, t: 70, p: 186, util: 94, s: 'healthy' },
  { id: 'G-11', rack: 'R-2', r: 0.72, t: 69, p: 185, util: 93, s: 'healthy' },
  { id: 'G-12', rack: 'R-2', r: 1.72, t: 83, p: 204, util: 96, s: 'rising' },
  { id: 'G-13', rack: 'R-2', r: 0.74, t: 71, p: 188, util: 95, s: 'healthy' },
  { id: 'G-14', rack: 'R-2', r: 0.76, t: 72, p: 191, util: 95, s: 'healthy' },
  { id: 'G-15', rack: 'R-2', r: 0.72, t: 69, p: 186, util: 94, s: 'healthy' },
  { id: 'G-16', rack: 'R-2', r: 0.71, t: 68, p: 184, util: 93, s: 'healthy' },
  { id: 'G-17', rack: 'R-3', r: 0.73, t: 70, p: 186, util: 94, s: 'healthy' },
  { id: 'G-18', rack: 'R-3', r: 0.74, t: 71, p: 188, util: 95, s: 'healthy' },
  { id: 'G-19', rack: 'R-3', r: 0.72, t: 69, p: 185, util: 93, s: 'healthy' },
  { id: 'G-20', rack: 'R-3', r: 0.71, t: 68, p: 183, util: 93, s: 'healthy' },
  { id: 'G-21', rack: 'R-3', r: 0.75, t: 72, p: 191, util: 95, s: 'healthy' },
  { id: 'G-22', rack: 'R-3', r: 0.73, t: 70, p: 187, util: 94, s: 'healthy' },
  { id: 'G-23', rack: 'R-3', r: 0.74, t: 71, p: 189, util: 95, s: 'healthy' },
  { id: 'G-24', rack: 'R-3', r: 0.72, t: 69, p: 186, util: 93, s: 'healthy' },
];
const RTHETA = [0.71,0.72,0.71,0.73,0.72,0.71,0.73,0.72,0.74,0.72,0.71,0.73,0.72,0.71,0.74,0.73,0.72,0.71,0.73,0.72,
  0.71,0.73,0.72,0.74,0.73,0.74,0.76,0.79,0.84,0.91,0.99,1.10,1.23,1.38,1.54,1.72,1.88,1.98,2.05,2.09,
  2.10,2.10,2.09,2.10,2.10,2.10,2.09,2.10,2.10,2.09,2.10,2.10,2.09,2.11,2.10,2.10,2.09,2.10,2.10,2.10];
const TEMPS = [68,68,69,68,69,68,69,68,70,69,68,69,68,68,70,69,68,68,69,68,68,69,68,70,69,70,72,74,76,79,
  82,84,86,87,88,88,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,89];
const ALERTS = [
  { t: '14:38:07', a: 'HIGH_RTHETA', gpu: 'G-03-B', r: 2.10, temp: 89, p: 218 },
  { t: '14:35:22', a: 'HIGH_RTHETA', gpu: 'G-03-B', r: 1.89, temp: 89, p: 217 },
  { t: '14:33:01', a: 'RISING', gpu: 'G-12', r: 1.72, temp: 83, p: 204 },
  { t: '14:30:45', a: 'LOW_HEADROOM', gpu: 'G-03-B', r: 1.58, temp: 88, p: 215 },
  { t: '14:28:19', a: 'CAUTION', gpu: 'G-07', r: 1.28, temp: 81, p: 200 },
  { t: '14:22:04', a: 'CAUTION', gpu: 'G-07', r: 1.21, temp: 80, p: 198 },
];

// ── Primitives ──────────────────────────────────────────────────────────────
function IsothermMark({ size = 20 }: { size?: number }) {
  const c = size / 2, r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
      <circle cx={c} cy={c} r={r * .15} fill={C.healthy} />
      <circle cx={c} cy={c} r={r * .38} stroke={C.healthy} strokeWidth=".9" opacity=".75" />
      <circle cx={c} cy={c} r={r * .62} stroke={C.healthy} strokeWidth=".7" opacity=".45" />
      <circle cx={c} cy={c} r={r * .84} stroke={C.healthy} strokeWidth=".55" opacity=".22" />
    </svg>
  );
}

function UTCClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span className="mono" style={{ fontSize: 11, color: C.faint, fontVariantNumeric: 'tabular-nums' }}>{now.toISOString().slice(11, 19)} UTC</span>;
}

function IsothermTexture() {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 520, height: 520, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden>
      <svg width="520" height="520" viewBox="0 0 520 520" fill="none" style={{ position: 'absolute', top: -60, right: -60 }}>
        <circle cx="480" cy="40" r="90" stroke={C.healthy} strokeWidth=".9" strokeOpacity=".06" />
        <circle cx="480" cy="40" r="170" stroke={C.healthy} strokeWidth=".75" strokeOpacity=".05" />
        <circle cx="480" cy="40" r="265" stroke={C.healthy} strokeWidth=".6" strokeOpacity=".04" />
        <circle cx="480" cy="40" r="370" stroke={C.caution} strokeWidth=".5" strokeOpacity=".02" />
      </svg>
    </div>
  );
}

type CardProps = { children: React.ReactNode; style?: React.CSSProperties; tone?: string };
function Card({ children, style = {}, tone }: CardProps) {
  const tCol = tone === 'healthy' ? C.healthy : tone === 'critical' ? C.critical : tone === 'caution' ? C.caution : tone === 'rising' ? C.rising : null;
  return (
    <div style={{
      background: C.s1, border: `0.5px solid ${C.border}`, borderRadius: 8,
      ...(tCol ? { background: `linear-gradient(180deg,${tCol}08 0%,${C.s1} 100%)`, borderColor: `${tCol}25` } : {}),
      ...style,
    }}>{children}</div>
  );
}

// ── Nav ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'fleet', label: 'Fleet', sub: 'GPU rack overview', Icon: Hexagon },
  { id: 'telemetry', label: 'Telemetry', sub: 'R_θ time series', Icon: TrendingUp },
  { id: 'alerts', label: 'Alerts', sub: 'Event log', Icon: AlertTriangle },
];

function Topbar() {
  return (
    <header style={{
      height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, position: 'sticky', top: 0, zIndex: 30,
      background: 'rgba(10,14,20,.88)', borderBottom: `1px solid ${C.tborder}`, backdropFilter: 'blur(12px)', flexShrink: 0,
    }}>
      <Link to={sitePath()} className="mono" style={{ fontSize: 11, color: C.faint, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={12} /> thermalos
      </Link>
      <span style={{ width: 1, height: 18, background: C.tborder }} />
      <IsothermMark size={20} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, letterSpacing: '-.02em' }}>thermalos</span>
        <span className="mono" style={{ fontSize: 10, color: C.healthy }}>/ fleet</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 12, background: 'rgba(30,122,110,.12)', border: `1px solid rgba(30,122,110,.35)` }}>
        <span className="tp" style={{ width: 6, height: 6, borderRadius: '50%', background: C.healthy, display: 'inline-block' }} />
        <span className="mono" style={{ fontSize: 10, letterSpacing: '.06em', color: C.healthy }}>LIVE</span>
      </div>
      <UTCClock />
    </header>
  );
}

function Sidebar({ view, setView }: { view: string; setView: (v: string) => void }) {
  return (
    <aside style={{ width: 208, height: 'calc(100vh - 56px)', borderRight: `1px solid ${C.tborder}`, background: C.abyss, overflow: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <nav style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ id, label, sub, Icon }) => {
          const active = view === id;
          return (
            <button key={id} onClick={() => setView(id)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
              textAlign: 'left', width: '100%', transition: 'all .15s',
              borderLeft: `2px solid ${active ? C.stable : 'transparent'}`,
              background: active ? `rgba(30,122,110,.10)` : 'transparent',
              color: active ? C.healthy : C.muted,
            }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.03)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <Icon size={14} style={{ marginTop: 1, opacity: .85, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
                <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          );
        })}
      </nav>
      <div style={{ marginTop: 'auto', padding: 12, borderTop: `1px solid rgba(28,38,48,.6)` }}>
        <div className="mono" style={{ fontSize: 9, color: C.faint, lineHeight: 1.7 }}>
          Amogh (EE) + Sam (ME)<br />Cal Poly · YC W27
        </div>
      </div>
    </aside>
  );
}

// ── Fleet View ──────────────────────────────────────────────────────────────
function GPUCard({ gpu, selected, onClick }: { gpu: GPU; selected: boolean; onClick: () => void }) {
  const col = statusColor(gpu.s);
  return (
    <button onClick={onClick} style={{
      background: selected ? `rgba(30,122,110,.12)` : C.s1,
      border: `0.5px solid ${selected ? C.stable : col + '30'}`, borderRadius: 6, padding: '8px 10px',
      cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s',
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = col + '60')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = selected ? C.stable : col + '30')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 9, color: C.faint, letterSpacing: '.08em' }}>{gpu.id}</span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, display: 'inline-block', ...(gpu.s === 'critical' ? { boxShadow: `0 0 6px ${col}` } : {}) }} />
      </div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 500, color: col, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em' }}>{gpu.r.toFixed(2)}</div>
      <div className="mono" style={{ fontSize: 9, color: C.faint, marginTop: 3 }}>{gpu.t}°C · {gpu.p}W</div>
    </button>
  );
}

function GPUDetail({ gpu }: { gpu?: GPU }) {
  if (!gpu) return null;
  const col = statusColor(gpu.s);
  const headroom = (93 - gpu.t).toFixed(1);
  const rows: [string, string, string][] = [
    ['R_θ_eff', `${gpu.r.toFixed(4)} °C/W`, col], ['GPU Temp', `${gpu.t}.0 °C`, C.rising],
    ['Power Draw', `${gpu.p}.0 W`, C.caution], ['Headroom', `${headroom} °C`, +headroom < 10 ? C.rising : C.healthy],
    ['Utilization', `${gpu.util}%`, C.healthy], ['Rack', gpu.rack, C.faint],
  ];
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.15em', color: C.faint, marginBottom: 4 }}>Selected GPU</div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.01em' }}>{gpu.id}</div>
        </div>
        <span className="mono" style={{ fontSize: 10, padding: '3px 8px', borderRadius: 3, color: col, background: `${col}12`, border: `0.5px solid ${col}40` }}>{gpu.s.toUpperCase()}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map(([l, v, c]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid rgba(255,255,255,.04)` }}>
            <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
          </div>
        ))}
      </div>
      {gpu.s === 'critical' && (
        <div className="mono" style={{ marginTop: 12, padding: 10, background: 'rgba(214,61,61,.06)', border: '1px solid rgba(214,61,61,.25)', borderRadius: 4, fontSize: 10, color: '#E6F7F1', lineHeight: 1.7 }}>
          HIGH R_θ · cooling path degrading<br />
          Action: inspect TIM and mounting pressure
        </div>
      )}
    </Card>
  );
}

function FleetView({ gpus }: { gpus: GPU[] }) {
  const [sel, setSel] = useState('G-03-B');
  const selGpu = gpus.find((g) => g.id === sel);
  const racks = ['R-1', 'R-2', 'R-3'];
  const counts = {
    healthy: gpus.filter((g) => g.s === 'healthy').length, critical: gpus.filter((g) => g.s === 'critical').length,
    caution: gpus.filter((g) => g.s === 'caution').length, rising: gpus.filter((g) => g.s === 'rising').length,
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16 }}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[{ l: 'GPUS', v: gpus.length, c: C.text }, { l: 'HEALTHY', v: counts.healthy, c: C.healthy },
          { l: 'CRITICAL', v: counts.critical, c: C.critical }, { l: 'CAUTION / RISING', v: counts.caution + counts.rising, c: C.caution }].map((s) => (
            <Card key={s.l} style={{ padding: '12px 14px' }}>
              <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.14em', color: C.faint, marginBottom: 6 }}>{s.l}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            </Card>
          ))}
        </div>
        {racks.map((rack) => (
          <div key={rack} style={{ marginBottom: 14 }}>
            <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.16em', color: C.faint, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ height: 1, width: 16, background: C.tborder, display: 'inline-block' }} />
              {rack}
              <span style={{ height: 1, flex: 1, background: C.tborder, display: 'inline-block' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6 }}>
              {gpus.filter((g) => g.rack === rack).map((g) => (
                <GPUCard key={g.id} gpu={g} selected={sel === g.id} onClick={() => setSel(g.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <GPUDetail gpu={selGpu} />
    </div>
  );
}

// ── Telemetry View ──────────────────────────────────────────────────────────
function SVGChart({ data, color, height = 90, refLine }: { data: number[]; color: string; height?: number; refLine?: number }) {
  const W = 100, H = height, min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const y = (v: number) => H - ((v - min) / rng) * (H - 8) - 4;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${y(v)}`).join(' ');
  const area = `M0,${H} ` + data.map((v, i) => `L${(i / (data.length - 1)) * W},${y(v)}`).join(' ') + ` L${W},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {refLine && <line x1="0" y1={y(refLine)} x2={W} y2={y(refLine)} stroke={C.caution} strokeWidth=".8" strokeDasharray="2 2" opacity=".6" />}
      <path d={area} fill={color} fillOpacity=".08" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={W} cy={y(data[data.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

function TelemetryView() {
  const latest = { t: 89, p: 218, cap: 300, util: 97, sm: 1695, hdroom: 4.0 };
  const readouts: [string, string, string][] = [
    ['GPU Temp', `${latest.t}.0 °C`, C.rising], ['Power Draw', `${latest.p}.0 W`, C.caution],
    ['Power Cap', `${latest.cap} W`, C.faint], ['SM Clock', `${latest.sm} MHz`, C.healthy],
    ['Utilization', `${latest.util}%`, C.healthy], ['Headroom', `${latest.hdroom} °C`, C.rising],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>R_θ_eff over time</span>
            <span className="mono" style={{ fontSize: 10, color: C.faint }}>°C/W · 60 samples · G-03-B</span>
          </div>
          <SVGChart data={RTHETA} color={C.healthy} height={100} refLine={1.8} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 9, color: C.faint }}>baseline 0.72</span>
            <span className="mono" style={{ fontSize: 9, color: C.caution }}>+192% drift</span>
            <span className="mono" style={{ fontSize: 9, color: C.critical }}>critical 2.10</span>
          </div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Temperature over time</span>
            <span className="mono" style={{ fontSize: 10, color: C.faint }}>°C · 60 samples</span>
          </div>
          <SVGChart data={TEMPS} color={C.rising} height={80} refLine={93} />
        </Card>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.15em', color: C.faint, marginBottom: 10 }}>Live GPU Readout · G-03-B</div>
          {readouts.map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: c, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
              </div>
              <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </Card>
        <div style={{ background: C.s1, border: `1px solid rgba(255,255,255,.07)`, borderLeft: `3px solid ${C.stable}`, borderRadius: 8, padding: 14 }}>
          <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.15em', color: C.healthy, marginBottom: 8 }}>ThermalOS Recommendation</div>
          <p className="mono" style={{ fontSize: 11, color: '#E6F7F1', lineHeight: 1.65 }}>Thermal resistance elevated at 2.1000 °C/W. Cooling path degrading — verify TIM and mounting pressure on G-03-B.</p>
          <div className="mono" style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(10,10,8,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 4, fontSize: 10, color: '#D8D2C2', lineHeight: 1.8 }}>
            <div>Rθ_eff(t) = 2.1000 °C/W</div>
            <div>Formula: (T_gpu − T_amb) / P_draw</div>
            <div>Headroom = 4.0 °C to throttle</div>
            <div>Alert: <span style={{ color: C.critical }}>HIGH_RTHETA</span> <span className="blip" style={{ display: 'inline-block', width: 6, height: 10, background: C.healthy, marginLeft: 4, verticalAlign: 'middle' }} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alerts View ─────────────────────────────────────────────────────────────
const ALERT_META: Record<string, { l: string; c: string }> = {
  OK: { l: 'OK', c: C.healthy }, RISING: { l: 'RISING', c: C.rising }, CAUTION: { l: 'CAUTION', c: C.caution },
  LOW_HEADROOM: { l: 'LOW HEADROOM', c: C.caution }, HIGH_RTHETA: { l: 'HIGH Rθ', c: C.rising }, HOT: { l: 'HOT', c: C.critical },
};

function AlertsView() {
  const counts: Record<string, number> = { OK: 0, HIGH_RTHETA: 2, RISING: 1, LOW_HEADROOM: 1, CAUTION: 2, HOT: 0 };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {['OK', 'LOW_HEADROOM', 'HIGH_RTHETA', 'HOT'].map((k) => {
          const m = ALERT_META[k] || ALERT_META.OK;
          return (
            <Card key={k} style={{ padding: '14px 16px', borderTop: `2px solid ${m.c}` }}>
              <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.14em', color: C.faint, marginBottom: 6 }}>{m.l}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: m.c, fontVariantNumeric: 'tabular-nums' }}>{counts[k] || 0}</div>
              <div className="mono" style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>events · last hr</div>
            </Card>
          );
        })}
      </div>
      <Card style={{ padding: 14 }}>
        <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.15em', color: C.faint, marginBottom: 12 }}>Alert Event Log — {ALERTS.length} events</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {ALERTS.map((ev, i) => {
            const m = ALERT_META[ev.a] || ALERT_META.OK;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.c, flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: 10, color: C.faint, width: 56, flexShrink: 0 }}>{ev.t}</span>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: m.c, width: 100, flexShrink: 0 }}>{m.l}</span>
                <span className="mono" style={{ fontSize: 10, color: C.faint, width: 60, flexShrink: 0 }}>{ev.gpu}</span>
                <span className="mono" style={{ fontSize: 10, color: C.muted }}>{ev.temp.toFixed(1)}°C / {ev.p.toFixed(1)}W / Rθ {ev.r.toFixed(3)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── App shell ───────────────────────────────────────────────────────────────
export default function FleetDashboard() {
  const [view, setView] = useState('fleet');
  const content = view === 'fleet' ? <FleetView gpus={GPUS} /> : view === 'telemetry' ? <TelemetryView /> : <AlertsView />;
  const titles: Record<string, string> = { fleet: 'Fleet Overview', telemetry: 'Live Telemetry · G-03-B', alerts: 'Alert Event Log' };
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.abyss, color: C.text, fontFamily: "'Space Grotesk',system-ui,sans-serif", overflow: 'hidden' }}>
      <style>{`
        .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
        @keyframes fd-blip{0%,100%{opacity:.35}50%{opacity:1}}
        .blip{animation:fd-blip 1.6s ease-in-out infinite}
        @keyframes fd-tp{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.5);opacity:0}}
        .tp{animation:fd-tp 2s ease-out infinite}
      `}</style>
      <IsothermTexture />
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <Sidebar view={view} setView={setView} />
        <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.15em', color: C.faint, marginBottom: 4 }}>Fleet Dashboard · {view.charAt(0).toUpperCase() + view.slice(1)}</div>
            <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' }}>{titles[view] || 'Overview'}</h1>
          </div>
          {content}
          <div className="mono" style={{ marginTop: 32, paddingTop: 14, borderTop: `1px solid ${C.tborder}`, fontSize: 9, textAlign: 'center', color: C.faint }}>
            ThermalOS · fleet dashboard · Amogh (EE · Cal Poly) + Sam (ME · Cal Poly) · YC W27
          </div>
        </main>
      </div>
    </div>
  );
}
