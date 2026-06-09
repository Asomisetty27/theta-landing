import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";
import HologramModeBar, { type HologramMode } from "@/components/ui/HologramModeBar";

interface DetectStage {
  id: number;
  name: string;
  shortName: string;
  x: number;
  y: number;
  color: string;
  trigger: string;
  description: string;
  output: string;
  evidenceSource: string;
  failureMode?: string;
}

const detectStages: DetectStage[] = [
  { id: 1, name: "Solenoid Launches Steel Marble", shortName: "LAUNCH", x: 40, y: 45, color: "#00aaff",
    trigger: "Digital trigger from light detector (Stage 4)", description: "Solenoid actuator pushes steel marble down 6×2×1 in track into inductor coil",
    output: "Steel marble enters sensing region", evidenceSource: "Lab_Final_Report, p4" },
  { id: 2, name: "Inductance/Frequency Change", shortName: "FREQ\nSHIFT", x: 110, y: 45, color: "#00ff88",
    trigger: "Steel marble enters inductor coil (L₁=0.5mH)", description: "NE555 astable LC oscillator frequency drops: 8,760 Hz → 8,310 Hz (5.1% drop). Marble changes inductance of coil.",
    output: "Frequency shift detected by Arduino pulseIn()", evidenceSource: "Lab_Final_Report, p4; EE_241_Lab_6",
    failureMode: "Small frequency fluctuations falsely exceeded threshold before marble entered coil" },
  { id: 3, name: "Threshold Logic Trips", shortName: "THRESH\nLOGIC", x: 180, y: 45, color: "#ffaa00",
    trigger: "Frequency drop ≥ TRIP_DELTA (150 Hz) for STREAK_N=5 consecutive readings", description: "Arduino streak counter confirms sustained frequency drop. Prevents false triggers from noise. RELEASE_DELAY=600ms added.",
    output: "Detection confirmed → pin 11 set LOW", evidenceSource: "Lab_Final_Report, p4, p11",
    failureMode: "Electromagnet releasing prematurely without streak logic" },
  { id: 4, name: "MOSFET Switches Off Electromagnet", shortName: "MOSFET\nOFF", x: 250, y: 45, color: "#ff6644",
    trigger: "Arduino pin 11 → LOW", description: "N-Channel MOSFET (30V/40A) gate goes LOW, cutting current to electromagnet. Requires shared ground between Arduino and 9V supply.",
    output: "Electromagnet field collapses", evidenceSource: "Lab_Final_Report, p4; EE_241_Lab_7",
    failureMode: "No common ground between Arduino (USB 5V) and 9V supply — undefined gate-source voltage" },
  { id: 5, name: "Steel Ball Released", shortName: "BALL\nDROP", x: 320, y: 45, color: "#ffcc00",
    trigger: "Electromagnet field collapses", description: "2.5kg hold electromagnet releases steel ball. Ball falls under gravity onto tilt switch below.",
    output: "Ball impacts tilt switch → chain continues", evidenceSource: "Lab_Final_Report, p4-5" },
];

