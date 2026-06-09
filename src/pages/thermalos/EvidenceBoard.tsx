import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEvidence, generateDemoEvidence, isDemoModeError } from "@/services/thermalosApi";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const STATUS_META = {
  "Proof exists ✓": { color: "#1D9E75", bg: "#1D9E7515", border: "#1D9E7540", icon: CheckCircle2, short: "Proven" },
  "In progress":    { color: "#EF9F27", bg: "#EF9F2715", border: "#EF9F2740", icon: Clock,         short: "In progress" },
  "No proof yet":   { color: "#D85A30", bg: "#D85A3015", border: "#D85A3040", icon: XCircle,       short: "Missing" },
};

function getStatusMeta(status: string) {
  return STATUS_META[status as keyof typeof STATUS_META] ?? STATUS_META["No proof yet"];
}

export default function EvidenceBoard() {
  useEffect(() => { document.title = "ThermalOS — Evidence Board | amogh.site"; }, []);

  const [filter, setFilter] = useState<"All" | "No proof yet" | "In progress" | "Proof exists ✓">("All");

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["evidence"],
    queryFn: fetchEvidence,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows = demo || !data || data.length === 0 ? generateDemoEvidence() : data;

  const proven = rows.filter((r) => r.status === "Proof exists ✓").length;
  const inProgress = rows.filter((r) => r.status === "In progress").length;
  const missing = rows.filter((r) => r.status === "No proof yet").length;
  const pct = rows.length ? Math.round((proven / rows.length) * 100) : 0;

  const filtered = useMemo(() =>
    filter === "All" ? rows : rows.filter((r) => r.status === filter),
    [rows, filter]
  );

  if (isLoading) return <div className="h-96 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {demo && (
        <div className="px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect the Google Sheet to load live evidence status.
        </div>
      )}

      {/* Progress header */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="flex flex-wrap gap-6 items-center mb-3">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-1">YC Application Readiness</div>
            <div className="text-[32px] font-bold font-mono text-[#D4AF37] leading-none">{pct}%</div>
            <div className="text-[11px] font-mono text-[#888780]">{proven} / {rows.length} claims proven</div>
          </div>
          <div className="flex gap-4 text-center">
            {[
              { label: "Proven", value: proven, color: "#1D9E75" },
              { label: "In Progress", value: inProgress, color: "#EF9F27" },
              { label: "Missing", value: missing, color: "#D85A30" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-[22px] font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="w-full h-3 rounded-full bg-[#2C2C2A] overflow-hidden flex">
              <div className="h-full bg-[#1D9E75] transition-all" style={{ width: `${(proven / rows.length) * 100}%` }} />
              <div className="h-full bg-[#EF9F27] transition-all" style={{ width: `${(inProgress / rows.length) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#5a5a55] mt-1">
              <span className="text-[#1D9E75]">Proven</span>
              <span className="text-[#EF9F27]">In progress</span>
              <span className="text-[#D85A30]">Missing</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] font-mono text-[#888780]">
          Every YC claim must have a file, screenshot, or commit as proof. No proof = cut the claim from the application.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["All", "No proof yet", "In progress", "Proof exists ✓"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${filter === f ? "bg-[#0F6E56]/25 border-[#1D9E75]/60 text-[#D4AF37]" : "border-white/[0.08] text-[#888780] hover:text-[#E6F7F1]"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Claim cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((r, i) => {
          const m = getStatusMeta(r.status);
          const Icon = m.icon;
          return (
            <div key={i} className="bg-[#141412] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5" style={{ background: m.bg }}>
                  <Icon size={14} style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold leading-snug mb-1">{r.claim}</div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono"
                    style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}>
                    {m.short}
                  </span>
                </div>
              </div>
              <div className="border-t border-white/[0.05] pt-3 space-y-1.5">
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-0.5">Required Proof</div>
                  <div className="text-[11px] font-mono text-[#a8a89f]">{r.proof}</div>
                </div>
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-0.5">Where to Find It</div>
                  <div className="text-[11px] font-mono text-[#5a5a55] italic">{r.location}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
