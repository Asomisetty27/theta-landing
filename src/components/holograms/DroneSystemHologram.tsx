import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";
import HologramModeBar, { type HologramMode } from "@/components/ui/HologramModeBar";

// ========== SUBSYSTEM DATA ==========
type ViewMode = "structure" | "function" | "validation" | "failure";

interface DroneSubsystem {
  id: string;
  name: string;
  shortName: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  description: string;
  role: string;
  constraints: string;
  failureIfRemoved: string;
  confidence: "VERIFIED" | "CONCEPTUAL";
  specs?: string[];
}

const subsystems: DroneSubsystem[] = [
  { id: "frame", name: "Cockroach75 Frame", shortName: "FRAME", cx: 200, cy: 140, rx: 70, ry: 30, color: "#667788",
    description: "75 mm ducted whoop frame providing structural skeleton, motor mounting, and crash protection",
    role: "Structural foundation — all subsystems mount to or within the frame",
    constraints: "75 mm M2M limits component size; ducts add drag but enable indoor safety",
    failureIfRemoved: "No structural support — entire system non-functional",
    confidence: "VERIFIED",
    specs: ["75 mm motor-to-motor", "Ducted prop guards", "Carbon fiber composite"] },
  { id: "motors", name: "0804 12000KV Motors (×4)", shortName: "MOTORS", cx: 200, cy: 50, rx: 55, ry: 18, color: "#00d4aa",
    description: "Four micro brushless motors: 8 mm stator diameter, 4 mm stator height, 12000 RPM/V",
    role: "Convert electrical energy to thrust via high-RPM propeller rotation",
    constraints: "High KV requires quality bearings; vibration couples directly to camera/gyro",
    failureIfRemoved: "No thrust generation — craft cannot fly",
    confidence: "VERIFIED",
    specs: ["0804 (8×4 mm stator)", "12000 KV", "Bluejay 48 kHz ESC firmware", "Bidirectional DShot600"] },
  { id: "aio", name: "BeeBrain HD G4 AIO", shortName: "AIO / FC", cx: 200, cy: 140, rx: 40, ry: 16, color: "#4488ff",
    description: "All-in-one board: STM32G474 flight controller + 4×20A ESC + integrated ELRS 3.0 receiver",
    role: "Central coordination core — PID control, ESC command, receiver input, OSD data",
    constraints: "Single PCB failure disables entire craft; thermal density from ESC FETs",
    failureIfRemoved: "No flight control, no motor drive, no receiver — total system failure",
    confidence: "VERIFIED",
    specs: ["STM32G474 (Cortex-M4F, 170 MHz)", "4×20A ESC", "ELRS 3.0 diversity Rx", "DShot600 + bidir"] },
  { id: "o3", name: "DJI O3 Air Unit", shortName: "DJI O3", cx: 200, cy: 220, rx: 38, ry: 16, color: "#ff6644",
    description: "HD digital video transmitter with camera — heaviest single component, premium payload",
    role: "Low-latency HD video transmission for FPV piloting; OSD overlay via FC serial",
    constraints: "Dominant mass + power consumer; requires 10V dedicated rail; generates heat",
    failureIfRemoved: "No video feed — pilot blind; craft still flyable in LOS but impractical for FPV",
    confidence: "VERIFIED",
    specs: ["10V 2A power requirement", "HD digital video link", "OSD serial to FC", "Camera + VTX integrated"] },
  { id: "battery", name: "2S LiPo Battery", shortName: "BATTERY", cx: 200, cy: 280, rx: 35, ry: 14, color: "#ffcc00",
    description: "1–2S lithium polymer battery (typically 450–550 mAh) providing all system power",
    role: "Sole energy source — powers motors, regulators, FC, receiver, and O3",
    constraints: "Weight vs capacity tradeoff; internal resistance causes sag under load",
    failureIfRemoved: "No power — entire system dead",
    confidence: "VERIFIED",
    specs: ["2S (7.4–8.4V)", "450–550 mAh typical", "XT30 connector", "~15–25C discharge"] },
  { id: "receiver", name: "ELRS 3.0 Diversity Rx", shortName: "ELRS Rx", cx: 65, cy: 140, rx: 32, ry: 14, color: "#00ffaa",
    description: "Integrated ExpressLRS 3.0 diversity receiver with dual antenna paths on UART2",
    role: "Receives pilot commands from transmitter and delivers to FC via serial protocol",
    constraints: "Antenna routing must clear carbon fiber; diversity logic needs both paths unobstructed",
    failureIfRemoved: "No pilot input — craft enters failsafe (disarm or return-to-home)",
    confidence: "VERIFIED",
    specs: ["ELRS 3.0 protocol", "UART2 to FC", "Diversity antenna (2 paths)", "Integrated on AIO"] },
  { id: "props", name: "40 mm Tri-blade Props", shortName: "PROPS", cx: 335, cy: 50, rx: 30, ry: 12, color: "#88ddaa",
    description: "40 mm diameter tri-blade propellers — interface between motor output and aerodynamic thrust",
    role: "Convert motor RPM to thrust; tri-blade increases control authority at efficiency cost",
    constraints: "Balance affects vibration; tri-blade less efficient than bi-blade but more responsive",
    failureIfRemoved: "No thrust generation — motors spin but produce no useful force",
    confidence: "VERIFIED",
    specs: ["40 mm diameter", "Tri-blade", "Clockwise + counter-clockwise pairs"] },
  { id: "canopy", name: "AcroBee75 HD O3 Canopy", shortName: "CANOPY", cx: 335, cy: 220, rx: 32, ry: 14, color: "#9977cc",
    description: "Protective canopy enclosing camera/VTX, routing antennas, managing airflow",
    role: "Crash protection for O3; camera tilt geometry; antenna exit path; airflow management",
    constraints: "Must allow antenna exposure; thermal ventilation needed; adds frontal drag",
    failureIfRemoved: "O3 exposed to crashes; antenna routing compromised; no camera tilt structure",
    confidence: "VERIFIED",
    specs: ["O3-specific geometry", "Camera tilt mount", "Antenna routing channels"] },
];

