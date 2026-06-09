import { useEffect } from "react";

// TIM Analysis is Sam's physical rig work — planned for Fall 2026
// This page documents the planned methodology and will populate with real data
// once Sam's heater-block testbed is built.

const TIM_MATERIALS = [
  { name: "No TIM (bare)", rtheta: null, notes: "Dry reference baseline" },
  { name: "Generic paste", rtheta: null, notes: "Low-cost commodity" },
  { name: "Arctic MX-4", rtheta: null, notes: "Consumer benchmark standard" },
  { name: "Fujipoly XR-m", rtheta: null, notes: "Premium pad — high conformability" },
  { name: "Phase-change pad", rtheta: null, notes: "Melts at junction temp" },
  { name: "Graphene TIM", rtheta: null, notes: "Research material — ultra-low Rθ target" },
];

const PRESSURE_TARGETS = [8, 16, 24, 32, 40, 50]; // Newtons

export default function TIMAnalysis() {
  useEffect(() => { document.title = "ThermalOS — TIM Analysis | amogh.site"; }, []);

  return (
    <div className="space-y-4">
      <div className="px-3 py-2 rounded-lg bg-[#D8D2C2]/10 border border-[#D8D2C2]/30 text-[12px] font-mono text-[#D8D2C2]">
        Physical rig work — planned Fall 2026. Sam's heater-block testbed will generate ground-truth fault signatures for the anomaly detector calibration (E006).
      </div>

      {/* Methodology overview */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="font-bold text-[13px] mb-3">Planned experiment matrix</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px] text-[#a8a89f]">
          {[
            { title: "Variable 1: TIM Material", items: TIM_MATERIALS.map((m) => m.name) },
            { title: "Variable 2: Mounting Pressure", items: PRESSURE_TARGETS.map((p) => `${p} N`) },
            { title: "Fault Simulations", items: ["Wrong pressure (4N vs optimal)", "Partial TIM coverage", "Reduced coolant flow", "Air bubble in loop", "TIM pump-out (post-cycling)"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-[9px] uppercase tracking-wider text-[#5a5a55] mb-2">{col.title}</div>
              <ul className="space-y-1">
                {col.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#5a5a55]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* TIM material table — placeholder */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="font-bold text-[13px] mb-3">TIM material Rθ results</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Material", "Rθ_eff (°C/W)", "vs No TIM", "Notes", "Status"].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-[9px] uppercase tracking-wider text-[#5a5a55]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIM_MATERIALS.map((m) => (
                <tr key={m.name} className="border-b border-white/[0.04]">
                  <td className="py-2 pr-4 text-[#E6F7F1]">{m.name}</td>
                  <td className="py-2 pr-4 text-[#5a5a55]">—</td>
                  <td className="py-2 pr-4 text-[#5a5a55]">—</td>
                  <td className="py-2 pr-4 text-[#888780]">{m.notes}</td>
                  <td className="py-2 pr-4">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#5a5a5518] border border-[#5a5a5540] text-[#5a5a55]">
                      Fall 2026
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pressure sweep placeholder */}
      <div className="bg-[#141412] border border-white/[0.07] rounded-xl p-4">
        <div className="font-bold text-[13px] mb-1">Pressure sweep — Arctic MX-4</div>
        <div className="text-[10px] font-mono text-[#5a5a55] mb-3">Rθ_eff at 6 mounting pressures. Expected: 30-35% reduction from 8N to 32N.</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PRESSURE_TARGETS.map((p) => (
            <div key={p} className="bg-[#0A0A08] border border-white/[0.05] rounded-lg p-2.5 text-center">
              <div className="font-mono text-[11px] text-[#5a5a55]">{p}N</div>
              <div className="font-mono text-[20px] font-bold text-[#5a5a55] mt-1">—</div>
              <div className="text-[8px] font-mono text-[#3a3a38] mt-0.5">°C/W</div>
            </div>
          ))}
        </div>
      </div>

      {/* Why this matters */}
      <div className="bg-[#0A0A08] border border-white/[0.07] rounded-xl p-4">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#5a5a55] mb-2">Why the rig matters for the software</div>
        <div className="font-mono text-[11px] text-[#888780] leading-relaxed">
          The heater-block testbed generates known fault signatures under controlled conditions — wrong pressure, degraded TIM, reduced flow — at exact Rθ deviation values. These become the ground truth for calibrating the anomaly detector threshold in E006. Without the rig, the 15% threshold is an educated guess. With it, it becomes a validated, defensible number. That distinction is what makes ThermalOS's anomaly detection credible in a YC interview.
        </div>
      </div>
    </div>
  );
}
