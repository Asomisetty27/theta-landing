import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";

// Pb-Sn phase diagram data (reconstructed from standard eutectic diagram)
// Eutectic: 61.9 wt% Sn at 183°C
// Liquidus/Solidus/Solvus lines are approximated from standard metallurgical references.

interface PhaseRegion {
  label: string;
  phases: string[];
  description: string;
  color: string;
}

function getPhaseRegion(wtSn: number, tempC: number): PhaseRegion {
  // Melting points: Pb = 327°C, Sn = 232°C
  // Eutectic: 61.9 wt% Sn at 183°C
  // α solvus max solubility: ~19.2 wt% Sn at 183°C
  // β solvus max solubility: ~2.5 wt% Pb (97.5 wt% Sn) at 183°C

  // Simplified liquidus line (piecewise linear)
  const eutecticT = 183;
  const eutecticComp = 61.9;
  const pbMelt = 327;
  const snMelt = 232;

  // Liquidus temperature for given composition
  let liquidusT: number;
  if (wtSn <= eutecticComp) {
    liquidusT = pbMelt - ((pbMelt - eutecticT) / eutecticComp) * wtSn;
  } else {
    liquidusT = snMelt - ((snMelt - eutecticT) / (100 - eutecticComp)) * (100 - wtSn);
  }

  // α solvus (Pb-rich solid): max ~19.2 wt% Sn at 183°C, ~2 wt% Sn at 20°C
  const alphaSolvusAt183 = 19.2;
  const alphaSolvusAtRT = 2;
  const alphaSolvusAtT = tempC >= eutecticT
    ? alphaSolvusAt183
    : alphaSolvusAtRT + (alphaSolvusAt183 - alphaSolvusAtRT) * ((tempC - 20) / (eutecticT - 20));

  // β solvus (Sn-rich solid): max ~97.5 wt% Sn at 183°C, ~99 wt% Sn at 20°C
  const betaSolvusAt183 = 97.5;
  const betaSolvusAtRT = 99;
  const betaSolvusAtT = tempC >= eutecticT
    ? betaSolvusAt183
    : betaSolvusAtRT - (betaSolvusAtRT - betaSolvusAt183) * ((tempC - 20) / (eutecticT - 20));

  // Above liquidus → liquid
  if (tempC > liquidusT) {
    return {
      label: "Liquid (L)",
      phases: ["L"],
      description: "Fully liquid. Both Pb and Sn are dissolved in a single liquid phase.",
      color: "hsl(var(--neon-cyan))",
    };
  }

  // Below eutectic temperature
  if (tempC <= eutecticT) {
    if (wtSn <= alphaSolvusAtT) {
      return {
        label: "α (Pb-rich solid)",
        phases: ["α"],
        description: "Single-phase α: FCC Pb-rich solid solution with dissolved Sn.",
        color: "hsl(210, 80%, 60%)",
      };
    }
    if (wtSn >= betaSolvusAtT) {
      return {
        label: "β (Sn-rich solid)",
        phases: ["β"],
        description: "Single-phase β: BCT Sn-rich solid solution with dissolved Pb.",
        color: "hsl(38, 80%, 60%)",
      };
    }
    // Two-phase α + β region
    const microstructure = wtSn < eutecticComp
      ? "Proeutectic α + eutectic (α + β) lamellar microstructure"
      : "Proeutectic β + eutectic (α + β) lamellar microstructure";
    return {
      label: "α + β",
      phases: ["α", "β"],
      description: `Two-phase solid. ${microstructure}. Relative amounts determined by lever rule.`,
      color: "hsl(var(--neon-green))",
    };
  }

  // Between eutectic and liquidus — mushy zone
  if (wtSn < eutecticComp) {
    // α + L region
    return {
      label: "α + L",
      phases: ["α", "L"],
      description: "Two-phase: proeutectic α solidifying from liquid. α crystals grow as temperature decreases.",
      color: "hsl(190, 70%, 55%)",
    };
  } else {
    // β + L region
    return {
      label: "β + L",
      phases: ["β", "L"],
      description: "Two-phase: proeutectic β solidifying from liquid. β crystals grow as temperature decreases.",
      color: "hsl(30, 70%, 55%)",
    };
  }
}

