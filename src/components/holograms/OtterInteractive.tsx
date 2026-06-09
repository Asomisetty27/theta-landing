/**
 * OtterInteractive — OTTER RISC-V MCU Datapath
 *
 * PCB-substrate schematic hologram. Layout follows OTTER_Architecture.
 * FSM: FETCH (PC→IMEM, load IR) → EXEC (decode, RF→ALU→MEM→writeback)
 * Step mode cycles through the two FSM states with animated copper-trace signals.
 *
 * Schematic conventions:
 *   - ALU: standard chevron/arrow symbol
 *   - RF: rectangle with dual read arrowheads
 *   - CU_FSM: state-bubble pair
 *   - IMM_GEN: trapezoid decoder symbol
 *   - MEM: SRAM rectangle with diagonal RW marks
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";
import HologramModeBar, { type HologramMode } from "@/components/ui/HologramModeBar";

interface Block {
  id: string;
  name: string;
  short: string;
  color: string;
  description: string;
  signals: string[];
  source: string;
}

const BLOCKS: Block[] = [
  { id: "pc", name: "Program Counter", short: "PC",
    color: "#00d4aa",
    description: "32-bit register. 4 sources via pcSource[1:0] MUX: PC+4 (default), jalr target, branch target, jal target. Write gated by PCWrite from CU_FSM.",
    signals: ["pcSource[1:0]", "PCWrite (from CU_FSM)", "pc_out → IMEM ADDR1"],
    source: "OTTER_Architecture p1" },
  { id: "imem", name: "Instruction Memory", short: "IMEM",
    color: "#44aaff",
    description: "ROM port 1: ADDR=PC, asserted RDEN1 during FETCH only. Outputs 32-bit instruction word loaded implicitly into IR for decode in EXEC.",
    signals: ["ADDR1 = pc_out", "RDEN1 (FETCH only)", "ir[31:0] → RF, IMM_GEN, CU_DCDR"],
    source: "OTTER_Architecture p1" },
  { id: "rf", name: "Register File", short: "RF 32×32",
    color: "#ff4488",
    description: "32 × 32-bit general-purpose registers. Dual async read (rs1=ir[19:15], rs2=ir[24:20]). Single write port rd=ir[11:7], muxed by rf_wr_sel[1:0]: 00=PC+4, 01=CSR_reg, 10=DOUT2.",
    signals: ["rs1 = ir[19:15]", "rs2 = ir[24:20]", "rd = ir[11:7]", "rf_wr_sel[1:0]", "RegWrite"],
    source: "OTTER_Architecture p1" },
  { id: "immgen", name: "Immediate Generator", short: "IMM GEN",
    color: "#00ffcc",
    description: "Combinational decoder. Produces five immediate formats from ir[31:7]: I-type, S-type, B-type, U-type, J-type. Output muxed into ALU srcB.",
    signals: ["in: ir[31:7]", "I / S / B / U / J imm formats", "imm_out → alu_srcB MUX"],
    source: "OTTER_Architecture p1" },
  { id: "alu", name: "ALU", short: "ALU",
    color: "#ffaa00",
    description: "10 operations: ADD, SUB, AND, OR, XOR, SLT, SLTU, SRA, SLL, LUI-copy. alu_fun[3:0] from CU_DCDR. srcA = RF.rs1 or PC (alu_srcA); srcB = RF.rs2 or imm (alu_srcB).",
    signals: ["alu_fun[3:0]", "srcA: rs1 | PC (alu_srcA)", "srcB: rs2 | imm (alu_srcB[1:0])", "alu_result → MEM ADDR2 & pcSource"],
    source: "OTTER_Architecture p1" },
  { id: "branch", name: "Branch Condition Gen", short: "BR COND",
    color: "#ff6644",
    description: "Compares RF.rs1 and RF.rs2 to produce branch condition flags used by the pcSource MUX to select branch target.",
    signals: ["br_eq  (rs1 == rs2)", "br_lt  (rs1 < rs2, signed)", "br_ltu (rs1 < rs2, unsigned)", "→ pcSource[1:0] in CU_DCDR"],
    source: "OTTER_Architecture p1" },
  { id: "mem", name: "Data Memory (Port 2)", short: "MEM",
    color: "#5599ff",
    description: "Shared memory, port 2 for data access: ADDR2=ALU result, SIZE[1:0] selects byte/half/word, SIGN controls sign-extension. DOUT2 feeds RF writeback MUX.",
    signals: ["ADDR2 = alu_result", "WE2 (store)", "RDEN2 (load)", "SIZE[1:0], SIGN", "DOUT2 → rf_wr_sel"],
    source: "OTTER_Architecture p1" },
  { id: "cu_fsm", name: "Control Unit FSM", short: "CU FSM",
    color: "#aa44ff",
    description: "2-state Moore FSM. FETCH: assert memRDEN1, PCWrite; advance to EXEC. EXEC: assert RegWrite, memWE2/RDEN2 per opcode; return to FETCH. Also handles int_taken and mret_exec.",
    signals: ["FETCH → memRDEN1, PCWrite", "EXEC → RegWrite, memWE2, memRDEN2", "int_taken, mret_exec"],
    source: "OTTER_Architecture p1" },
  { id: "cu_dcdr", name: "Control Unit Decoder", short: "CU DCDR",
    color: "#cc66ff",
    description: "Combinational ROM decoder. Inputs: ir[30], ir[14:12], ir[6:0] (funct7b5, funct3, opcode). Generates: alu_fun[3:0], alu_srcA, alu_srcB[1:0], pcSource[1:0], rf_wr_sel[1:0].",
    signals: ["in: ir[30,14:12,6:0]", "alu_fun[3:0]", "alu_srcA, alu_srcB[1:0]", "pcSource[1:0]", "rf_wr_sel[1:0]"],
    source: "OTTER_Architecture p1" },
];

// FSM steps for step/play mode
const FSM_STEPS = [
  { label: "FETCH", desc: "PC → IMEM: assert RDEN1, load IR at addr=PC", active: ["pc","imem"] },
  { label: "EXEC",  desc: "Decode IR: RF read → ALU → MEM → RF writeback", active: ["rf","immgen","alu","branch","mem","cu_dcdr","cu_fsm"] },
];

/* ── Schematic symbols ────────────────────────────────────────────────────── */

function PCSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      <rect x={12} y={76} width={28} height={18} rx="1"
        fill={color} fillOpacity={active ? 0.12 : 0.05} stroke={color} strokeWidth="0.5" />
      {/* Clock edge symbol */}
      <polyline points="13,89 16,89 16,86 19,86" fill="none" stroke={color} strokeWidth="0.4" opacity="0.6" />
      <text x={26} y={84} textAnchor="middle" fill={color} fontSize="3.2" fontFamily="monospace" fontWeight="bold">PC</text>
      <text x={26} y={89} textAnchor="middle" fill={color} fontSize="1.8" fontFamily="monospace" opacity="0.6">32-bit</text>
      {/* MUX indicator */}
      <text x={26} y={92} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.5">pcSrc[1:0]</text>
    </g>
  );
}

function IMEMSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      <rect x={84} y={76} width={32} height={18} rx="1"
        fill={color} fillOpacity={active ? 0.1 : 0.04} stroke={color} strokeWidth="0.5" />
      {/* ROM diagonal lines inside */}
      <line x1={84} y1={94} x2={116} y2={76} stroke={color} strokeWidth="0.25" opacity="0.2" />
      <line x1={84} y1={88} x2={108} y2={76} stroke={color} strokeWidth="0.25" opacity="0.2" />
      <text x={100} y={83} textAnchor="middle" fill={color} fontSize="2.8" fontFamily="monospace" fontWeight="bold">IMEM</text>
      <text x={100} y={88} textAnchor="middle" fill={color} fontSize="1.8" fontFamily="monospace" opacity="0.6">ADDR1=PC</text>
      <text x={100} y={92} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.5">ir[31:0]</text>
    </g>
  );
}

function RFSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      <rect x={170} y={62} width={34} height={32} rx="1"
        fill={color} fillOpacity={active ? 0.1 : 0.04} stroke={color} strokeWidth="0.5" />
      <text x={187} y={71} textAnchor="middle" fill={color} fontSize="2.8" fontFamily="monospace" fontWeight="bold">RF</text>
      <text x={187} y={75} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">32 × 32b</text>
      {/* Read port arrows */}
      <line x1={170} y1={78} x2={167} y2={78} stroke={color} strokeWidth="0.4" />
      <polygon points="167,77.3 165,78 167,78.7" fill={color} opacity="0.7" />
      <text x={168} y={77.5} textAnchor="end" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">rs1</text>
      <line x1={170} y1={82} x2={167} y2={82} stroke={color} strokeWidth="0.4" />
      <polygon points="167,81.3 165,82 167,82.7" fill={color} opacity="0.7" />
      <text x={168} y={81.5} textAnchor="end" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">rs2</text>
      {/* Write port */}
      <line x1={170} y1={87} x2={167} y2={87} stroke={color} strokeWidth="0.4" />
      <text x={168} y={86.5} textAnchor="end" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">rd↑</text>
      <text x={187} y={92} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.5">rf_wr_sel[1:0]</text>
    </g>
  );
}

function IMMGenSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Trapezoid decoder shape */}
      <polygon points="172,132 206,132 210,150 168,150"
        fill={color} fillOpacity={active ? 0.09 : 0.04} stroke={color} strokeWidth="0.5" />
      <text x={189} y={140} textAnchor="middle" fill={color} fontSize="2.6" fontFamily="monospace" fontWeight="bold">IMM</text>
      <text x={189} y={144} textAnchor="middle" fill={color} fontSize="1.8" fontFamily="monospace" opacity="0.6">GEN</text>
      <text x={189} y={148} textAnchor="middle" fill={color} fontSize="1.5" fontFamily="monospace" opacity="0.5">I/S/B/U/J</text>
    </g>
  );
}

function ALUSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Classic ALU chevron */}
      <polygon points="258,76 286,76 294,88 286,100 258,100 264,88"
        fill={color} fillOpacity={active ? 0.12 : 0.05} stroke={color} strokeWidth="0.5" />
      <text x={274} y={87} textAnchor="middle" fill={color} fontSize="3.5" fontFamily="monospace" fontWeight="bold">ALU</text>
      <text x={274} y={92} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">fun[3:0]</text>
      <text x={274} y={96} textAnchor="middle" fill={color} fontSize="1.5" fontFamily="monospace" opacity="0.5">10 ops</text>
    </g>
  );
}

function BranchSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      <rect x={255} y={136} width={32} height={18} rx="1"
        fill={color} fillOpacity={active ? 0.1 : 0.04} stroke={color} strokeWidth="0.5" />
      <text x={271} y={143} textAnchor="middle" fill={color} fontSize="2.4" fontFamily="monospace" fontWeight="bold">BRANCH</text>
      <text x={271} y={147} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.7">= &lt; &lt;u</text>
      <text x={271} y={151} textAnchor="middle" fill={color} fontSize="1.5" fontFamily="monospace" opacity="0.5">br_eq/lt/ltu</text>
    </g>
  );
}

function MEMSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      <rect x={348} y={76} width={34} height={22} rx="1"
        fill={color} fillOpacity={active ? 0.1 : 0.04} stroke={color} strokeWidth="0.5" />
      {/* SRAM diagonal RW marks */}
      <line x1={348} y1={98} x2={382} y2={76} stroke={color} strokeWidth="0.2" opacity="0.15" />
      <text x={365} y={83} textAnchor="middle" fill={color} fontSize="2.8" fontFamily="monospace" fontWeight="bold">MEM</text>
      <text x={365} y={88} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.6">ADDR2=ALU</text>
      <text x={365} y={92} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.5">RD2/WE2</text>
      <text x={365} y={96} textAnchor="middle" fill={color} fontSize="1.5" fontFamily="monospace" opacity="0.4">SIZE/SIGN</text>
    </g>
  );
}

function CUFSMSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Two state bubbles */}
      <circle cx={412} cy={38} r="10"
        fill={color} fillOpacity={active ? 0.12 : 0.04} stroke={color} strokeWidth="0.5" />
      <text x={412} y={37} textAnchor="middle" fill={color} fontSize="2.4" fontFamily="monospace" fontWeight="bold">FETCH</text>
      <text x={412} y={41} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.7">rden1</text>
      <circle cx={445} cy={38} r="10"
        fill={color} fillOpacity={active ? 0.12 : 0.04} stroke={color} strokeWidth="0.5" />
      <text x={445} y={37} textAnchor="middle" fill={color} fontSize="2.4" fontFamily="monospace" fontWeight="bold">EXEC</text>
      <text x={445} y={41} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.7">regWr</text>
      {/* Arrow between bubbles */}
      <path d="M 422,34 Q 428,28 435,34" fill="none" stroke={color} strokeWidth="0.5"
        markerEnd="url(#cu-arrow)" />
      <path d="M 435,42 Q 428,48 422,42" fill="none" stroke={color} strokeWidth="0.5"
        markerEnd="url(#cu-arrow)" />
    </g>
  );
}

function CUDCDRSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Decoder trapezoid (wide-to-narrow) */}
      <polygon points="344,26 404,26 400,52 348,52"
        fill={color} fillOpacity={active ? 0.1 : 0.04} stroke={color} strokeWidth="0.5" />
      <text x={374} y={37} textAnchor="middle" fill={color} fontSize="2.4" fontFamily="monospace" fontWeight="bold">CU_DCDR</text>
      <text x={374} y={42} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.7">ir→alu_fun</text>
      <text x={374} y={46} textAnchor="middle" fill={color} fontSize="1.6" fontFamily="monospace" opacity="0.6">pcSrc/rfWrSel</text>
      <text x={374} y={50} textAnchor="middle" fill={color} fontSize="1.5" fontFamily="monospace" opacity="0.5">srcA/srcB MUX</text>
    </g>
  );
}

export default function OtterInteractive() {
  const [mode, setMode] = useState<HologramMode>("idle");
  const [step, setStep] = useState(0); // 0=FETCH, 1=EXEC
  const [selected, setSelected] = useState<Block | null>(null);
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
    const id = setInterval(() => setStep(s => (s + 1) % 2), 2000);
    return () => clearInterval(id);
  }, [mode]);

  const handleModeChange = useCallback((m: HologramMode) => {
    setMode(m);
    if (m === "idle") { setStep(0); setSelected(null); }
  }, []);

  const currentStep = FSM_STEPS[step];
  const isFetch = step === 0;

  const blockActive = (id: string) => {
    if (mode === "idle") return false;
    return currentStep.active.includes(id);
  };

  const getBlock = (id: string) => BLOCKS.find(b => b.id === id)!;

  // Trace animation: packet travels from t=0..1 based on tick
  const packetPos = (tick % 60) / 60;

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* ── Main hologram ─────────────────────────────────────────────── */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border"
        style={{ background: "#070d07" }}>

        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 space-y-1.5"
          style={{ background: "linear-gradient(to bottom,rgba(7,13,7,.95),transparent)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
              OTTER MCU — RISC-V Datapath
            </span>
            <ConfidenceBadgeTag confidence="VERIFIED" />
          </div>
          <HologramModeBar mode={mode} onModeChange={handleModeChange}
            currentStep={step} totalSteps={2}
            onNextStep={() => setStep(s => Math.min(s + 1, 1))}
            onPrevStep={() => setStep(s => Math.max(s - 1, 0))} />
        </div>

        <svg viewBox="0 0 480 170" className="w-full" style={{ minHeight: 360 }}>
          <defs>
            <pattern id="otter-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#142014" strokeWidth="0.15" />
            </pattern>
            <pattern id="otter-via" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.5" fill="#1e3a1e" />
            </pattern>
            <filter id="og-tight" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="og-broad" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feColorMatrix in="b" type="saturate" values="2" result="s" />
              <feMerge><feMergeNode in="s" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker id="cu-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0 0, 4 2, 0 4" fill="#aa44ff" fillOpacity="0.7" />
            </marker>
            <marker id="sig-arr" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <polygon points="0 0, 4 2, 0 4" fill="#00d4aa" fillOpacity="0.6" />
            </marker>
          </defs>

          {/* PCB substrate */}
          <rect width="480" height="170" fill="url(#otter-grid)" />
          <rect width="480" height="170" fill="url(#otter-via)" />

          {/* Power rails */}
          <line x1="8" y1="15" x2="472" y2="15" stroke="#ff4444" strokeWidth="0.5" opacity="0.12" strokeDasharray="4 2" />
          <text x="474" y="17" fill="#ff4444" fontSize="2.2" fontFamily="monospace" opacity="0.35">+3.3V</text>
          <line x1="8" y1="162" x2="472" y2="162" stroke="#333" strokeWidth="0.7" opacity="0.3" />
          <text x="474" y="164" fill="#555" fontSize="2.2" fontFamily="monospace" opacity="0.4">GND</text>

          {/* ── Signal traces ─────────────────────────────────────────── */}

          {/* FETCH traces */}
          {/* PC → IMEM (main bus) */}
          {(() => {
            const active = mode !== "idle" && isFetch;
            const px = 40 + packetPos * 44;
            return (
              <g>
                <line x1={40} y1={88} x2={84} y2={88}
                  stroke={active ? "#00d4aa" : "#1a3a1a"}
                  strokeWidth={active ? 1.2 : 0.5}
                  opacity={active ? 0.9 : 0.25} />
                {active && <line x1={40} y1={88} x2={84} y2={88}
                  stroke="#00d4aa" strokeWidth="2.5" opacity="0.1" filter="url(#og-tight)" />}
                {active && (
                  <>
                    <circle cx={px} cy={88} r="1.8" fill="#00d4aa" opacity="0.9" filter="url(#og-tight)" />
                    <circle cx={Math.max(40, px - 10)} cy={88} r="0.9" fill="#00d4aa" opacity="0.35" />
                    <text x={62} y={85.5} textAnchor="middle" fill="#00d4aa" fontSize="1.8" fontFamily="monospace" opacity="0.7">pc_out</text>
                  </>
                )}
              </g>
            );
          })()}

          {/* IMEM → RF (ir bus, horizontal) */}
          {(() => {
            const active = mode !== "idle" && isFetch;
            const px = 116 + packetPos * 54;
            return (
              <g>
                <line x1={116} y1={88} x2={170} y2={78}
                  stroke={active ? "#44aaff" : "#1a3a1a"}
                  strokeWidth={active ? 1.1 : 0.5}
                  opacity={active ? 0.85 : 0.25}
                  strokeDasharray={active ? "none" : "2 2"} />
                {active && (
                  <>
                    <circle cx={116 + packetPos * 56} cy={88 - packetPos * 10}
                      r="1.6" fill="#44aaff" opacity="0.85" filter="url(#og-tight)" />
                    <text x={140} y={80} fill="#44aaff" fontSize="1.8" fontFamily="monospace" opacity="0.7">ir[31:0]</text>
                  </>
                )}
              </g>
            );
          })()}

          {/* IMEM → CU_DCDR (decode bus, diagonal up) */}
          {(() => {
            const active = mode !== "idle" && isFetch;
            return (
              <g>
                <line x1={116} y1={84} x2={348} y2={46}
                  stroke={active ? "#cc66ff" : "#1a2a1a"}
                  strokeWidth={active ? 0.9 : 0.4}
                  opacity={active ? 0.7 : 0.15}
                  strokeDasharray={active ? "none" : "2 2"} />
                {active && (
                  <circle cx={116 + packetPos * 232} cy={84 - packetPos * 38}
                    r="1.4" fill="#cc66ff" opacity="0.8" filter="url(#og-tight)" />
                )}
              </g>
            );
          })()}

          {/* EXEC traces */}
          {/* RF.rs1 → ALU srcA */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            return (
              <g>
                <line x1={204} y1={78} x2={258} y2={82}
                  stroke={active ? "#ff4488" : "#1a2a1a"}
                  strokeWidth={active ? 1.1 : 0.4}
                  opacity={active ? 0.85 : 0.2} />
                {active && (
                  <circle cx={204 + packetPos * 54} cy={78 + packetPos * 4}
                    r="1.5" fill="#ff4488" opacity="0.85" filter="url(#og-tight)" />
                )}
                {active && <text x={228} y={77} textAnchor="middle" fill="#ff4488" fontSize="1.7" fontFamily="monospace" opacity="0.6">srcA</text>}
              </g>
            );
          })()}

          {/* RF.rs2 → ALU srcB */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            return (
              <g>
                <line x1={204} y1={84} x2={258} y2={90}
                  stroke={active ? "#ff4488" : "#1a2a1a"}
                  strokeWidth={active ? 0.9 : 0.4}
                  opacity={active ? 0.7 : 0.2} />
                {active && <text x={228} y={93} textAnchor="middle" fill="#ff4488" fontSize="1.7" fontFamily="monospace" opacity="0.5">srcB</text>}
              </g>
            );
          })()}

          {/* IMM_GEN → ALU srcB (L-shaped: up then right) */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            return (
              <g>
                <polyline points={`209,141 248,141 248,94 258,94`}
                  fill="none"
                  stroke={active ? "#00ffcc" : "#1a2a1a"}
                  strokeWidth={active ? 0.9 : 0.4}
                  opacity={active ? 0.75 : 0.15}
                  strokeDasharray={active ? "none" : "2 2"} />
                {active && <text x={240} y={138} fill="#00ffcc" fontSize="1.7" fontFamily="monospace" opacity="0.7">imm</text>}
              </g>
            );
          })()}

          {/* RF.rs1,rs2 → BRANCH */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            return (
              <g>
                <line x1={204} y1={90} x2={255} y2={142}
                  stroke={active ? "#ff4488" : "#1a2a1a"}
                  strokeWidth={active ? 0.8 : 0.35}
                  opacity={active ? 0.6 : 0.12}
                  strokeDasharray="2 1" />
              </g>
            );
          })()}

          {/* ALU → MEM ADDR2 */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            const px = 294 + packetPos * 54;
            return (
              <g>
                <line x1={294} y1={88} x2={348} y2={88}
                  stroke={active ? "#ffaa00" : "#1a2a1a"}
                  strokeWidth={active ? 1.3 : 0.5}
                  opacity={active ? 0.9 : 0.2} />
                {active && <line x1={294} y1={88} x2={348} y2={88}
                  stroke="#ffaa00" strokeWidth="2.5" opacity="0.1" filter="url(#og-tight)" />}
                {active && (
                  <>
                    <circle cx={px} cy={88} r="1.8" fill="#ffaa00" opacity="0.9" filter="url(#og-tight)" />
                    <circle cx={Math.max(294, px - 10)} cy={88} r="0.9" fill="#ffaa00" opacity="0.35" />
                    <text x={321} y={85.5} textAnchor="middle" fill="#ffaa00" fontSize="1.8" fontFamily="monospace" opacity="0.7">alu_result</text>
                  </>
                )}
              </g>
            );
          })()}

          {/* MEM.DOUT2 → RF writeback (L-shaped: up, then left, then down) */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            return (
              <g>
                <polyline points={`365,76 365,58 187,58 187,62`}
                  fill="none"
                  stroke={active ? "#5599ff" : "#1a2a1a"}
                  strokeWidth={active ? 1.1 : 0.4}
                  opacity={active ? 0.8 : 0.15} />
                {active && <line x1={365} y1={76} x2={365} y2={58}
                  stroke="#5599ff" strokeWidth="2" opacity="0.1" filter="url(#og-tight)" />}
                {active && (
                  <circle cx={365 - packetPos * 178} cy={active ? Math.max(58, 76 - packetPos * 80) : 58}
                    r="1.5" fill="#5599ff" opacity="0.85" filter="url(#og-tight)" />
                )}
                {active && <text x={280} y={55} textAnchor="middle" fill="#5599ff" fontSize="1.8" fontFamily="monospace" opacity="0.7">DOUT2 (writeback)</text>}
              </g>
            );
          })()}

          {/* CU_DCDR → ALU alu_fun */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            return (
              <g>
                <line x1={374} y1={52} x2={280} y2={76}
                  stroke={active ? "#cc66ff" : "#1a2a1a"}
                  strokeWidth={active ? 0.9 : 0.4}
                  opacity={active ? 0.75 : 0.15}
                  strokeDasharray={active ? "none" : "2 2"} />
                {active && <text x={326} y={61} textAnchor="middle" fill="#cc66ff" fontSize="1.8" fontFamily="monospace" opacity="0.7">alu_fun[3:0]</text>}
              </g>
            );
          })()}

          {/* CU_FSM → CU_DCDR (control handoff) */}
          {(() => {
            const active = mode !== "idle";
            return (
              <g>
                <line x1={402} y1={38} x2={404} y2={38}
                  stroke={active ? "#aa44ff" : "#1a2a1a"}
                  strokeWidth={active ? 0.7 : 0.3}
                  opacity={active ? 0.6 : 0.1} />
              </g>
            );
          })()}

          {/* CU_FSM vertical drop to datapath (control bus) */}
          {(() => {
            const active = mode !== "idle" && !isFetch;
            return (
              <g>
                <line x1={428} y1={48} x2={428} y2={88}
                  stroke={active ? "#aa44ff" : "#1a2a1a"}
                  strokeWidth={active ? 0.8 : 0.3}
                  opacity={active ? 0.6 : 0.12}
                  strokeDasharray="2 1.5" />
                {active && <text x={432} y={70} fill="#aa44ff" fontSize="1.7" fontFamily="monospace" opacity="0.6">ctrl</text>}
              </g>
            );
          })()}

          {/* GND drops */}
          {[26, 100, 187, 189, 271, 271, 365, 428, 374].map((x, i) => (
            <line key={i} x1={x} y1={i < 2 ? 94 : i === 2 ? 94 : i === 3 ? 150 : i === 4 ? 100 : i === 5 ? 154 : i === 6 ? 98 : 88}
              x2={x} y2={162}
              stroke="#1a3a1a" strokeWidth="0.25" opacity="0.12" strokeDasharray="1 3" />
          ))}

          {/* ── Schematic symbols ─────────────────────────────────────── */}
          <PCSymbol    active={blockActive("pc")}     color={getBlock("pc").color} />
          <IMEMSymbol  active={blockActive("imem")}   color={getBlock("imem").color} />
          <RFSymbol    active={blockActive("rf")}     color={getBlock("rf").color} />
          <IMMGenSymbol active={blockActive("immgen")} color={getBlock("immgen").color} />
          <ALUSymbol   active={blockActive("alu")}    color={getBlock("alu").color} />
          <BranchSymbol active={blockActive("branch")} color={getBlock("branch").color} />
          <MEMSymbol   active={blockActive("mem")}    color={getBlock("mem").color} />
          <CUDCDRSymbol active={blockActive("cu_dcdr")} color={getBlock("cu_dcdr").color} />
          <CUFSMSymbol  active={blockActive("cu_fsm")} color={getBlock("cu_fsm").color} />

          {/* Clickable hit zones */}
          {[
            { id: "pc",      x: 12, y: 76, w: 28, h: 18 },
            { id: "imem",    x: 84, y: 76, w: 32, h: 18 },
            { id: "rf",      x: 170, y: 62, w: 34, h: 32 },
            { id: "immgen",  x: 168, y: 132, w: 44, h: 18 },
            { id: "alu",     x: 258, y: 76, w: 36, h: 24 },
            { id: "branch",  x: 255, y: 136, w: 32, h: 18 },
            { id: "mem",     x: 348, y: 76, w: 34, h: 22 },
            { id: "cu_dcdr", x: 344, y: 26, w: 60, h: 26 },
            { id: "cu_fsm",  x: 402, y: 26, w: 56, h: 26 },
          ].map(z => (
            <rect key={z.id} x={z.x} y={z.y} width={z.w} height={z.h}
              fill="transparent" className="cursor-pointer"
              onClick={() => setSelected(selected?.id === z.id ? null : getBlock(z.id))} />
          ))}

          {/* Selection halos */}
          {selected && (() => {
            const zones: Record<string, { cx: number; cy: number }> = {
              pc: {cx:26,cy:85}, imem: {cx:100,cy:85}, rf: {cx:187,cy:78},
              immgen: {cx:189,cy:141}, alu: {cx:274,cy:88}, branch: {cx:271,cy:145},
              mem: {cx:365,cy:87}, cu_dcdr: {cx:374,cy:39}, cu_fsm: {cx:428,cy:38},
            };
            const z = zones[selected.id];
            if (!z) return null;
            return (
              <ellipse cx={z.cx} cy={z.cy} rx="22" ry="16"
                fill="none" stroke={selected.color} strokeWidth="0.5"
                opacity="0.6" strokeDasharray="3 2" filter="url(#og-tight)" />
            );
          })()}

          {/* Ambient halos (idle mode) */}
          {mode === "idle" && BLOCKS.map((b, i) => {
            const centers: Record<string, { cx: number; cy: number }> = {
              pc: {cx:26,cy:85}, imem: {cx:100,cy:85}, rf: {cx:187,cy:78},
              immgen: {cx:189,cy:141}, alu: {cx:274,cy:88}, branch: {cx:271,cy:145},
              mem: {cx:365,cy:87}, cu_dcdr: {cx:374,cy:39}, cu_fsm: {cx:428,cy:38},
            };
            const c = centers[b.id];
            if (!c) return null;
            return (
              <ellipse key={b.id} cx={c.cx} cy={c.cy} rx="18" ry="14"
                fill={b.color}
                fillOpacity={0.03 + 0.02 * Math.sin((tick + i * 20) * 0.035)}
                filter="url(#og-broad)" />
            );
          })}

          {/* FSM state label */}
          {mode !== "idle" && (
            <g>
              <rect x={8} y={154} width={120} height={10} rx="1"
                fill={isFetch ? "#00d4aa22" : "#ffaa0022"}
                stroke={isFetch ? "#00d4aa" : "#ffaa00"} strokeWidth="0.4" />
              <text x={68} y={161} textAnchor="middle"
                fill={isFetch ? "#00d4aa" : "#ffaa00"}
                fontSize="3" fontFamily="monospace" fontWeight="bold">
                STATE: {isFetch ? "FETCH" : "EXEC"} — {currentStep.desc}
              </text>
            </g>
          )}

          {/* Header label */}
          <text x="240" y="11" textAnchor="middle" fill="hsl(43,68%,50%)" fontSize="2.8"
            fontFamily="monospace" opacity="0.22">
            OTTER RISC-V MCU · 2-STATE FSM · FETCH → EXEC
          </text>
        </svg>

        {/* Scanline */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.02 }}>
          <div className="absolute inset-x-0 h-px bg-primary animate-scan-line" />
        </div>

        {/* Source bar */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded"
            style={{ background: "rgba(7,13,7,.85)", border: "1px solid #1a3a1a" }}>
            Source: OTTER_Architecture — RISC-V RV32I verified implementation
          </span>
          {mode !== "idle" && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ color: isFetch ? "#00d4aa" : "#ffaa00", background: "rgba(7,13,7,.85)", border: `1px solid ${isFetch ? "#00d4aa" : "#ffaa00"}44` }}>
              {isFetch ? "FETCH" : "EXEC"} phase
            </span>
          )}
        </div>
      </div>

      {/* ── Inspector panel ───────────────────────────────────────────── */}
      <div className="lg:w-72 fx-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,.06)" }}>
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            Block Inspector
          </span>
        </div>

        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <h4 className="text-sm font-semibold mb-1" style={{ color: selected.color }}>
                  {selected.name}
                </h4>
                <ConfidenceBadgeTag confidence="VERIFIED" />
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed">{selected.description}</p>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Signals</span>
                <div className="mt-1 space-y-0.5">
                  {selected.signals.map((s, i) => (
                    <div key={i} className="text-[10px] font-mono" style={{ color: selected.color + "cc" }}>{s}</div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">Source: {selected.source}</div>
            </motion.div>
          ) : mode !== "idle" ? (
            <motion.div key={`fsm-${step}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-3 space-y-3 flex-1">
              <div>
                <h4 className="text-sm font-bold mb-1"
                  style={{ color: isFetch ? "#00d4aa" : "#ffaa00" }}>
                  {isFetch ? "FETCH State" : "EXEC State"}
                </h4>
                <p className="text-xs text-secondary-foreground leading-relaxed">{currentStep.desc}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Active blocks
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {currentStep.active.map(id => {
                    const b = getBlock(id);
                    return (
                      <span key={id} className="px-1.5 py-0.5 text-[9px] font-mono rounded"
                        style={{ background: `${b.color}18`, border: `1px solid ${b.color}44`, color: b.color }}>
                        {b.short}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Control signals asserted
                </span>
                <div className="mt-1 space-y-0.5">
                  {isFetch
                    ? ["memRDEN1=1", "PCWrite=1 (on EXEC exit)", "RegWrite=0", "memWE2=0"].map((s, i) => (
                        <div key={i} className="text-[10px] font-mono text-primary/80">{s}</div>
                      ))
                    : ["RegWrite=1 (if not store)", "memWE2=1 (store)", "memRDEN2=1 (load)", "PCWrite=1", "alu_fun per opcode"].map((s, i) => (
                        <div key={i} className="text-[10px] font-mono text-primary/80">{s}</div>
                      ))
                  }
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="p-4 flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-mono text-center">
                Click a block to inspect<br />Use mode bar to step FETCH↔EXEC
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
