import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";

interface PolymerData {
  id: string;
  name: string;
  abbrev: string;
  color: string;
  // Approximate conceptual values for educational illustration
  modulus: string; // GPa
  tensileStrength: string; // MPa
  elongation: string; // %
  tg: string; // °C
  structure: string;
  bondingNotes: string;
  // Stress-strain curve shape: array of [strain%, stress_MPa] points (conceptual)
  curve: [number, number][];
}

const polymers: PolymerData[] = [
  {
    id: "pe",
    name: "Polyethylene (HDPE)",
    abbrev: "PE",
    color: "hsl(var(--neon-green))",
    modulus: "0.8–1.5",
    tensileStrength: "25–45",
    elongation: "100–1000",
    tg: "−120",
    structure: "Simple –(CH₂–CH₂)– backbone. No bulky side groups. High chain mobility.",
    bondingNotes: "Weak van der Waals only. Low Tg. Semi-crystalline → moderate stiffness.",
    curve: [[0, 0], [2, 25], [5, 35], [10, 38], [50, 30], [100, 25]],
  },
  {
    id: "pvc",
    name: "Polyvinyl Chloride",
    abbrev: "PVC",
    color: "hsl(var(--neon-cyan))",
    modulus: "2.4–4.1",
    tensileStrength: "40–60",
    elongation: "20–80",
    tg: "80",
    structure: "–(CH₂–CHCl)– backbone. Cl atoms restrict chain rotation and increase intermolecular forces.",
    bondingNotes: "Dipole-dipole interactions from C–Cl. Higher Tg than PE. Moderate ductility.",
    curve: [[0, 0], [1, 30], [2, 50], [4, 58], [10, 55], [40, 45]],
  },
  {
    id: "ps",
    name: "Polystyrene",
    abbrev: "PS",
    color: "hsl(var(--neon-magenta))",
    modulus: "3.0–3.5",
    tensileStrength: "35–55",
    elongation: "1–4",
    tg: "100",
    structure: "–(CH₂–CH(C₆H₅))– backbone. Bulky phenyl ring severely restricts chain motion.",
    bondingNotes: "Van der Waals + steric hindrance from phenyl. High Tg. Brittle — fractures with minimal plastic deformation.",
    curve: [[0, 0], [0.5, 20], [1, 40], [1.5, 50], [2, 45]],
  },
  {
    id: "pc",
    name: "Polycarbonate",
    abbrev: "PC",
    color: "hsl(var(--neon-amber))",
    modulus: "2.0–2.4",
    tensileStrength: "55–75",
    elongation: "80–150",
    tg: "150",
    structure: "Carbonate linkages (–O–CO–O–) in backbone. Aromatic rings provide stiffness; carbonate allows some flexibility.",
    bondingNotes: "Balanced stiff backbone + ductile behavior. High impact resistance. High Tg. Optically clear.",
    curve: [[0, 0], [1, 30], [2, 55], [5, 65], [20, 62], [80, 55]],
  },
  {
    id: "pmma",
    name: "Poly(methyl methacrylate)",
    abbrev: "PMMA",
    color: "hsl(210, 80%, 65%)",
    modulus: "2.4–3.3",
    tensileStrength: "50–75",
    elongation: "2–10",
    tg: "105",
    structure: "–(CH₂–C(CH₃)(COOCH₃))– backbone. Methyl and ester groups restrict rotation.",
    bondingNotes: "Polar ester groups → dipole interactions. Stiff and brittle. Excellent optical clarity (acrylic glass).",
    curve: [[0, 0], [0.5, 25], [1, 50], [2, 65], [3, 60]],
  },
];

