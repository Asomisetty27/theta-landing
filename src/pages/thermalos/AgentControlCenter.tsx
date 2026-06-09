import React, { useState, useMemo } from 'react';
import { useFleetStatus } from '@/services/agentApi';
import FleetStatusSidebar from './components/FleetStatusSidebar';
import IncidentPanel from './components/IncidentPanel';
import PillarProgress from './components/PillarProgress';
import AgentDetailTabs from './components/AgentDetailTabs';
import { COLORS } from './design-system';

export default function AgentControlCenter() {
  const { data: fleetStatus, isLoading, error } = useFleetStatus();
  const [selectedGpuIndex, setSelectedGpuIndex] = useState<number | null>(null);

  // Auto-select first anomalous GPU on load
  useMemo(() => {
    if (fleetStatus && selectedGpuIndex === null) {
      const anomalous = fleetStatus.gpus.find(
        (g) => g.state === 'critical' || g.state === 'drifting'
      );
      if (anomalous) {
        setSelectedGpuIndex(anomalous.index);
      }
    }
  }, [fleetStatus, selectedGpuIndex]);

  const selectedGpu = fleetStatus?.gpus.find((g) => g.index === selectedGpuIndex) || null;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg.deep }}>
      {/* Header */}
      <div
        style={{
          padding: '24px',
          borderBottom: `1px solid ${COLORS.steel.faint}`,
          background: COLORS.bg.deep,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          <div>
            <h1
              style={{
                margin: '0 0 8px 0',
                fontSize: '24px',
                fontWeight: 600,
                color: COLORS.steel.bright,
              }}
            >
              Theta Agent Command Center
            </h1>
            <div
              style={{
                fontSize: '12px',
                color: COLORS.steel.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Real-time thermal intelligence · Fleet overview · Autonomous remediation
            </div>
          </div>

          {/* Status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: COLORS.bg.surface,
              border: `1px solid ${COLORS.steel.faint}`,
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isLoading ? '#FFA500' : error ? '#B83030' : '#1D9E75',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                color: COLORS.steel.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {isLoading ? 'Connecting...' : error ? 'Demo Mode' : 'Daemon Live'}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '24px',
            minHeight: 'calc(100vh - 140px)',
          }}
        >
          {/* Left sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {fleetStatus && (
              <FleetStatusSidebar
                gpus={fleetStatus.gpus}
                selectedIndex={selectedGpuIndex}
                onSelectGpu={setSelectedGpuIndex}
              />
            )}

            {fleetStatus && <PillarProgress fleetStatus={fleetStatus} />}
          </div>

          {/* Right pane */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Main incident/fleet panel */}
            {fleetStatus && (
              <IncidentPanel
                gpu={selectedGpu}
                fleetAnomalyCount={
                  fleetStatus.gpus.filter(
                    (g) => g.state === 'critical' || g.state === 'drifting'
                  ).length
                }
              />
            )}

            {/* Real tab system — Reasoning / Memory / Telemetry / Integrations.
                Driven by useAgentDetails() which polls /api/v1/agent/gpu/{i}/details
                every 5s. Falls back to demo data when daemon isn't running. */}
            <AgentDetailTabs selectedGpuIndex={selectedGpuIndex} />
          </div>
        </div>
      </div>
    </div>
  );
}
