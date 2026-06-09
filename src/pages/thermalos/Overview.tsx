import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Cpu, FlaskConical, Zap } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from "recharts";
import {
  fetchMeasurements, generateDemoMeasurements, isDemoModeError,
  generateDemoRoadmapStages,
  fetchTimeline, generateDemoTimeline,
  fetchAdvisorQuestions, generateDemoAdvisorQuestions,
  fetchWikiSummary, generateDemoWikiSummary,
  type MeasurementRow, type RoadmapStage, type TimelineRow, type AdvisorQuestion,
} from "@/services/thermalosApi";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-md ${className}`}
      style={{ background: "var(--t-deep-field)", border: "0.5px solid var(--t-border)", ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: "var(--t-faint)" }}>
        {children}
      </div>
      {hint && <div className="text-[10px] font-mono" style={{ color: "var(--t-faint)" }}>{hint}</div>}
    </div>
  );
}

type Tone = "complete" | "progress" | "queued" | "locked" | "amber" | "gray";

const TONE: Record<Tone, { fg: string; bg: string; border: string }> = {
  complete: { fg: "#D4AF37", bg: "#D4AF3712", border: "#D4AF3738" },
  progress: { fg: "#D89A5C", bg: "#B8733315", border: "#B8733340" },
  queued:   { fg: "#E8B23A", bg: "#E8B23A12", border: "#E8B23A38" },
  locked:   { fg: "#8A938F", bg: "#ffffff08", border: "#ffffff15" },
  amber:    { fg: "#E8B23A", bg: "#E8B23A12", border: "#E8B23A38" },
  gray:     { fg: "#8A938F", bg: "#ffffff08", border: "#ffffff15" },
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap"
      style={{ color: t.fg, background: t.bg, border: `0.5px solid ${t.border}` }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Hero({ rowCount, demo, syncedAt }: { rowCount: number; demo: boolean; syncedAt?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Pill tone="complete">YC W27 target</Pill>
        <Pill tone="progress">Pre-seed · Pre-revenue</Pill>
        <Pill tone="complete">Stage 1 complete · 8,734 rows · 14 trials</Pill>
        <Pill tone="complete">Agent v0.1.9 · pip install runtheta</Pill>
        {syncedAt && (
          <span className="text-[10px] font-mono" style={{ color: "var(--t-faint)" }}>synced {syncedAt}</span>
        )}
      </div>
      <h1
        className="text-[26px] md:text-[34px] font-display font-semibold leading-[1.15] mb-3 max-w-3xl"
        style={{ color: "var(--t-text)", letterSpacing: "-0.02em" }}
      >
        GPU thermal-power forensics for production AI infrastructure.
      </h1>
      <p className="text-[14px] md:text-[15px] leading-relaxed max-w-2xl" style={{ color: "var(--t-muted)" }}>
        Cloud operators run thousands of GPUs without knowing when one is silently throttling. ThermalOS
        detects cooling-path anomalies from telemetry alone — using power, temperature, and effective
        thermal resistance (Rθ_eff) as forensic signals.
      </p>
    </div>
  );
}

function HeadlineFinding() {
  return (
    <Card className="p-5 mb-8" >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: "#D4AF3712", border: "0.5px solid #D4AF3738" }}
        >
          <Cpu size={18} style={{ color: "var(--t-healthy)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: "var(--t-faint)" }}>
              Headline finding · Stage 1
            </span>
            <Pill tone="complete">Tesla T4 · Colab · E001–E004</Pill>
          </div>
          <div className="text-[16px] md:text-[17px] font-semibold mb-2 leading-snug" style={{ color: "var(--t-text)" }}>
            Utilization alone does not define thermal state.
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
            Across 8,734 telemetry rows and 14 child-exit trials on a Tesla T4, a controlled-variable
            experiment isolated starting ambient temperature as the dominant driver of recovery dynamics.{" "}
            <span className="font-semibold" style={{ color: "var(--t-healthy)" }}>A 2°C delta in starting temperature produces a 3.5× change in power-recovery time</span>
            {" "}(cold-start cohort 37°C, n=2: 4.2s; warm-start cohort 39°C, n=5: 14.7s ± 1.1s). Within-condition
            reproducibility T&lt;55°C CV is 1.8%. This is direct, single-variable evidence of thermal memory —
            a signal utilization-based monitoring collapses into a single &ldquo;idle&rdquo; bucket.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Next step engine                                                    */
/* ------------------------------------------------------------------ */

function priorityRank(p: string): number {
  if (!p) return 3;
  if (p.includes("P0") || p.toLowerCase().includes("critical")) return 0;
  if (p.includes("P1") || p.toLowerCase().includes("high")) return 1;
  if (p.includes("P2") || p.toLowerCase().includes("normal")) return 2;
  return 3;
}

function isDone(s: string): boolean {
  if (!s) return false;
  const l = s.toLowerCase();
  return l.includes("done") || l.includes("complete") || s.includes("✓");
}

function isInProgress(s: string): boolean {
  if (!s) return false;
  const l = s.toLowerCase();
  return l.includes("progress") || l === "doing" || l.includes("active");
}

type ActionType = "blocked" | "in_progress" | "ready";

interface NextAction {
  action: string;
  reason: string;
  type: ActionType;
  link: string;
  owner?: string;
  priority?: string;
}

function computeNextSteps(
  questions: AdvisorQuestion[],
  timeline: TimelineRow[],
): { next: NextAction | null; onDeck: NextAction[] } {
  // Rule 1: Blocked by high-priority open questions
  const blockingQs = questions.filter(
    (q) => q.priority === "high" && (q.status === "open" || q.status === "in_discussion"),
  );

  if (blockingQs.length > 0) {
    const q = blockingQs[0];
    const truncated = q.question.length > 90 ? q.question.slice(0, 90) + "..." : q.question;
    const next: NextAction = {
      action: `Resolve: ${truncated}`,
      reason:
        q.status === "in_discussion"
          ? "High-priority question is in discussion with Kundu. Methodology decisions downstream are gated on this."
          : "High-priority advisor question is open. Methodology decisions downstream cannot proceed without resolution.",
      type: "blocked",
      link: "/thermalos/advisor",
    };

    const onDeck: NextAction[] = blockingQs.slice(1, 3).map((qq) => ({
      action: qq.question.length > 70 ? qq.question.slice(0, 70) + "..." : qq.question,
      reason: `${qq.priority} priority · ${qq.status === "open" ? "open" : "in discussion"}`,
      type: "blocked",
      link: "/thermalos/advisor",
    }));

    return { next, onDeck };
  }

  // Rule 2: Highest-priority in-progress task
  const inProgress = timeline.filter((t) => isInProgress(t.status));
  if (inProgress.length > 0) {
    const sorted = [...inProgress].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
    const top = sorted[0];

    const next: NextAction = {
      action: top.milestone,
      reason: `Active work in ${top.phase || "current phase"}. Owner: ${top.owner || "unassigned"}. ${top.priority || ""}`.trim(),
      type: "in_progress",
      link: "/thermalos/roadmap",
      owner: top.owner,
      priority: top.priority,
    };

    const onDeck: NextAction[] = sorted.slice(1, 3).map((t) => ({
      action: t.milestone,
      reason: `${t.priority || "normal"} · ${t.owner || "unassigned"}`,
      type: "in_progress",
      link: "/thermalos/roadmap",
      owner: t.owner,
      priority: t.priority,
    }));

    return { next, onDeck };
  }

  // Rule 3: Next highest-priority not-started task
  const todo = timeline.filter((t) => !isDone(t.status) && !isInProgress(t.status));
  const sorted = [...todo].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  if (sorted.length > 0) {
    const top = sorted[0];
    const next: NextAction = {
      action: top.milestone,
      reason: `Next highest-priority task ready to start. Phase: ${top.phase || "current"}. Owner: ${top.owner || "unassigned"}.`,
      type: "ready",
      link: "/thermalos/roadmap",
      owner: top.owner,
      priority: top.priority,
    };

    const onDeck: NextAction[] = sorted.slice(1, 3).map((t) => ({
      action: t.milestone,
      reason: `${t.priority || "normal"} · ${t.owner || "unassigned"}`,
      type: "ready",
      link: "/thermalos/roadmap",
      owner: t.owner,
      priority: t.priority,
    }));

    return { next, onDeck };
  }

  return { next: null, onDeck: [] };
}

function NextStep() {
  const { data: questionsData } = useQuery({
    queryKey: ["advisor-questions"],
    queryFn: fetchAdvisorQuestions,
    staleTime: 30_000,
    retry: false,
  });
  const { data: timelineData } = useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimeline,
    staleTime: 60_000,
    retry: false,
  });

  const questions = !questionsData || questionsData.length === 0 ? generateDemoAdvisorQuestions() : questionsData;
  const timeline = !timelineData || timelineData.length === 0 ? generateDemoTimeline() : timelineData;

  const { next, onDeck } = useMemo(() => computeNextSteps(questions, timeline), [questions, timeline]);

  if (!next) return null;

  const TYPE_STYLE: Record<ActionType, { tone: Tone; label: string }> = {
    blocked:     { tone: "queued",   label: "Blocked · resolve to unblock" },
    in_progress: { tone: "progress", label: "Active work" },
    ready:       { tone: "complete", label: "Ready to start" },
  };

  const typeStyle = TYPE_STYLE[next.type];
  const t = TONE[typeStyle.tone];

  return (
    <Card
      className="p-5 mb-8"
      style={{ borderColor: `${t.fg}40`, background: `linear-gradient(180deg, ${t.fg}06 0%, transparent 100%)` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: t.bg, border: `0.5px solid ${t.border}` }}
        >
          <Zap size={14} style={{ color: t.fg }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] font-semibold" style={{ color: t.fg }}>
              Next action
            </span>
            <Pill tone={typeStyle.tone}>{typeStyle.label}</Pill>
            {next.priority && next.type !== "blocked" && (
              <span className="text-[9px] font-mono" style={{ color: "var(--t-faint)" }}>{next.priority}</span>
            )}
          </div>
          <div className="text-[15px] md:text-[16px] font-semibold mb-2 leading-snug" style={{ color: "var(--t-text)" }}>
            {next.action}
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{next.reason}</p>
        </div>
      </div>

      <div className="flex items-center justify-end pt-1">
        <Link
          to={next.link}
          className="inline-flex items-center gap-1 text-[11px] font-mono transition-colors"
          style={{ color: "var(--t-healthy)" }}
        >
          Open {next.link.split("/").pop()} <ArrowRight size={11} />
        </Link>
      </div>

      {onDeck.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
          <div className="text-[9px] font-mono uppercase tracking-[0.15em] mb-2" style={{ color: "var(--t-faint)" }}>
            On deck
          </div>
          <ul className="space-y-2">
            {onDeck.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                <span className="font-mono tabular-nums w-5 flex-shrink-0" style={{ color: "var(--t-faint)" }}>{i + 2}.</span>
                <span className="flex-1 min-w-0">
                  <span style={{ color: "var(--t-muted)" }}>{item.action}</span>
                  <span className="ml-2 font-mono" style={{ color: "var(--t-faint)" }}>· {item.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* What data goes where                                                */
/* ------------------------------------------------------------------ */

function detectExperimentId(s: string): string | null {
  const m = (s ?? "").match(/E(\d{3})/i);
  return m ? `E${m[1]}` : null;
}

interface DataMapping {
  experimentId: string;
  description: string;
  tab: string;
  columns: string[];
  notes: string;
}

const EXPERIMENT_DATA_MAP: Record<string, DataMapping> = {
  E005: {
    experimentId: "E005",
    description: "Power-cap sweep (6 levels)",
    tab: "📡 Measurements",
    columns: ["timestamp", "temp_c", "power_w", "power_cap_w", "sm_clock_mhz", "util_pct", "rtheta_cwatt"],
    notes: "Run PyTorch matmul at 150W / 175W / 200W / 225W / 250W / TDP. Log 30min per level. Use steady-state window only.",
  },
  E006: {
    experimentId: "E006",
    description: "Rolling Rθ baseline + anomaly threshold",
    tab: "📡 Measurements",
    columns: ["timestamp", "temp_c", "power_w", "rtheta_cwatt", "headroom_c"],
    notes: "Compute rolling mean Rθ over 30-sample window. Sweep k = [2, 3, 4] for baseline_mean + k*std threshold. Report false-positive rate per k.",
  },
  E007: {
    experimentId: "E007",
    description: "Cross-trial replication (n>=10)",
    tab: "📡 Measurements",
    columns: ["timestamp", "trial_id", "temp_c", "power_w", "rtheta_cwatt"],
    notes: "Redo E003/E004 with 10+ trials on Stage 2 hardware. Trial_id column required for grouping. Report CV per metric.",
  },
  E008: {
    experimentId: "E008",
    description: "Bayesian state classifier training",
    tab: "📡 Measurements + label",
    columns: ["timestamp", "temp_c", "power_w", "util_pct", "rtheta_cwatt", "labeled_state"],
    notes: "Hand-label each transition (idle/ramp/load/cooldown). Train classifier in Orange Data Mining. Export model equation for paper.",
  },
};

function WhatDataGoesWhere() {
  const { data: timelineData } = useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimeline,
    staleTime: 60_000,
    retry: false,
  });

  const timeline = !timelineData || timelineData.length === 0 ? generateDemoTimeline() : timelineData;

  // Find the current active experiment (in-progress or next-up E-prefixed milestone)
  const inProgressExp = timeline.find(
    (t) => detectExperimentId(t.milestone) && isInProgress(t.status),
  );
  const nextExp = timeline.find(
    (t) =>
      detectExperimentId(t.milestone) && !isDone(t.status) && !isInProgress(t.status),
  );

  const activeRow = inProgressExp || nextExp;
  const expId = activeRow ? detectExperimentId(activeRow.milestone) : null;
  const mapping = expId ? EXPERIMENT_DATA_MAP[expId] : null;

  if (!mapping) return null;

  return (
    <div className="mb-8">
      <SectionLabel hint={inProgressExp ? "Active experiment" : "Next experiment"}>
        Where does the data go?
      </SectionLabel>
      <Card className="p-4">
        <div className="flex flex-wrap items-baseline gap-2 mb-3">
          <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--t-healthy)" }}>{mapping.experimentId}</span>
          <span className="text-[12px]" style={{ color: "var(--t-text)" }}>{mapping.description}</span>
          <Pill tone={inProgressExp ? "progress" : "queued"}>
            {inProgressExp ? "Running" : "Up next"}
          </Pill>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="md:col-span-1">
            <div className="text-[9px] font-mono uppercase tracking-[0.12em] mb-1" style={{ color: "var(--t-faint)" }}>
              Sheet tab
            </div>
            <div className="text-[12px] font-mono" style={{ color: "var(--t-healthy)" }}>{mapping.tab}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-[9px] font-mono uppercase tracking-[0.12em] mb-1" style={{ color: "var(--t-faint)" }}>
              Required columns
            </div>
            <div className="flex flex-wrap gap-1">
              {mapping.columns.map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed pt-3" style={{ color: "var(--t-faint)", borderTop: "1px solid var(--t-border)" }}>
          {mapping.notes}
        </p>

        <div className="flex items-center justify-end pt-3">
          <Link
            to="/thermalos/lab?tab=experiments"
            className="inline-flex items-center gap-1 text-[11px] font-mono transition-colors"
            style={{ color: "var(--t-healthy)" }}
          >
            Open Lab · Experiments <ArrowRight size={11} />
          </Link>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live data panel                                                     */
/* ------------------------------------------------------------------ */

function LiveData() {
  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["measurements"],
    queryFn: fetchMeasurements,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows: MeasurementRow[] = useMemo(
    () => (demo || !data || data.length === 0 ? generateDemoMeasurements(40) : data),
    [demo, data]
  );

  const valid = rows.filter((r) => r.rthetaCwatt > 0);
  const latest = valid[valid.length - 1];

  const chartData = valid.slice(-30).map((r, i) => ({
    i: i + 1,
    rtheta: r.rthetaCwatt,
    tHot: r.tempC,
  }));

  const bestRtheta = valid.length ? Math.min(...valid.map((r) => r.rthetaCwatt)) : null;
  const avgRtheta = valid.length ? valid.reduce((a, r) => a + r.rthetaCwatt, 0) / valid.length : null;
  const alertCount = valid.filter((r) => r.alert && r.alert !== "OK" && !r.alert.includes("🟢")).length;

  if (isLoading) {
    return <div className="h-64 mb-8 rounded-md animate-pulse" style={{ background: "var(--t-deep-field)", border: "0.5px solid var(--t-border)" }} />;
  }

  return (
    <div className="mb-8">
      <SectionLabel hint="Auto-refreshes from Google Sheet every 30s">Live telemetry</SectionLabel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <KPI label="Latest Rθ_eff" value={latest ? `${latest.rthetaCwatt.toFixed(3)}` : "—"} unit="°C/W" tone={latest && latest.rthetaCwatt > 0.5 ? "amber" : "complete"} />
        <KPI label="Best so far" value={bestRtheta !== null ? `${bestRtheta.toFixed(3)}` : "—"} unit="°C/W" tone="complete" />
        <KPI label="Avg Rθ_eff" value={avgRtheta !== null ? `${avgRtheta.toFixed(3)}` : "—"} unit="°C/W" tone="gray" />
        <KPI label="Anomaly events" value={String(alertCount)} unit={`/ ${valid.length} runs`} tone={alertCount > 0 ? "amber" : "complete"} />
      </div>

      <Card className="p-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[12px] font-semibold" style={{ color: "var(--t-text)" }}>Rθ_eff over recent runs</div>
          <div className="text-[10px] font-mono" style={{ color: "var(--t-faint)" }}>last 30 samples · °C/W</div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="i" tick={{ fill: "#525a55", fontSize: 10 }} stroke="#1C2630" />
            <YAxis domain={[0, 0.8]} tick={{ fill: "#525a55", fontSize: 10 }} stroke="#1C2630" />
            <Tooltip
              contentStyle={{ background: "#0A0E14", border: "1px solid #1C2630", fontSize: 11 }}
              formatter={(v: number) => [`${v.toFixed(3)} °C/W`, "Rθ_eff"]}
              labelFormatter={(v) => `Run ${v}`}
            />
            <ReferenceLine y={0.5} stroke="#E8743A" strokeDasharray="4 4" label={{ value: "Anomaly threshold", fill: "#E8743A", fontSize: 10, position: "right" }} />
            <Area type="monotone" dataKey="rtheta" fill="rgba(47,179,107,0.07)" stroke="none" />
            <Line type="monotone" dataKey="rtheta" stroke="#D4AF37" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="mt-3 text-right">
        <Link
          to="/thermalos/lab"
          className="inline-flex items-center gap-1 text-[11px] font-mono transition-colors"
          style={{ color: "var(--t-healthy)" }}
        >
          Drill into Lab data <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

function KPI({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: Tone }) {
  const t = TONE[tone];
  return (
    <Card className="p-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-1.5" style={{ color: "var(--t-faint)" }}>{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-mono font-semibold tabular-nums" style={{ color: t.fg }}>{value}</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--t-faint)" }}>{unit}</span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Condensed roadmap                                                   */
/* ------------------------------------------------------------------ */

function Roadmap() {
  // Stages are vault state, not live-derived — Sheets timeline phase grouping is unreliable
  const stages = generateDemoRoadmapStages();

  return (
    <div className="mb-8">
      <SectionLabel hint="Detailed methodology in Research →">Research roadmap</SectionLabel>
      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-px bg-white/[0.08]" aria-hidden />
        <div className="space-y-3">
          {stages.map((s) => {
            const tone: Tone = s.status === "complete" ? "complete" : s.status === "in_progress" ? "progress" : "locked";
            const t = TONE[tone];
            const dim = s.status === "locked" ? (s.id === 3 ? "opacity-65" : "opacity-45") : "";
            return (
              <div key={s.id} className={`relative pl-10 ${dim}`}>
                <div
                  className="absolute left-0 top-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: s.status === "complete" ? t.fg : s.status === "in_progress" ? t.fg : "var(--t-abyss)",
                    border: `0.5px solid ${s.status === "locked" ? "var(--t-border)" : t.fg}`,
                    color: s.status === "locked" ? "var(--t-muted)" : "white",
                  }}
                >
                  {s.status === "complete" ? <Check size={12} /> : <span className="text-[10px] font-mono font-semibold">{s.id}</span>}
                </div>
                <Card className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono" style={{ color: "var(--t-faint)" }}>Stage {s.id}</span>
                        <Pill tone={tone}>
                          {s.status === "complete" ? "Complete" : s.status === "in_progress" ? "In progress" : "Locked"}
                        </Pill>
                      </div>
                      <div className="text-[13px] font-semibold leading-tight" style={{ color: "var(--t-text)" }}>{s.title}</div>
                      <div className="text-[11px] font-mono mt-0.5 leading-snug truncate" style={{ color: "var(--t-muted)" }}>{s.subtitle}</div>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums flex-shrink-0" style={{ color: "var(--t-muted)" }}>{s.progress}%</div>
                  </div>
                  <div className="w-full h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.progress}%`, background: t.fg }}
                    />
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