// ========== POWER/SIGNAL FLOW PATHS ==========
const flowPaths = [
  { from: "battery", to: "aio", label: "Battery → AIO (raw 2S)", color: "#ffcc00", type: "power" as const },
  { from: "aio", to: "motors", label: "ESC → Motors (DShot600)", color: "#00d4aa", type: "signal" as const },
  { from: "aio", to: "o3", label: "10V BEC → O3", color: "#ff6644", type: "power" as const },
  { from: "receiver", to: "aio", label: "ELRS → FC (UART2)", color: "#00ffaa", type: "signal" as const },
  { from: "motors", to: "props", label: "Motor → Prop (mechanical)", color: "#88ddaa", type: "mechanical" as const },
  { from: "aio", to: "o3", label: "OSD Serial → O3", color: "#4488ff", type: "signal" as const },
];

// ========== FAILURE HOTSPOTS ==========
interface FailureHotspot {
  id: string;
  name: string;
  subsystemId: string;
  propagatesTo: string[];
  description: string;
  severity: "high" | "medium" | "low";
}

const failureHotspots: FailureHotspot[] = [
  { id: "f-sag", name: "Battery Sag", subsystemId: "battery", propagatesTo: ["aio", "motors", "o3"],
    description: "Internal resistance causes voltage drop under high current → reduced motor authority → potential O3 brownout", severity: "high" },
  { id: "f-vibration", name: "Motor/Prop Vibration", subsystemId: "motors", propagatesTo: ["aio", "o3", "frame"],
    description: "Unbalanced props or worn bearings → frame vibration → gyro noise → degraded flight control + jello in video", severity: "high" },
  { id: "f-antenna", name: "Antenna Obstruction", subsystemId: "receiver", propagatesTo: ["aio"],
    description: "Carbon fiber blocks RF → control-link dead zones → failsafe during certain orientations", severity: "medium" },
  { id: "f-thermal", name: "BEC Thermal Stress", subsystemId: "aio", propagatesTo: ["o3"],
    description: "10V BEC heat in enclosed canopy → regulator instability → video artifacts or brownout", severity: "medium" },
  { id: "f-protocol", name: "Control-Link Mismatch", subsystemId: "receiver", propagatesTo: ["aio"],
    description: "TBS Mambo (Tracer) ≠ onboard ELRS — incompatible RF protocols prevent flight without resolution", severity: "high" },
];

