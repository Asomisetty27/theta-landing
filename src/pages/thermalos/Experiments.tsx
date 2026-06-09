import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMeasurements, generateDemoMeasurements, isDemoModeError, type MeasurementRow } from "@/services/thermalosApi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

// Hardcoded experiment log — real findings from E001-E004
const EXPERIMENTS = [
  {
    id: "E001",
    title: "Idle Baseline — T4 GPU",
    date: "2026-05-14",
    status: "Done",
    finding: "Stable idle baseline established. T~39°C, P~11-14W, Rθ~1.28 °C/W, 0% utilization, P8 power state, ~450MB memory. Ambient assumption of 25°C introduces noise at low power — calibrate ambient in future runs.",
    metrics: { avgTemp: 39, avgPower: 12, avgRtheta: 1.28, samples: 120 },
  },
  {
    id: "E002",
    title: "Same-Process Cooldown Study",
    date: "2026-05-14",
    status: "Done",
    finding: "GPU held 74°C / 31W for 10 full minutes after workload ended while reporting 0% utilization. Critical finding: utilization is a broken thermal state signal.",
    metrics: { avgTemp: 74, avgPower: 31, avgRtheta: 1.61, samples: 600 },
  },
  {
    id: "E003",
    title: "Child-Process Cooldown (single trial)",
    date: "2026-05-14",
    status: "Done",
    finding: "Isolated workload in a separate child process. GPU returned to clean idle in 141s after process exit. Clear cooldown curve confirmed.",
    metrics: { avgTemp: 54, avgPower: 18, avgRtheta: 1.59, samples: 141 },
  },
  {
    id: "E004",
    title: "Cooldown Replication (3 trials)",
    date: "2026-05-14",
    status: "Done",
    finding: "Replicated E003 three times. Return times: 209s, 212s, 185s. Mean 202s, std dev 14.8s. Consistent and measurable — forms basis for anomaly detection threshold.",
    metrics: { avgTemp: 52, avgPower: 17, avgRtheta: 1.58, samples: 606 },
  },
  {
    id: "E005",
    title: "Power-Cap Sweep (6 levels)",
    date: "—",
    status: "Planned",
    finding: "Run PyTorch matmul at 150W / 175W / 200W / 225W / 250W / full TDP. Measure compute/watt at each. Identify optimal power cap with <3% throughput loss.",
    metrics: null,
  },
  {
    id: "E006",
    title: "Rolling Rθ Baseline + Anomaly Threshold",
    date: "—",
    status: "Planned",
    finding: "Establish rolling mean Rθ over 30-sample window. Calibrate deviation threshold (target: 15% above baseline triggers alert). Measure false positive rate.",
    metrics: null,
  },
];

// Cooldown curve data (E003 approximate shape)
const cooldownData = Array.from({ length: 30 }, (_, i) => ({
  t: i * 5,
  temp: Math.max(40, 74 - (74 - 40) * (1 - Math.exp(-i / 8))),
  power: Math.max(9.5, 31 - (31 - 9.5) * (1 - Math.exp(-i / 8))),
}));

const statusColor: Record<string, string> = {
  Done: "#1D9E75",
  Planned: "#5a5a55",
  "In Progress": "#EF9F27",
};

export default function Experiments() {
  useEffect(() => { document.title = "ThermalOS — Experiments | amogh.site"; }, []);
  const [selected, setSelected] = useState<string>("E002");

  const { data, error, isError } = useQuery({
    queryKey: ["measurements"],
    queryFn: fetchMeasurements,
    refetchInterval: 10_000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const liveRows: MeasurementRow[] = demo || !data || data.length === 0
    ? generateDemoMeasurements(60)
    : data;

  const sel = EXPERIMENTS.find((e) => e.id === selected) ?? EXPERIMENTS[0];

  // Scatter of live rtheta vs power for all live rows
  const scatterData = liveRows.map((r) => ({
    power: r.powerW,
    rtheta: r.rthetaCwatt,
    temp: r.tempC,
  }));

  return (
    <div className="space-y-4">
      {/* Experiment list */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {EXPERIMENTS.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e.id)}
            className={`text-left p-3 rounded-xl border transition-colors ${
              selected === e.id
                ? "bg-[#1D9E75]/10 border-[#1D9E75]/40"
                : "bg-[#141412] border-white/[0.07] hover:border-white/20"
            }`}
          >
            <div className="font-mono text-[11px] font-bold">{e.id}</div>
            <div className="text-[9px] text-[#5a5a55] mt-0.5 leading-tight">{e.title.slice(0, 30)}</div>
            <div
              className="inline-block mt-1.5 text-[8px] font-mono px-1.5 py-0.5 rounded"
              style={{ color: statusColor[e.status], background: `${statusColor[e.status]}18`, border: `1px solid ${statusColor[e.status]}40` }}
            >
              {e.status}
            </div>
          </button>
        ))}
      </div>

      {/* Selected experiment detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-[#141412] border border-white/[0.07] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[13px] font-bold text-[#1D9E75]">{sel.id}</span>
              <span className="ml-2 text-[13px] font-semibold">{sel.title}</span>
            </div>
            <div className="text-[10px] font-mono text-[#5a5a55]">{sel.date}</div>
          </div>
          <p className="font-mono text-[12px] text-[#a8a89f] leading-relaxed border-l-2 border-[#1D9E75]/40 pl-3">
            {sel.finding}
          </p>
          {sel.metrics && (
            <div className="grid grid-cols-4 gap-2 pt-2">
              {[
                { label: "Avg Temp", value: `${sel.metrics.avgTemp}°C` },
                { label: "Avg Power", value: `${sel.metrics.avgPower}W` },
                { label: "Avg Rθ", value: `${sel.metrics.avgRtheta} °C/W` },
                { label: "Samples", value: sel.metrics.samples },
              ].map((m) => (
                <div key={m.label} className="bg-[#0A0A08] rounded-lg p-2.5">
                  <div className="text-[9px] font-mono text-[#5a5a55] uppercase tracking-wider">{m.label}</div>
                  <div className="font-mono text-[14px] font-bold text-[#E6F7F1] mt-0.5">{m.value}</div>
                </div>
              ))}
            </div>
          )}
          {sel.id === "E004" && (
            <div className="bg-[#0A0A08] border border-[#EF9F27]/25 rounded-lg p-3">
              <div className="text-[9px] font-mono text-[#EF9F27] uppercase tracking-wider mb-1">Key Research Finding</div>
              <div className="font-mono text-[11px] text-[#a8a89f]">
                Utilization alone fails to classify GPU thermal state. A multi-field classifier using (temp, power, P-state, process_count, Rθ) is required. Cooldown mean 202s provides natural state-transition window.
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-2">
              E003/E004 — Cooldown curve shape
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={cooldownData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" label={{ value: "s after exit", position: "insideBottom", fill: "#5a5a55", fontSize: 9 }} />
                <YAxis tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" />
                <Tooltip contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                <Line type="monotone" dataKey="temp" stroke="#D85A30" strokeWidth={2} dot={false} name="Temp °C" />
                <Line type="monotone" dataKey="power" stroke="#EF9F27" strokeWidth={1.5} dot={false} name="Power W" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-2">
              Live Rθ vs Power scatter
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="power" name="Power W" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" label={{ value: "Power W", position: "insideBottom", fill: "#5a5a55", fontSize: 9 }} />
                <YAxis dataKey="rtheta" name="Rθ °C/W" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" />
                <ZAxis range={[20, 20]} />
                <Tooltip contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatterData} fill="#1D9E75" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
