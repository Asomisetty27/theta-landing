import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Quote } from "lucide-react";
import { fetchOutreach, generateDemoOutreach, isDemoModeError, type OutreachRow } from "@/services/thermalosApi";

const DISCOVERY_TARGET = 10;

const STATUS_ORDER = ["Not Contacted", "Contacted", "Replied", "Meeting Set", "Positive Quote", "No Response"];

const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  "Not Contacted": { color: "#888780", bg: "#88878015", border: "#88878040" },
  "Contacted":     { color: "#B87333", bg: "#B8733315", border: "#B8733340" },
  "Replied":       { color: "#EF9F27", bg: "#EF9F2715", border: "#EF9F2740" },
  "Meeting Set":   { color: "#a855f7", bg: "#a855f715", border: "#a855f740" },
  "Positive Quote":{ color: "#1D9E75", bg: "#1D9E7515", border: "#1D9E7540" },
  "No Response":   { color: "#D85A30", bg: "#D85A3015", border: "#D85A3040" },
};

function statusMeta(s: string) { return STATUS_META[s] ?? STATUS_META["Not Contacted"]; }

// ─── Discovery Quotes ────────────────────────────────────────────────────────

function extractQuote(notes: string): string | null {
  if (!notes) return null;
  // Look for quoted text first (highest signal)
  const quoted = notes.match(/['"]([^'"]{15,})['"]/);
  if (quoted) return quoted[1];
  // Look for pain keywords (signal it's a real quote)
  const painSignals = /(no idea|hard to|broken|messy|don't know|can't tell|black box|painful|frustrating|wish we|need|problem|issue|throttling)/i;
  if (painSignals.test(notes) && notes.length >= 25) return notes;
  return null;
}