export default function MetalDetectorHologram() {
  const [mode, setMode] = useState<HologramMode>("idle");
  const [activeStage, setActiveStage] = useState(0);
  const [selectedStage, setSelectedStage] = useState<DetectStage | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (mode !== "idle" && mode !== "play") return;
    const interval = setInterval(() => setTick(t => t + 1), 60);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== "play") return;
    const interval = setInterval(() => {
      setActiveStage(prev => (prev + 1) % detectStages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleModeChange = useCallback((m: HologramMode) => {
    setMode(m);
    if (m === "step") setActiveStage(0);
  }, []);

  const isActive = (idx: number) => mode === "idle" ? false : idx <= activeStage;
  const isHighlighted = (idx: number) => (mode === "step" || mode === "play") && idx === activeStage;
  const hasFail = (s: DetectStage) => mode === "failure" && !!s.failureMode;

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border bg-[hsl(220,20%,3%)]">
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 bg-gradient-to-b from-background/90 to-transparent space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
              DETECT-7 — Metal Detection & Electromagnet Release
            </span>
            <ConfidenceBadgeTag confidence="VERIFIED" />
          </div>
          <HologramModeBar
            mode={mode}
            onModeChange={handleModeChange}
            currentStep={activeStage}
            totalSteps={detectStages.length}
            onNextStep={() => setActiveStage(prev => Math.min(prev + 1, detectStages.length - 1))}
            onPrevStep={() => setActiveStage(prev => Math.max(prev - 1, 0))}
          />
        </div>

        <svg viewBox="0 0 380 100" className="w-full" style={{ minHeight: 300 }}>
          <defs>
            <pattern id="detect-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(43,68%,50%)" strokeWidth="0.1" opacity="0.06" />
            </pattern>
            <filter id="detect-glow">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="380" height="100" fill="url(#detect-grid)" />

          {/* Motion path (marble trajectory) */}
          <path d="M 55 45 Q 80 35, 110 45" fill="none" stroke="#cccccc" strokeWidth="0.3" opacity="0.2" strokeDasharray="2 1" />

          {/* Steel marble animation */}
          {(mode === "step" || mode === "play") && activeStage >= 0 && (
            <circle
              cx={detectStages[Math.min(activeStage, 1)].x + (activeStage === 0 ? Math.sin(tick * 0.05) * 10 : 0)}
              cy={activeStage >= 4 ? 45 + Math.min((tick % 30) * 0.5, 12) : 45}
              r="3"
              fill="#cccccc"
              opacity="0.7"
              filter="url(#detect-glow)"
            />
          )}

          {/* Connection arrows */}
          {detectStages.slice(0, -1).map((stage, i) => {
            const next = detectStages[i + 1];
            const active = isActive(i) && isActive(i + 1);
            return (
              <line key={`arr-${i}`}
                x1={stage.x + 25} y1={stage.y}
                x2={next.x - 25} y2={next.y}
                stroke={active ? stage.color : "#1a3a3a"}
                strokeWidth={isHighlighted(i + 1) ? 1 : 0.4}
                opacity={active ? 0.7 : 0.15}
                strokeDasharray={active ? "none" : "2 1"}
              />
            );
          })}

          {/* Stage blocks */}
          {detectStages.map((stage, i) => {
            const w = 42;
            const h = 20;
            const active = isActive(i);
            const highlighted = isHighlighted(i);
            const failed = hasFail(stage);
            const selected = selectedStage?.id === stage.id;
            const idleGlow = mode === "idle" ? 0.04 + 0.02 * Math.sin((tick + i * 20) * 0.02) : 0;

            return (
              <g key={stage.id} className="cursor-pointer" onClick={() => setSelectedStage(selected ? null : stage)}>
                {(highlighted || selected) && (
                  <rect x={stage.x - w/2 - 2} y={stage.y - h/2 - 2} width={w + 4} height={h + 4} rx="3"
                    fill="none" stroke={failed ? "hsl(var(--neon-red))" : stage.color} strokeWidth="0.4" opacity="0.5" filter="url(#detect-glow)" />
                )}
                <rect x={stage.x - w/2} y={stage.y - h/2} width={w} height={h} rx="2"
                  fill={stage.color} fillOpacity={highlighted ? 0.25 : active ? 0.12 : 0.04 + idleGlow}
                  stroke={failed ? "hsl(var(--neon-red))" : stage.color}
                  strokeWidth={highlighted || selected ? 1 : 0.4} strokeOpacity={active ? 0.8 : 0.3} />
                <circle cx={stage.x - w/2 + 4} cy={stage.y - h/2 + 4} r="3" fill={stage.color} fillOpacity={active ? 0.3 : 0.1} stroke={stage.color} strokeWidth="0.3" />
                <text x={stage.x - w/2 + 4} y={stage.y - h/2 + 5.5} textAnchor="middle" fill={stage.color} fontSize="3" fontFamily="monospace" fontWeight="bold">{stage.id}</text>
                <text x={stage.x} y={stage.y + 1} textAnchor="middle" fill={stage.color} fontSize="2.8" fontFamily="monospace" fontWeight="bold" opacity={active ? 1 : 0.4}>
                  {stage.shortName.split("\n").map((line, li) => (
                    <tspan key={li} x={stage.x} dy={li === 0 ? -1.5 : 3.5}>{line}</tspan>
                  ))}
                </text>
                {failed && (
                  <text x={stage.x} y={stage.y + h/2 + 5} textAnchor="middle" fill="hsl(var(--neon-red))" fontSize="2.5" fontFamily="monospace" fontWeight="bold">⚠ FAILURE</text>
                )}
              </g>
            );
          })}

          {/* Signal path labels */}
          <text x="80" y="15" textAnchor="middle" fill="#00aaff" fontSize="2.5" fontFamily="monospace" opacity="0.3">MOTION PATH</text>
          <text x="190" y="15" textAnchor="middle" fill="#ffaa00" fontSize="2.5" fontFamily="monospace" opacity="0.3">SIGNAL PATH</text>
          <text x="290" y="15" textAnchor="middle" fill="#ff6644" fontSize="2.5" fontFamily="monospace" opacity="0.3">ACTUATION</text>
        </svg>

        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-muted-foreground bg-background/80 rounded px-2 py-0.5 border border-panel-border">
          Source: Lab_Final_Report, EE_241_Lab_6, EE_241_Lab_7
        </div>
      </div>

      {/* Inspector */}
      <div className="lg:w-72 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">Stage Inspector</span>
        </div>
        <AnimatePresence mode="wait">
          {selectedStage ? (
            <motion.div key={selectedStage.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{ backgroundColor: selectedStage.color + "20", color: selectedStage.color, border: `1px solid ${selectedStage.color}40` }}>
                    {selectedStage.id}
                  </span>
                  <h4 className="text-sm font-semibold text-foreground">{selectedStage.name}</h4>
                </div>
                <ConfidenceBadgeTag confidence="VERIFIED" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Trigger</span>
                <p className="text-xs text-secondary-foreground mt-0.5">{selectedStage.trigger}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Process</span>
                <p className="text-xs text-secondary-foreground mt-0.5">{selectedStage.description}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Output</span>
                <p className="text-xs font-mono mt-0.5" style={{ color: selectedStage.color }}>{selectedStage.output}</p>
              </div>
              {selectedStage.failureMode && (
                <div className="border border-neon-red/20 rounded p-2 bg-neon-red/5">
                  <span className="text-[10px] font-mono text-neon-red uppercase">Known Failure</span>
                  <p className="text-xs text-secondary-foreground mt-0.5">{selectedStage.failureMode}</p>
                </div>
              )}
              <div className="text-[10px] font-mono text-muted-foreground">Evidence: {selectedStage.evidenceSource}</div>
            </motion.div>
          ) : (mode === "step" || mode === "play") ? (
            <motion.div key={`auto-${activeStage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
                  style={{ backgroundColor: detectStages[activeStage].color + "20", color: detectStages[activeStage].color, border: `1px solid ${detectStages[activeStage].color}40` }}>
                  {detectStages[activeStage].id}
                </span>
                <h4 className="text-sm font-semibold text-foreground">{detectStages[activeStage].name}</h4>
              </div>
              <p className="text-xs text-secondary-foreground">{detectStages[activeStage].description}</p>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Output</span>
                <p className="text-xs font-mono mt-0.5" style={{ color: detectStages[activeStage].color }}>{detectStages[activeStage].output}</p>
              </div>
            </motion.div>
          ) : (
            <div className="p-4 flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-mono text-center">Click a stage to inspect<br />Use mode bar for playback</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
