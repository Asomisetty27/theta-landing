import React from 'react';
import { GPUStateSnapshot } from '@/types/agent';
import { COLORS, RISK } from '../design-system';

interface Props {
  gpu: GPUStateSnapshot | null;
  fleetAnomalyCount?: number;
}

export default function IncidentPanel({ gpu, fleetAnomalyCount = 0 }: Props) {
  if (!gpu) {
    return (
      <div
        style={{
          padding: '24px',
          background: COLORS.bg.surface,
          border: `1px solid ${COLORS.steel.faint}`,
          borderRadius: '6px',
          color: COLORS.steel.muted,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '14px', marginBottom: '12px' }}>Fleet is Nominal</div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          {fleetAnomalyCount === 0
            ? 'All GPUs operating within expected parameters'
            : `${fleetAnomalyCount} anomaly detected`}
        </div>
      </div>
    );
  }

  const faultDescriptions: Record<string, string> = {
    cooling_degradation: 'Cooling path degradation — check airflow and thermal paste',
    dust_accumulation: 'Dust accumulation detected — scheduled cleaning recommended',
    thermal_interface_material: 'TIM interface degradation — TIM replacement may be needed',
    fan_blockage: 'Fan obstruction detected — clear vents and intake',
    mounting_issue: 'Mounting pressure change — verify physical installation',
    unknown: 'Unknown failure mode — escalate to support',
  };

  const getRiskColor = (risk: number): string => {
    if (risk < 0.3) return RISK.safe;
    if (risk < 0.6) return RISK.warning;
    if (risk < 0.85) return RISK.caution;
    return RISK.critical;
  };

  const getStateEmoji = (state: string): string => {
    switch (state) {
      case 'idle':
        return '◌';
      case 'load':
        return '●';
      case 'drifting':
        return '⚠️';
      case 'critical':
        return '🔴';
      case 'recovery':
        return '⟳';
      default:
        return '?';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        background: COLORS.bg.surface,
        border: `1px solid ${COLORS.steel.faint}`,
        borderRadius: '6px',
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <span style={{ fontSize: '24px' }}>{getStateEmoji(gpu.state)}</span>
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: COLORS.steel.bright,
              }}
            >
              GPU {gpu.index} — {gpu.model}
            </div>
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: getRiskColor(gpu.risk_score),
              }}
            >
              {gpu.state} · Risk {gpu.risk_score.toFixed(2)} · Confidence {(gpu.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Current Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '9px', color: COLORS.steel.muted, marginBottom: '4px' }}>Temperature</div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: COLORS.steel.bright,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {gpu.temperature_c.toFixed(1)}°C
          </div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: COLORS.steel.muted, marginBottom: '4px' }}>Power</div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: COLORS.steel.bright,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {gpu.power_w.toFixed(1)}W
          </div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: COLORS.steel.muted, marginBottom: '4px' }}>R_θ (Current)</div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: getRiskColor(gpu.risk_score),
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {gpu.rtheta_cw.toFixed(3)} C/W
          </div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: COLORS.steel.muted, marginBottom: '4px' }}>R_θ (Baseline)</div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: COLORS.steel.bright,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {gpu.rtheta_baseline.toFixed(3)} C/W
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      {gpu.fault_class && (
        <div
          style={{
            padding: '12px',
            background: COLORS.bg.raised,
            border: `1px solid ${COLORS.steel.faint}`,
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: COLORS.steel.muted,
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Diagnosis
          </div>
          <div
            style={{
              fontSize: '12px',
              color: COLORS.steel.bright,
              lineHeight: 1.4,
            }}
          >
            {faultDescriptions[gpu.fault_class] || 'Unknown condition'}
          </div>
          {gpu.ecc_dbit_any && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '11px',
                color: RISK.critical,
                fontWeight: 500,
              }}
            >
              ⚠️ Double-bit ECC error detected
            </div>
          )}
        </div>
      )}

      {/* Recommended Actions */}
      <div>
        <div
          style={{
            fontSize: '10px',
            color: COLORS.steel.muted,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Recommended Actions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {gpu.recommendation === 'drain' && (
            <div
              style={{
                fontSize: '12px',
                padding: '8px 12px',
                background: RISK.critical + '15',
                border: `1px solid ${RISK.critical}`,
                borderRadius: '4px',
                color: COLORS.steel.bright,
              }}
            >
              1. Drain this GPU from workload (SLURM)
            </div>
          )}
          {gpu.fault_class && (
            <div
              style={{
                fontSize: '12px',
                padding: '8px 12px',
                background: COLORS.bg.raised,
                border: `1px solid ${COLORS.steel.faint}`,
                borderRadius: '4px',
                color: COLORS.steel.bright,
              }}
            >
              2. Clear cooling path / check thermal interface
            </div>
          )}
          <div
            style={{
              fontSize: '12px',
              padding: '8px 12px',
              background: COLORS.bg.raised,
              border: `1px solid ${COLORS.steel.faint}`,
              borderRadius: '4px',
              color: COLORS.steel.bright,
            }}
          >
            3. Rerun `theta calibrate --gpu {gpu.index}` after maintenance
          </div>
        </div>
      </div>

      {/* Recovery Timeline */}
      {gpu.recovery_eta_sec > 0 && (
        <div>
          <div
            style={{
              fontSize: '10px',
              color: COLORS.steel.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Recovery Timeline
          </div>
          <div
            style={{
              fontSize: '12px',
              padding: '8px 12px',
              background: COLORS.bg.raised,
              border: `1px solid ${COLORS.steel.faint}`,
              borderRadius: '4px',
              color: COLORS.steel.bright,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ETA to recovery: ~{Math.ceil(gpu.recovery_eta_sec / 60)} min
          </div>
        </div>
      )}

      {/* Recent State Transitions */}
      {gpu.decision_log_recent.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '10px',
              color: COLORS.steel.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Recent Transitions
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '10px',
            }}
          >
            {gpu.decision_log_recent.slice(0, 3).map((trans, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 8px',
                  background: COLORS.bg.raised,
                  border: `1px solid ${COLORS.steel.faint}`,
                  borderRadius: '3px',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <div style={{ color: COLORS.steel.bright, marginBottom: '2px' }}>
                  {trans.old_state} → {trans.new_state}
                </div>
                <div style={{ color: COLORS.steel.muted, fontSize: '9px' }}>
                  {trans.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
