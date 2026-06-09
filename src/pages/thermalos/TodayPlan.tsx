import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTodayPlan, generateDemoTodayPlan, isDemoModeError, type TodayRow } from "@/services/thermalosApi";

const OWNER_COLOR: Record<string, string> = {
  Amogh: "#1D9E75",
  Sam: "#a855f7",
  Both: "#EF9F27",
};

const TRACK_COLOR: Record<string, string> = {
  Software: "#1D9E75",
  Hardware: "#a855f7",
  EE: "#1D9E75",
  ME: "#a855f7",
  Comms: "#B87333",
  Ops: "#EF9F27",
  Both: "#EF9F27",
  YC: "#D85A30",
  Business: "#B87333",
};

function Pill({ text, colorMap }: { text: string; colorMap: Record<string, string> }) {
  const color = colorMap[text] ?? "#888780";
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap"
      style={{ color, background: `${color}15`, border: `1px solid ${color}40` }}>
      {text}
    </span>
  );
}

function TaskRow({ row, isP0 }: { row: TodayRow; isP0: boolean }) {
  return (
    <div className={`flex items-start gap-3 py-3 border-t border-white/[0.04] group hover:bg-white/[0.01] px-4 -mx-4 transition-colors`}>
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isP0 ? "bg-[#D85A30]" : "bg-[#EF9F27]"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] leading-snug mb-1.5">{row.milestone}</div>
        <div className="flex flex-wrap gap-2 items-center">
          {row.owner && <Pill text={row.owner} colorMap={OWNER_COLOR} />}
          {row.track && <Pill text={row.track} colorMap={TRACK_COLOR} />}
          {row.phase && (
            <span className="text-[10px] font-mono text-[#5a5a55]">{row.phase.replace(/^Phase /, "P").split(" — ")[0]}</span>
          )}
        </div>
        {row.notes && (
          <div className="mt-1.5 text-[10px] font-mono text-[#888780] italic">{row.notes}</div>
        )}
      </div>
    </div>
  );
}

export default function TodayPlan() {
  useEffect(() => { document.title = "ThermalOS — Today Plan | amogh.site"; }, []);

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["todayplan"],
    queryFn: fetchTodayPlan,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows: TodayRow[] = demo || !data || data.length === 0 ? generateDemoTodayPlan() : data;

  const p0 = useMemo(() => rows.filter((r) => r.priority.startsWith("P0")), [rows]);
  const p1 = useMemo(() => rows.filter((r) => r.priority.startsWith("P1")), [rows]);
  const other = useMemo(() => rows.filter((r) => !r.priority.startsWith("P0") && !r.priority.startsWith("P1")), [rows]);

  const byOwner = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => { if (r.owner) m[r.owner] = (m[r.owner] ?? 0) + 1; });
    return m;
  }, [rows]);

  if (isLoading) return <div className="h-96 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {demo && (
        <div className="px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect the Google Sheet to load today's actual tasks.
        </div>
      )}

      {/* Header */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="text-[22px] font-bold text-[#E6F7F1]">
            {p0.length} critical · {p1.length} high priority
          </div>
        </div>
        <div className="flex gap-3 ml-auto">
          {Object.entries(byOwner).map(([owner, count]) => (
            <div key={owner} className="text-center">
              <div className="text-[18px] font-bold font-mono" style={{ color: OWNER_COLOR[owner] ?? "#888780" }}>{count}</div>
              <div className="text-[9px] font-mono text-[#5a5a55]">{owner}</div>
            </div>
          ))}
        </div>
      </div>

      {/* P0 */}
      {p0.length > 0 && (
        <div className="bg-[#141412] border rounded-xl overflow-hidden" style={{ borderColor: "#D85A3040" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#D85A3010" }}>
            <div className="w-2 h-2 rounded-full bg-[#D85A30]" />
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#D85A30]">
              P0 — Critical ({p0.length} tasks)
            </span>
          </div>
          <div className="px-4">
            {p0.map((r, i) => <TaskRow key={i} row={r} isP0={true} />)}
          </div>
        </div>
      )}

      {/* P1 */}
      {p1.length > 0 && (
        <div className="bg-[#141412] border rounded-xl overflow-hidden" style={{ borderColor: "#EF9F2740" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#EF9F2710" }}>
            <div className="w-2 h-2 rounded-full bg-[#EF9F27]" />
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#EF9F27]">
              P1 — High ({p1.length} tasks)
            </span>
          </div>
          <div className="px-4">
            {p1.map((r, i) => <TaskRow key={i} row={r} isP0={false} />)}
          </div>
        </div>
      )}

      {/* Other */}
      {other.length > 0 && (
        <div className="bg-[#141412] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 flex items-center gap-2 bg-[#1C1C19]">
            <div className="w-2 h-2 rounded-full bg-[#888780]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#888780]">
              Other ({other.length} tasks)
            </span>
          </div>
          <div className="px-4">
            {other.map((r, i) => <TaskRow key={i} row={r} isP0={false} />)}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-10 text-center">
          <div className="text-[#1D9E75] text-[24px] mb-2">✓</div>
          <div className="font-mono text-[#888780]">No tasks for today. Run "Rebuild Today Plan" in the Google Sheet.</div>
        </div>
      )}

      <div className="text-[10px] font-mono text-[#5a5a55] text-center">
        Auto-generated from Master Timeline. Run "Rebuild Today Plan" in the Google Sheet each morning to refresh.
      </div>
    </div>
  );
}