// ========== FUNCTION-MODE STAGES ==========
const functionStages = [
  { id: 1, name: "Power Distribution", active: ["battery", "aio"], description: "Battery feeds raw 2S voltage through XT30 to AIO. AIO distributes to ESC power stage (unregulated), 10V BEC (O3), and 5V BEC (logic).", trigger: "Battery connected", output: "All rails energized" },
  { id: 2, name: "Control-Link Acquisition", active: ["receiver", "aio"], description: "ELRS receiver acquires link with transmitter. Diversity antenna selects strongest path. Serial commands flow to FC on UART2.", trigger: "Transmitter powered on", output: "Pilot commands available to FC" },
  { id: 3, name: "Flight Control Loop", active: ["aio", "motors"], description: "FC reads gyroscope, computes PID error, generates DShot600 commands to each ESC channel. Bidirectional DShot returns RPM telemetry for filtering.", trigger: "Arm command from pilot", output: "Motor speed adjustments at kHz rate" },
  { id: 4, name: "Thrust Generation", active: ["motors", "props"], description: "ESC commutates motor phases at 48 kHz. Motors spin props at 10,000+ RPM. Tri-blade geometry converts rotation to thrust and torque.", trigger: "ESC PWM output", output: "Aerodynamic thrust + craft motion" },
  { id: 5, name: "HD Video Transmission", active: ["o3", "aio", "canopy"], description: "O3 camera captures HD feed. FC sends OSD data via serial. O3 encodes and transmits to goggles. Canopy routes antenna for RF clearance.", trigger: "O3 powered and linked to goggles", output: "Low-latency HD FPV feed to pilot" },
];

