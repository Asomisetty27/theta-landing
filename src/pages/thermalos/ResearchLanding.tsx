/**
 * ThermalOS Research Landing — amogh.site/thermalos
 *
 * Audience: academics, Kundu, Yu, OSS users, engineers from GitHub/PyPI.
 * Tone: research project page, not a product pitch.
 * Data is the hero. Formula is the anchor. Findings are the content.
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import { researchPath } from './config';

/* ── Design tokens (shared with Theta brand) ──────────────────────────────── */
const T = {
  bg:       '#09090D',
  s1:       '#0F0F15',
  s2:       '#141419',
  border:   '#1E1E28',
  borderHi: '#2A2A38',
  text:     '#E2E2EA',
  muted:    '#7A7A8A',
  faint:    '#3A3A4A',
  healthy:  '#D4AF37',
  caution:  '#C8942A',
  rising:   '#C85F2A',
  accent:   '#3B82F6',
};

const FD = "'Space Grotesk', system-ui, sans-serif";
const FM = "'JetBrains Mono', ui-monospace, monospace";

/* ── Shared style primitives ──────────────────────────────────────────────── */
const cell: React.CSSProperties = {
  fontFamily: FM,
  fontSize: 13,
  color: T.text,
  padding: '10px 14px',
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: 'top',
};

