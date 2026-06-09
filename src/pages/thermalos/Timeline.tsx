import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchTimeline, generateDemoTimeline, isDemoModeError,
  type TimelineRow,
} from "@/services/thermalosApi";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FILTERS = ["All", "P0", "P1", "Amogh", "Sam", "Done ✓", "Blocked ✗", "In Progress"] as const;

const STATUS_COLOR: Record<string, string> = {
  "Done ✓": "#1D9E75",
  "In Progress": "#EF9F27",
  "Blocked ✗": "#D85A30",
  "Not Started": "#5a5a55",
};

const OWNER_COLOR: Record<string, string> = {
  Amogh: "#1D9E75",
  Sam: "#a855f7",
  Both: "#EF9F27",
};

export default function Timeline() {
  useEffect(() => {
    document.title = "ThermalOS — Master Timeline | amogh.site";
  }, []);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [search, setSearch] = useState("");

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimeline,
    refetchInterval: 5000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows: TimelineRow[] = demo || !data || data.length === 0
    ? generateDemoTimeline()
    : data;

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.milestone.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "All") return true;
      if (filter === "P0") return r.priority.startsWith("P0");
      if (filter === "P1") return r.priority.startsWith("P1");
      if (filter === "Amogh") return r.owner === "Amogh";
      if (filter === "Sam") return r.owner === "Sam";
      if (filter === "Done ✓") return r.status === "Done ✓";
      if (filter === "Blocked ✗") return r.status === "Blocked ✗";
      if (filter === "In Progress") return r.status === "In Progress";
      return true;
    });
  }, [rows, filter, search]);

  // Phase progress summary
  const phaseStats = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    let currentPhase = "";
    rows.forEach((r) => {
      if (r.phase) currentPhase = r.phase;
      const key = currentPhase || "Other";
      const s = map.get(key) ?? { done: 0, total: 0 };
      s.total++;
      if (r.status === "Done ✓") s.done++;
      map.set(key, s);
    });
    return Array.from(map.entries());
  }, [rows]);

  if (isLoading) {
    return <div className="h-96 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;
  }

  return (
    <div>
      {demo && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect the Google Sheet to load the live Master Timeline.
        </div>
      )}

      {/* Phase progress */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-3 mb-4">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-2">Phase Progress</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono">
          {phaseStats.map(([phase, s]) => (
            <span key={phase} className="text-[#a8a89f]">
              <span className="text-[#D8D2C2]">{phase.replace(/^Phase /, "P")}:</span>{" "}
              <span className="text-[#D4AF37]">{s.done}</span>
              <span className="text-[#5a5a55]">/{s.total}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
              filter === f
                ? "bg-[#0F6E56]/25 border-[#1D9E75]/60 text-[#D4AF37]"
                : "bg-transparent border-white/[0.08] text-[#888780] hover:text-[#E6F7F1]"
            }`}
          >
            {f}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search milestone…"
          className="ml-auto bg-[#141412] border border-white/[0.07] rounded px-2.5 py-1 text-[12px] font-mono text-[#E6F7F1] placeholder:text-[#5a5a55] focus:outline-none focus:border-[#1D9E75]/50 w-full sm:w-56"
        />
      </div>

      {/* Table */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-[#1C1C19]">
              <tr className="text-left text-[9px] font-mono uppercase tracking-wider text-[#5a5a55]">
                <Th>Phase</Th>
                <Th>Wk</Th>
                <Th>Dates</Th>
                <Th className="min-w-[200px]">Milestone</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Layer</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <TooltipProvider delayDuration={150}>
              <tbody>
                {filtered.map((r, i) => {
                  const done = r.status === "Done ✓";
                  return (
                    <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <Td>{r.phase && <Pill color="#1D9E75">{r.phase.replace(/^Phase /, "P")}</Pill>}</Td>
                      <Td className="font-mono text-[#888780]">{r.week}</Td>
                      <Td className="font-mono text-[#888780] whitespace-nowrap">{r.dates}</Td>
                      <Td className={done ? "line-through text-[#5a5a55]" : ""}>{r.milestone}</Td>
                      <Td>{r.owner && <Pill color={OWNER_COLOR[r.owner] ?? "#888780"}>{r.owner}</Pill>}</Td>
                      <Td>
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-mono"
                          style={{
                            color: STATUS_COLOR[r.status] ?? "#5a5a55",
                            background: `${STATUS_COLOR[r.status] ?? "#5a5a55"}15`,
                            border: `1px solid ${STATUS_COLOR[r.status] ?? "#5a5a55"}40`,
                          }}
                        >
                          {r.status}
                        </span>
                      </Td>
                      <Td>
                        <Pill
                          color={
                            r.priority.startsWith("P0")
                              ? "#D85A30"
                              : r.priority.startsWith("P1")
                              ? "#EF9F27"
                              : "#1D9E75"
                          }
                        >
                          {r.priority.split(" — ")[0]}
                        </Pill>
                      </Td>
                      <Td className="font-mono text-[10px] text-[#888780]">{r.layer}</Td>
                      <Td className="max-w-[180px]">
                        {r.notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[#a8a89f] truncate inline-block max-w-[160px] cursor-help">
                                {r.notes.slice(0, 40)}
                                {r.notes.length > 40 && "…"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">{r.notes}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-[#5a5a55]">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-[#5a5a55] font-mono text-[12px]">
                      No matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </TooltipProvider>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}
function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap"
      style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}
