import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMeasurements, generateDemoMeasurements, isDemoModeError, type MeasurementRow } from "@/services/thermalosApi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// This page shows GPU thermal cycling behavior from real telemetry:
// idle -> load -> idle transitions, capturing ramp-up and cooldown curves.

export default function ThermalCycling() {
  useEffect(() => { document.title = "ThermalOS — Thermal Cycling | amogh.site"; }, []);

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["measurements"],
    queryFn: fetchMeasurements,
    refetchInterval: 10_000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows: MeasurementRow[] = demo || !data || data.length === 0
    ? generateDemoMeasurements(60)
    : data;

  // Annotate with state transitions
  const IDLE_POWER = 12;
  const IDLE_UTIL = 5;

  const chartData = rows.map((r, i) => {
    const isIdle = r.powerW < IDLE_POWER && r.utilPct <= IDLE_UTIL;
    return {
      i,
      t: r.timestamp.slice(11, 19),
      temp: r.tempC,
      power: r.powerW,
      rtheta: r.rthetaCwatt,
      util: r.utilPct,
      state: isIdle ? "idle" : "load",
    };
  });

  // Find transitions
  const transitions: { i: number; to: string }[] = [];
  chartData.forEach((d, idx) => {
    if (idx > 0 && d.state !== chartData[idx - 1].state) {
      transitions.push({ i: idx, to: d.state });
    }
  });

  // Stats by state
  const idleRows = rows.filter((r) => r.powerW < IDLE_POWER && r.utilPct <= IDLE_UTIL);
  const loadRows = rows.filter((r) => r.powerW >= IDLE_POWER || r.utilPct > IDLE_UTIL);
  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  if (isLoading) return <div className="h-64 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {demo && (
        <div className="px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect sheet for real cycling data.
        </div>
      )}

      {/* State comparison */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Idle state",
            color: "#1D9E75",
            samples: idleRows.length,
            avgTemp: avg(idleRows.map((r) => r.tempC)),
            avgPower: avg(idleRows.map((r) => r.powerW)),
            avgRtheta: avg(idleRows.map((r) => r.rthetaCwatt)),
          },
          {
            label: "Load state",
            color: "#D85A30",
            samples: loadRows.length,
            avgTemp: avg(loadRows.map((r) => r.tempC)),
            avgPower: avg(loadRows.map((r) => r.powerW)),
            avgRtheta: avg(loadRows.map((r) => r.rthetaCwatt)),
          },
        ].map((s) => (
          <div key={s.label} className="bg-[#141412] border border-white/[0.07] rounded-xl p-4"
            style={{ borderTopColor: s.color, borderTopWidth: 2 }}>
            <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: s.color }}>{s.label}</div>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-[#5a5a55]">Samples</span><span>{s.samples}</span></div>
              <div className="flex justify-between"><span className="text-[#5a5a55]">Avg Temp</span><span>{s.avgTemp.toFixed(1)} °C</span></div>
              <div className="flex justify-between"><span className="text-[#5a5a55]">Avg Power</span><span>{s.avgPower.toFixed(1)} W</span></div>
              <div className="flex justify-between"><span className="text-[#5a5a55]">Avg Rθ_eff</span><span>{s.avgRtheta.toFixed(4)} °C/W</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Full timeline chart */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="font-bold text-[13px] mb-1">Temp + Power — full session</div>
        <div className="text-[10px] font-mono text-[#5a5a55] mb-1">
          {transitions.length} state transitions detected. E002 finding: GPU holds load state thermally even after workload exits.
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" interval={9} />
            <YAxis yAxisId="temp" domain={[20, 100]} tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
            <YAxis yAxisId="power" orientation="right" domain={[0, 80]} tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
            <Tooltip contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#888780" }} />
            <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#D85A30" strokeWidth={2} dot={false} name="Temp °C" />
            <Line yAxisId="power" type="monotone" dataKey="power" stroke="#EF9F27" strokeWidth={1.5} dot={false} name="Power W" />
            <Line yAxisId="temp" type="monotone" dataKey="util" stroke="#D8D2C2" strokeWidth={1} dot={false} name="Util %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* E002 finding callout */}
      <div className="bg-[#0A0A08] border border-[#EF9F27]/30 rounded-xl p-4">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#EF9F27] mb-2">E002/E003/E004 — Thermal cycling insight</div>
        <div className="font-mono text-[11px] text-[#a8a89f] leading-relaxed">
          When a workload exits from the same process (E002), the GPU CUDA context stays alive, holding temp at ~74°C and power at ~31W for up to 10 minutes — while reporting 0% utilization. When isolated in a child process (E003/E004), the context is released on exit and the GPU returns to thermal idle in ~202s. This means operator dashboards that show "0% util = idle" are wrong. Thermal state requires multi-field classification.
        </div>
      </div>
    </div>
  );
}
