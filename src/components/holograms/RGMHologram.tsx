/**
 * RGMHologram — 9-Stage Rube Goldberg Machine
 *
 * PCB-substrate schematic hologram. Each stage renders its actual electronic
 * schematic symbol (not a generic rectangle). Signal propagation follows real
 * copper trace routing. Measured data from Lab_Final_Report is embedded.
 *
 * Symbols drawn to IEC/IEEE schematic convention:
 *   - BC548 NPN: base-collector-emitter arrowhead
 *   - N-Ch MOSFET: gate/channel bar with arrow direction
 *   - Op-amp: triangle with inverting/non-inverting inputs
 *   - 555 Timer: rectangular block with pin labels
 *   - Relay coil: two overlapping circles with armature
 *   - Inductor: looping arcs (RFC style)
 *   - Capacitor: two parallel plates
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";
import HologramModeBar, { type HologramMode } from "@/components/ui/HologramModeBar";

interface Stage {
  id: number;
  name: string;
  shortName: string;
  cx: number; // center x on 460-wide viewBox
  cy: number; // center y on 160-high viewBox
  color: string;
  trigger: string;
  activeComponents: string[];
  output: string;
  evidenceSource: string;
  failureMode?: string;
  failureCause?: string;
}

const STAGES: Stage[] = [
  { id: 1, name: "Capacitive Touch Arduino Piano", shortName: "PIANO", cx: 26, cy: 80, color: "#00d4aa",
    trigger: "Human touch — correct 5-note sequence (1,3,2,4,1)",
    activeComponents: ["Arduino Mega", "Copper foil pads", "2.2MΩ RC circuits", "Buzzer"],
    output: "Relay activation (pin 8 HIGH)", evidenceSource: "Lab_Final_Report p3",
    failureMode: "RC time constant 38.5% error", failureCause: "Oscilloscope cursor positioning + component tolerances + breadboard contact resistance" },
  { id: 2, name: "Relay — Piano to Strobe", shortName: "RELAY", cx: 76, cy: 80, color: "#44aaff",
    trigger: "Relay activation signal from piano Arduino",
    activeComponents: ["BC548 NPN transistor", "Relay module", "Flyback diode"],
    output: "9V power connected to strobe circuit", evidenceSource: "Lab_Final_Report p3" },
  { id: 3, name: "Strobe Light", shortName: "STROBE", cx: 126, cy: 80, color: "#ffe066",
    trigger: "9V supply from relay",
    activeComponents: ["Step-up transformer (~580V)", "Xenon flash tube", "SCR trigger", "RC oscillator"],
    output: "Bright xenon flash", evidenceSource: "Lab_Final_Report p3",
    failureMode: "Strobe not flashing", failureCause: "Broken transistor lead in oscillator stage" },
  { id: 4, name: "Light Detector + Schmitt Trigger", shortName: "PHOTO\nDETECT", cx: 176, cy: 80, color: "#ff4488",
    trigger: "Strobe flash detected by photoresistor",
    activeComponents: ["Photoresistor", "LM324 Op-Amp", "Schmitt trigger", "VR1 threshold pot"],
    output: "Clean digital trigger to solenoid", evidenceSource: "Lab_Final_Report p3-4",
    failureMode: "False trigger from ambient light", failureCause: "VR1 reference too low — room lighting exceeded threshold" },
  { id: 5, name: "Solenoid Launcher", shortName: "SOLENOID", cx: 226, cy: 80, color: "#00aaff",
    trigger: "Digital trigger from light detector",
    activeComponents: ["Solenoid actuator", "Custom track (6×2×1 in)", "Steel marble"],
    output: "Steel marble launched into inductor coil", evidenceSource: "Lab_Final_Report p4" },
  { id: 6, name: "555 Metal Detector", shortName: "METAL\nDETECT", cx: 280, cy: 80, color: "#00ff88",
    trigger: "Steel marble enters inductor coil",
    activeComponents: ["NE555 (astable)", "LC oscillator", "Arduino pulseIn()", "L₁=0.5mH coil"],
    output: "8,760→8,310 Hz (5.1% drop)", evidenceSource: "Lab_Final_Report p4; EE_241_Lab_6",
    failureMode: "Electromagnet releasing prematurely", failureCause: "Frequency fluctuations exceeded threshold before marble entered coil" },
  { id: 7, name: "Electromagnet Release", shortName: "MOSFET\n+EM", cx: 334, cy: 80, color: "#ff6644",
    trigger: "Arduino confirms ≥4% drop for STREAK_N=5",
    activeComponents: ["N-Ch MOSFET (30V/40A)", "Electromagnet (2.5kg hold)", "Arduino pin 11"],
    output: "Steel ball released from electromagnet", evidenceSource: "Lab_Final_Report p4; EE_241_Lab_7",
    failureMode: "MOSFET not switching", failureCause: "No common ground between Arduino (USB 5V) and 9V supply" },
  { id: 8, name: "Tilt Switch", shortName: "TILT\nSWITCH", cx: 388, cy: 80, color: "#ffcc00",
    trigger: "Steel ball falls under gravity onto tilt switch",
    activeComponents: ["Tilt switch (SPST, N.O.)", "INPUT_PULLUP on Arduino"],
    output: "Arduino digital input pulled LOW", evidenceSource: "Lab_Final_Report p5" },
  { id: 9, name: "LCD Display", shortName: "LCD\nDISPLAY", cx: 436, cy: 80, color: "#00ffcc",
    trigger: "Tilt switch pulls Arduino pin LOW",
    activeComponents: ["Inland 16×2 I2C LCD", "PCF8574 (0x27)", "Custom 0xFF block char"],
    output: "2×16 white blocks — RGM COMPLETE", evidenceSource: "Lab_Final_Report p5-6" },
];

// Copper trace paths connecting stage centers along the horizontal chain
const TRACE_PATH = STAGES.slice(0, -1).map((s, i) => {
  const next = STAGES[i + 1];
  return { x1: s.cx + 16, y1: s.cy, x2: next.cx - 16, y2: next.cy, color: s.color };
});

/* ── SVG schematic symbols drawn per stage ─────────────────────────────── */

function PianoSymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Microcontroller outline */}
      <rect x={cx - 12} y={cy - 10} width={24} height={20} rx="1" fill={color} fillOpacity="0.08" stroke={color} strokeWidth="0.5" />
      {/* Key pads — 5 touch capacitive keys */}
      {[-8,-4,0,4,8].map((dx, i) => (
        <rect key={i} x={cx + dx - 1.5} y={cy - 7} width={3} height={5} rx="0.3"
          fill={color} fillOpacity={active ? 0.5 : 0.15} stroke={color} strokeWidth="0.3" />
      ))}
      {/* Arduino label */}
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="2.2" fontFamily="monospace" fontWeight="bold" opacity="0.9">ARDUINO</text>
      <text x={cx} y={cy + 8.5} textAnchor="middle" fill={color} fontSize="1.8" fontFamily="monospace" opacity="0.6">2.2MΩ RC</text>
      {/* Pin lines on sides */}
      {[-6,-2,2,6].map((dy, i) => (
        <line key={i} x1={cx - 12} y1={cy + dy} x2={cx - 14} y2={cy + dy} stroke={color} strokeWidth="0.4" opacity="0.5" />
      ))}
    </g>
  );
}

function RelaySymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Relay coil box */}
      <rect x={cx - 9} y={cy - 5} width={12} height={10} rx="1"
        fill={color} fillOpacity="0.08" stroke={color} strokeWidth="0.5" />
      <text x={cx - 3} y={cy + 1} textAnchor="middle" fill={color} fontSize="2" fontFamily="monospace">COIL</text>
      {/* Switch arm */}
      <line x1={cx + 3} y1={cy - 5} x2={cx + 10} y2={cy - 8} stroke={color} strokeWidth="0.7" strokeLinecap="round"
        transform={active ? "rotate(-10, " + (cx+3) + "," + (cy-5) + ")" : ""} />
      <circle cx={cx + 3} cy={cy - 5} r="0.8" fill={color} />
      <circle cx={cx + 10} cy={cy - 9.5} r="0.8" fill={color} />
      {/* NC contact */}
      <line x1={cx + 10} y1={cy + 1} x2={cx + 10} y2={cy - 4} stroke={color} strokeWidth="0.4" opacity="0.4" />
      {/* BC548 NPN transistor below coil */}
      <line x1={cx - 3} y1={cy + 5} x2={cx - 3} y2={cy + 9} stroke={color} strokeWidth="0.5" />
      <line x1={cx - 3} y1={cy + 6} x2={cx - 9} y2={cy + 4} stroke={color} strokeWidth="0.5" />
      <line x1={cx - 3} y1={cy + 8} x2={cx - 9} y2={cy + 10} stroke={color} strokeWidth="0.5" />
      {/* Arrow (emitter) */}
      <polygon points={`${cx-9},${cy+8} ${cx-7},${cy+10} ${cx-7},${cy+6}`} fill={color} opacity="0.7" />
      <text x={cx + 3} y={cy + 10} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">BC548</text>
    </g>
  );
}

function StrobeSymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Xenon tube — curved envelope */}
      <ellipse cx={cx} cy={cy - 2} rx={9} ry={6} fill={color} fillOpacity="0.05" stroke={color} strokeWidth="0.4" />
      {/* Flash arc symbol inside */}
      <path d={`M ${cx-4} ${cy-4} L ${cx+1} ${cy-1} L ${cx-2} ${cy+1} L ${cx+4} ${cy+4}`}
        fill="none" stroke={color} strokeWidth="0.7" strokeLinejoin="round"
        opacity={active ? 1 : 0.3} />
      {/* SCR symbol below */}
      <polygon points={`${cx-4},${cy+6} ${cx+4},${cy+6} ${cx},${cy+9}`} fill="none" stroke={color} strokeWidth="0.4" />
      <line x1={cx} y1={cy+9} x2={cx} y2={cy+11} stroke={color} strokeWidth="0.4" />
      <text x={cx} y={cy + 13} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">~580V</text>
      {/* Radiation rays when active */}
      {active && [0, 45, 90, 135].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line key={i}
            x1={cx + 9 * Math.cos(rad)} y1={cy - 2 + 6 * Math.sin(rad)}
            x2={cx + 13 * Math.cos(rad)} y2={cy - 2 + 9 * Math.sin(rad)}
            stroke={color} strokeWidth="0.4" opacity="0.6" />
        );
      })}
    </g>
  );
}

function PhotoDetectSymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Photoresistor symbol */}
      <path d={`M ${cx-12} ${cy} L ${cx-9} ${cy} M ${cx-9} ${cy-2} L ${cx-5} ${cy+2} L ${cx-5} ${cy-2} L ${cx-1} ${cy+2} L ${cx-1} ${cy-2} L ${cx+1} ${cy} M ${cx+1} ${cy} L ${cx+4} ${cy}`}
        fill="none" stroke={color} strokeWidth="0.5" strokeLinecap="round" />
      {/* Light arrows onto photoresistor */}
      {[-2, 2].map((dy, i) => (
        <path key={i} d={`M ${cx-10} ${cy + dy - 4} L ${cx-8} ${cy + dy - 2}`}
          stroke={color} strokeWidth="0.4" markerEnd="url(#arr)" opacity="0.5" />
      ))}
      {/* Op-amp triangle */}
      <polygon points={`${cx+4},${cy-7} ${cx+4},${cy+3} ${cx+12},${cy-2}`}
        fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.4" />
      <text x={cx + 8} y={cy - 1} textAnchor="middle" fill={color} fontSize="2" fontFamily="monospace">+</text>
      <text x={cx + 8} y={cy + 3} textAnchor="middle" fill={color} fontSize="2" fontFamily="monospace">−</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.6">LM324</text>
    </g>
  );
}

function SolenoidSymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Coil arcs */}
      {[-6,-3,0,3,6].map((dx, i) => (
        <path key={i} d={`M ${cx+dx-1.5} ${cy} a 1.5 3 0 0 1 3 0`}
          fill="none" stroke={color} strokeWidth="0.5" />
      ))}
      {/* Lead wires */}
      <line x1={cx - 8} y1={cy} x2={cx - 7.5} y2={cy} stroke={color} strokeWidth="0.5" />
      <line x1={cx + 7.5} y1={cy} x2={cx + 9} y2={cy} stroke={color} strokeWidth="0.5" />
      {/* Core bar (iron) */}
      <line x1={cx - 8} y1={cy + 3.5} x2={cx + 8} y2={cy + 3.5} stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* Marble */}
      <circle cx={active ? cx + 5 : cx - 14} cy={cy - 6} r="2.5"
        fill="#aaaaaa" fillOpacity="0.7" stroke="#888888" strokeWidth="0.3" />
      <text x={cx} y={cy + 9} textAnchor="middle" fill={color} fontSize="1.8" fontFamily="monospace" opacity="0.6">SOLENOID</text>
    </g>
  );
}