const PEOPLE = [
  { name: "Amogh Somisetty", role: "Co-founder · EE · Cal Poly SLO", badge: "Founder", tone: "complete" as Tone },
  { name: "Sam", role: "Co-founder · ME · Hardware · Cal Poly SLO", badge: "Founder", tone: "complete" as Tone },
  { name: "Prof. Kundu", role: "Cal Poly EE · informal advising (summer) · EE 4400 (fall)", badge: "Advisor", tone: "amber" as Tone },
  { name: "Prof. Yu", role: "Signal processing · first meeting pending", badge: "Pending", tone: "gray" as Tone },
];

function Team() {
  return (
    <div className="mb-8">
      <SectionLabel>Team</SectionLabel>
      <Card>
        <ul className="divide-y" style={{ borderColor: "var(--t-border)" }}>
          {PEOPLE.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] truncate" style={{ color: "var(--t-text)" }}>{p.name}</div>
                <div className="text-[11px] font-mono truncate" style={{ color: "var(--t-muted)" }}>{p.role}</div>
              </div>
              <Pill tone={p.tone}>{p.badge}</Pill>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Current asks                                                        */
/* ------------------------------------------------------------------ */

const ASKS = [
  {
    title: "Cal Poly AI Factory access",
    body: "Dedicated access to Cal Poly's new DGX B200 cluster ($3M Noyce School investment, 4 nodes, operational since Jan 2026) for Stage 2 experiments. This is the single critical unlock — publication-grade R_theta data requires measured ambient temperature, which the DGX cluster enables. Everything downstream sequences behind this.",
    tone: "queued" as Tone,
  },
  {
    title: "Neocloud introductions",
    body: "Warm introductions to infra/platform leads at Lambda, CoreWeave, Crusoe, RunPod, or Vast. Running 10 discovery calls to validate the cooling-anomaly pain before building further. Their words on whether this is a real, costly problem are the strongest possible YC slide.",
    tone: "amber" as Tone,
  },
];

function CurrentAsks() {
  return (
    <div className="mb-4">
      <SectionLabel>What would help right now</SectionLabel>
      <div className="grid grid-cols-1 gap-3 max-w-xl">
        {ASKS.map((a) => {
          const t = TONE[a.tone];
          return (
            <Card key={a.title} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: t.fg }}
                  aria-hidden
                />
                <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{a.title}</div>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{a.body}</p>
            </Card>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] font-mono text-center" style={{ color: "var(--t-faint)" }}>
        Reach out: <a href="mailto:asomisetty27@gmail.com" style={{ color: "var(--t-healthy)" }}>asomisetty27@gmail.com</a>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Methodology footer (links to deeper pages)                          */
/* ------------------------------------------------------------------ */

function DeepLinks() {
  const links = [
    { to: "/thermalos/lab", label: "Lab — live telemetry & runs", icon: Cpu },
    { to: "/thermalos/findings", label: "Research — Rθ methodology", icon: FlaskConical },
    { to: "/thermalos/yc", label: "YC — evidence & milestones", icon: Check },
  ];
  return (
    <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--t-border)" }}>
      <SectionLabel>Deeper views</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              className="group rounded-md px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
              style={{ background: "var(--t-deep-field)", border: "0.5px solid var(--t-border)" }}
            >
              <Icon size={14} className="transition-colors" style={{ color: "var(--t-faint)" }} />
              <span className="text-[12px] flex-1 transition-colors" style={{ color: "var(--t-muted)" }}>{l.label}</span>
              <ArrowRight size={12} className="transition-colors" style={{ color: "var(--t-faint)" }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Overview() {
  useEffect(() => {
    document.title = "ThermalOS — Overview | amogh.site";
  }, []);

  const { data, error, isError } = useQuery({
    queryKey: ["measurements"],
    queryFn: fetchMeasurements,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });
  const { data: summaryData, error: summaryErr, isError: summaryIsErr } = useQuery({
    queryKey: ["wiki-summary"],
    queryFn: fetchWikiSummary,
    staleTime: 60_000,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rowCount = demo ? 8734 : data?.length ?? 0;
  const summary = (summaryIsErr && isDemoModeError(summaryErr)) || !summaryData
    ? generateDemoWikiSummary()
    : summaryData;

  const syncedAt = summary.vault_last_updated
    ? summary.vault_last_updated
    : undefined;

  // Only show live data panel when the sheet is actually connected (not demo mode)
  const showLiveData = !demo && rowCount > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <Hero rowCount={rowCount} demo={demo} syncedAt={syncedAt} />
      <HeadlineFinding />
      {showLiveData && <LiveData />}
      <Roadmap />
      <Team />
      <CurrentAsks />
      <DeepLinks />
    </div>
  );
}
