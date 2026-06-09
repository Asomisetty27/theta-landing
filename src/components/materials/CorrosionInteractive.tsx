import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";

interface CorrosionElement {
  id: "anode" | "cathode" | "electrolyte" | "path";
  name: string;
  description: string;
  role: string;
  color: string;
  prevention: string;
}

const elements: CorrosionElement[] = [
  {
    id: "anode",
    name: "Anode",
    description: "Metal undergoing oxidation — loses electrons and dissolves into electrolyte as metal ions",
    role: "Oxidation: M → Mⁿ⁺ + ne⁻",
    color: "hsl(var(--neon-red))",
    prevention: "Coat with protective barrier, use sacrificial anode, select more noble metal",
  },
  {
    id: "cathode",
    name: "Cathode",
    description: "Site where reduction occurs — gains electrons transferred from anode through electrical path",
    role: "Reduction: O₂ + 2H₂O + 4e⁻ → 4OH⁻",
    color: "hsl(var(--neon-cyan))",
    prevention: "Apply insulating coating to cathode surface, cathodic protection",
  },
  {
    id: "electrolyte",
    name: "Electrolyte",
    description: "Ionic conduction medium (water, soil, humidity) that transports ions between anode and cathode",
    role: "Ionic transport: carries Mⁿ⁺ ions from anode, OH⁻ from cathode",
    color: "hsl(var(--neon-green))",
    prevention: "Eliminate moisture (dehumidification, sealants, drainage design)",
  },
  {
    id: "path",
    name: "Electrical Path",
    description: "Metallic connection between anode and cathode that allows electron flow",
    role: "Electron transport: e⁻ flow from anode → cathode through metal",
    color: "hsl(var(--neon-amber))",
    prevention: "Insulating gaskets between dissimilar metals, break electrical continuity",
  },
];

