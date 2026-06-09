import { useState } from "react";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";

interface MaterialRow {
  property: string;
  cfrp: string;
  al6061: string;
  unit: string;
  winner: "cfrp" | "al" | "tie";
}

const comparisonData: MaterialRow[] = [
  { property: "Density", cfrp: "~1.6", al6061: "~2.7", unit: "g/cm³", winner: "cfrp" },
  { property: "Tensile Strength", cfrp: "600–3000", al6061: "~310", unit: "MPa", winner: "cfrp" },
  { property: "Specific Strength (σ/ρ)", cfrp: "375–1875", al6061: "~115", unit: "kN·m/kg", winner: "cfrp" },
  { property: "Elastic Modulus", cfrp: "70–230", al6061: "~69", unit: "GPa", winner: "cfrp" },
  { property: "Fatigue Resistance", cfrp: "Excellent", al6061: "Good", unit: "—", winner: "cfrp" },
  { property: "Cost", cfrp: "High ($20–50/kg)", al6061: "Low ($3–5/kg)", unit: "$/kg", winner: "al" },
  { property: "Repairability", cfrp: "Complex, specialist", al6061: "Weldable, standard", unit: "—", winner: "al" },
  { property: "Recyclability", cfrp: "Difficult", al6061: "Highly recyclable", unit: "—", winner: "al" },
  { property: "Impact Damage Visibility", cfrp: "Often hidden (BVID)", al6061: "Visible denting", unit: "—", winner: "al" },
  { property: "Corrosion Resistance", cfrp: "Excellent", al6061: "Good (with anodize)", unit: "—", winner: "cfrp" },
];

export default function CFRPComparison() {
  const [showAll, setShowAll] = useState(false);
  const displayData = showAll ? comparisonData : comparisonData.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
          CFRP vs 6061-T6 Aluminum — Material Selection
        </span>
        <ConfidenceBadgeTag confidence="CONCEPTUAL" />
      </div>

      {/* Application Context */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-neon-cyan/20 rounded-lg p-3 bg-neon-cyan/5">
          <div className="text-[10px] font-mono font-semibold text-neon-cyan uppercase mb-1">Short-Haul BRT</div>
          <p className="text-xs text-secondary-foreground leading-relaxed">
            Frequent acceleration/braking cycles. Weight reduction directly improves energy efficiency. CFRP's high specific strength maximizes benefit.
          </p>
          <div className="mt-2 text-[10px] font-mono text-neon-cyan">→ CFRP FAVORED</div>
        </div>
        <div className="border border-neon-amber/20 rounded-lg p-3 bg-neon-amber/5">
          <div className="text-[10px] font-mono font-semibold text-neon-amber uppercase mb-1">Long-Range Rail</div>
          <p className="text-xs text-secondary-foreground leading-relaxed">
            Constant speed operation. Weight savings have diminished returns. Cost-effectiveness and repairability of aluminum dominate the decision.
          </p>
          <div className="mt-2 text-[10px] font-mono text-neon-amber">→ 6061-T6 FAVORED</div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="border border-panel-border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-panel-border bg-panel-highlight/50">
              <th className="text-left px-3 py-2 font-mono text-muted-foreground">Property</th>
              <th className="text-left px-3 py-2 font-mono text-neon-cyan">CFRP</th>
              <th className="text-left px-3 py-2 font-mono text-neon-amber">6061-T6</th>
              <th className="text-left px-3 py-2 font-mono text-muted-foreground">Unit</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, i) => (
              <tr key={i} className="border-b border-panel-border/50 last:border-0">
                <td className="px-3 py-1.5 text-foreground">{row.property}</td>
                <td className={`px-3 py-1.5 font-mono ${row.winner === "cfrp" ? "text-neon-cyan" : "text-secondary-foreground"}`}>{row.cfrp}</td>
                <td className={`px-3 py-1.5 font-mono ${row.winner === "al" ? "text-neon-amber" : "text-secondary-foreground"}`}>{row.al6061}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!showAll && comparisonData.length > 6 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-2 text-[10px] font-mono text-primary hover:bg-panel-highlight transition-colors border-t border-panel-border"
          >
            SHOW ALL {comparisonData.length} PROPERTIES →
          </button>
        )}
      </div>

      {/* Key Framework */}
      <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
        <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1 uppercase">Framework</h4>
        <p className="text-xs text-secondary-foreground leading-relaxed">
          Structure → Properties → Processing → Performance. Material selection is never absolute — it is always relative to the application requirements, lifecycle costs, and manufacturing constraints.
        </p>
      </div>

      <div className="text-[10px] font-mono text-muted-foreground">
        ⚠ CONCEPTUAL — values from white paper and standard material databases. Upload white paper for VERIFIED status.
      </div>
    </div>
  );
}
