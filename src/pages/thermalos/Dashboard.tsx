import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, AlertTriangle, CheckCircle2, Clock, Cpu, FlaskConical, BookOpen, Users, Route, Activity, Zap } from "lucide-react";
import {
  fetchWikiSummary, generateDemoWikiSummary, isDemoModeError,
  fetchAdvisorQuestions, generateDemoAdvisorQuestions,
  fetchTimeline, generateDemoTimeline,
  type AdvisorQuestion, type TimelineRow, type WikiSummary,
} from "@/services/thermalosApi";

// ── primitives ────────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "blue" | "red" | "gray";
const TONE: Record<Tone, { fg: string; bg: string; border: string }> = {
  green: { fg: "#D4AF37", bg: "#0F6E5615", border: "#1D9E7540" },
  amber: { fg: "#EF9F27", bg: "#EF9F2715", border: "#EF9F2740" },
  blue:  { fg: "#D89A5C", bg: "#B8733315", border: "#B8733340" },
  red:   { fg: "#D85A30", bg: "#D85A3015", border: "#D85A3040" },
  gray:  { fg: "#888780", bg: "#ffffff08", border: "#ffffff15" },
};

function Card({ children, className = "", tone }: { children: React.ReactNode; className?: string; tone?: Tone }) {
  const t = tone ? TONE[tone] : null;
  return (
    <div
      className={`rounded-md ${className}`}
      style={{
        background: t ? `linear-gradient(180deg, ${t.fg}06 0%, #141412 100%)` : "#141412",
        border: `0.5px solid ${t ? t.border : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {children}
    </div>
  );
}

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

// ── next-step engine ──────────────────────────────────────────────────────────

type ActionType = "blocked" | "in_progress" | "ready" | "attention";

interface NextAction {
  label: string;
  action: string;
  reason: string;
  type: ActionType;
  link: string;
}

function priorityRank(p: string): number {
  if (!p) return 3;
  if (p.includes("P0") || p.toLowerCase().includes("critical")) return 0;
  if (p.includes("P1") || p.toLowerCase().includes("high")) return 1;
  return 2;
}

function computeActions(
  questions: AdvisorQuestion[],
  timeline: TimelineRow[],
  summary: WikiSummary,
): { next: NextAction; onDeck: NextAction[] } {
  const actions: NextAction[] = [];

  // Priority 1: high-priority open questions
  const blockingQs = questions.filter(
    (q) => q.priority === "high" && (q.status === "open" || q.status === "in_discussion"),
  );
  for (const q of blockingQs) {
    actions.push({
      label: "Blocked",
      action: q.question.length > 80 ? q.question.slice(0, 80) + "…" : q.question,
      reason: `High-priority advisor question open since ${q.date_raised}. Downstream work gated.`,
      type: "blocked",
      link: "/thermalos/advisor",
    });
  }

  // Priority 2: vault conflicts surfaced by sync
  if (parseInt(summary.conflicts_found || "0") > 0) {
    actions.push({
      label: "Needs attention",
      action: "Vault / site conflict detected — run sync to review",
      reason: summary.conflicts_detail || "Contradiction between vault and site data.",
      type: "attention",
      link: "/thermalos/lab",
    });
  }

  // Priority 3: in-progress timeline tasks
  const inProgress = timeline.filter((t) => {
    const s = t.status.toLowerCase();
    return s.includes("progress") || s === "doing" || s.includes("active");
  });
  const sortedIP = [...inProgress].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  for (const t of sortedIP) {
    actions.push({
      label: "In progress",
      action: t.milestone,
      reason: `Active work · ${t.owner || "unassigned"} · ${t.priority || ""}`.replace(/ · $/, ""),
      type: "in_progress",
      link: "/thermalos/roadmap",
    });
  }

  // Priority 4: next ready task
  const todo = timeline
    .filter((t) => {
      const s = t.status.toLowerCase();
      return !s.includes("done") && !s.includes("complete") && !s.includes("progress") && !s.includes("doing");
    })
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  for (const t of todo) {
    actions.push({
      label: "Ready to start",
      action: t.milestone,
      reason: `Next highest-priority task · ${t.owner || "unassigned"}`,
      type: "ready",
      link: "/thermalos/roadmap",
    });
  }

  // Vault next action as final fallback
  if (summary.next_action) {
    actions.push({
      label: "Vault directive",
      action: summary.next_action.replace(/\[\[.*?\]\]/g, "").trim().slice(0, 100),
      reason: "From vault overview.md — last synced " + (summary.vault_last_updated || "unknown"),
      type: "ready",
      link: "/thermalos",
    });
  }

  const [next, ...rest] = actions;
  return {
    next: next ?? {
      label: "All clear",
      action: "No blocking tasks or questions",
      reason: "Run a sync to pull latest vault state.",
      type: "ready",
      link: "/thermalos",
    },
    onDeck: rest.slice(0, 3),
  };
}

const ACTION_META: Record<ActionType, { tone: Tone; icon: typeof Zap }> = {
  blocked:     { tone: "amber", icon: AlertTriangle },
  attention:   { tone: "red",   icon: AlertTriangle },
  in_progress: { tone: "blue",  icon: Clock },
  ready:       { tone: "green", icon: CheckCircle2 },
};

// ── quick links ───────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { to: "/thermalos/lab",         label: "Lab",         sub: "Telemetry & runs",       icon: Activity },
  { to: "/thermalos/findings",    label: "Research",    sub: "Rθ methodology",         icon: FlaskConical },
  { to: "/thermalos/advisor",     label: "Advisor",     sub: "Questions & decisions",  icon: Users },
  { to: "/thermalos/publication", label: "Publication", sub: "Conference tracker",     icon: BookOpen },
  { to: "/thermalos/yc",          label: "YC",          sub: "Evidence & milestones",  icon: Cpu },
  { to: "/thermalos/roadmap",     label: "Roadmap",     sub: "4-stage tracker",        icon: Route },
];

// ── vault state panel ─────────────────────────────────────────────────────────

function VaultState({ summary }: { summary: WikiSummary }) {
  const complete = summary.experiments_complete.split(",").map(s => s.trim()).filter(Boolean);
  const planned  = summary.experiments_planned.split(",").map(s => s.trim()).filter(Boolean);
  const openQs   = summary.open_questions_list.split(";").map(s => s.trim()).filter(Boolean);
  const syncedAt = summary.sync_timestamp
    ? new Date(summary.sync_timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55]">Vault state</div>
        <span className="text-[10px] font-mono text-[#5a5a55]">Last synced {syncedAt}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCell label="Findings validated" value={summary.findings_current || "—"} tone="green" />
        <StatCell label="Experiments complete" value={String(complete.length) || "—"} tone="green" />
        <StatCell label="Experiments planned" value={String(planned.length) || "—"} tone="gray" />
        <StatCell label="Open questions" value={summary.open_questions_count || "—"} tone={parseInt(summary.open_questions_count || "0") > 5 ? "amber" : "green"} />
      </div>
      {openQs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-1.5">Open questions</div>
          <div className="flex flex-wrap gap-1.5">
            {openQs.map((q) => (
              <span key={q} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[#a8a89f]">{q}</span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function StatCell({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const t = TONE[tone];
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#5a5a55] mb-1">{label}</div>
      <div className="text-[22px] font-semibold tabular-nums" style={{ color: t.fg }}>{value}</div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  useEffect(() => { document.title = "ThermalOS — Dashboard | amogh.site"; }, []);

  const { data: summaryData, error: summaryErr, isError: summaryIsErr } = useQuery({
    queryKey: ["wiki-summary"],
    queryFn: fetchWikiSummary,
    staleTime: 60_000,
    retry: false,
  });
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

  const summary = (summaryIsErr && isDemoModeError(summaryErr)) || !summaryData
    ? generateDemoWikiSummary()
    : summaryData;
  const questions = !questionsData || questionsData.length === 0 ? generateDemoAdvisorQuestions() : questionsData;
  const timeline  = !timelineData  || timelineData.length === 0  ? generateDemoTimeline()         : timelineData;

  const { next, onDeck } = useMemo(
    () => computeActions(questions, timeline, summary),
    [questions, timeline, summary],
  );

  const meta = ACTION_META[next.type];
  const t = TONE[meta.tone];
  const ActionIcon = meta.icon;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-1">Admin · Dashboard</div>
        <h1 className="text-[22px] font-semibold text-[#E6F7F1] tracking-tight">ThermalOS command center</h1>
        <p className="text-[12px] text-[#888780] mt-1">
          Derived from open questions, task statuses, and vault sync. Updates on every sync.
        </p>
      </div>

      {/* Next-step hero */}
      <Card tone={meta.tone} className="p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: t.bg, border: `0.5px solid ${t.border}` }}
          >
            <ActionIcon size={16} style={{ color: t.fg }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] font-semibold" style={{ color: t.fg }}>
                Next action
              </span>
              <Pill tone={meta.tone}>{next.label}</Pill>
            </div>
            <div className="text-[16px] md:text-[18px] font-semibold text-[#E6F7F1] mb-1.5 leading-snug">{next.action}</div>
            <p className="text-[12px] text-[#a8a89f] leading-relaxed">{next.reason}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Link
            to={next.link}
            className="inline-flex items-center gap-1 text-[11px] font-mono hover:opacity-80 transition-opacity"
            style={{ color: t.fg }}
          >
            Open {next.link.split("/").pop()} <ArrowRight size={11} />
          </Link>
        </div>
      </Card>

      {/* On-deck */}
      {onDeck.length > 0 && (
        <Card className="p-4 mb-6">
          <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-2">On deck</div>
          <ul className="space-y-2">
            {onDeck.map((item, i) => {
              const m = ACTION_META[item.type];
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[11px] font-mono tabular-nums text-[#5a5a55] w-5 flex-shrink-0 mt-0.5">{i + 2}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Pill tone={m.tone}>{item.label}</Pill>
                      <Link
                        to={item.link}
                        className="text-[11px] font-mono text-[#5a5a55] hover:text-[#D8D2C2] transition-colors"
                      >
                        {item.link.split("/").pop()} ↗
                      </Link>
                    </div>
                    <span className="text-[12px] text-[#a8a89f]">{item.action}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Vault state */}
      <VaultState summary={summary} />

      {/* Quick links */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-3">Quick access</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-white/[0.03] transition-colors"
                style={{ background: "#141412", border: "0.5px solid rgba(255,255,255,0.07)" }}
              >
                <Icon size={13} className="text-[#5a5a55] group-hover:text-[#D4AF37] transition-colors flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[#E6F7F1] group-hover:text-[#D8D2C2] transition-colors">{l.label}</div>
                  <div className="text-[10px] font-mono text-[#5a5a55] truncate">{l.sub}</div>
                </div>
                <ArrowRight size={11} className="ml-auto text-[#5a5a55] group-hover:text-[#D4AF37] transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