// ========== MAIN COMPONENT ==========
export default function DroneSystemHologram() {
  const [playbackMode, setPlaybackMode] = useState<HologramMode>("idle");
  const [viewMode, setViewMode] = useState<ViewMode>("structure");
  const [selectedSubsystem, setSelectedSubsystem] = useState<DroneSubsystem | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeFailure, setActiveFailure] = useState<FailureHotspot | null>(null);
  const [idlePulse, setIdlePulse] = useState(0);

  // Idle animation
  useEffect(() => {
    if (playbackMode !== "idle") return;
    const interval = setInterval(() => setIdlePulse((p) => (p + 1) % 360), 50);
    return () => clearInterval(interval);
  }, [playbackMode]);

  // Auto-play
  useEffect(() => {
    if (playbackMode !== "play") return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % functionStages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [playbackMode]);

  const handleNext = useCallback(() => setCurrentStep((p) => Math.min(p + 1, functionStages.length - 1)), []);
  const handlePrev = useCallback(() => setCurrentStep((p) => Math.max(p - 1, 0)), []);

  const getSubsystemOpacity = (sub: DroneSubsystem) => {
    if (viewMode === "failure" && activeFailure) {
      if (sub.id === activeFailure.subsystemId) return 1;
      if (activeFailure.propagatesTo.includes(sub.id)) return 0.7;
      return 0.15;
    }
    if (viewMode === "function" && (playbackMode === "step" || playbackMode === "play")) {
      const stage = functionStages[currentStep];
      return stage.active.includes(sub.id) ? 1 : 0.2;
    }
    return 1;
  };

  const getSubsystemStroke = (sub: DroneSubsystem) => {
    if (hoveredId === sub.id || selectedSubsystem?.id === sub.id) return sub.color;
    if (viewMode === "failure" && activeFailure) {
      if (sub.id === activeFailure.subsystemId) return "#ff4444";
      if (activeFailure.propagatesTo.includes(sub.id)) return "#ff8844";
    }
    if (viewMode === "validation") return "#44ff88";
    return sub.color;
  };

  const currentFunctionStage = functionStages[currentStep];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3" style={{ minHeight: 520 }}>
      {/* Left: Subsystem Navigator */}
      <div className="lg:col-span-2 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">Subsystems</span>
        </div>
        <div className="p-1.5 space-y-0.5 overflow-y-auto flex-1">
          {subsystems.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubsystem(sub)}
              onMouseEnter={() => setHoveredId(sub.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-mono transition-all ${
                selectedSubsystem?.id === sub.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-panel-highlight border border-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                <span className="text-foreground truncate">{sub.shortName}</span>
              </div>
            </button>
          ))}
        </div>

        {/* View Mode Switcher */}
        <div className="p-2 border-t border-panel-border space-y-1">
          <span className="text-[9px] font-mono text-muted-foreground uppercase">View</span>
          {(["structure", "function", "validation", "failure"] as ViewMode[]).map((vm) => (
            <button
              key={vm}
              onClick={() => { setViewMode(vm); if (vm === "failure") setPlaybackMode("failure"); else if (vm === "function") setPlaybackMode("step"); else setPlaybackMode("idle"); }}
              className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                viewMode === vm ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-panel-highlight border border-transparent"
              }`}
            >
              {vm.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Hologram SVG */}
      <div className="lg:col-span-6 relative rounded-lg overflow-hidden border border-panel-border" style={{ minHeight: 480 }}>
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-background/90 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold text-primary tracking-wider uppercase">FPV SYSTEM — {viewMode.toUpperCase()}</span>
            <ConfidenceBadgeTag confidence="VERIFIED" />
          </div>
        </div>

        {/* Mode bar */}
        {viewMode === "function" && (
          <div className="absolute bottom-12 left-2 right-2 z-10">
            <HologramModeBar
              mode={playbackMode}
              onModeChange={setPlaybackMode}
              currentStep={currentStep}
              totalSteps={functionStages.length}
              onNextStep={handleNext}
              onPrevStep={handlePrev}
              label={currentFunctionStage?.name}
            />
          </div>
        )}

        {/* Reconstructed note */}
        <div className="absolute bottom-2 left-2 right-2 z-10 text-[9px] font-mono text-neon-amber bg-background/80 rounded px-2 py-1 border border-neon-amber/20">
          RECONSTRUCTED FROM KNOWN COMPONENTS — derived from platform specs and standard engineering integration logic
        </div>

        <svg viewBox="0 0 400 320" className="w-full h-full" style={{ background: "hsl(220, 20%, 3%)" }}>
          {/* Grid */}
          <defs>
            <pattern id="drone-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(220, 30%, 8%)" strokeWidth="0.5" />
            </pattern>
            <filter id="drone-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="drone-glow-strong">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width="400" height="320" fill="url(#drone-grid)" />

          {/* Flow paths (function mode) */}
          {viewMode === "function" && flowPaths.map((fp, i) => {
            const from = subsystems.find((s) => s.id === fp.from)!;
            const to = subsystems.find((s) => s.id === fp.to)!;
            const isActive = currentFunctionStage?.active.includes(fp.from) && currentFunctionStage?.active.includes(fp.to);
            return (
              <g key={i}>
                <line
                  x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                  stroke={fp.color}
                  strokeWidth={isActive ? 2 : 0.5}
                  strokeOpacity={isActive ? 0.8 : 0.15}
                  strokeDasharray={fp.type === "signal" ? "4 2" : fp.type === "mechanical" ? "2 4" : "none"}
                  filter={isActive ? "url(#drone-glow)" : undefined}
                />
                {isActive && (
                  <circle r="3" fill={fp.color} filter="url(#drone-glow)">
                    <animateMotion dur="1.5s" repeatCount="indefinite"
                      path={`M${from.cx},${from.cy} L${to.cx},${to.cy}`} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Failure propagation paths */}
          {viewMode === "failure" && activeFailure && (() => {
            const source = subsystems.find((s) => s.id === activeFailure.subsystemId)!;
            return activeFailure.propagatesTo.map((targetId) => {
              const target = subsystems.find((s) => s.id === targetId)!;
              return (
                <line key={targetId}
                  x1={source.cx} y1={source.cy} x2={target.cx} y2={target.cy}
                  stroke="#ff4444" strokeWidth="2" strokeDasharray="6 3" strokeOpacity="0.6"
                  filter="url(#drone-glow)"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" />
                </line>
              );
            });
          })()}

          {/* Subsystem nodes */}
          {subsystems.map((sub) => {
            const opacity = getSubsystemOpacity(sub);
            const strokeColor = getSubsystemStroke(sub);
            const isSelected = selectedSubsystem?.id === sub.id;
            const isHovered = hoveredId === sub.id;
            const pulseScale = playbackMode === "idle" ? 1 + Math.sin((idlePulse + subsystems.indexOf(sub) * 40) * Math.PI / 180) * 0.02 : 1;

            return (
              <g key={sub.id}
                onClick={() => setSelectedSubsystem(sub)}
                onMouseEnter={() => setHoveredId(sub.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer", opacity }}
              >
                <ellipse
                  cx={sub.cx} cy={sub.cy}
                  rx={sub.rx * pulseScale} ry={sub.ry * pulseScale}
                  fill={`${sub.color}10`}
                  stroke={strokeColor}
                  strokeWidth={isSelected || isHovered ? 2 : 1}
                  filter={isSelected || isHovered ? "url(#drone-glow-strong)" : "url(#drone-glow)"}
                />
                <text x={sub.cx} y={sub.cy + 1} textAnchor="middle" dominantBaseline="middle"
                  fill={sub.color} fontSize="8" fontFamily="monospace" fontWeight="600"
                >
                  {sub.shortName}
                </text>

                {/* Validation overlay dots */}
                {viewMode === "validation" && (
                  <>
                    <circle cx={sub.cx + sub.rx - 8} cy={sub.cy - sub.ry + 6} r="4" fill="#22cc66" fillOpacity="0.8" />
                    <text x={sub.cx + sub.rx - 8} y={sub.cy - sub.ry + 7} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="5" fontFamily="monospace">✓</text>
                  </>
                )}
              </g>
            );
          })}

          {/* Title */}
          <text x="200" y="310" textAnchor="middle" fill="hsl(215, 12%, 40%)" fontSize="7" fontFamily="monospace">
            AcroBee75 G4 HD O3 — Reconstructed System Architecture
          </text>
        </svg>

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden opacity-[0.03]">
          <div className="absolute inset-x-0 h-px bg-primary animate-scan-line" />
        </div>
      </div>

      {/* Right: Inspector */}
      <div className="lg:col-span-4 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            {viewMode === "failure" ? "Failure Analysis" : viewMode === "function" ? "Stage Inspector" : "Subsystem Inspector"}
          </span>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {/* Function mode stage info */}
          {viewMode === "function" && currentFunctionStage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                  STAGE {currentFunctionStage.id}/{functionStages.length}
                </span>
                <span className="text-xs font-semibold text-foreground">{currentFunctionStage.name}</span>
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed">{currentFunctionStage.description}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="border border-panel-border rounded p-1.5">
                  <span className="font-mono text-neon-amber">TRIGGER</span>
                  <p className="text-secondary-foreground mt-0.5">{currentFunctionStage.trigger}</p>
                </div>
                <div className="border border-panel-border rounded p-1.5">
                  <span className="font-mono text-neon-green">OUTPUT</span>
                  <p className="text-secondary-foreground mt-0.5">{currentFunctionStage.output}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground">ACTIVE SUBSYSTEMS</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentFunctionStage.active.map((id) => {
                    const sub = subsystems.find((s) => s.id === id);
                    return sub ? (
                      <span key={id} className="px-1.5 py-0.5 text-[9px] font-mono rounded border" style={{ color: sub.color, borderColor: `${sub.color}40` }}>
                        {sub.shortName}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Failure mode selector */}
          {viewMode === "failure" && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Select Failure Hotspot</span>
              {failureHotspots.map((fh) => (
                <button
                  key={fh.id}
                  onClick={() => setActiveFailure(activeFailure?.id === fh.id ? null : fh)}
                  className={`w-full text-left px-2 py-1.5 rounded border text-[10px] font-mono transition-all ${
                    activeFailure?.id === fh.id
                      ? "border-neon-red/40 bg-neon-red/10 text-neon-red"
                      : "border-panel-border text-muted-foreground hover:text-foreground hover:bg-panel-highlight"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${fh.severity === "high" ? "bg-neon-red" : "bg-neon-amber"}`} />
                    {fh.name}
                  </div>
                </button>
              ))}
              {activeFailure && (
                <div className="border border-neon-red/20 rounded p-2 bg-neon-red/5 space-y-1.5">
                  <p className="text-xs font-semibold text-neon-red">{activeFailure.name}</p>
                  <p className="text-[10px] text-secondary-foreground leading-relaxed">{activeFailure.description}</p>
                  <div>
                    <span className="text-[9px] font-mono text-muted-foreground">PROPAGATES TO:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {activeFailure.propagatesTo.map((id) => {
                        const sub = subsystems.find((s) => s.id === id);
                        return <span key={id} className="px-1 py-0.5 text-[9px] font-mono rounded bg-neon-red/10 text-neon-red border border-neon-red/20">{sub?.shortName || id}</span>;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subsystem inspector (structure / validation / clicked) */}
          {selectedSubsystem && (viewMode === "structure" || viewMode === "validation") && (
            <AnimatePresence mode="wait">
              <motion.div key={selectedSubsystem.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedSubsystem.color }} />
                  <h4 className="text-sm font-semibold text-foreground">{selectedSubsystem.name}</h4>
                </div>
                <ConfidenceBadgeTag confidence={selectedSubsystem.confidence} />

                <div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Description</span>
                  <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selectedSubsystem.description}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Role in System</span>
                  <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selectedSubsystem.role}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Constraints</span>
                  <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selectedSubsystem.constraints}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neon-red uppercase">If Removed</span>
                  <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selectedSubsystem.failureIfRemoved}</p>
                </div>

                {selectedSubsystem.specs && (
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">Verified Specs</span>
                    <ul className="mt-1 space-y-0.5">
                      {selectedSubsystem.specs.map((s, i) => (
                        <li key={i} className="text-[10px] text-secondary-foreground flex items-start gap-1.5">
                          <span className="text-neon-green mt-0.5">▸</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {!selectedSubsystem && viewMode !== "failure" && viewMode !== "function" && (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground font-mono text-center">Click a subsystem to inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
