import { useEffect } from "react";
import { BookOpen, FlaskConical, AlertCircle, Check } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[#141412] border border-white/[0.07] rounded-md ${className}`}
      style={{ borderWidth: "0.5px" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-3">
      {children}
    </div>
  );
}

// ─── Venue candidates ─────────────────────────────────────────────────────────

const VENUES = [
  {
    name: "IISWC",
    full: "IEEE Int'l Symposium on Workload Characterization",
    fit: "Direct fit — workload characterization and system behavior measurement",
    deadline: "TBD",
    tone: "high",
  },
  {
    name: "IEEE TCAD",
    full: "IEEE Transactions on Computer-Aided Design",
    fit: "Strong fit for the Rθ modeling and anomaly detection methodology",
    deadline: "Rolling",
    tone: "medium",
  },
  {
    name: "ISCA",
    full: "Int'l Symposium on Computer Architecture",
    fit: "Stretch — GPU thermal forensics is adjacent but not core arch",
    deadline: "TBD",
    tone: "low",
  },
];

// ─── Paper sections ───────────────────────────────────────────────────────────

type SectionStatus = "done" | "in_progress" | "blocked" | "not_started";

const STATUS_STYLE: Record<SectionStatus, { label: string; fg: string; bg: string }> = {
  done:        { label: "Done",        fg: "#D4AF37", bg: "#0F6E5615" },
  in_progress: { label: "In progress", fg: "#D89A5C", bg: "#B8733315" },
  blocked:     { label: "Blocked",     fg: "#f87171", bg: "#f8717115" },
  not_started: { label: "Not started", fg: "#888780", bg: "#ffffff08" },
};

const SECTIONS = [
  {
    name: "Abstract",
    status: "in_progress" as SectionStatus,
    evidence: ["E001–E004 headline numbers", "Rθ_eff definition"],
    blocker: null,
    notes: "Draft framing exists — needs final results from Stage 2 to lock numbers.",
  },
  {
    name: "1. Introduction",
    status: "in_progress" as SectionStatus,
    evidence: ["E002 zero-util phantom load", "GPU cloud operator quotes"],
    blocker: null,
    notes: "Silent throttling framing is solid. Add 1-2 operator quotes from outreach.",
  },
  {
    name: "2. Background & Related Work",
    status: "not_started" as SectionStatus,
    evidence: ["NVIDIA NVML docs", "Prior thermal monitoring literature"],
    blocker: null,
    notes: "Literature survey not yet started. Cover prior GPU thermal work and gaps.",
  },
  {
    name: "3. Methodology",
    status: "in_progress" as SectionStatus,
    evidence: ["Rθ_eff = (T_hot - T_ref) / P", "F002 sensitivity analysis", "F003 smoothing null result"],
    blocker: null,
    notes: "T_reference uncertainty section needs Kundu input (Q1). Smoothing decision is locked (use steady-state window).",
  },
  {
    name: "4. Experiments",
    status: "in_progress" as SectionStatus,
    evidence: ["E001 idle baseline", "E002 same-process cooldown", "E003/E004 child-process replication"],
    blocker: "Stage 2 hardware (E005–E008)",
    notes: "Stage 1 experiments are complete and documented. Stage 2 power-cap sweep is gated on AI Factory access.",
  },
  {
    name: "5. State Classification",
    status: "blocked" as SectionStatus,
    evidence: ["F004 rule-based classifier failure", "Bayesian model (planned)"],
    blocker: "Bayesian classifier — needs n>=10 labeled training data",
    notes: "Rule-based classifier fails 47-98% of transitional phases. Bayesian model is designed but not trained.",
  },
  {
    name: "6. Results & Anomaly Detection",
    status: "blocked" as SectionStatus,
    evidence: ["Rolling Rθ baseline (planned)", "E006 anomaly threshold calibration (planned)"],
    blocker: "Stage 2 hardware + trained classifier",
    notes: "The headline result. Requires E005–E008 data and trained state classifier.",
  },
  {
    name: "7. Discussion",
    status: "not_started" as SectionStatus,
    evidence: ["Limitations (T_ref uncertainty, n=3)", "Generalization claims (A100/H100/RTX)"],
    blocker: null,
    notes: "Address T_reference limitation explicitly. Multi-GPU generalization is Stage 4 work.",
  },
  {
    name: "8. Conclusion",
    status: "not_started" as SectionStatus,
    evidence: ["Full results"],
    blocker: "Full results required",
    notes: "Write last.",
  },
];

// ─── What's needed before submission ──────────────────────────────────────────

const GAPS = [
  {
    item: "Confirm venue + submission deadline",
    status: "open",
    owner: "Kundu",
    note: "Ask at next meeting. This gates the whole timeline.",
  },
  {
    item: "AI Factory / GPU cluster access (Stage 2 hardware)",
    status: "open",
    owner: "Amogh",
    note: "E005–E008, ambient sensors, 10+ replication trials. Single biggest blocker.",
  },
  {
    item: "n>=10 cooldown trials on Stage 2 hardware",
    status: "open",
    owner: "Amogh",
    note: "Current n=3 is insufficient for statistical reporting. Need 10+ before p-values.",
  },
  {
    item: "Bayesian state classifier trained and validated",
    status: "open",
    owner: "Amogh",
    note: "Requires labeled Stage 2 data. Orange Data Mining tooling is chosen.",
  },
  {
    item: "T_reference treatment at low power loads",
    status: "open",
    owner: "Kundu",
    note: "Methodological decision. Currently the dominant error source at idle.",
  },
  {
    item: "Literature survey (Related Work section)",
    status: "open",
    owner: "Amogh",
    note: "Not started. Need 6-10 citations covering GPU thermal monitoring and anomaly detection.",
  },
  {
    item: "1-2 operator quotes from outreach",
    status: "in_progress",
    owner: "Amogh",
    note: "Crusoe: 'We have no idea if our GPUs are throttling silently.' Voltage Park call set.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Publication() {
  useEffect(() => {
    document.title = "ThermalOS -- Publication | amogh.site";
  }, []);

  const done = SECTIONS.filter((s) => s.status === "done").length;
  const blocked = SECTIONS.filter((s) => s.status === "blocked").length;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-1">
          ThermalOS -- Publication
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-semibold text-[#E6F7F1] tracking-tight">
              Conference publication
            </h1>
            <p className="text-[12px] text-[#888780] mt-1 max-w-2xl">
              Target venue, paper outline, and section status. Venue TBD pending Kundu confirmation.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span style={{ color: "#D4AF37" }}>{done} done</span>
            <span className="text-[#5a5a55]">/</span>
            <span style={{ color: "#f87171" }}>{blocked} blocked</span>
            <span className="text-[#5a5a55]">/ {SECTIONS.length} total</span>
          </div>
        </div>
      </div>

      {/* Venue */}
      <section className="mb-8">
        <SectionLabel>Target venue</SectionLabel>
        <div className="space-y-2">
          {VENUES.map((v) => (
            <Card key={v.name} className="p-4 flex items-start gap-4">
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  background: v.tone === "high" ? "#D4AF37" : v.tone === "medium" ? "#D89A5C" : "#888780",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-[#E6F7F1]">{v.name}</span>
                  <span className="text-[10px] font-mono text-[#5a5a55]">{v.full}</span>
                </div>
                <p className="text-[12px] text-[#a8a89f] leading-relaxed">{v.fit}</p>
              </div>
              <div className="text-[10px] font-mono text-[#5a5a55] flex-shrink-0">
                Deadline: {v.deadline}
              </div>
            </Card>
          ))}
        </div>
        <p className="text-[11px] font-mono text-[#5a5a55] mt-2">
          Venue priority: Kundu to confirm at next meeting.
        </p>
      </section>

      {/* Section tracker */}
      <section className="mb-8">
        <SectionLabel>Paper section tracker</SectionLabel>
        <Card>
          <ul className="divide-y divide-white/[0.04]">
            {SECTIONS.map((s) => {
              const st = STATUS_STYLE[s.status];
              return (
                <li key={s.name} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: st.bg, border: `0.5px solid ${st.fg}40` }}
                    >
                      {s.status === "done" ? (
                        <Check size={10} style={{ color: st.fg }} />
                      ) : s.status === "blocked" ? (
                        <AlertCircle size={10} style={{ color: st.fg }} />
                      ) : s.status === "in_progress" ? (
                        <BookOpen size={10} style={{ color: st.fg }} />
                      ) : (
                        <span />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[13px] font-semibold text-[#E6F7F1]">{s.name}</span>
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{ color: st.fg, background: st.bg, border: `0.5px solid ${st.fg}40` }}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6b7280] leading-relaxed mb-1.5">{s.notes}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.evidence.map((e) => (
                          <span
                            key={e}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[#5a5a55]"
                          >
                            <FlaskConical size={8} className="inline mr-1 opacity-60" />
                            {e}
                          </span>
                        ))}
                        {s.blocker && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#f87171]/10 border border-[#f87171]/25 text-[#f87171]">
                            Blocked: {s.blocker}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Gaps before submission */}
      <section className="mb-8">
        <SectionLabel>What needs to happen before submission</SectionLabel>
        <Card>
          <ul className="divide-y divide-white/[0.04]">
            {GAPS.map((g) => (
              <li key={g.item} className="px-4 py-3 flex items-start gap-3">
                <div
                  className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: g.status === "in_progress" ? "#EF9F27" : "#888780",
                    marginTop: "6px",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[13px] text-[#E6F7F1]">{g.item}</span>
                    <span className="text-[9px] font-mono text-[#5a5a55]">Owner: {g.owner}</span>
                  </div>
                  <p className="text-[11px] text-[#6b7280] leading-relaxed">{g.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
