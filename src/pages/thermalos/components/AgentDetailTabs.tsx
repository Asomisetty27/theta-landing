import React, { useState } from 'react';
import { useAgentDetails, DaemonGpuDetails } from '@/services/agentApi';
import { COLORS, RISK } from '../design-system';

type TabId = 'reasoning' | 'memory' | 'telemetry' | 'integrations';

const TABS: Array<{ id: TabId; label: string; sub: string }> = [
  { id: 'reasoning',    label: 'Reasoning',    sub: 'Causal explanation + decision rules' },
  { id: 'memory',       label: 'Memory',       sub: 'Thermal fingerprint + state posterior' },
  { id: 'telemetry',    label: 'Telemetry',    sub: 'Community benchmarks (Intelligence Network)' },
  { id: 'integrations', label: 'Integrations', sub: 'SLURM / K8s / Grafana script generators' },
];

interface Props {
  selectedGpuIndex: number | null;
}

export default function AgentDetailTabs({ selectedGpuIndex }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('reasoning');
  const { data: details, isLoading, error } = useAgentDetails(selectedGpuIndex);

  if (selectedGpuIndex == null) {
    return (
      <Panel>
        <Empty text="Select a GPU from the sidebar to inspect its causal explanation, memory state, and integration hooks." />
      </Panel>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <TabBar tabs={TABS} active={activeTab} onSelect={setActiveTab} />
      <Panel>
        {isLoading && <Empty text="Loading agent details..." />}
        {!isLoading && !details && (
          <Empty text="No agent details available — daemon may be unreachable. Showing demo fallback in production mode." />
        )}
        {!isLoading && details && (
          <>
            {activeTab === 'reasoning' && <ReasoningTab details={details} />}
            {activeTab === 'memory' && <MemoryTab details={details} />}
            {activeTab === 'telemetry' && <TelemetryTab details={details} />}
            {activeTab === 'integrations' && <IntegrationsTab details={details} />}
          </>
        )}
      </Panel>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared layout primitives
// ──────────────────────────────────────────────────────────────────────────

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '20px',
        background: COLORS.bg.surface,
        border: `1px solid ${COLORS.steel.faint}`,
        borderRadius: '6px',
        minHeight: '240px',
      }}
    >
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ color: COLORS.steel.muted, fontSize: '12px', opacity: 0.7, lineHeight: 1.6 }}>
      {text}
    </div>
  );
}

function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: typeof TABS;
  active: TabId;
  onSelect: (id: TabId) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        padding: '12px',
        background: COLORS.bg.panel,
        border: `1px solid ${COLORS.steel.faint}`,
        borderRadius: '6px',
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              padding: '6px 12px',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: isActive ? COLORS.bg.raised : 'transparent',
              border: `1px solid ${isActive ? COLORS.amber.medium : COLORS.steel.faint}`,
              color: isActive ? COLORS.amber.bright : COLORS.steel.muted,
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            title={tab.sub}
          >
            [{tab.label}]
          </button>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '9px',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: COLORS.steel.muted,
        marginBottom: '8px',
        marginTop: '16px',
      }}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Reasoning tab — causal explanation + raw classifier + fault diagnosis
// ──────────────────────────────────────────────────────────────────────────

