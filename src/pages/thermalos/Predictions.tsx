import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchMeasurements, generateDemoMeasurements,
  fetchOutreach, generateDemoOutreach,
  fetchAdvisorQuestions, generateDemoAdvisorQuestions,
  fetchTimeline, generateDemoTimeline,
  isDemoModeError,
} from "@/services/thermalosApi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, ComposedChart,
} from "recharts";

const YC_DEADLINE = new Date("2026-10-01");
const TARGET_TELEMETRY_ROWS = 20000; // Stage 2 dataset target
const TARGET_OPERATORS = 10;          // Discovery call target
const TARGET_EXPERIMENTS = 8;         // E001-E008 (Stage 2 completion)
const TARGET_QUESTIONS_RESOLVED = 5;  // All 5 advisor questions

function daysUntil(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

function ProgressBar({ value, max, color = "#1D9E75" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-[#2C2C2A] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function Predictions() {
  useEffect(() => { document.title = "ThermalOS — Milestones | amogh.site"; }, []);

  const { data: measurementsData, error, isError, isLoading } = useQuery({
    queryKey: ["measurements"],
    queryFn: fetchMeasurements,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });

  const { data: outreachData } = useQuery({
    queryKey: ["outreach"],
    queryFn: fetchOutreach,
    refetchInterval: 30_000,
    staleTime: 0,
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

  const demo = isError && isDemoModeError(error);
  const measurements = demo || !measurementsData || measurementsData.length === 0 ? generateDemoMeasurements(60) : measurementsData;
  const outreach = !outreachData || outreachData.length === 0 ? generateDemoOutreach() : outreachData;
  const questions = !questionsData || questionsData.length === 0 ? generateDemoAdvisorQuestions() : questionsData;
  const timeline = !timelineData || timelineData.length === 0 ? generateDemoTimeline() : timelineData;

  const daysLeft = daysUntil(YC_DEADLINE);
  const weeksLeft = Math.floor(daysLeft / 7);

  // GPU forensics specific metrics
  const validRows = measurements.filter((r) => r.rthetaCwatt > 0);
  const totalRows = measurements.length;
  const bestRtheta = validRows.length ? Math.min(...validRows.map((r) => r.rthetaCwatt)) : null;
  const avgRtheta = validRows.length ? validRows.reduce((a, r) => a + r.rthetaCwatt, 0) / validRows.length : null;
  const anomalies = measurements.filter((r) => r.alert && r.alert !== "OK").length;

  const operatorConversations = outreach.filter((r) =>
    ["Contacted", "Replied", "Meeting Set", "Positive Quote"].includes(r.status)
  ).length;

  const questionsResolved = questions.filter((q) => q.status === "answered").length;

  const experimentsDone = timeline.filter((t) =>
    /^E\d{3}/.test(t.milestone || "") && t.status?.toLowerCase().includes("done")
  ).length;

  // R_theta trajectory — running minimum (best-so-far trend per sample)
  const trajectory = useMemo(() => {
    let best = Infinity;
    return validRows.slice(-30).map((r, i) => {
      if (r.rthetaCwatt < best) best = r.rthetaCwatt;
      return { run: i + 1, rtheta: r.rthetaCwatt, bestSoFar: +best.toFixed(4) };
    });
  }, [validRows]);

  // Weekly telemetry pace needed
  const rowsNeeded = Math.max(0, TARGET_TELEMETRY_ROWS - totalRows);
  const rowsPerWeek = weeksLeft > 0 ? Math.round(rowsNeeded / weeksLeft).toLocaleString() : "—";

  const milestones = [
    {
      label: "All 5 advisor questions resolved",
      current: questionsResolved,
      target: TARGET_QUESTIONS_RESOLVED,
      unit: "answered",
      color: "#1D9E75",
      achieved: questionsResolved >= TARGET_QUESTIONS_RESOLVED,
    },
    {
      label: "E001-E008 experiments complete",
      current: experimentsDone,
      target: TARGET_EXPERIMENTS,
      unit: "experiments",
      color: "#D4AF37",
      achieved: experimentsDone >= TARGET_EXPERIMENTS,
    },
    {
      label: `${TARGET_TELEMETRY_ROWS.toLocaleString()} telemetry rows collected`,
      current: totalRows,
      target: TARGET_TELEMETRY_ROWS,
      unit: "rows",
      color: "#B87333",
      achieved: totalRows >= TARGET_TELEMETRY_ROWS,
    },
    {
      label: `${TARGET_OPERATORS} discovery calls completed`,
      current: operatorConversations,
      target: TARGET_OPERATORS,
      unit: "operators",
      color: "#a855f7",
      achieved: operatorConversations >= TARGET_OPERATORS,
    },
    {
      label: "First conference paper submitted",
      current: 0,
      target: 1,
      unit: "submission",
      color: "#EF9F27",
      achieved: false,
    },
  ];

  if (isLoading) return <div className="h-96 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {demo && (
        <div className="px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect the Google Sheet for projections against real data.
        </div>
      )}

      {/* YC countdown */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="flex flex-wrap gap-6 items-center">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-1">YC W27 Deadline</div>
            <div className="text-[32px] font-bold text-[#D4AF37] font-mono leading-none">{daysLeft}</div>
            <div className="text-[11px] font-mono text-[#888780]">days · {weeksLeft} weeks</div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <ProgressBar value={1} max={1} color="#D4AF37" />
            <div className="flex justify-between text-[9px] font-mono text-[#5a5a55] mt-1">
              <span>Stage 1 ✓</span>
              <span>Oct 1, 2026</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55]">Rows / week needed</div>
              <div className="text-[20px] font-bold font-mono text-[#EF9F27]">{rowsPerWeek}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55]">Rows collected</div>
              <div className="text-[20px] font-bold font-mono text-[#D8D2C2]">{totalRows.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rθ trajectory */}
        <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-1">Rθ_eff Trajectory — Best-So-Far</div>
          <div className="text-[10px] font-mono text-[#888780] mb-3">
            Current best: <span className="text-[#D4AF37]">{bestRtheta?.toFixed(3) ?? "—"} °C/W</span>
            {avgRtheta !== null && (
              <>
                {" · "}Avg: <span className="text-[#EF9F27]">{avgRtheta.toFixed(3)} °C/W</span>
              </>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={trajectory} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="run" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" />
              <YAxis domain={[0, 2.5]} tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" />
              <Tooltip contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }}
                formatter={(v: number, name: string) => [`${v.toFixed(3)} °C/W`, name === "bestSoFar" ? "Best-so-far" : "Measured"]} />
              <ReferenceLine y={0.5} stroke="#EF9F27" strokeDasharray="4 2"
                label={{ value: "Anomaly threshold", fill: "#EF9F27", fontSize: 9, position: "right" }} />
              <Area type="monotone" dataKey="rtheta" fill="rgba(29,158,117,0.06)" stroke="none" />
              <Line type="monotone" dataKey="rtheta" stroke="#888780" strokeWidth={1} dot={{ fill: "#888780", r: 2 }} name="Measured" />
              <Line type="monotone" dataKey="bestSoFar" stroke="#1D9E75" strokeWidth={2.5} dot={false} name="Best-so-far" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Detection rate */}
        <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
          <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-1">Anomaly detection coverage</div>
          <div className="text-[10px] font-mono text-[#888780] mb-3">
            {anomalies} anomaly events flagged across {totalRows.toLocaleString()} samples
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#888780]">Samples processed</span>
                <span className="text-[#D8D2C2]">{totalRows.toLocaleString()}</span>
              </div>
              <ProgressBar value={totalRows} max={TARGET_TELEMETRY_ROWS} color="#D8D2C2" />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#888780]">Anomaly events</span>
                <span style={{ color: anomalies > 0 ? "#EF9F27" : "#888780" }}>{anomalies}</span>
              </div>
              <ProgressBar value={anomalies} max={Math.max(10, anomalies)} color="#EF9F27" />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-[#888780]">Discovery calls</span>
                <span className="text-[#a855f7]">{operatorConversations} / {TARGET_OPERATORS}</span>
              </div>
              <ProgressBar value={operatorConversations} max={TARGET_OPERATORS} color="#a855f7" />
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#0A0A08] rounded text-[10px] font-mono text-[#D8D2C2] leading-relaxed">
            Stage 1 ({totalRows.toLocaleString()} rows) proved Rθ separates states. Stage 2 needs{" "}
            <span className="text-[#D4AF37]">{TARGET_TELEMETRY_ROWS.toLocaleString()}</span> rows on dedicated
            hardware to publish.
          </div>
        </div>
      </div>

      {/* Milestone tracker */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-3">
          YC W27 + Publication milestones
        </div>
        <div className="space-y-3">
          {milestones.map((m) => (
            <div key={m.label} className="flex items-center gap-4">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${m.achieved ? "bg-[#1D9E75]/20" : "bg-[#2C2C2A]"}`}>
                {m.achieved
                  ? <span className="text-[#1D9E75] text-[12px]">✓</span>
                  : <span className="text-[#5a5a55] text-[10px]">○</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-[12px] ${m.achieved ? "line-through text-[#5a5a55]" : ""}`}>{m.label}</span>
                  <span className="text-[11px] font-mono text-[#888780] ml-2 flex-shrink-0">
                    {m.current.toLocaleString()} / {m.target.toLocaleString()} {m.unit}
                  </span>
                </div>
                <ProgressBar
                  value={m.current}
                  max={m.target}
                  color={m.achieved ? "#1D9E75" : m.color}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
