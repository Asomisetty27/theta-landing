import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMeasurements, generateDemoMeasurements, isDemoModeError, type MeasurementRow } from "@/services/thermalosApi";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, LineChart, Line, ReferenceLine } from "recharts";

// Power-cap sweep targets (E005 — planned)
const POWER_CAP_TARGETS = [150, 175, 200, 225, 250, 270];

export default function RthetaModel() {
  useEffect(() => { document.title = "ThermalOS — Rθ Model | amogh.site"; }, []);

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

  // Rθ distribution
  const rthetaValues = rows.map((r) => r.rthetaCwatt).filter(Boolean).sort((a, b) => a - b);
  const mean = rthetaValues.reduce((s, v) => s + v, 0) / rthetaValues.length;
  const std = Math.sqrt(rthetaValues.reduce((s, v) => s + (v - mean) ** 2, 0) / rthetaValues.length);
  const min = rthetaValues[0];
  const max = rthetaValues[rthetaValues.length - 1];

  // Rθ vs Power scatter
  const scatterData = rows.map((r) => ({
    power: r.powerW,
    rtheta: r.rthetaCwatt,
    temp: r.tempC,
    util: r.utilPct,
  }));

  // Rθ histogram (10 buckets)
  const histData = useMemo(() => {
    if (rthetaValues.length === 0) return [];
    const bucketCount = 10;
    const range = max - min || 0.001;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${(min + (range * i) / bucketCount).toFixed(2)}`,
      count: 0,
    }));
    rthetaValues.forEach((v) => {
      const idx = Math.min(bucketCount - 1, Math.floor(((v - min) / range) * bucketCount));
      buckets[idx].count++;
    });
    return buckets;
  }, [rthetaValues, min, max]);

  if (isLoading) return <div className="h-64 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {demo && (
        <div className="px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect sheet for live Rθ model.
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Mean Rθ_eff", value: `${mean.toFixed(4)}`, sub: "°C/W", accent: "#1D9E75" },
          { label: "Std Dev", value: `${std.toFixed(4)}`, sub: "°C/W", accent: "#D8D2C2" },
          { label: "Min", value: `${min?.toFixed(4) ?? "—"}`, sub: "°C/W", accent: "#1D9E75" },
          { label: "Max", value: `${max?.toFixed(4) ?? "—"}`, sub: "°C/W", accent: "#D85A30" },
        ].map((k) => (
          <div key={k.label} className="relative bg-[#141412] border border-white/[0.07] rounded-xl p-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: k.accent }} />
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-1">{k.label}</div>
            <div className="font-bold text-[22px] tabular-nums" style={{ color: k.accent }}>{k.value}</div>
            <div className="text-[10px] font-mono text-[#888780]">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rθ vs Power scatter */}
        <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
          <div className="font-bold text-[13px] mb-1">Rθ_eff vs Power Draw</div>
          <div className="text-[10px] font-mono text-[#5a5a55] mb-3">
            Each point = 1 telemetry sample. Pattern reveals cooling efficiency across power levels.
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 4, right: 12, left: 0, bottom: 16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="power" name="Power W" tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26"
                label={{ value: "Power (W)", position: "insideBottom", fill: "#5a5a55", fontSize: 10, offset: -8 }} />
              <YAxis dataKey="rtheta" name="Rθ °C/W" tick={{ fill: "#5a5a55", fontSize: 10 }} stroke="#2a2a26" />
              <ZAxis range={[18, 18]} />
              <Tooltip contentStyle={{ background: "#0D0D0B", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }}
                formatter={(v: number, name: string) => [name === "rtheta" ? `${v.toFixed(4)} °C/W` : `${v.toFixed(1)} W`, name]} />
              <ReferenceLine y={mean + std * 2} stroke="#D85A30" strokeDasharray="3 3"
                label={{ value: "μ+2σ anomaly zone", fill: "#D85A30", fontSize: 9 }} />
              <Scatter data={scatterData} fill="#1D9E75" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Rθ distribution histogram */}
        <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
          <div className="font-bold text-[13px] mb-1">Rθ_eff distribution</div>
          <div className="text-[10px] font-mono text-[#5a5a55] mb-3">
            {rows.length} samples. Baseline: {mean.toFixed(4)} ± {std.toFixed(4)} °C/W
          </div>
          <div className="flex items-end gap-1 h-[180px]">
            {histData.map((b, i) => {
              const maxCount = Math.max(...histData.map((x) => x.count), 1);
              const h = Math.round((b.count / maxCount) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[8px] font-mono text-[#5a5a55]">{b.count || ""}</div>
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${h}%`, background: b.count > 0 ? "#1D9E75" : "#1a1a18", minHeight: 2 }}
                  />
                  <div className="text-[7px] font-mono text-[#5a5a55] rotate-45 origin-left mt-1">{b.range}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* E005 power-cap sweep placeholder */}
      <div className="bg-[#0A0A08] border border-[#5a5a55]/30 rounded-xl p-4">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-2">
          E005 — Power-Cap Sweep (planned)
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {POWER_CAP_TARGETS.map((w) => (
            <div key={w} className="bg-[#141412] border border-white/[0.07] rounded-lg p-2.5 text-center">
              <div className="font-mono text-[11px] text-[#5a5a55]">{w}W</div>
              <div className="font-mono text-[18px] font-bold text-[#5a5a55] mt-1">—</div>
              <div className="text-[8px] font-mono text-[#3a3a38] mt-0.5">compute/W</div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[11px] text-[#5a5a55]">
          Run E005 in Colab to populate: PyTorch matmul at each cap level, measure TOPS/W. Target: identify optimal cap with &lt;3% throughput loss.
        </div>
      </div>
    </div>
  );
}