function Timer555Symbol({ cx, cy, active, color, tick }: { cx: number; cy: number; active: boolean; color: string; tick: number }) {
  const op = active ? 1 : 0.45;
  const freqText = active ? `${(8760 - Math.min(450, tick * 3)).toFixed(0)} Hz` : "8,760 Hz";
  return (
    <g opacity={op}>
      {/* 555 block */}
      <rect x={cx - 10} y={cy - 10} width={20} height={20} rx="1"
        fill={color} fillOpacity="0.08" stroke={color} strokeWidth="0.5" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="2.2" fontFamily="monospace" fontWeight="bold">NE555</text>
      {/* Pin labels */}
      <text x={cx - 9} y={cy + 0} fill={color} fontSize="1.5" fontFamily="monospace">TH</text>
      <text x={cx - 9} y={cy + 3.5} fill={color} fontSize="1.5" fontFamily="monospace">DIS</text>
      <text x={cx + 2} y={cy + 0} fill={color} fontSize="1.5" fontFamily="monospace">OUT</text>
      {/* Inductor (coil) to the right */}
      {[0,2,4,6].map((dx, i) => (
        <path key={i} d={`M ${cx+10+dx} ${cy-5} a 1 2 0 0 1 2 0`} fill="none" stroke={color} strokeWidth="0.4" />
      ))}
      <text x={cx + 14} y={cy - 7} fill={color} fontSize="1.5" fontFamily="monospace" opacity="0.7">L₁=0.5mH</text>
      {/* Frequency readout */}
      <rect x={cx - 10} y={cy + 11} width={20} height={5} rx="0.5"
        fill={color} fillOpacity="0.12" stroke={color} strokeWidth="0.3" />
      <text x={cx} y={cy + 14.5} textAnchor="middle" fill={color} fontSize="1.9" fontFamily="monospace" fontWeight="bold">{freqText}</text>
    </g>
  );
}

function MOSFETSymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Drain */}
      <line x1={cx} y1={cy - 12} x2={cx} y2={cy - 5} stroke={color} strokeWidth="0.5" />
      {/* Channel bar */}
      <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      {/* Insulated gate */}
      <line x1={cx - 5} y1={cy - 4} x2={cx - 5} y2={cy + 4} stroke={color} strokeWidth="1" />
      <line x1={cx - 8} y1={cy} x2={cx - 5} y2={cy} stroke={color} strokeWidth="0.5" />
      {/* Source tap connections */}
      <line x1={cx} y1={cy - 3} x2={cx + 4} y2={cy - 3} stroke={color} strokeWidth="0.4" opacity="0.6" />
      <line x1={cx} y1={cy + 3} x2={cx + 4} y2={cy + 3} stroke={color} strokeWidth="0.4" opacity="0.6" />
      <line x1={cx + 4} y1={cy - 3} x2={cx + 4} y2={cy + 3} stroke={color} strokeWidth="0.4" opacity="0.6" />
      {/* Arrow (N-channel) */}
      <polygon points={`${cx+4},${cy} ${cx+8},${cy-2} ${cx+8},${cy+2}`} fill={color} opacity="0.8" />
      <line x1={cx + 8} y1={cy} x2={cx + 12} y2={cy} stroke={color} strokeWidth="0.5" />
      {/* Source to GND */}
      <line x1={cx} y1={cy + 5} x2={cx} y2={cy + 12} stroke={color} strokeWidth="0.5" />
      {/* Electromagnet coil */}
      {[-3,-1,1,3].map((dx) => (
        <path key={dx} d={`M ${cx + dx * 1.5} ${cy - 14} a 1.2 2 0 0 1 2.4 0`}
          fill="none" stroke={color} strokeWidth="0.4" />
      ))}
      <text x={cx} y={cy + 15} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.6">N-CH MOSFET</text>
    </g>
  );
}

function TiltSwitchSymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Tube outline */}
      <ellipse cx={cx} cy={cy} rx="8" ry="5" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="0.4" />
      {/* Ball inside */}
      <circle cx={active ? cx + 4 : cx - 4} cy={cy + 1} r="2"
        fill="#aaaaaa" fillOpacity="0.6" stroke="#888" strokeWidth="0.3" />
      {/* Contact pins */}
      <line x1={cx + 8} y1={cy - 2} x2={cx + 12} y2={cy - 2} stroke={color} strokeWidth="0.5" />
      <line x1={cx + 8} y1={cy + 2} x2={cx + 12} y2={cy + 2} stroke={color} strokeWidth="0.5" />
      <line x1={cx - 8} y1={cy} x2={cx - 12} y2={cy} stroke={color} strokeWidth="0.5" />
      {/* Closed contact indicator */}
      {active && <line x1={cx + 12} y1={cy - 2} x2={cx + 12} y2={cy + 2} stroke={color} strokeWidth="0.8" />}
      <text x={cx} y={cy + 9} textAnchor="middle" fill={color} fontSize="1.8" fontFamily="monospace" opacity="0.6">TILT</text>
    </g>
  );
}

function LCDSymbol({ cx, cy, active, color }: { cx: number; cy: number; active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* LCD border */}
      <rect x={cx - 13} y={cy - 8} width={26} height={16} rx="1"
        fill={color} fillOpacity="0.06" stroke={color} strokeWidth="0.5" />
      {/* Display area */}
      <rect x={cx - 11} y={cy - 6} width={22} height={12} rx="0.5"
        fill={active ? `${color}22` : "none"} stroke={color} strokeWidth="0.3" strokeOpacity="0.5" />
      {/* Pixel grid when active */}
      {active && (
        <g fill={color} opacity="0.7">
          {Array.from({ length: 16 }).map((_, col) =>
            Array.from({ length: 2 }).map((_, row) => (
              <rect key={`${col}-${row}`}
                x={cx - 10 + col * 1.35} y={cy - 5 + row * 6}
                width={1.2} height={4.5} rx="0.2" />
            ))
          )}
        </g>
      )}
      {/* I2C address */}
      <text x={cx} y={cy + 11} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.6">I2C 0x27</text>
    </g>
  );
}