const headerCell: React.CSSProperties = {
  ...cell,
  color: T.muted,
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${T.borderHi}`,
  paddingBottom: 8,
};

/* ── Findings data ────────────────────────────────────────────────────────── */
const FINDINGS = [
  {
    id: 'F1',
    statement: 'R_θ captures thermal memory invisible to utilisation and power alone',
    evidence: 'E001–E004 v2',
    headline: '35% R_θ shift between thermal regimes (n=7 trials)',
    confidence: 'high',
  },
  {
    id: 'F2',
    statement: 'T_reference sensitivity: ±5 °C ambient error causes ±35% R_θ swing at idle',
    evidence: 'E001, E002',
    headline: 'Sensitivity quantified at each power tier (Kundu mandate)',
    confidence: 'high',
  },
  {
    id: 'F3',
    statement: 'Power smoothing has no detectable effect on R_θ variance (null result)',
    evidence: 'E002',
    headline: 'Simplifies the pipeline — smoothing layer dropped in v0.1.2',
    confidence: 'high',
  },
  {
    id: 'F4',
    statement: 'Elevated post-load R_θ is CUDA context overhead, not thermal lag',
    evidence: 'E002, E003',
    headline: 'Resolved apparent anomaly — memory artifact identified and isolated',
    confidence: 'high',
  },
  {
    id: 'F5',
    statement: 'Cross-trial reproducibility is strong (CV ≈ 1.68% within thermal group)',
    evidence: 'E004 v1 + v2',
    headline: '2.0% CV within-group; 14% cross-group is the F1 signature, not noise',
    confidence: 'high',
  },
  {
    id: 'F6',
    statement: 'Same-process exit never recovers: GPU stuck at P0, 30–31 W for 600 s',
    evidence: 'E002, E003',
    headline: 'Child-process exit recovers cleanly in 140–210 s. Invisible to util-only tools.',
    confidence: 'high',
  },
];

/* ── Sub-components ───────────────────────────────────────────────────────── */

function Badge({ children, color = T.muted }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: FM,
      fontSize: 10,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color,
      border: `1px solid ${color}33`,
      borderRadius: 3,
      padding: '2px 6px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: FM,
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: T.muted,
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ color: T.healthy }}>▸</span>
      {children}
      <span style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

function NavBar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 52,
      background: `${T.bg}E8`,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${T.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 clamp(20px, 5%, 72px)',
      justifyContent: 'space-between',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: FM, fontSize: 13, color: T.text }}>thermalos</span>
        <Badge color={T.healthy}>research</Badge>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {[
          { label: 'Findings', href: researchPath('findings') },
          { label: 'Experiments', href: researchPath('lab') },
          { label: 'Publication', href: researchPath('publication') },
          { label: 'Advisor', href: researchPath('advisor') },
        ].map(({ label, href }) => (
          <Link key={label} to={href} style={{
            fontFamily: FD,
            fontSize: 13,
            color: T.muted,
            textDecoration: 'none',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          >
            {label}
          </Link>
        ))}
        <a
          href="https://github.com/Asomisetty27/theta"
          target="_blank" rel="noreferrer"
          style={{
            fontFamily: FM, fontSize: 12, color: T.muted,
            textDecoration: 'none', border: `1px solid ${T.border}`,
            borderRadius: 4, padding: '4px 10px',
          }}
        >
          GitHub ↗
        </a>
      </div>
    </nav>
  );
}

function HeroFormula() {
  return (
    <div style={{
      border: `1px solid ${T.borderHi}`,
      borderRadius: 8,
      padding: '32px 40px',
      background: T.s1,
      maxWidth: 640,
      margin: '0 auto 48px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: FM,
        fontSize: 28,
        color: T.text,
        letterSpacing: '-0.01em',
        marginBottom: 16,
      }}>
        R_θ<sub style={{ fontSize: 18 }}>eff</sub>(t){'  '}={' '}
        <span style={{ color: T.healthy }}>T_junction</span>(t) −{' '}
        <span style={{ color: T.caution }}>T_ref</span>(t)
        <span style={{ color: T.muted, margin: '0 6px' }}>/</span>
        <span style={{ color: T.rising }}>P_GPU</span>(t)
      </div>
      <div style={{
        fontFamily: FD, fontSize: 13, color: T.muted,
        lineHeight: 1.6, maxWidth: 480, margin: '0 auto',
      }}>
        In a healthy GPU, thermal resistance is roughly stable over time.
        A rising R_θ at steady power means cooling is degrading —
        independent of workload.
      </div>
      <div style={{
        display: 'flex', gap: 24, justifyContent: 'center',
        marginTop: 20, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Clean idle', value: '~1.28 C/W', color: T.healthy },
          { label: 'Under load', value: '~0.72 C/W', color: T.caution },
          { label: 'Separation', value: '77.9%',     color: T.text },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: FM, fontSize: 20, color, marginBottom: 2 }}>{value}</div>
            <div style={{ fontFamily: FD, fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FindingsTable() {
  return (
    <div style={{
      overflowX: 'auto',
      border: `1px solid ${T.border}`,
      borderRadius: 6,
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...headerCell, width: 48 }}>#</th>
            <th style={headerCell}>Finding</th>
            <th style={headerCell}>Evidence</th>
            <th style={{ ...headerCell, minWidth: 240 }}>Key result</th>
            <th style={{ ...headerCell, width: 80 }}>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {FINDINGS.map((f, i) => (
            <tr key={f.id} style={{ background: i % 2 === 0 ? 'transparent' : `${T.s1}66` }}>
              <td style={{ ...cell, color: T.muted }}>{f.id}</td>
              <td style={{ ...cell, color: T.text, lineHeight: 1.5 }}>{f.statement}</td>
              <td style={{ ...cell, color: T.muted, whiteSpace: 'nowrap' }}>{f.evidence}</td>
              <td style={{ ...cell, color: T.muted, lineHeight: 1.5, fontSize: 12 }}>{f.headline}</td>
              <td style={{ ...cell }}>
                <Badge color={T.healthy}>high</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentBlock() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 16,
    }}>
      {/* pip install card */}
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: 6,
        background: T.s1, padding: 24,
      }}>
        <div style={{ fontFamily: FM, fontSize: 11, color: T.muted, marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Install
        </div>
        <div style={{
          fontFamily: FM, fontSize: 15, color: T.healthy,
          background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 4, padding: '10px 14px', marginBottom: 12,
          letterSpacing: '0.01em',
        }}>
          pip install runtheta
        </div>
        <div style={{
          fontFamily: FM, fontSize: 13, color: T.muted,
          lineHeight: 1.8,
        }}>
          <div style={{ color: T.faint }}>$ theta setup</div>
          <div style={{ color: T.faint }}>$ theta monitor</div>
          <div style={{ color: T.faint }}>$ theta calibrate   <span style={{ color: `${T.muted}66` }}># non-T4 GPUs</span></div>
        </div>
      </div>

      {/* Stats card */}
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: 6,
        background: T.s1, padding: 24,
      }}>
        <div style={{ fontFamily: FM, fontSize: 11, color: T.muted, marginBottom: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Stage 1 — Tesla T4, Colab
        </div>
        {[
          { label: 'Total rows',      value: '8,734',  sub: 'E001–E004 v1 + E004 v2' },
          { label: 'Experiments',     value: '4',      sub: 'E001, E002, E003, E004' },
          { label: 'Validated findings', value: '6',   sub: 'F1 through F6' },
          { label: 'Agent version',   value: 'v0.1.9', sub: 'live on PyPI' },
          { label: 'Detection layers', value: '6',     sub: 'ensemble → fault curve → ECC' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${T.border}`,
          }}>
            <div>
              <div style={{ fontFamily: FD, fontSize: 13, color: T.text }}>{label}</div>
              <div style={{ fontFamily: FM, fontSize: 11, color: T.muted }}>{sub}</div>
            </div>
            <div style={{ fontFamily: FM, fontSize: 18, color: T.healthy }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Publication + links card */}
      <div style={{
        border: `1px solid ${T.border}`, borderRadius: 6,
        background: T.s1, padding: 24,
      }}>
        <div style={{ fontFamily: FM, fontSize: 11, color: T.muted, marginBottom: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Publication track
        </div>
        <div style={{ fontFamily: FD, fontSize: 13, color: T.text, marginBottom: 6 }}>
          ICPE 2027 (working target)
        </div>
        <div style={{ fontFamily: FD, fontSize: 12, color: T.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Advisor: Souvik Kundu (ex-Intel yield engineering, Cal Poly EE).
          Stage 2 on DGX B200 (Cal Poly AI Factory, 4 nodes) pending access.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'GitHub', href: 'https://github.com/Asomisetty27/theta', badge: 'source' },
            { label: 'PyPI',   href: 'https://pypi.org/project/runtheta', badge: 'v0.1.9' },
            { label: 'Research app', href: researchPath(), badge: 'internal', internal: true },
          ].map(({ label, href, badge, internal }) => (
            internal ? (
              <Link key={label} to={href} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: FD, fontSize: 13, color: T.muted, textDecoration: 'none',
                padding: '6px 0', borderBottom: `1px solid ${T.border}`,
              }}>
                {label} <Badge>{badge}</Badge>
              </Link>
            ) : (
              <a key={label} href={href} target="_blank" rel="noreferrer" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: FD, fontSize: 13, color: T.muted, textDecoration: 'none',
                padding: '6px 0', borderBottom: `1px solid ${T.border}`,
              }}>
                {label} ↗ <Badge>{badge}</Badge>
              </a>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfidenceMap() {
  const rows: { claim: string; confidence: 'high' | 'low' | 'assumed'; note: string }[] = [
    { claim: 'R_θ separates idle vs load', confidence: 'high', note: '7 trials, F1 dim-1: 35% shift' },
    { claim: 'Within-group reproducibility', confidence: 'high', note: 'F5: 2.0% CV; 1.68% Stage 1 headline' },
    { claim: 'Wait duration drives recovery', confidence: 'high', note: 'F1 dim-2: 10× improvement, 30-min vs 60-s wait' },
    { claim: 'CUDA context retention causes lag', confidence: 'high', note: 'F6: same-process stuck at P0 for 600 s' },
    { claim: 'T_ref sensitivity is ±35% per ±5 °C', confidence: 'high', note: 'F2: quantified at each power tier' },
    { claim: 'Classifier viability', confidence: 'high', note: 'NB 99.8% / DT 100% with 15-s steady-state window' },
    { claim: 'R_θ rises before throttling (lead-time)', confidence: 'low', note: 'E-LT — Fall 2026, hardware pending' },
    { claim: 'Stage 1 findings replicate on DGX B200', confidence: 'low', note: 'Stage 2 — pending AI Factory access' },
    { claim: 'Classifier holds across vendors', confidence: 'assumed', note: 'AMD/Intel not yet tested; calibrate command mitigates' },
  ];

  const colorMap = { high: T.healthy, low: T.caution, assumed: T.muted };

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={headerCell}>Claim</th>
            <th style={{ ...headerCell, width: 100 }}>Confidence</th>
            <th style={headerCell}>Basis</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.claim} style={{ background: i % 2 === 0 ? 'transparent' : `${T.s1}66` }}>
              <td style={{ ...cell, color: T.text }}>{r.claim}</td>
              <td style={{ ...cell }}>
                <Badge color={colorMap[r.confidence]}>{r.confidence}</Badge>
              </td>
              <td style={{ ...cell, color: T.muted, fontSize: 12, lineHeight: 1.5 }}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function ResearchLanding() {
  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text }}>
      <NavBar />

      <main style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 'clamp(80px, 10vw, 120px) clamp(20px, 5%, 48px) 80px',
      }}>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Badge color={T.healthy}>Stage 1 complete</Badge>
            <Badge color={T.accent}>v0.1.9 on PyPI</Badge>
          </div>
          <h1 style={{
            fontFamily: FD,
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: T.text,
            marginBottom: 16,
          }}>
            ThermalOS
          </h1>
          <p style={{
            fontFamily: FD,
            fontSize: 'clamp(14px, 2vw, 17px)',
            color: T.muted,
            maxWidth: 580,
            lineHeight: 1.7,
            marginBottom: 36,
          }}>
            GPU thermal-power forensics research. We compute effective thermal resistance
            from software telemetry alone — no thermocouple required — and show it captures
            thermal history that utilisation and power cannot.
          </p>
          <HeroFormula />
        </div>

        {/* ── Stage 1 findings ─────────────────────────────────────────── */}
        <section style={{ marginBottom: 60 }}>
          <SectionLabel>Stage 1 Findings — Tesla T4, Google Colab</SectionLabel>
          <FindingsTable />
          <div style={{
            fontFamily: FM, fontSize: 11, color: T.muted, marginTop: 10,
            display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            <span>n = 8,734 rows across 4 experiments (E001–E004 v2)</span>
            <Link to={researchPath('findings')} style={{ color: T.accent, textDecoration: 'none' }}>
              Full methodology + data →
            </Link>
          </div>
        </section>

        {/* ── OSS agent + stats + links ─────────────────────────────────── */}
        <section style={{ marginBottom: 60 }}>
          <SectionLabel>Open-Source Agent</SectionLabel>
          <AgentBlock />
        </section>

        {/* ── Confidence map ────────────────────────────────────────────── */}
        <section style={{ marginBottom: 60 }}>
          <SectionLabel>Confidence Map</SectionLabel>
          <ConfidenceMap />
          <div style={{ fontFamily: FD, fontSize: 12, color: T.muted, marginTop: 10, lineHeight: 1.6 }}>
            Stage 2 validation (DGX B200, Cal Poly AI Factory) is gated on hardware access.
            The lead-time result (does R_θ rise before throttling?) determines whether
            Theta is a predictive maintenance tool or a diagnostic one. E-LT planned for Fall 2026.
          </div>
        </section>

        {/* ── Footer nav ───────────────────────────────────────────────── */}
        <div style={{
          borderTop: `1px solid ${T.border}`,
          paddingTop: 32,
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {[
            { label: 'Findings',    href: researchPath('findings'),    internal: true },
            { label: 'Lab data',    href: researchPath('lab'),         internal: true },
            { label: 'Advisor',     href: researchPath('advisor'),     internal: true },
            { label: 'Publication', href: researchPath('publication'), internal: true },
            { label: 'GitHub',      href: 'https://github.com/Asomisetty27/theta', internal: false },
            { label: 'PyPI',        href: 'https://pypi.org/project/runtheta',        internal: false },
          ].map(({ label, href, internal }) =>
            internal ? (
              <Link key={label} to={href} style={{
                fontFamily: FD, fontSize: 13, color: T.muted, textDecoration: 'none',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
              >
                {label}
              </Link>
            ) : (
              <a key={label} href={href} target="_blank" rel="noreferrer" style={{
                fontFamily: FD, fontSize: 13, color: T.muted, textDecoration: 'none',
              }}>
                {label} ↗
              </a>
            )
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: FM, fontSize: 11, color: T.faint }}>
            Amogh Somisetty · Sam · Cal Poly EE · 2026
          </span>
        </div>
      </main>
    </div>
  );
}