export default function CorrosionInteractive() {
  const [selected, setSelected] = useState<CorrosionElement | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState(true);
  const [tick, setTick] = useState(0);

  const corrosionActive = removed.size === 0;

  useEffect(() => {
    if (!corrosionActive || !animating) return;
    const interval = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(interval);
  }, [corrosionActive, animating]);

  const toggleRemove = (id: string) => {
    setRemoved(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Animated particles position
  const electronX = corrosionActive ? 200 + Math.sin(tick * 0.05) * 60 : 140;
  const ionY = corrosionActive ? 200 + Math.cos(tick * 0.04) * 30 : 200;

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Electrochemical Cell SVG */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border bg-[hsl(220,20%,3%)]">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-background/90 to-transparent">
          <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
            Electrochemical Corrosion Cell
          </span>
          <ConfidenceBadgeTag confidence="CONCEPTUAL" />
          <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded border ${corrosionActive ? "text-neon-red border-neon-red/30 bg-neon-red/10" : "text-neon-green border-neon-green/30 bg-neon-green/10"}`}>
            {corrosionActive ? "⚠ CORROSION ACTIVE" : "✓ CORROSION INTERRUPTED"}
          </span>
        </div>

        <svg viewBox="0 0 400 320" className="w-full" style={{ minHeight: 320 }}>
          {/* Grid */}
          <defs>
            <pattern id="corr-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(43,68%,50%)" strokeWidth="0.2" opacity="0.05" />
            </pattern>
          </defs>
          <rect width="400" height="320" fill="url(#corr-grid)" />

          {/* Electrolyte region */}
          {!removed.has("electrolyte") && (
            <rect
              x="60" y="140" width="280" height="120" rx="4"
              fill="hsl(142,70%,50%)" fillOpacity="0.05"
              stroke="hsl(142,70%,50%)" strokeWidth="0.5" strokeOpacity="0.3"
              className="cursor-pointer"
              onClick={() => { setSelected(elements.find(e => e.id === "electrolyte")!); }}
            />
          )}
          {!removed.has("electrolyte") && (
            <text x="200" y="290" textAnchor="middle" fill="hsl(142,70%,50%)" fontSize="9" fontFamily="monospace" opacity="0.5">
              ELECTROLYTE (ionic medium)
            </text>
          )}

          {/* Anode (left) */}
          {!removed.has("anode") && (
            <g className="cursor-pointer" onClick={() => setSelected(elements.find(e => e.id === "anode")!)}>
              <rect x="80" y="100" width="40" height="140" rx="2"
                fill="hsl(0,72%,55%)" fillOpacity={selected?.id === "anode" ? 0.3 : 0.15}
                stroke="hsl(0,72%,55%)" strokeWidth={selected?.id === "anode" ? 1.5 : 0.8}
              />
              <text x="100" y="90" textAnchor="middle" fill="hsl(0,72%,55%)" fontSize="10" fontFamily="monospace" fontWeight="bold">ANODE</text>
              <text x="100" y="175" textAnchor="middle" fill="hsl(0,72%,55%)" fontSize="7" fontFamily="monospace" opacity="0.7">M → Mⁿ⁺</text>

              {/* Dissolving particles */}
              {corrosionActive && Array.from({ length: 3 }, (_, i) => (
                <circle
                  key={i}
                  cx={120 + Math.sin((tick + i * 30) * 0.03) * 20}
                  cy={160 + i * 20 + Math.cos((tick + i * 20) * 0.04) * 10}
                  r="2"
                  fill="hsl(0,72%,55%)"
                  opacity={0.3 + Math.sin((tick + i * 40) * 0.05) * 0.2}
                />
              ))}
            </g>
          )}

          {/* Cathode (right) */}
          {!removed.has("cathode") && (
            <g className="cursor-pointer" onClick={() => setSelected(elements.find(e => e.id === "cathode")!)}>
              <rect x="280" y="100" width="40" height="140" rx="2"
                fill="hsl(43,68%,50%)" fillOpacity={selected?.id === "cathode" ? 0.3 : 0.15}
                stroke="hsl(43,68%,50%)" strokeWidth={selected?.id === "cathode" ? 1.5 : 0.8}
              />
              <text x="300" y="90" textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="10" fontFamily="monospace" fontWeight="bold">CATHODE</text>
              <text x="300" y="175" textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="6" fontFamily="monospace" opacity="0.7">O₂+H₂O+e⁻→OH⁻</text>
            </g>
          )}

          {/* Electrical path (top wire) */}
          {!removed.has("path") && !removed.has("anode") && !removed.has("cathode") && (
            <g className="cursor-pointer" onClick={() => setSelected(elements.find(e => e.id === "path")!)}>
              <path d="M 100 100 L 100 60 L 300 60 L 300 100"
                fill="none"
                stroke="hsl(38,90%,55%)"
                strokeWidth={selected?.id === "path" ? 2 : 1}
                opacity="0.7"
              />
              <text x="200" y="52" textAnchor="middle" fill="hsl(38,90%,55%)" fontSize="8" fontFamily="monospace" opacity="0.6">
                e⁻ FLOW →
              </text>

              {/* Electron flow animation */}
              {corrosionActive && (
                <circle
                  cx={electronX}
                  cy="60"
                  r="3"
                  fill="hsl(38,90%,55%)"
                  opacity="0.8"
                />
              )}
            </g>
          )}

          {/* Ion flow in electrolyte */}
          {corrosionActive && !removed.has("electrolyte") && (
            <>
              <circle cx={150 + Math.sin(tick * 0.03) * 30} cy={ionY} r="2" fill="hsl(0,72%,55%)" opacity="0.4" />
              <circle cx={250 - Math.sin(tick * 0.035) * 25} cy={ionY + 15} r="2" fill="hsl(43,68%,50%)" opacity="0.4" />
              <text x="200" y={ionY + 40} textAnchor="middle" fill="hsl(142,70%,50%)" fontSize="6" fontFamily="monospace" opacity="0.4">
                ← ion transport →
              </text>
            </>
          )}

          {/* Removed element indicators */}
          {removed.has("anode") && (
            <text x="100" y="170" textAnchor="middle" fill="hsl(142,70%,50%)" fontSize="8" fontFamily="monospace" opacity="0.5">
              [ANODE REMOVED]
            </text>
          )}
          {removed.has("cathode") && (
            <text x="300" y="170" textAnchor="middle" fill="hsl(142,70%,50%)" fontSize="8" fontFamily="monospace" opacity="0.5">
              [CATHODE REMOVED]
            </text>
          )}
          {removed.has("electrolyte") && (
            <text x="200" y="200" textAnchor="middle" fill="hsl(142,70%,50%)" fontSize="8" fontFamily="monospace" opacity="0.5">
              [ELECTROLYTE REMOVED]
            </text>
          )}
          {removed.has("path") && (
            <text x="200" y="55" textAnchor="middle" fill="hsl(142,70%,50%)" fontSize="8" fontFamily="monospace" opacity="0.5">
              [PATH BROKEN]
            </text>
          )}
        </svg>

        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-muted-foreground bg-background/80 rounded px-2 py-0.5 border border-panel-border">
          Source: Lab_5_Corrosion_SPR_2017 — 4-component model, galvanic series, Eqs.1–5
        </div>
      </div>

      {/* Inspector Panel */}
      <div className="lg:w-72 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            Corrosion Cell Inspector
          </span>
        </div>

        {/* Element toggles */}
        <div className="p-3 border-b border-panel-border space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">Remove Element to Stop Corrosion</span>
          <div className="grid grid-cols-2 gap-1.5">
            {elements.map(el => (
              <button
                key={el.id}
                onClick={() => toggleRemove(el.id)}
                className={`text-[10px] font-mono px-2 py-1.5 rounded border transition-colors ${
                  removed.has(el.id)
                    ? "border-neon-green/40 bg-neon-green/10 text-neon-green line-through"
                    : "border-panel-border text-foreground hover:bg-panel-highlight"
                }`}
              >
                {removed.has(el.id) ? "✓ " : ""}{el.name}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-3 overflow-y-auto flex-1"
            >
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1" style={{ color: selected.color }}>
                  {selected.name}
                </h4>
                <ConfidenceBadgeTag confidence="CONCEPTUAL" />
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed">{selected.description}</p>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Reaction</span>
                <div className="text-xs font-mono text-primary mt-0.5">{selected.role}</div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Prevention</span>
                <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selected.prevention}</p>
              </div>
            </motion.div>
          ) : (
            <div className="p-4 flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-mono text-center">
                Click a cell element to inspect<br />Toggle elements above to see prevention
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