export default function RGMHologram() {
  const [mode, setMode] = useState<HologramMode>("idle");
  const [activeStage, setActiveStage] = useState(0);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [tick, setTick] = useState(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      setTick(t => t + 1);
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mode !== "play") return;
    const id = setInterval(() => {
      setActiveStage(prev => (prev + 1) % STAGES.length);
    }, 1600);
    return () => clearInterval(id);
  }, [mode]);

  const handleModeChange = useCallback((m: HologramMode) => {
    setMode(m);
    if (m === "step") setActiveStage(0);
    if (m === "idle") { setActiveStage(0); setSelectedStage(null); }
  }, []);

  const isActive = (i: number) => {
    if (mode === "idle") return false;
    if (mode === "failure") return true;
    return i <= activeStage;
  };
  const isHighlighted = (i: number) => (mode === "step" || mode === "play") && i === activeStage;
  const hasFail = (s: Stage) => mode === "failure" && !!s.failureMode;

  const symbolProps = (i: number, s: Stage) => ({
    cx: s.cx, cy: s.cy,
    active: isActive(i),
    color: hasFail(s) ? "#ff3333" : s.color,
  });

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* ── Main hologram ───────────────────────────────────────────── */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border"
        style={{ background: "#080f08" }}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 space-y-1.5"
          style={{ background: "linear-gradient(to bottom, rgba(8,15,8,.95), transparent)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
              RGM — 9-Stage Chain Reaction
            </span>
            <ConfidenceBadgeTag confidence="VERIFIED" />
          </div>
          <HologramModeBar mode={mode} onModeChange={handleModeChange}
            currentStep={activeStage} totalSteps={STAGES.length}
            onNextStep={() => setActiveStage(p => Math.min(p + 1, STAGES.length - 1))}
            onPrevStep={() => setActiveStage(p => Math.max(p - 1, 0))} />
        </div>

        <svg viewBox="0 0 462 160" className="w-full" style={{ minHeight: 360 }}>
          <defs>
            {/* PCB substrate grid */}
            <pattern id="pcb-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#1a3a1a" strokeWidth="0.15" />
            </pattern>
            {/* Via dot pattern */}
            <pattern id="via-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.6" fill="#2a4a2a" />
            </pattern>

            {/* Tiered glow: tight (for signal edges) */}
            <filter id="glow-tight" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="b1" />
              <feMerge><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Tiered glow: broad (for ambient component halos) */}
            <filter id="glow-broad" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="b2" />
              <feColorMatrix in="b2" type="saturate" values="2" result="sat" />
              <feMerge><feMergeNode in="sat" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Scanline noise */}
            <filter id="scanlines">
              <feTurbulence type="fractalNoise" baseFrequency="0 0.5" numOctaves="1" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" xChannelSelector="R" yChannelSelector="G" />
            </filter>

            {/* Copper gradient for traces */}
            <linearGradient id="copper-h" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b87333" />
              <stop offset="50%" stopColor="#d4944a" />
              <stop offset="100%" stopColor="#b87333" />
            </linearGradient>

            {/* Arrow marker for signal direction */}
            <marker id="sig-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0 0, 4 2, 0 4" fill="#00d4aa" fillOpacity="0.6" />
            </marker>
            <marker id="arr" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
              <polygon points="0 0, 3 1.5, 0 3" fill="#ff4488" opacity="0.7" />
            </marker>
          </defs>

          {/* PCB substrate layers */}
          <rect width="462" height="160" fill="url(#pcb-grid)" />
          <rect width="462" height="160" fill="url(#via-pattern)" />

          {/* Power rails */}
          <line x1="10" y1="20" x2="452" y2="20" stroke="#ff4444" strokeWidth="0.6" opacity="0.15" strokeDasharray="4 2" />
          <line x1="10" y1="22" x2="452" y2="22" stroke="#ff4444" strokeWidth="0.4" opacity="0.1" />
          <text x="454" y="22" fill="#ff4444" fontSize="2.5" fontFamily="monospace" opacity="0.4">+9V</text>
          <line x1="10" y1="148" x2="452" y2="148" stroke="#333" strokeWidth="0.8" opacity="0.35" />
          <text x="454" y="150" fill="#666" fontSize="2.5" fontFamily="monospace" opacity="0.5">GND</text>
          <line x1="10" y1="146" x2="452" y2="146" stroke="#222" strokeWidth="0.4" opacity="0.2" />

          {/* Copper traces between stages */}
          {TRACE_PATH.map((t, i) => {
            const active = isActive(i) && isActive(i + 1);
            const highlighted = isHighlighted(i + 1);
            return (
              <g key={i}>
                {/* Copper trace base */}
                <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke={active ? t.color : "#1e3a1e"}
                  strokeWidth={active ? 1.4 : 0.6}
                  opacity={active ? 0.85 : 0.3}
                  strokeDasharray={active ? "none" : "3 2"} />

                {/* Active signal glow overlay */}
                {active && (
                  <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                    stroke={t.color} strokeWidth="2.5" opacity="0.12" filter="url(#glow-tight)" />
                )}

                {/* Animated signal packet */}
                {highlighted && (
                  <>
                    <circle
                      cx={t.x1 + (t.x2 - t.x1) * ((tick % 40) / 40)}
                      cy={t.y1}
                      r="2" fill={STAGES[i + 1].color} opacity="0.9"
                      filter="url(#glow-tight)" />
                    {/* Trailing ghost */}
                    <circle
                      cx={t.x1 + (t.x2 - t.x1) * Math.max(0, ((tick % 40) - 8) / 40)}
                      cy={t.y1}
                      r="1" fill={STAGES[i + 1].color} opacity="0.35" />
                  </>
                )}
              </g>
            );
          })}

          {/* Vertical GND drops from each stage */}
          {STAGES.map((s, i) => (
            <line key={`gnd-${i}`} x1={s.cx} y1={s.cy + 12} x2={s.cx} y2={148}
              stroke={isActive(i) ? s.color : "#1a3a1a"}
              strokeWidth="0.3" opacity={isActive(i) ? 0.2 : 0.08}
              strokeDasharray="1 2" />
          ))}

          {/* Stage ambient halos */}
          {STAGES.map((s, i) => {
            const active = isActive(i);
            const idle = mode === "idle" ? 0.04 + 0.025 * Math.sin((tick + i * 18) * 0.04) : 0;
            return (
              <ellipse key={`halo-${i}`}
                cx={s.cx} cy={s.cy} rx="20" ry="16"
                fill={s.color}
                fillOpacity={active ? 0.06 : idle}
                filter="url(#glow-broad)" />
            );
          })}

          {/* Schematic symbols per stage */}
          {STAGES.map((s, i) => {
            const active = isActive(i);
            const highlighted = isHighlighted(i);
            const failed = hasFail(s);
            const selected = selectedStage?.id === s.id;
            const color = failed ? "#ff3333" : s.color;

            return (
              <g key={s.id} className="cursor-pointer" onClick={() => setSelectedStage(selected ? null : s)}>
                {/* Selection ring */}
                {(highlighted || selected) && (
                  <ellipse cx={s.cx} cy={s.cy} rx="18" ry="14"
                    fill="none" stroke={color} strokeWidth="0.5"
                    opacity="0.6" strokeDasharray="3 2"
                    filter="url(#glow-tight)" />
                )}

                {/* Failure pulse ring */}
                {failed && (
                  <ellipse cx={s.cx} cy={s.cy} rx="18" ry="14"
                    fill="none" stroke="#ff3333" strokeWidth="0.8"
                    opacity={0.3 + 0.25 * Math.sin(tick * 0.07)}
                    filter="url(#glow-tight)" />
                )}

                {/* Stage number badge (PCB silkscreen style) */}
                <circle cx={s.cx - 13} cy={s.cy - 11} r="3.5"
                  fill={color} fillOpacity={active ? 0.2 : 0.07}
                  stroke={color} strokeWidth="0.4" strokeOpacity={active ? 0.9 : 0.4} />
                <text x={s.cx - 13} y={s.cy - 9.5} textAnchor="middle"
                  fill={color} fontSize="3.5" fontFamily="monospace" fontWeight="bold"
                  opacity={active ? 1 : 0.5}>{s.id}</text>

                {/* Symbol */}
                {i === 0 && <PianoSymbol {...symbolProps(i, s)} />}
                {i === 1 && <RelaySymbol {...symbolProps(i, s)} />}
                {i === 2 && <StrobeSymbol {...symbolProps(i, s)} />}
                {i === 3 && <PhotoDetectSymbol {...symbolProps(i, s)} />}
                {i === 4 && <SolenoidSymbol {...symbolProps(i, s)} />}
                {i === 5 && <Timer555Symbol {...symbolProps(i, s)} tick={highlighted ? tick : 0} />}
                {i === 6 && <MOSFETSymbol {...symbolProps(i, s)} />}
                {i === 7 && <TiltSwitchSymbol {...symbolProps(i, s)} />}
                {i === 8 && <LCDSymbol {...symbolProps(i, s)} />}

                {/* Stage short name label (below symbol) */}
                <text x={s.cx} y={s.cy + 22} textAnchor="middle"
                  fill={color} fontSize="2.2" fontFamily="monospace" fontWeight="600"
                  opacity={active ? 0.9 : 0.35}>
                  {s.shortName.split("\n").map((line, li) => (
                    <tspan key={li} x={s.cx} dy={li === 0 ? 0 : 3}>{line}</tspan>
                  ))}
                </text>

                {/* Failure marker */}
                {failed && (
                  <text x={s.cx} y={s.cy + 29} textAnchor="middle"
                    fill="#ff3333" fontSize="2.8" fontFamily="monospace" fontWeight="bold">
                    ⚠ FAIL
                  </text>
                )}
              </g>
            );
          })}

          {/* Flow label */}
          <text x="231" y="12" textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="2.8"
            fontFamily="monospace" opacity="0.25">
            SIGNAL CHAIN: TOUCH → DETECT → ACTUATE → OUTPUT
          </text>

          {/* Metal detector frequency trace when stage 6 active */}
          {isActive(5) && (
            <g transform="translate(240, 125)">
              <rect x="-24" y="-10" width="68" height="20" rx="1"
                fill="#001a00" fillOpacity="0.8" stroke="#00ff88" strokeWidth="0.4" />
              <text x="-22" y="-5" fill="#00ff88" fontSize="2" fontFamily="monospace" opacity="0.7">OSC</text>
              {/* Frequency waveform — shows step down from 8760 to 8310 */}
              <polyline
                points="−20,4 −10,4 −5,−4 10,−4 15,4 44,4"
                fill="none" stroke="#00ff88" strokeWidth="0.6"
                transform="translate(20,2)"
                filter="url(#glow-tight)" />
              <text x="0" y="8" fill="#00ff88" fontSize="1.8" fontFamily="monospace" opacity="0.9">8,760→8,310Hz (5.1%↓)</text>
            </g>
          )}
        </svg>

        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.025 }}>
          <div className="absolute inset-x-0 h-px bg-primary animate-scan-line" />
        </div>

        {/* Source bar */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded"
            style={{ background: "rgba(8,15,8,.85)", border: "1px solid #1a3a1a" }}>
            Source: Lab_Final_Report_Amogh_Somisetty.pdf — 9-stage verified chain
          </span>
          {(mode === "step" || mode === "play") && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ color: STAGES[activeStage].color, background: "rgba(8,15,8,.85)", border: `1px solid ${STAGES[activeStage].color}44` }}>
              Stage {activeStage + 1}: {STAGES[activeStage].shortName.replace("\n", " ")}
            </span>
          )}
        </div>
      </div>

      {/* ── Inspector panel ─────────────────────────────────────────── */}
      <div className="lg:w-72 fx-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,.06)" }}>
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            Stage Inspector
          </span>
        </div>

        <AnimatePresence mode="wait">
          {selectedStage ? (
            <motion.div key={selectedStage.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-3 space-y-3 overflow-y-auto flex-1">
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
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Trigger</span>
                <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selectedStage.trigger}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Components</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedStage.activeComponents.map((c, i) => (
                    <span key={i} className="px-1.5 py-0.5 text-[9px] font-mono rounded"
                      style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "hsl(var(--foreground))" }}>{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Output</span>
                <p className="text-xs font-mono mt-0.5" style={{ color: selectedStage.color }}>{selectedStage.output}</p>
              </div>
              {selectedStage.failureMode && (
                <div className="rounded p-2" style={{ background: "rgba(255,51,51,.06)", border: "1px solid rgba(255,51,51,.2)" }}>
                  <span className="text-[10px] font-mono uppercase" style={{ color: "#ff3333" }}>Known Failure</span>
                  <p className="text-xs text-secondary-foreground mt-0.5">{selectedStage.failureMode}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Cause: {selectedStage.failureCause}</p>
                </div>
              )}
              <div className="text-[10px] font-mono text-muted-foreground">Evidence: {selectedStage.evidenceSource}</div>
            </motion.div>
          ) : (mode === "step" || mode === "play") ? (
            <motion.div key={`auto-${activeStage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-3 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold"
                  style={{ backgroundColor: STAGES[activeStage].color + "20", color: STAGES[activeStage].color, border: `1px solid ${STAGES[activeStage].color}40` }}>
                  {STAGES[activeStage].id}
                </span>
                <h4 className="text-sm font-semibold text-foreground leading-tight">{STAGES[activeStage].name}</h4>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Trigger</span>
                <p className="text-xs text-secondary-foreground mt-0.5">{STAGES[activeStage].trigger}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Output</span>
                <p className="text-xs font-mono mt-0.5" style={{ color: STAGES[activeStage].color }}>{STAGES[activeStage].output}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {STAGES[activeStage].activeComponents.map((c, i) => (
                  <span key={i} className="px-1.5 py-0.5 text-[9px] font-mono rounded"
                    style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "hsl(var(--foreground))" }}>{c}</span>
                ))}
              </div>
            </motion.div>
          ) : mode === "failure" ? (
            <div className="p-3 space-y-2 overflow-y-auto flex-1">
              <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: "#ff3333" }}>
                Failure Analysis — 4 Documented Modes
              </span>
              {STAGES.filter(s => s.failureMode).map(s => (
                <div key={s.id}
                  className="rounded p-2 cursor-pointer transition-colors"
                  style={{ background: "rgba(255,51,51,.05)", border: "1px solid rgba(255,51,51,.2)" }}
                  onClick={() => setSelectedStage(s)}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold"
                      style={{ color: s.color, border: `1px solid ${s.color}40` }}>{s.id}</span>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: "#ff3333" }}>{s.failureMode}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{s.failureCause}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-mono text-center">
                Click a stage to inspect<br />Use mode bar for step-through
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
