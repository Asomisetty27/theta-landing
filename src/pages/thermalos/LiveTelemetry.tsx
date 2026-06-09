import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Area, ComposedChart,
} from "recharts";
import {
  fetchMeasurements, generateDemoMeasurements, isDemoModeError,
  type MeasurementRow,
} from "@/services/thermalosApi";
import KPIStrip from "./components/KPIStrip";

const ALERT_CONFIG: Record<string, { text: (m: MeasurementRow) => string; action: string; color: string }> = {
  OK: {
    text: (m) => `System nominal. Rθ = ${m.rthetaCwatt.toFixed(3)} °C/W. ${m.headroomC.toFixed(1)}°C thermal headroom remaining.`,
    action: "maintain_current_power_cap",
    color: "#1D9E75",
  },
  HIGH_RTHETA: {
    text: (m) => `Thermal resistance elevated at ${m.rthetaCwatt.toFixed(3)} °C/W above expected baseline. Possible cooling path degradation — verify TIM and mounting.`,
    action: "inspect_cooling_path",
    color: "#D85A30",
  },
  LOW_HEADROOM: {
    text: (m) => `Only ${m.headroomC.toFixed(1)}°C before throttle threshold. Reduce power cap or improve cooling to avoid performance loss.`,
    action: "reduce_power_cap → -5W",
    color: "#EF9F27",
  },
  HOT: {
    text: (m) => `CRITICAL: ${m.tempC.toFixed(1)}°C. Throttle imminent. Reduce workload or power cap immediately.`,
    action: "emergency_power_reduction",
    color: "#ff4d4d",
  },
};

