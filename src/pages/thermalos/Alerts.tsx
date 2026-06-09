import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMeasurements, generateDemoMeasurements, isDemoModeError, type MeasurementRow } from "@/services/thermalosApi";

const ALERT_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  OK:           { label: "OK",           color: "#1D9E75", bg: "#1D9E7518", desc: "System nominal. Rθ within expected range, headroom adequate." },
  LOW_HEADROOM: { label: "LOW HEADROOM", color: "#EF9F27", bg: "#EF9F2718", desc: "Less than 15°C before throttle threshold. Reduce power cap or improve airflow." },
  HIGH_RTHETA:  { label: "HIGH Rθ",     color: "#D85A30", bg: "#D85A3018", desc: "Thermal resistance elevated above 1.8 °C/W. Cooling path may be degrading." },
  HOT:          { label: "HOT",          color: "#ff4d4d", bg: "#ff4d4d18", desc: "Temperature critical. Throttle imminent. Reduce workload immediately." },
};

function timeSince(ts: string): string {
  const d = new Date(ts).getTime();
  if (isNaN(d)) return ts;
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function Alerts() {
  useEffect(() => { document.title = "ThermalOS — Alerts | amogh.site"; }, []);

  const { data, error, isError, isLoading } = useQuery({
    queryKey: ["measurements"],
    queryFn: fetchMeasurements,
    refetchInterval: 5000,
    staleTime: 0,
    retry: false,
  });

  const demo = isError && isDemoModeError(error);
  const rows: MeasurementRow[] = demo || !data || data.length === 0
    ? generateDemoMeasurements(60)
    : data;

  // Count alerts
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.alert] = (acc[r.alert] ?? 0) + 1;
    return acc;
  }, {});

  // Non-OK events (most recent first)
  const events = [...rows].reverse().filter((r) => r.alert !== "OK");
  const latest = rows[rows.length - 1];

  if (isLoading) return <div className="h-64 bg-[#141412] border border-white/[0.07] rounded-xl animate-pulse" />;

  return (
    <div className="space-y-4">
      {demo && (
        <div className="px-3 py-2 rounded-lg bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
          Demo Mode — connect sheet to see live alerts.
        </div>
      )}

      {/* Current state */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(ALERT_META).map(([key, meta]) => (
          <div key={key} className="bg-[#141412] border border-white/[0.07] rounded-xl p-4"
            style={{ borderTopColor: meta.color, borderTopWidth: 2 }}>
            <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-1">{meta.label}</div>
            <div className="font-bold text-[28px] tabular-nums" style={{ color: meta.color }}>
              {counts[key] ?? 0}
            </div>
            <div className="text-[10px] text-[#5a5a55] mt-0.5">of {rows.length} samples</div>
          </div>
        ))}
      </div>

      {/* Current alert */}
      {latest && (
        <div className="rounded-xl p-4 border"
          style={{
            background: ALERT_META[latest.alert]?.bg ?? "#141412",
            borderColor: `${ALERT_META[latest.alert]?.color ?? "#5a5a55"}40`,
          }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{latest.alert === "OK" ? "🟢" : latest.alert === "HOT" ? "🔴" : latest.alert === "HIGH_RTHETA" ? "🟠" : "🟡"}</span>
            <div>
              <div className="font-bold text-[13px]" style={{ color: ALERT_META[latest.alert]?.color }}>
                Current: {ALERT_META[latest.alert]?.label ?? latest.alert}
              </div>
              <div className="font-mono text-[11px] text-[#a8a89f] mt-0.5">
                {ALERT_META[latest.alert]?.desc}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: "Temp", value: `${latest.tempC.toFixed(1)} °C` },
              { label: "Power", value: `${latest.powerW.toFixed(1)} W` },
              { label: "Rθ_eff", value: `${latest.rthetaCwatt.toFixed(4)} °C/W` },
              { label: "Headroom", value: `${latest.headroomC.toFixed(1)} °C` },
              { label: "Util", value: `${latest.utilPct}%` },
              { label: "SM Clock", value: `${latest.smClockMhz} MHz` },
            ].map((m) => (
              <div key={m.label} className="bg-black/20 rounded-lg p-2.5">
                <div className="text-[9px] font-mono text-[#5a5a55] uppercase">{m.label}</div>
                <div className="font-mono text-[13px] font-bold mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert event log */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-3">
          Alert Event Log — non-OK only ({events.length} events)
        </div>
        {events.length === 0 ? (
          <div className="text-[12px] font-mono text-[#5a5a55] py-6 text-center">No alert events in current window. System nominal.</div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {events.map((r, i) => {
              const meta = ALERT_META[r.alert] ?? ALERT_META.OK;
              return (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                  <span className="font-mono text-[10px] text-[#5a5a55] w-20 flex-shrink-0">{timeSince(r.timestamp)}</span>
                  <span className="font-mono text-[11px] font-bold flex-shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="font-mono text-[10px] text-[#888780]">
                    {r.tempC.toFixed(1)}°C / {r.powerW.toFixed(1)}W / Rθ {r.rthetaCwatt.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
