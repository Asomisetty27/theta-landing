import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ChevronDown, ChevronUp, Copy, Check,
  ArrowRight, Clock, Zap, Shield, Users,
} from "lucide-react";
import {
  fetchCommandCenter, generateDemoCommandCenter, isDemoModeError,
  type CommandCenterAction, type CommandCenterBlocker, type CommandCenterEscalation, type CommandCenterOnDeck,
} from "@/services/thermalosApi";

// ── design tokens ─────────────────────────────────────────────────────────────

type Tone = "green" | "amber" | "red" | "blue" | "gray";
const TONE: Record<Tone, { fg: string; bg: string; border: string }> = {
  green: { fg: "#D4AF37", bg: "#0F6E5615", border: "#1D9E7540" },
  amber: { fg: "#EF9F27", bg: "#EF9F2715", border: "#EF9F2740" },
  red:   { fg: "#D85A30", bg: "#D85A3015", border: "#D85A3040" },
  blue:  { fg: "#D89A5C", bg: "#B8733315", border: "#B8733340" },
  gray:  { fg: "#888780", bg: "#ffffff08", border: "#ffffff15" },
};

function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#5a5a55] mb-3">
      {children}
    </div>
  );
}

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[9px] font-mono whitespace-nowrap"
      style={{ color: t.fg, background: t.bg, border: `0.5px solid ${t.border}` }}
    >
      {children}
    </span>
  );
}

// ── copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded transition-colors"
      style={{
        color: copied ? "#D4AF37" : "#888780",
        background: "#ffffff08",
        border: "0.5px solid rgba(255,255,255,0.1)",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── zone 1: THE ONE THING ─────────────────────────────────────────────────────

function OneThing({ item }: { item: CommandCenterAction }) {
  const [expanded, setExpanded] = useState(false);
  const t = TONE["green"];

  return (
    <div
      className="rounded-lg p-5 mb-6"
      style={{
        background: `linear-gradient(160deg, ${t.fg}0A 0%, #141412 60%)`,
        border: `1px solid ${t.border}`,
        boxShadow: `0 0 40px ${t.fg}08`,
      }}
    >
      <ZoneLabel>Zone 1 · The one thing</ZoneLabel>

      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: t.bg, border: `0.5px solid ${t.border}` }}
        >
          <Zap size={18} style={{ color: t.fg }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] md:text-[20px] font-semibold text-[#E6F7F1] leading-snug mb-2">
            {item.action}
          </div>
          <p className="text-[13px] text-[#a8a89f] leading-relaxed">{item.why}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Pill tone="gray">~{item.effort}</Pill>
        {item.source && (
          <span className="text-[10px] font-mono text-[#5a5a55]">{item.source}</span>
        )}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-[12px] font-mono transition-colors px-3 py-1.5 rounded"
        style={{
          color: expanded ? t.fg : "#888780",
          background: expanded ? t.bg : "#ffffff06",
          border: `0.5px solid ${expanded ? t.border : "rgba(255,255,255,0.08)"}`,
        }}
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        How do I start?
      </button>

      {expanded && item.how_steps.length > 0 && (
        <ol className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
          {item.how_steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="flex-shrink-0 w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center mt-0.5"
                style={{ background: t.bg, color: t.fg, border: `0.5px solid ${t.border}` }}
              >
                {i + 1}
              </span>
              <span className="text-[12px] text-[#c8c8be] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── zone 2: ON DECK ───────────────────────────────────────────────────────────

function OnDeck({ items }: { items: CommandCenterOnDeck[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-6">
      <ZoneLabel>Zone 2 · On deck</ZoneLabel>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-md"
            style={{ background: "#141412", border: "0.5px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-[11px] font-mono text-[#5a5a55] tabular-nums w-5 flex-shrink-0 mt-0.5">
              {i + 2}.
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#E6F7F1] mb-0.5">{item.title}</div>
              <div className="text-[11px] text-[#888780]">{item.why}</div>
            </div>
            <ArrowRight size={13} className="text-[#5a5a55] flex-shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── zone 3: BLOCKERS ──────────────────────────────────────────────────────────

const BLOCKER_TYPE_META: Record<string, { label: string; tone: Tone }> = {
  "open_question":       { label: "Open question",       tone: "amber" },
  "external_dependency": { label: "External dependency", tone: "red" },
  "waiting_on_sam":      { label: "Waiting on Sam",      tone: "blue" },
};

function Blockers({ items }: { items: CommandCenterBlocker[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-6">
      <ZoneLabel>Zone 3 · What&apos;s blocking you</ZoneLabel>
      <div className="space-y-2">
        {items.map((b, i) => {
          const meta = BLOCKER_TYPE_META[b.type] ?? { label: b.type, tone: "gray" as Tone };
          const t = TONE[meta.tone];
          return (
            <div
              key={i}
              className="rounded-md px-4 py-3"
              style={{ background: "#141412", border: `0.5px solid ${t.border}` }}
            >
              <div className="flex flex-wrap items-start gap-2 mb-1.5">
                <Pill tone={meta.tone}>{meta.label}</Pill>
                {b.owner && <Pill tone="gray">{b.owner}</Pill>}
                {b.days_open > 0 && (
                  <span className="text-[9px] font-mono text-[#5a5a55]">{b.days_open}d open</span>
                )}
              </div>
              <div className="text-[12px] font-semibold text-[#E6F7F1] mb-1">{b.what}</div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#888780]">
                <ArrowRight size={11} className="mt-0.5 flex-shrink-0" style={{ color: t.fg }} />
                <span>{b.how_to_unblock}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── zone 4: ESCALATION ────────────────────────────────────────────────────────

function EscalationCard({ item }: { item: CommandCenterEscalation }) {
  const [showDraft, setShowDraft] = useState(false);
  const t = TONE["amber"];

  return (
    <div
      className="rounded-md px-4 py-3 mb-2"
      style={{ background: "#141412", border: `0.5px solid ${t.border}` }}
    >
      <div className="flex flex-wrap items-start gap-2 mb-2">
        <Pill tone="amber">Needs expert</Pill>
        <Pill tone="gray">{item.route_to}</Pill>
      </div>
      <div className="text-[12px] font-semibold text-[#E6F7F1] mb-1">{item.question}</div>
      <div className="text-[11px] text-[#888780] mb-3">{item.why}</div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowDraft((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded transition-colors"
          style={{
            color: showDraft ? t.fg : "#a8a89f",
            background: showDraft ? t.bg : "#ffffff08",
            border: `0.5px solid ${showDraft ? t.border : "rgba(255,255,255,0.1)"}`,
          }}
        >
          <Users size={11} />
          {showDraft ? "Hide draft" : "Draft the ask"}
        </button>
        {showDraft && <CopyButton text={item.draft_ask} />}
      </div>

      {showDraft && (
        <pre
          className="mt-3 p-3 rounded text-[11px] font-mono text-[#c8c8be] leading-relaxed whitespace-pre-wrap overflow-x-auto"
          style={{ background: "#0A0A08", border: "0.5px solid rgba(255,255,255,0.06)" }}
        >
          {item.draft_ask}
        </pre>
      )}
    </div>
  );
}

function Escalations({ items }: { items: CommandCenterEscalation[] }) {
  if (!items.length) {
    return (
      <div className="mb-6">
        <ZoneLabel>Zone 4 · Escalation</ZoneLabel>
        <div
          className="px-4 py-3 rounded-md text-[12px] font-mono text-[#5a5a55]"
          style={{ background: "#141412", border: "0.5px solid rgba(255,255,255,0.07)" }}
        >
          No escalations — no questions marked needs-expert and none open 7+ days.
        </div>
      </div>
    );
  }
  return (
    <div className="mb-6">
      <ZoneLabel>Zone 4 · Escalation</ZoneLabel>
      <div className="mb-2 text-[11px] text-[#5a5a55] font-mono">
        {items.length} question{items.length !== 1 ? "s" : ""} need expert routing. Claude + web search could not resolve these.
      </div>
      {items.map((item, i) => <EscalationCard key={i} item={item} />)}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function CommandCenter() {
  useEffect(() => { document.title = "ThermalOS — Command Center | amogh.site"; }, []);

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["command-center"],
    queryFn: fetchCommandCenter,
    staleTime: 60_000,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const cc = demo || !data ? generateDemoCommandCenter() : data;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-48 rounded-lg bg-[#141412] border border-white/[0.07] animate-pulse mb-4" />
        <div className="h-24 rounded-md bg-[#141412] border border-white/[0.07] animate-pulse mb-2" />
        <div className="h-24 rounded-md bg-[#141412] border border-white/[0.07] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55]">
            Admin · Command Center
          </div>
          {demo && (
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded-full"
              style={{ color: "#EF9F27", background: "#EF9F2715", border: "0.5px solid #EF9F2740" }}
            >
              Demo data — connect Google Sheet for live vault state
            </span>
          )}
        </div>
        <h1 className="text-[20px] font-semibold text-[#E6F7F1] tracking-tight">
          What to do right now.
        </h1>
        <p className="text-[12px] text-[#5a5a55] mt-1 font-mono">
          Computed from vault state on every sync. Never manually edited.
        </p>
      </div>

      {/* Four zones */}
      <OneThing item={cc.the_one_thing} />
      <OnDeck items={cc.on_deck} />
      <Blockers items={cc.blockers} />
      <Escalations items={cc.escalations} />

      {/* Routing legend */}
      <div className="mt-2 pt-4 border-t border-white/[0.05]">
        <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-2">Escalation routing</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {[
            { who: "Kundu", what: "Research · stats · AI Factory · publication" },
            { who: "Yu",    what: "Signal processing · adaptive control" },
            { who: "Sam",   what: "Physical testbed · TIM · ME" },
            { who: "Ryan Xu", what: "Fundraising · investor process" },
          ].map((r) => (
            <div key={r.who} className="px-2.5 py-2 rounded" style={{ background: "#141412", border: "0.5px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[11px] font-semibold text-[#E6F7F1] mb-0.5">{r.who}</div>
              <div className="text-[9px] font-mono text-[#5a5a55]">{r.what}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
