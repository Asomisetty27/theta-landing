import React from 'react';
import { FleetStatus } from '@/types/agent';
import { COLORS, RISK } from '../design-system';

interface Props {
  fleetStatus?: FleetStatus;
}

export default function PillarProgress({ fleetStatus }: Props) {
  // Compute pillar coverage based on fleet state
  const computeAutonomy = (): number => {
    if (!fleetStatus) return 40;
    const incidentsResolved = fleetStatus.gpus.filter((g) => g.state === 'idle').length;
    return Math.min(100, (incidentsResolved / Math.max(1, fleetStatus.gpus.length)) * 100);
  };

  const computeReasoning = (): number => {
    if (!fleetStatus) return 60;
    const diagnosed = fleetStatus.gpus.filter((g) => g.fault_class !== null).length;
    const confidentDiagnoses = fleetStatus.gpus.filter((g) => g.confidence > 0.85).length;
    return Math.min(100, ((diagnosed + confidentDiagnoses) / (fleetStatus.gpus.length * 2)) * 100);
  };

  const computeToolUse = (): number => {
    if (!fleetStatus) return 80;
    // Assume SLURM + Grafana integration = 80%, other integrations = remaining
    return 80;
  };

  const computeMemory = (): number => {
    if (!fleetStatus) return 40;
    const withFingerprints = fleetStatus.gpus.filter((g) => g.rtheta_baseline !== 0).length;
    return Math.min(100, (withFingerprints / Math.max(1, fleetStatus.gpus.length)) * 100);
  };

  const computeAdaptability = (): number => {
    if (!fleetStatus) return 100;
    // theta calibrate is shipped and deployed
    return 100;
  };

  const pillars = [
    {
      name: 'Autonomy',
      coverage: computeAutonomy(),
      desc: 'Closed-loop remediation',
      color: RISK.safe,
    },
    {
      name: 'Reasoning',
      coverage: computeReasoning(),
      desc: 'Fault diagnosis',
      color: RISK.warning,
    },
    {
      name: 'Tool-Use',
      coverage: computeToolUse(),
      desc: 'Infrastructure hooks',
      color: RISK.warning,
    },
    {
      name: 'Memory',
      coverage: computeMemory(),
      desc: 'Thermal fingerprints',
      color: RISK.safe,
    },
    {
      name: 'Adaptability',
      coverage: computeAdaptability(),
      desc: 'Self-calibration',
      color: RISK.safe,
    },
  ];

  return (
    <div
      style={{
        padding: '16px',
        background: COLORS.bg.panel,
        border: `1px solid ${COLORS.steel.faint}`,
        borderRadius: '6px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: COLORS.steel.muted,
          marginBottom: '12px',
        }}
      >
        Theta Capability Map
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {pillars.map((pillar) => (
          <div key={pillar.name}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  color: COLORS.steel.bright,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {pillar.name}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: pillar.color,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                }}
              >
                {Math.round(pillar.coverage)}%
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: '6px',
                background: COLORS.bg.raised,
                border: `1px solid ${COLORS.steel.faint}`,
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '3px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${pillar.color}, ${pillar.color}dd)`,
                  width: `${pillar.coverage}%`,
                  transition: 'width 300ms ease',
                }}
              />
            </div>

            <div
              style={{
                fontSize: '8px',
                color: COLORS.steel.muted,
                opacity: 0.7,
              }}
            >
              {pillar.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${COLORS.steel.faint}`,
          fontSize: '8px',
          color: COLORS.steel.muted,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase' }}>
          Pillar Status
        </div>
        <div>
          <span style={{ color: RISK.safe }}>■</span> Ready ·{' '}
          <span style={{ color: RISK.warning }}>■</span> Partial ·{' '}
          <span style={{ color: RISK.caution }}>■</span> In progress
        </div>
      </div>
    </div>
  );
}