export default function PolymerStressStrain() {
  const [selected, setSelected] = useState<PolymerData[]>([polymers[0], polymers[2]]);

  const togglePolymer = (p: PolymerData) => {
    setSelected(prev => {
      if (prev.find(s => s.id === p.id)) return prev.filter(s => s.id !== p.id);
      return [...prev, p];
    });
  };

  // SVG chart dimensions
  const chartX = 60, chartY = 20, chartW = 340, chartH = 220;
  const maxStrain = 120;
  const maxStress = 80;

  const strainToX = (s: number) => chartX + (s / maxStrain) * chartW;
  const stressToY = (s: number) => chartY + chartH - (s / maxStress) * chartH;

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Chart */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border bg-[hsl(220,20%,3%)]">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-background/90 to-transparent">
          <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
            Polymer Stress–Strain Comparison
          </span>
          <ConfidenceBadgeTag confidence="CONCEPTUAL" />
        </div>

        <svg viewBox="0 0 460 300" className="w-full" style={{ minHeight: 300 }}>
          {/* Grid */}
          <defs>
            <pattern id="poly-grid" width="34" height="22" patternUnits="userSpaceOnUse" x={chartX} y={chartY}>
              <path d="M 34 0 L 0 0 0 22" fill="none" stroke="hsl(43,68%,50%)" strokeWidth="0.2" opacity="0.06" />
            </pattern>
          </defs>
          <rect x={chartX} y={chartY} width={chartW} height={chartH} fill="url(#poly-grid)" />

          {/* Axes */}
          <line x1={chartX} y1={chartY + chartH} x2={chartX + chartW} y2={chartY + chartH} stroke="hsl(43,68%,50%)" strokeWidth="0.8" opacity="0.4" />
          <line x1={chartX} y1={chartY} x2={chartX} y2={chartY + chartH} stroke="hsl(43,68%,50%)" strokeWidth="0.8" opacity="0.4" />

          {/* X-axis labels */}
          {[0, 20, 40, 60, 80, 100, 120].map(s => (
            <g key={s}>
              <line x1={strainToX(s)} y1={chartY + chartH} x2={strainToX(s)} y2={chartY + chartH + 4} stroke="hsl(43,68%,50%)" strokeWidth="0.4" opacity="0.4" />
              <text x={strainToX(s)} y={chartY + chartH + 14} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="7" fontFamily="monospace" opacity="0.5">{s}%</text>
            </g>
          ))}
          <text x={chartX + chartW / 2} y={chartY + chartH + 28} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="8" fontFamily="monospace" opacity="0.5">
            Engineering Strain (%)
          </text>

          {/* Y-axis labels */}
          {[0, 20, 40, 60, 80].map(s => (
            <g key={s}>
              <line x1={chartX - 4} y1={stressToY(s)} x2={chartX} y2={stressToY(s)} stroke="hsl(43,68%,50%)" strokeWidth="0.4" opacity="0.4" />
              <text x={chartX - 8} y={stressToY(s) + 3} textAnchor="end" fill="hsl(43,68%,50%)" fontSize="7" fontFamily="monospace" opacity="0.5">{s}</text>
            </g>
          ))}
          <text x={20} y={chartY + chartH / 2} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="8" fontFamily="monospace" opacity="0.5" transform={`rotate(-90, 20, ${chartY + chartH / 2})`}>
            Stress (MPa)
          </text>

          {/* Curves */}
          {selected.map(p => {
            const points = p.curve.map(([strain, stress]) =>
              `${strainToX(strain)},${stressToY(stress)}`
            ).join(" ");
            return (
              <g key={p.id}>
                <polyline points={points} fill="none" stroke={p.color} strokeWidth="1.5" opacity="0.8" />
                {/* End label */}
                {p.curve.length > 0 && (
                  <text
                    x={strainToX(p.curve[p.curve.length - 1][0]) + 4}
                    y={stressToY(p.curve[p.curve.length - 1][1]) + 3}
                    fill={p.color}
                    fontSize="8"
                    fontFamily="monospace"
                    opacity="0.7"
                  >
                    {p.abbrev}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-muted-foreground bg-background/80 rounded px-2 py-0.5 border border-panel-border">
          Source: Lab_6_Polymer_Mechanical_Properties_SPR_2017 — conceptual curve shapes, property ranges from lab background
        </div>
      </div>

      {/* Inspector Panel */}
      <div className="lg:w-72 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            Polymer Selector
          </span>
        </div>

        {/* Toggle buttons */}
        <div className="p-2 border-b border-panel-border space-y-1">
          {polymers.map(p => (
            <button
              key={p.id}
              onClick={() => togglePolymer(p)}
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                selected.find(s => s.id === p.id)
                  ? "bg-primary/10 border border-primary/20"
                  : "border border-transparent hover:bg-panel-highlight"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color, opacity: selected.find(s => s.id === p.id) ? 1 : 0.3 }} />
              <span className="truncate">{p.abbrev} — {p.name.split("(")[0].trim()}</span>
            </button>
          ))}
        </div>

        {/* Selected polymer details */}
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {selected.length > 0 ? selected.map(p => (
            <div key={p.id} className="border border-panel-border rounded p-2 space-y-2">
              <h4 className="text-xs font-semibold" style={{ color: p.color }}>{p.abbrev}</h4>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                <div><span className="text-muted-foreground">E:</span> <span className="text-foreground">{p.modulus} GPa</span></div>
                <div><span className="text-muted-foreground">σ:</span> <span className="text-foreground">{p.tensileStrength} MPa</span></div>
                <div><span className="text-muted-foreground">ε:</span> <span className="text-foreground">{p.elongation}%</span></div>
                <div><span className="text-muted-foreground">Tg:</span> <span className="text-foreground">{p.tg}°C</span></div>
              </div>
              <p className="text-[10px] text-secondary-foreground leading-relaxed">{p.bondingNotes}</p>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground font-mono text-center">Select polymers to compare</p>
          )}
        </div>
      </div>
    </div>
  );
}