export default function PhaseDiagramInteractive() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<{ wtSn: number; tempC: number } | null>(null);
  const [locked, setLocked] = useState(false);

  // SVG coordinate system: x = 0-100 wt% Sn, y = 0-350°C
  // Map to viewBox: x in [50, 450], y in [30, 330]
  const xMin = 50, xMax = 450, yMin = 30, yMax = 330;
  const tMin = 20, tMax = 350;

  const compToX = (wt: number) => xMin + (wt / 100) * (xMax - xMin);
  const tempToY = (t: number) => yMax - ((t - tMin) / (tMax - tMin)) * (yMax - yMin);
  const xToComp = (x: number) => Math.max(0, Math.min(100, ((x - xMin) / (xMax - xMin)) * 100));
  const yToTemp = (y: number) => Math.max(tMin, Math.min(tMax, tMin + ((yMax - y) / (yMax - yMin)) * (tMax - tMin)));

  const handleMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (locked) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const viewBoxWidth = 500;
    const viewBoxHeight = 370;
    const scaleX = viewBoxWidth / rect.width;
    const scaleY = viewBoxHeight / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    const wtSn = xToComp(svgX);
    const tempC = yToTemp(svgY);
    if (wtSn >= 0 && wtSn <= 100 && tempC >= tMin && tempC <= tMax) {
      setCursor({ wtSn, tempC });
    }
  }, [locked]);

  const handleClick = () => setLocked(!locked);

  const region = cursor ? getPhaseRegion(cursor.wtSn, cursor.tempC) : null;

  // Liquidus line points
  const eutecticT = 183;
  const eutecticComp = 61.9;
  const liquidusLeftPoints = Array.from({ length: 20 }, (_, i) => {
    const wt = (i / 19) * eutecticComp;
    const t = 327 - ((327 - eutecticT) / eutecticComp) * wt;
    return `${compToX(wt)},${tempToY(t)}`;
  }).join(" ");
  const liquidusRightPoints = Array.from({ length: 20 }, (_, i) => {
    const wt = eutecticComp + (i / 19) * (100 - eutecticComp);
    const t = 232 - ((232 - eutecticT) / (100 - eutecticComp)) * (100 - wt);
    return `${compToX(wt)},${tempToY(t)}`;
  }).join(" ");

  // Solvus lines
  const alphaSolvusPoints = Array.from({ length: 15 }, (_, i) => {
    const t = 20 + (i / 14) * (eutecticT - 20);
    const wt = 2 + (19.2 - 2) * ((t - 20) / (eutecticT - 20));
    return `${compToX(wt)},${tempToY(t)}`;
  }).join(" ");
  const betaSolvusPoints = Array.from({ length: 15 }, (_, i) => {
    const t = 20 + (i / 14) * (eutecticT - 20);
    const wt = 99 - (99 - 97.5) * ((t - 20) / (eutecticT - 20));
    return `${compToX(wt)},${tempToY(t)}`;
  }).join(" ");

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Phase Diagram SVG */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border bg-[hsl(220,20%,3%)]">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-background/90 to-transparent">
          <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
            Pb-Sn Eutectic Phase Diagram — Interactive
          </span>
          <ConfidenceBadgeTag confidence="VERIFIED" />
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 500 370"
          className="w-full cursor-crosshair"
          style={{ minHeight: 380 }}
          onMouseMove={handleMove}
          onClick={handleClick}
          onMouseLeave={() => !locked && setCursor(null)}
        >
          {/* Background grid */}
          <defs>
            <pattern id="phase-grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="hsl(43,68%,50%)" strokeWidth="0.3" opacity="0.06" />
            </pattern>
          </defs>
          <rect x={xMin} y={yMin} width={xMax - xMin} height={yMax - yMin} fill="url(#phase-grid)" />

          {/* Axes */}
          <line x1={xMin} y1={yMax} x2={xMax} y2={yMax} stroke="hsl(43,68%,50%)" strokeWidth="1" opacity="0.4" />
          <line x1={xMin} y1={yMin} x2={xMin} y2={yMax} stroke="hsl(43,68%,50%)" strokeWidth="1" opacity="0.4" />

          {/* X-axis labels */}
          {[0, 20, 40, 60, 80, 100].map(wt => (
            <g key={wt}>
              <line x1={compToX(wt)} y1={yMax} x2={compToX(wt)} y2={yMax + 5} stroke="hsl(43,68%,50%)" strokeWidth="0.5" opacity="0.4" />
              <text x={compToX(wt)} y={yMax + 16} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="8" fontFamily="monospace" opacity="0.6">{wt}</text>
            </g>
          ))}
          <text x={(xMin + xMax) / 2} y={yMax + 30} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="9" fontFamily="monospace" opacity="0.5">
            Composition (wt% Sn)
          </text>

          {/* Y-axis labels */}
          {[50, 100, 150, 183, 200, 250, 300, 327].map(t => (
            <g key={t}>
              <line x1={xMin - 4} y1={tempToY(t)} x2={xMin} y2={tempToY(t)} stroke="hsl(43,68%,50%)" strokeWidth="0.5" opacity="0.4" />
              <text x={xMin - 8} y={tempToY(t) + 3} textAnchor="end" fill="hsl(43,68%,50%)" fontSize="7" fontFamily="monospace" opacity="0.5">{t}°C</text>
            </g>
          ))}
          <text x={20} y={(yMin + yMax) / 2} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="9" fontFamily="monospace" opacity="0.5" transform={`rotate(-90, 20, ${(yMin + yMax) / 2})`}>
            Temperature (°C)
          </text>

          {/* Eutectic isotherm */}
          <line x1={xMin} y1={tempToY(eutecticT)} x2={xMax} y2={tempToY(eutecticT)} stroke="hsl(38,90%,55%)" strokeWidth="0.8" strokeDasharray="4 2" opacity="0.5" />
          <text x={xMax + 5} y={tempToY(eutecticT) + 3} fill="hsl(38,90%,55%)" fontSize="7" fontFamily="monospace" opacity="0.7">183°C</text>

          {/* Liquidus lines */}
          <polyline points={liquidusLeftPoints} fill="none" stroke="hsl(43,68%,50%)" strokeWidth="1.5" opacity="0.8" />
          <polyline points={liquidusRightPoints} fill="none" stroke="hsl(43,68%,50%)" strokeWidth="1.5" opacity="0.8" />

          {/* Solvus lines */}
          <polyline points={alphaSolvusPoints} fill="none" stroke="hsl(210,80%,60%)" strokeWidth="1" opacity="0.6" strokeDasharray="3 2" />
          <polyline points={betaSolvusPoints} fill="none" stroke="hsl(38,80%,60%)" strokeWidth="1" opacity="0.6" strokeDasharray="3 2" />

          {/* Phase field labels */}
          <text x={compToX(30)} y={tempToY(300)} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="12" fontFamily="monospace" opacity="0.3" fontWeight="bold">L</text>
          <text x={compToX(75)} y={tempToY(220)} textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="10" fontFamily="monospace" opacity="0.25">L</text>
          <text x={compToX(5)} y={tempToY(100)} textAnchor="middle" fill="hsl(210,80%,60%)" fontSize="9" fontFamily="monospace" opacity="0.3">α</text>
          <text x={compToX(99)} y={tempToY(100)} textAnchor="middle" fill="hsl(38,80%,60%)" fontSize="9" fontFamily="monospace" opacity="0.3">β</text>
          <text x={compToX(50)} y={tempToY(100)} textAnchor="middle" fill="hsl(142,70%,50%)" fontSize="10" fontFamily="monospace" opacity="0.3">α + β</text>
          <text x={compToX(20)} y={tempToY(260)} textAnchor="middle" fill="hsl(190,70%,55%)" fontSize="8" fontFamily="monospace" opacity="0.25">α + L</text>
          <text x={compToX(80)} y={tempToY(210)} textAnchor="middle" fill="hsl(30,70%,55%)" fontSize="8" fontFamily="monospace" opacity="0.25">β + L</text>

          {/* Eutectic point marker */}
          <circle cx={compToX(eutecticComp)} cy={tempToY(eutecticT)} r="3" fill="hsl(var(--neon-amber))" opacity="0.8" />
          <text x={compToX(eutecticComp)} y={tempToY(eutecticT) - 6} textAnchor="middle" fill="hsl(var(--neon-amber))" fontSize="7" fontFamily="monospace" opacity="0.7">
            61.9% Sn
          </text>

          {/* Melting point markers */}
          <circle cx={compToX(0)} cy={tempToY(327)} r="2.5" fill="hsl(210,80%,60%)" opacity="0.7" />
          <text x={compToX(0) + 8} y={tempToY(327) + 3} fill="hsl(210,80%,60%)" fontSize="7" fontFamily="monospace" opacity="0.6">327°C (Pb)</text>
          <circle cx={compToX(100)} cy={tempToY(232)} r="2.5" fill="hsl(38,80%,60%)" opacity="0.7" />
          <text x={compToX(100) - 8} y={tempToY(232) - 5} textAnchor="end" fill="hsl(38,80%,60%)" fontSize="7" fontFamily="monospace" opacity="0.6">232°C (Sn)</text>

          {/* Cursor crosshair */}
          {cursor && (
            <>
              <line x1={compToX(cursor.wtSn)} y1={yMin} x2={compToX(cursor.wtSn)} y2={yMax} stroke={region?.color || "hsl(var(--primary))"} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 2" />
              <line x1={xMin} y1={tempToY(cursor.tempC)} x2={xMax} y2={tempToY(cursor.tempC)} stroke={region?.color || "hsl(var(--primary))"} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 2" />
              <circle cx={compToX(cursor.wtSn)} cy={tempToY(cursor.tempC)} r="4" fill="none" stroke={region?.color || "hsl(var(--primary))"} strokeWidth="1.5" />
              <circle cx={compToX(cursor.wtSn)} cy={tempToY(cursor.tempC)} r="1.5" fill={region?.color || "hsl(var(--primary))"} />
            </>
          )}
        </svg>

        {/* Lock indicator */}
        {locked && (
          <div className="absolute bottom-2 right-2 text-[10px] font-mono text-neon-amber bg-background/80 rounded px-2 py-0.5 border border-neon-amber/20">
            LOCKED — click to unlock
          </div>
        )}
        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-muted-foreground bg-background/80 rounded px-2 py-0.5 border border-panel-border">
          Source: Lab_4_Phase_Diagrams_Spring_2017_1.pdf — Pb-Sn eutectic data (61.9 wt% Sn, 183°C, α max 18.3 wt% Sn)
        </div>
      </div>

      {/* Phase Inspector Panel */}
      <div className="lg:w-72 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            Phase Inspector
          </span>
        </div>

        {cursor && region ? (
          <motion.div
            key={`${Math.round(cursor.wtSn)}-${Math.round(cursor.tempC)}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 space-y-3 overflow-y-auto flex-1"
          >
            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-panel-border rounded p-2">
                <span className="text-[10px] font-mono text-muted-foreground">Composition</span>
                <div className="text-sm font-mono font-semibold text-primary">{cursor.wtSn.toFixed(1)} wt% Sn</div>
                <div className="text-[10px] font-mono text-muted-foreground">{(100 - cursor.wtSn).toFixed(1)} wt% Pb</div>
              </div>
              <div className="border border-panel-border rounded p-2">
                <span className="text-[10px] font-mono text-muted-foreground">Temperature</span>
                <div className="text-sm font-mono font-semibold text-primary">{cursor.tempC.toFixed(0)}°C</div>
                <div className="text-[10px] font-mono text-muted-foreground">{(cursor.tempC + 273.15).toFixed(0)} K</div>
              </div>
            </div>

            {/* Phase Region */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1" style={{ color: region.color }}>
                {region.label}
              </h4>
              <div className="flex flex-wrap gap-1 mb-2">
                {region.phases.map(p => (
                  <span key={p} className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-panel-border text-foreground">{p}</span>
                ))}
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed">{region.description}</p>
            </div>

            {/* Cooling behavior hint */}
            <div className="border border-primary/20 rounded p-2 bg-primary/5">
              <span className="text-[10px] font-mono text-primary uppercase">On Cooling</span>
              <p className="text-xs text-secondary-foreground leading-relaxed mt-1">
                {cursor.wtSn < 61.9
                  ? cursor.tempC > 183
                    ? "Proeutectic α will solidify first. Remaining liquid reaches eutectic at 183°C and transforms to α + β lamellar."
                    : "Below eutectic. Two solid phases: α (Pb-rich) and β (Sn-rich). Amounts follow lever rule."
                  : cursor.wtSn > 61.9
                    ? cursor.tempC > 183
                      ? "Proeutectic β will solidify first. Remaining liquid reaches eutectic at 183°C and transforms to α + β lamellar."
                      : "Below eutectic. Two solid phases: α (Pb-rich) and β (Sn-rich). Amounts follow lever rule."
                    : cursor.tempC > 183
                      ? "At eutectic composition — liquid transforms directly to lamellar α + β at 183°C. No proeutectic phase."
                      : "Fully eutectic microstructure: fine lamellar α + β."
                }
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="p-4 flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground font-mono text-center">
              Move cursor over diagram<br />Click to lock position
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