function ReasoningTab({ details }: { details: DaemonGpuDetails }) {
  const causal = details.causal_explanation;
  const urgencyColor =
    causal?.urgency === 'emergency' ? RISK.critical :
    causal?.urgency === 'act_now' ? RISK.critical :
    causal?.urgency === 'act_soon' ? RISK.caution :
    causal?.urgency === 'watch' ? RISK.warning :
    RISK.safe;

  return (
    <div>
      {causal && (
        <>
          <SectionLabel>Headline</SectionLabel>
          <div
            style={{
              padding: '12px',
              background: COLORS.bg.raised,
              border: `1px solid ${urgencyColor}`,
              borderRadius: '4px',
              color: COLORS.steel.bright,
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {causal.headline}
            <div
              style={{
                fontSize: '9px',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: urgencyColor,
                marginTop: '6px',
              }}
            >
              Urgency · {causal.urgency.replace('_', ' ')}
            </div>
          </div>

          <SectionLabel>Primary hypothesis</SectionLabel>
          <KeyVal
            label={causal.hypothesis.cause.replace(/_/g, ' ')}
            value={`${(causal.hypothesis.confidence * 100).toFixed(0)}%`}
          />
          <div style={{ fontSize: '12px', color: COLORS.steel.muted, lineHeight: 1.5, marginTop: '4px' }}>
            {causal.hypothesis.one_line}
          </div>

          {causal.alternatives.length > 0 && (
            <>
              <SectionLabel>Alternatives under consideration</SectionLabel>
              {causal.alternatives.map((alt, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '11px',
                    color: COLORS.steel.muted,
                    marginBottom: '6px',
                    paddingLeft: '8px',
                    borderLeft: `2px solid ${COLORS.steel.faint}`,
                  }}
                >
                  <span style={{ color: COLORS.steel.bright }}>
                    {alt.cause.replace(/_/g, ' ')} · {(alt.confidence * 100).toFixed(0)}%
                  </span>{' '}
                  — {alt.one_line}
                </div>
              ))}
            </>
          )}

          <SectionLabel>Evidence</SectionLabel>
          {causal.evidence.map((ev, i) => (
            <div
              key={i}
              style={{
                fontSize: '11px',
                padding: '6px 8px',
                marginBottom: '4px',
                background: COLORS.bg.raised,
                borderRadius: '3px',
                fontFamily: "'JetBrains Mono', monospace",
                color: COLORS.steel.bright,
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span>{ev.value}</span>
              <span style={{ color: COLORS.steel.muted, flexShrink: 0 }}>
                w {ev.weight.toFixed(2)}
              </span>
            </div>
          ))}

          <SectionLabel>Recommended actions</SectionLabel>
          {causal.actions.map((act, i) => (
            <div
              key={i}
              style={{
                padding: '10px',
                marginBottom: '8px',
                background: COLORS.bg.raised,
                border: `1px solid ${COLORS.steel.faint}`,
                borderRadius: '4px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: COLORS.steel.bright }}>
                {i + 1}. {act.title}
              </div>
              <div style={{ fontSize: '11px', color: COLORS.steel.muted, marginTop: '4px', lineHeight: 1.5 }}>
                {act.detail}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '6px',
                  fontSize: '9px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: COLORS.steel.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                <span>Effort · {act.effort}</span>
                {act.integration && <span>Integration · {act.integration}</span>}
                {act.blocks_workload && <span style={{ color: RISK.warning }}>Blocks workload</span>}
              </div>
            </div>
          ))}
        </>
      )}

      {!causal && (
        <Empty text="Causal explanation will appear here once Theta has enough samples to produce a fault diagnosis (~30 stable windows after baseline lock)." />
      )}

      <SectionLabel>Raw classifier output</SectionLabel>
      <KeyVal label={details.raw_classifier.state} value={`${(details.raw_classifier.confidence * 100).toFixed(0)}%`} />

      {details.cnn_prediction && (
        <>
          <SectionLabel>Cascading 1D-CNN prediction (Cai et al. 2026 architecture)</SectionLabel>
          {Object.entries(details.cnn_prediction.p_failure_by_horizon).map(([h, p]) => (
            <KeyVal key={h} label={`P(failure within ${formatHorizon(parseInt(h, 10))})`} value={`${(p * 100).toFixed(1)}%`} />
          ))}
          <KeyVal label="Model confidence" value={`${(details.cnn_prediction.model_confidence * 100).toFixed(0)}%`} />
        </>
      )}
      {!details.cnn_prediction && (
        <div style={{ fontSize: '10px', color: COLORS.steel.muted, marginTop: '12px', opacity: 0.6 }}>
          CNN predictor scaffolding present but no trained weights deployed yet — daemon falls back to rule-based predictor. See <code>theta/agent/predictor_cnn.py</code> for the architecture (cascading 1D CNNs over multi-channel telemetry, inspired by Cai et al. 2026).
        </div>
      )}
    </div>
  );
}

function formatHorizon(s: number): string {
  if (s < 90) return `${s}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  if (s < 172800) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

// ──────────────────────────────────────────────────────────────────────────
// Memory tab — smoothed state posterior + hardware profile + maintenance
// ──────────────────────────────────────────────────────────────────────────

function MemoryTab({ details }: { details: DaemonGpuDetails }) {
  const posterior = details.smoothed_state.posterior;
  const sortedStates = Object.entries(posterior)
    .sort(([, a], [, b]) => b - a)
    .filter(([, p]) => p > 0.005);

  const maint = details.maintenance;
  const profile = details.hw_profile;

  return (
    <div>
      <SectionLabel>State posterior (HMM-smoothed)</SectionLabel>
      <div style={{ marginBottom: '12px' }}>
        {sortedStates.map(([state, p]) => (
          <div key={state} style={{ marginBottom: '6px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: COLORS.steel.bright,
                marginBottom: '2px',
              }}
            >
              <span>{state}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {(p * 100).toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: '4px',
                background: COLORS.bg.raised,
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${p * 100}%`,
                  background: state === details.smoothed_state.state ? COLORS.amber.medium : COLORS.steel.muted,
                  transition: 'width 300ms ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '9px', color: COLORS.steel.muted, fontFamily: "'JetBrains Mono', monospace" }}>
        {details.smoothed_state.n_observations} observations integrated
      </div>

      {profile && (
        <>
          <SectionLabel>Hardware profile</SectionLabel>
          <KeyVal label="Canonical name" value={profile.canonical_name} />
          <KeyVal label="Vendor" value={profile.vendor} />
          <KeyVal label="Cooling" value={profile.cooling} />
          <KeyVal label="Profile confidence" value={profile.confidence} />
        </>
      )}

      {maint && (
        <>
          <SectionLabel>Maintenance projection</SectionLabel>
          <div
            style={{
              padding: '12px',
              background: COLORS.bg.raised,
              border: `1px solid ${
                maint.priority === 'immediate' || maint.priority === 'urgent'
                  ? RISK.critical
                  : maint.priority === 'next_window'
                  ? RISK.caution
                  : COLORS.steel.faint
              }`,
              borderRadius: '4px',
              fontSize: '12px',
              color: COLORS.steel.bright,
              marginBottom: '8px',
            }}
          >
            {maint.headline}
          </div>
          <KeyVal label="Priority" value={maint.priority} />
          {maint.days_until_service != null && (
            <KeyVal
              label="Days until service"
              value={`${maint.days_until_service.toFixed(1)} ± ${maint.days_uncertainty.toFixed(1)}`}
            />
          )}
          <KeyVal label="Dominant factor" value={maint.dominant_factor.replace(/_/g, ' ')} />

          <SectionLabel>Contributing factors</SectionLabel>
          {Object.entries(maint.contributions).map(([k, v]) => (
            <div key={k} style={{ marginBottom: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: COLORS.steel.muted,
                  marginBottom: '2px',
                }}
              >
                <span>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {(v * 100).toFixed(0)}%
                </span>
              </div>
              <div
                style={{
                  height: '3px',
                  background: COLORS.bg.raised,
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, v * 100)}%`,
                    background: COLORS.amber.dim,
                  }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Telemetry tab — Intelligence Network status + community benchmarks
// ──────────────────────────────────────────────────────────────────────────

function TelemetryTab({ details }: { details: DaemonGpuDetails }) {
  return (
    <div>
      <SectionLabel>Intelligence Network</SectionLabel>
      <div style={{ fontSize: '12px', color: COLORS.steel.bright, lineHeight: 1.6, marginBottom: '12px' }}>
        Theta's opt-in telemetry layer uploads <strong>anonymized aggregates only</strong> — R_θ percentiles, ECC rates, recovery-time signatures — bucketed hourly by GPU class. No hostnames, no IPs, no workload content, no model weights leave the host.
      </div>

      <SectionLabel>What this install would share (if opted in)</SectionLabel>
      <div
        style={{
          padding: '10px',
          background: COLORS.bg.raised,
          border: `1px solid ${COLORS.steel.faint}`,
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          color: COLORS.steel.bright,
          lineHeight: 1.6,
        }}
      >
        <div>install_id: sha256(machine-id)[:16]</div>
        <div>gpu_gen: {details.hw_profile?.family ?? 'unknown'}-class</div>
        <div>n_samples_per_hour: ~720 (at 5s interval)</div>
        <div>rtheta_mean, rtheta_std, ecc_sbit_total, recovery_time_p50</div>
        <div style={{ color: COLORS.steel.muted, marginTop: '4px' }}>
          (off by default — set data_sharing: true in ~/.theta/config.json to enable)
        </div>
      </div>

      <SectionLabel>Community benchmarks (when opted in)</SectionLabel>
      <div style={{ fontSize: '11px', color: COLORS.steel.muted, lineHeight: 1.6 }}>
        Cross-fleet percentiles by GPU class — does this unit run hotter or
        cooler than the median {details.hw_profile?.canonical_name ?? 'GPU'} across all opted-in installs? This is the data layer
        that turns Theta into a knowledge network rather than a per-cluster
        diagnostic. Cold-start data not yet aggregated — endpoint will populate
        once Intelligence Network has &gt;100 installations of this hardware class.
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Integrations tab — copy-paste script generators for SLURM/K8s/Grafana
// ──────────────────────────────────────────────────────────────────────────

function IntegrationsTab({ details }: { details: DaemonGpuDetails }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const slurmProlog = `# SLURM prolog — drain node when Theta risk > 0.5
RISK=$(curl -sH "Authorization: Bearer $THETA_TOKEN" \\
  http://localhost:9102/api/v1/health/gpu/${details.gpu_index} | jq .risk)
if (( $(echo "$RISK > 0.5" | bc -l) )); then
  scontrol update nodename=$(hostname) state=drain reason="theta:r_theta_drift"
fi`;

  const k8sCordon = `# Kubernetes admission webhook — cordon node when Theta risk > 0.5
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: theta-thermal-guard
webhooks:
  - name: thermal-guard.theta.svc
    clientConfig:
      url: https://theta.example.com/v1/k8s/admission
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    sideEffects: None
    admissionReviewVersions: ["v1"]`;

  const grafanaQuery = `# Grafana panel queries — Theta-exposed Prometheus metrics
# R_θ per GPU
theta_gpu_rtheta_cwatt{gpu_index="${details.gpu_index}"}

# Degradation risk score (rule-based predictor)
theta_gpu_degradation_risk{gpu_index="${details.gpu_index}"}

# Smoothed state posterior (HMM filter)
theta_gpu_state_posterior{gpu_index="${details.gpu_index}",state="under_load"}

# Maintenance days-until-service (composite of aging + ambient + workload)
theta_gpu_maintenance_days{gpu_index="${details.gpu_index}"}`;

  return (
    <div>
      <SectionLabel>SLURM prolog — auto-drain on drift</SectionLabel>
      <Snippet
        label="SLURM"
        text={slurmProlog}
        copied={copied === 'SLURM'}
        onCopy={() => copy('SLURM', slurmProlog)}
      />

      <SectionLabel>Kubernetes admission webhook</SectionLabel>
      <Snippet
        label="K8s"
        text={k8sCordon}
        copied={copied === 'K8s'}
        onCopy={() => copy('K8s', k8sCordon)}
      />

      <SectionLabel>Grafana panel queries</SectionLabel>
      <Snippet
        label="Grafana"
        text={grafanaQuery}
        copied={copied === 'Grafana'}
        onCopy={() => copy('Grafana', grafanaQuery)}
      />

      <SectionLabel>Integration status</SectionLabel>
      <div style={{ fontSize: '11px', color: COLORS.steel.muted, lineHeight: 1.6 }}>
        These snippets reach Theta via the <code>/api/v1/health</code> +
        <code> /api/v1/agent/*</code> endpoints. Production deployments
        should set <code>THETA_HEALTH_TOKEN</code> for bearer-token auth and
        front the daemon with a reverse proxy (Envoy, NGINX) for TLS + rate
        limiting before exposing on a shared network.
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Small primitives
// ──────────────────────────────────────────────────────────────────────────

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        fontSize: '11px',
        borderBottom: `1px solid ${COLORS.bg.raised}`,
      }}
    >
      <span style={{ color: COLORS.steel.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span
        style={{
          color: COLORS.steel.bright,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Snippet({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: '12px',
        padding: '10px 36px 10px 10px',
        background: COLORS.bg.raised,
        border: `1px solid ${COLORS.steel.faint}`,
        borderRadius: '4px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        color: COLORS.steel.bright,
        whiteSpace: 'pre-wrap',
        overflowX: 'auto',
      }}
    >
      <button
        onClick={onCopy}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          padding: '3px 8px',
          fontSize: '8px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          background: copied ? COLORS.amber.medium : COLORS.bg.surface,
          border: `1px solid ${copied ? COLORS.amber.medium : COLORS.steel.faint}`,
          color: copied ? COLORS.bg.deep : COLORS.steel.muted,
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      {text}
    </div>
  );
}
