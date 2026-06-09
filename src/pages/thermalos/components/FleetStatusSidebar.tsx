import React from 'react';
import { GPUStateSnapshot } from '@/types/agent';
import { COLORS, RISK } from '../design-system';

interface Props {
  gpus: GPUStateSnapshot[];
  selectedIndex: number | null;
  onSelectGpu: (index: number) => void;
  onDrain?: (index: number) => void;
  onRecalibrate?: (index: number) => void;
}

export default function FleetStatusSidebar({ gpus, selectedIndex, onSelectGpu }: Props) {
  const getRiskColor = (risk: number): string => {
    if (risk < 0.3) return RISK.safe;
    if (risk < 0.6) return RISK.warning;
    if (risk < 0.85) return RISK.caution;
    return RISK.critical;
  };

  const getTrendGlyph = (recent: any[]): string => {
    if (recent.length < 2) return '→';
    const prev = recent[recent.length - 2];
    const curr = recent[recent.length - 1];
    if (curr.rtheta > prev.rtheta * 1.02) return '↗️';
    if (curr.rtheta < prev.rtheta * 0.98) return '↘️';
    return '→';
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
        gap: '12px',
        padding: '16px',
        background: COLORS.bg.panel,
        border: `1px solid ${COLORS.steel.faint}`,
        borderRadius: '6px',
        minWidth: '240px',
        maxHeight: '600px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: COLORS.steel.muted,
          marginBottom: '8px',
        }}
      >
        Fleet Status ({gpus.length} GPUs)
      </div>

      {gpus.map((gpu) => (
        <button
          key={gpu.index}
          onClick={() => onSelectGpu(gpu.index)}
          style={{
            padding: '12px',
            background:
              selectedIndex === gpu.index
                ? `linear-gradient(135deg, ${COLORS.bg.raised}, ${COLORS.bg.surface})`
                : COLORS.bg.surface,
            border: `1px solid ${
              selectedIndex === gpu.index ? COLORS.amber.medium : COLORS.steel.faint
            }`,
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            if (selectedIndex !== gpu.index) {
              e.currentTarget.style.borderColor = COLORS.steel.muted;
              e.currentTarget.style.background = COLORS.bg.raised;
            }
          }}
          onMouseLeave={(e) => {
            if (selectedIndex !== gpu.index) {
              e.currentTarget.style.borderColor = COLORS.steel.faint;
              e.currentTarget.style.background = COLORS.bg.surface;
            }
          }}
        >
          {/* GPU ID + Model */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: COLORS.steel.bright,
              }}
            >
              GPU {gpu.index}
            </span>
            <span
              style={{
                fontSize: '9px',
                color: COLORS.steel.muted,
              }}
            >
              {gpu.model}
            </span>
          </div>

          {/* State + Emoji */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            <span style={{ color: getRiskColor(gpu.risk_score) }}>
              {getStateEmoji(gpu.state)} {gpu.state}
            </span>
            <span style={{ color: COLORS.steel.muted }}>
              {getTrendGlyph(gpu.decision_log_recent)}
            </span>
          </div>

          {/* Risk Score */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                color: COLORS.steel.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Risk
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: getRiskColor(gpu.risk_score),
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {gpu.risk_score.toFixed(2)}
            </span>
          </div>

          {/* R_θ + Baseline */}
          <div
            style={{
              fontSize: '9px',
              color: COLORS.steel.muted,
              marginBottom: '6px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
            }}
          >
            <div>
              <div style={{ opacity: 0.7 }}>R_θ</div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: COLORS.steel.bright,
                  fontSize: '10px',
                }}
              >
                {gpu.rtheta_cw.toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>Baseline</div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: COLORS.steel.bright,
                  fontSize: '10px',
                }}
              >
                {gpu.rtheta_baseline.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Confidence */}
          <div
            style={{
              fontSize: '9px',
              color: COLORS.steel.muted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Confidence</span>
            <span
              style={{
                color: COLORS.steel.bright,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {(gpu.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Action Buttons (stubs for now) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              marginTop: '8px',
            }}
          >
            <button
              style={{
                fontSize: '8px',
                padding: '4px 8px',
                background: COLORS.steel.faint,
                border: `1px solid ${COLORS.steel.muted}`,
                color: COLORS.steel.bright,
                borderRadius: '2px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              Drain
            </button>
            <button
              style={{
                fontSize: '8px',
                padding: '4px 8px',
                background: COLORS.steel.faint,
                border: `1px solid ${COLORS.steel.muted}`,
                color: COLORS.steel.bright,
                borderRadius: '2px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              Recal
            </button>
          </div>
        </button>
      ))}
    </div>
  );
}