function DiscoveryQuotes({ rows }: { rows: OutreachRow[] }) {
  // Treat any row that is "Replied", "Meeting Set", or "Positive Quote" as a completed discovery call
  const discoveryCalls = rows.filter((r) =>
    ["Replied", "Meeting Set", "Positive Quote"].includes(r.status),
  );

  const quotes = rows
    .map((r) => ({ row: r, quote: extractQuote(r.notes) }))
    .filter((q): q is { row: OutreachRow; quote: string } => q.quote !== null);

  // Sort by status priority — Positive Quote first
  quotes.sort((a, b) => {
    const rank = (s: string) =>
      s === "Positive Quote" ? 0 : s === "Meeting Set" ? 1 : s === "Replied" ? 2 : 3;
    return rank(a.row.status) - rank(b.row.status);
  });

  const progressPct = Math.min(100, Math.round((discoveryCalls.length / DISCOVERY_TARGET) * 100));

  return (
    <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-0.5">
            Discovery call evidence
          </div>
          <div className="text-[13px] font-semibold text-[#E6F7F1]">
            Operator pain, in their words
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-[#D8D2C2]">
            <span className="font-semibold text-[14px]">{discoveryCalls.length}</span>
            <span className="text-[#5a5a55]"> / {DISCOVERY_TARGET}</span> calls
          </span>
          <div className="w-24 h-1 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "#1D9E75" }}
            />
          </div>
        </div>
      </div>

      {quotes.length === 0 ? (
        <p className="text-[12px] font-mono text-[#5a5a55] py-2">
          No discovery quotes captured yet. Log operator pain in the Outreach &quot;Notes&quot; column.
          Target: {DISCOVERY_TARGET} discovery calls with verbatim quotes for the YC application.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {quotes.slice(0, 6).map(({ row, quote }, i) => {
            const isPositive = row.status === "Positive Quote";
            return (
              <div
                key={i}
                className="p-3 rounded border"
                style={{
                  background: isPositive ? "#1D9E7508" : "#ffffff03",
                  borderColor: isPositive ? "#1D9E7530" : "rgba(255,255,255,0.06)",
                }}
              >
                <Quote
                  size={11}
                  className="mb-1.5"
                  style={{ color: isPositive ? "#D4AF37" : "#888780" }}
                />
                <p className="text-[12px] text-[#E6F7F1] italic leading-snug mb-2">
                  &ldquo;{quote.length > 160 ? quote.slice(0, 160) + "..." : quote}&rdquo;
                </p>
                <div className="text-[10px] font-mono text-[#888780]">
                  <span className="text-[#D8D2C2]">{row.name}</span>
                  {row.role && <span className="text-[#5a5a55]">, {row.role}</span>}
                  {row.org && <span className="text-[#5a5a55]"> · {row.org}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {quotes.length > 6 && (
        <div className="mt-3 text-[10px] font-mono text-[#5a5a55] text-center">
          + {quotes.length - 6} more quote{quotes.length - 6 !== 1 ? "s" : ""} in the table below
        </div>
      )}
    </div>
  );
}

export default function Outreach() {
  useEffect(() => { document.title = "ThermalOS — Outreach | amogh.site"; }, []);

  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [search, setSearch] = useState("");

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["outreach"],
    queryFn: fetchOutreach,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows: OutreachRow[] = demo || !data || data.length === 0 ? generateDemoOutreach() : data;

  const types = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.type).filter(Boolean)))], [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const funnelSteps = [
    { label: "Total",          value: rows.length,                                                  color: "#888780" },
    { label: "Contacted",      value: rows.filter((r) => r.status !== "Not Contacted").length,      color: "#B87333" },
    { label: "Replied",        value: rows.filter((r) => ["Replied","Meeting Set","Positive Quote"].includes(r.status)).length, color: "#EF9F27" },
    { label: "Meetings",       value: rows.filter((r) => ["Meeting Set","Positive Quote"].includes(r.status)).length,           color: "#a855f7" },
    { label: "Positive Quotes",value: rows.filter((r) => r.status === "Positive Quote").length,    color: "#1D9E75" },
  ];

  const filtered = useMemo(() =>
    rows.filter((r) =>
      (filterStatus === "All" || r.status === filterStatus) &&
      (filterType === "All" || r.type === filterType) &&
      (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.org.toLowerCase().includes(search.toLowerCase()))
    ), [rows, filterStatus, filterType, search]);

  if (isLoading) return <div className="h-96 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {demo && (
        <div className="px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect the Google Sheet to load live outreach data.
        </div>
      )}

      {/* Discovery quotes — YC evidence */}
      <DiscoveryQuotes rows={rows} />

      {/* Funnel */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-3">Pipeline Funnel</div>
        <div className="flex items-end gap-1 sm:gap-3">
          {funnelSteps.map((s, i) => {
            const pct = funnelSteps[0].value > 0 ? s.value / funnelSteps[0].value : 0;
            const barH = Math.max(12, Math.round(pct * 80));
            return (
              <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="font-bold font-mono text-[14px]" style={{ color: s.color }}>{s.value}</div>
                <div className="w-full rounded-t" style={{ height: barH, background: s.color, opacity: 0.7 }} />
                <div className="text-[9px] font-mono text-[#5a5a55] text-center leading-tight">{s.label}</div>
                {i > 0 && funnelSteps[i - 1].value > 0 && (
                  <div className="text-[9px] font-mono" style={{ color: s.color }}>
                    {Math.round((s.value / funnelSteps[i - 1].value) * 100)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status quick-filter pills */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFilterStatus("All")}
          className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${filterStatus === "All" ? "bg-[#0F6E56]/25 border-[#1D9E75]/60 text-[#D4AF37]" : "border-white/[0.08] text-[#888780] hover:text-[#E6F7F1]"}`}>
          All ({rows.length})
        </button>
        {STATUS_ORDER.map((s) => counts[s] ? (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "All" : s)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors`}
            style={filterStatus === s
              ? { background: statusMeta(s).bg, borderColor: statusMeta(s).border, color: statusMeta(s).color }
              : { borderColor: "rgba(255,255,255,0.08)", color: "#888780" }}>
            {s} ({counts[s]})
          </button>
        ) : null)}
        <span className="ml-1 text-[9px] font-mono uppercase tracking-wider text-[#5a5a55]">Type:</span>
        {types.map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${filterType === t ? "bg-[#0F6E56]/25 border-[#1D9E75]/60 text-[#D4AF37]" : "border-white/[0.08] text-[#888780] hover:text-[#E6F7F1]"}`}>
            {t}
          </button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / org…"
          className="ml-auto bg-[#141412] border border-white/[0.07] rounded px-2.5 py-1 text-[12px] font-mono text-[#E6F7F1] placeholder:text-[#5a5a55] focus:outline-none focus:border-[#1D9E75]/50 w-full sm:w-48" />
      </div>

      {/* Contact table */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[#1C1C19]">
              <tr className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] text-left">
                {["Name", "Organization", "Type", "Status", "Date", "Priority", "Notes"].map((h) => (
                  <th key={h} className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center font-mono text-[#5a5a55]">No contacts match this filter.</td></tr>
              ) : filtered.map((r, i) => {
                const m = statusMeta(r.status);
                return (
                  <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2 text-[#a8a89f]">{r.org}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1D9E7510] text-[#D8D2C2] border border-[#1D9E7530]">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono"
                        style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[#5a5a55] text-[10px] whitespace-nowrap">{r.date || "—"}</td>
                    <td className="px-3 py-2">
                      {r.priority && (
                        <span className="text-[10px] font-mono"
                          style={{ color: r.priority.startsWith("P0") ? "#D85A30" : r.priority.startsWith("P1") ? "#EF9F27" : "#888780" }}>
                          {r.priority.split(" — ")[0]}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      {r.notes ? (
                        <span className="text-[10px] font-mono text-[#888780] italic truncate block max-w-[180px]" title={r.notes}>
                          {r.notes.length > 50 ? r.notes.slice(0, 50) + "…" : r.notes}
                        </span>
                      ) : <span className="text-[#5a5a55]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