export default function LiveTelemetry() {
  useEffect(() => {
    document.title = "ThermalOS — Live Telemetry | amogh.site";
  }, []);

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ["measurements"],
    queryFn: fetchMeasurements,
    refetchInterval: 5000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows: MeasurementRow[] = demo || !data || data.length === 0
    ? generateDemoMeasurements(60)
    : data.slice(-60);

  const latest = rows[rows.length - 1];
  const rec = ALERT_CONFIG[latest?.alert ?? "OK"] ?? ALERT_CONFIG.OK;

  const chartData = rows.map((r) => ({
    t: r.timestamp.length > 19 ? r.timestamp.slice(11, 19) : r.timestamp.slice(-8),
    rtheta: r.rthetaCwatt,
    temp: r.tempC,
    power: r.powerW,
    util: r.utilPct,
    sm: r.smClockMhz,
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      {demo && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — sheet not connected. Connect Supabase edge function to stream live Colab data.
        </div>
      )}
      {!demo && data && data.length === 0 && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-[#1D9E75]/10 border border-[#1D9E75]/30 text-[12px] font-mono text-[#1D9E75]">
          Sheet connected — no rows yet in <span className="opacity-70">📡 Measurements</span> A4:I. Run the Colab collector to populate.
        </div>
      )}

      <KPIStrip latest={latest} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Charts */}
        <div className="lg:col-span-3 space-y-4">
          <ChartCard title="Rθ_eff over time" subtitle="°C/W · last 60 samples · 5s refresh">
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" interval={9} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
                <Tooltip
                  contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }}
                  formatter={(v: number) => [`Rθ = ${v.toFixed(4)} °C/W`, ""]}
                  labelStyle={{ color: "#D8D2C2" }}
                />
                <Area type="monotone" dataKey="rtheta" fill="rgba(29,158,117,0.08)" stroke="none" />
                <Line type="monotone" dataKey="rtheta" stroke="#1D9E75" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Temperature + Power" subtitle="°C and W · last 60 samples">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" interval={9} />
                <YAxis yAxisId="temp" domain={[20, 100]} tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
                <YAxis yAxisId="power" orientation="right" domain={[0, 80]} tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
                <Tooltip contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#888780" }} />
                <ReferenceLine yAxisId="temp" y={93} stroke="#D85A30" strokeDasharray="4 4" label={{ value: "93°C throttle", fill: "#D85A30", fontSize: 9, position: "right" }} />
                <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#D85A30" strokeWidth={2} dot={false} name="Temp °C" />
                <Line yAxisId="power" type="monotone" dataKey="power" stroke="#EF9F27" strokeWidth={1.5} dot={false} name="Power W" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Utilization + SM Clock" subtitle="% and MHz · last 60 samples">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fill: "#5a5a55", fontSize: 9 }} stroke="#2a2a26" interval={9} />
                <YAxis yAxisId="util" domain={[0, 100]} tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
                <YAxis yAxisId="sm" orientation="right" domain={[0, 1700]} tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
                <Tooltip contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, color: "#888780" }} />
                <Line yAxisId="util" type="monotone" dataKey="util" stroke="#D8D2C2" strokeWidth={1.5} dot={false} name="Util %" />
                <Line yAxisId="sm" type="monotone" dataKey="sm" stroke="#888780" strokeWidth={1.5} dot={false} name="SM MHz" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-3">
              Live GPU Readout
            </div>
            <div className="space-y-0">
              <Row dot="#D85A30" label="GPU Temp" value={latest ? `${latest.tempC.toFixed(1)} °C` : "—"} />
              <Row dot="#EF9F27" label="Power Draw" value={latest ? `${latest.powerW.toFixed(1)} W` : "—"} />
              <Row dot="#888780" label="Power Cap" value={latest ? `${latest.powerCapW.toFixed(0)} W` : "—"} />
              <Row dot="#D8D2C2" label="SM Clock" value={latest ? `${latest.smClockMhz.toLocaleString()} MHz` : "—"} />
              <Row dot="#D8D2C2" label="Mem Clock" value={latest ? `${latest.memClockMhz.toLocaleString()} MHz` : "—"} />
              <Row dot="#1D9E75" label="Utilization" value={latest ? `${latest.utilPct}%` : "—"} />
              <Row dot="#1D9E75" label="Headroom" value={latest ? `${latest.headroomC.toFixed(1)} °C` : "—"} />
              <Row dot="#5a5a55" label="Last sample" value={latest ? latest.timestamp.slice(0, 19).replace("T", " ") : "—"} last />
            </div>
          </div>

          <div className="bg-[#141412] border border-white/[0.07] rounded-xl border-l-[3px] border-l-[#1D9E75] p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#D4AF37] mb-2">
              ThermalOS Recommendation
            </div>
            <p className="font-mono text-[12px] leading-relaxed text-[#E6F7F1]">
              {latest ? rec.text(latest) : "Awaiting telemetry..."}
            </p>
            <div className="mt-3">
              <span
                className="inline-block text-[10px] font-mono px-2 py-1 rounded"
                style={{ background: `${rec.color}15`, color: rec.color, border: `1px solid ${rec.color}40` }}
              >
                {rec.action}
              </span>
            </div>
            <div className="mt-3 bg-[#0A0A08] border border-white/[0.07] rounded p-2.5 font-mono text-[11px] text-[#D8D2C2] leading-relaxed">
              <div>Rθ_eff(t) = {latest?.rthetaCwatt.toFixed(4) ?? "—"} °C/W</div>
              <div>Formula: (T_gpu - T_amb) / P_draw</div>
              <div>Headroom = {latest?.headroomC.toFixed(1) ?? "—"} °C to throttle</div>
              <div>
                Alert: <span style={{ color: rec.color }}>{latest?.alert ?? "—"}</span>
                <span className="inline-block w-1.5 h-3 bg-[#D4AF37] ml-1 align-middle animate-pulse" />
              </div>
            </div>
          </div>

          {/* Key finding callout */}
          <div className="bg-[#0A0A08] border border-[#EF9F27]/30 rounded-xl p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#EF9F27] mb-2">
              Research Finding — E002/E003/E004
            </div>
            <p className="font-mono text-[11px] text-[#a8a89f] leading-relaxed">
              GPU utilization is a broken thermal state signal. After workload exit, GPU holds elevated temp+power for ~202s (mean, 3 trials) while reporting 0% utilization. Multi-field classifier required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-bold text-[13px]">{title}</div>
        <div className="text-[10px] font-mono text-[#5a5a55]">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function Row({ dot, label, value, last }: { dot: string; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-white/[0.04]"}`}>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
        <span className="text-[11px] text-[#a8a89f]">{label}</span>
      </div>
      <span className="font-mono text-[12px] tabular-nums">{value}</span>
    </div>
  );
}
