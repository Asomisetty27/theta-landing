/**
 * AIAgentsHologram — 5 Commonalities of Top AI Agents
 *
 * Pentagon topology: AGENT CORE at center, 5 satellite subsystem blocks,
 * one per architectural characteristic. Each satellite renders its own
 * schematic symbol. Signal traces animate from core → active satellite.
 * Inspector panel shows per-characteristic detail + agent comparison grid.
 *
 * Agents benchmarked: Claude (Anthropic), Devin (Cognition),
 *   Operator (OpenAI), Agentforce (Salesforce)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";
import HologramModeBar, { type HologramMode } from "@/components/ui/HologramModeBar";

interface Characteristic {
  id: string;
  name: string;
  short: string;
  cx: number;    // SVG center x
  cy: number;    // SVG center y
  color: string;
  tagline: string;
  description: string;
  details: string[];
  ratings: Record<string, number>; // agent → 1-5
}

// Pentagon vertices, center (240,90), radius 70
// Angles (from top, clockwise): 270°, 342°, 54°, 126°, 198°
const CHARS: Characteristic[] = [
  {
    id: "reasoning",
    name: "Advanced Reasoning & Planning",
    short: "REASONING",
    cx: 240, cy: 22,
    color: "#00d4aa",
    tagline: "Break complex tasks into logical step-by-step roadmaps",
    description: "Leading agents decompose massive tasks into logical sub-steps, weigh trade-offs, and dynamically update plans when conditions change. Reasoning depth determines whether an agent can handle novel situations vs. only scripted workflows.",
    details: ["Multi-step task decomposition", "Trade-off evaluation", "Dynamic replanning on failure", "Context-aware decision making"],
    ratings: { Claude: 5, Devin: 4, Operator: 4, Agentforce: 3 },
  },
  {
    id: "tooluse",
    name: "External Tool Integration",
    short: "TOOL-USE",
    cx: 310, cy: 68,
    color: "#ffaa00",
    tagline: "Seamless connection to APIs, databases, and external software",
    description: "Agents connect to external software, databases, and APIs (Salesforce, code repos, browsers) to execute real-world actions. Tool breadth determines the agent's effective action space — agents limited to chat cannot ship code or book travel.",
    details: ["REST/GraphQL API execution", "Browser automation", "Code interpreter + REPL", "File system + DB access", "Third-party SaaS integration"],
    ratings: { Claude: 4, Devin: 5, Operator: 5, Agentforce: 5 },
  },
  {
    id: "memory",
    name: "Memory & Context Retention",
    short: "MEMORY",
    cx: 285, cy: 148,
    color: "#44aaff",
    tagline: "Store and recall past interactions, preferences, and history",
    description: "Top platforms store past interactions, user preferences, and historical data to improve over time and maintain continuity across long-term projects. Without persistent memory, every session starts cold — the agent cannot learn from prior mistakes.",
    details: ["Short-term (in-context) memory", "Long-term (vector) retrieval", "User preference recall", "Cross-session continuity", "Historical data access"],
    ratings: { Claude: 4, Devin: 4, Operator: 3, Agentforce: 5 },
  },
  {
    id: "adaptability",
    name: "Adaptability & Mid-Task Correction",
    short: "ADAPT",
    cx: 195, cy: 148,
    color: "#ff4488",
    tagline: "Sense unexpected conditions and self-correct without re-prompting",
    description: "Adaptable agents detect when their current approach is failing and pivot — without requiring a human to intervene and re-prompt. This closes the gap between demo performance (happy path) and production reliability (edge cases).",
    details: ["Error detection + recovery", "Strategy switching", "Confidence estimation", "Graceful degradation", "Human-in-the-loop escalation"],
    ratings: { Claude: 5, Devin: 4, Operator: 4, Agentforce: 3 },
  },
  {
    id: "autonomy",
    name: "Autonomy & Goal-Orientation",
    short: "AUTONOMY",
    cx: 170, cy: 68,
    color: "#aa44ff",
    tagline: "High-level goal → self-directed multi-step execution",
    description: "Instead of waiting for step-by-step human prompts, top agents receive a high-level goal and determine all necessary sub-tasks on their own. The degree of autonomy is the single largest separator between a chatbot and an agent.",
    details: ["Sub-task decomposition", "Self-directed execution", "Progress self-monitoring", "Goal-state verification", "Minimal human prompting"],
    ratings: { Claude: 4, Devin: 5, Operator: 4, Agentforce: 4 },
  },
];

const AGENTS = [
  { id: "Claude",      label: "Claude",      color: "#d97706", org: "Anthropic" },
  { id: "Devin",       label: "Devin",       color: "#7c3aed", org: "Cognition" },
  { id: "Operator",    label: "Operator",    color: "#0ea5e9", org: "OpenAI" },
  { id: "Agentforce",  label: "Agentforce",  color: "#22c55e", org: "Salesforce" },
];

// Pentagon outline: connect the 5 satellites in order
const PENTAGON = CHARS.map(c => `${c.cx},${c.cy}`).join(" ");

/* ── Schematic symbols ────────────────────────────────────────────────────── */

function ReasoningSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* AND gate body + OR gate on top */}
      <path d={`M 226 14 L 226 22 Q 234 22 234 18 Q 234 14 226 14`}
        fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.4" />
      <path d={`M 246 14 L 246 22 Q 254 22 254 18 Q 254 14 246 14`}
        fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.4" />
      {/* OR gate below combining both */}
      <path d={`M 232 26 Q 240 26 240 30 Q 240 34 240 34 Q 240 34 240 34 Q 248 34 248 30 Q 248 26 248 26`}
        fill="none" stroke={color} strokeWidth="0.35" opacity="0.4" />
      <text x={240} y={21} textAnchor="middle" fill={color} fontSize="4" fontFamily="monospace" fontWeight="bold">⊕</text>
      <text x={240} y={31} textAnchor="middle" fill={color} fontSize="3" fontFamily="monospace" opacity="0.8">PLAN</text>
      <text x={240} y={35} textAnchor="middle" fill={color} fontSize="2.2" fontFamily="monospace" opacity="0.5">REASONING</text>
    </g>
  );
}

function ToolUseSymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* API plug body */}
      <rect x={300} y={60} width={20} height={16} rx="1"
        fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.4" />
      {/* Plug pins */}
      {[63, 67, 71].map((y, i) => (
        <line key={i} x1={320} y1={y} x2={324} y2={y} stroke={color} strokeWidth="0.7" strokeLinecap="round" />
      ))}
      {/* Socket on left */}
      <rect x={294} y={62} width={6} height={12} rx="0.5"
        fill={color} fillOpacity="0.05" stroke={color} strokeWidth="0.3" />
      {[64, 67, 70].map((y, i) => (
        <circle key={i} cx={297} cy={y} r="0.8" fill={color} fillOpacity="0.6" />
      ))}
      <text x={310} y={67} textAnchor="middle" fill={color} fontSize="2.5" fontFamily="monospace" fontWeight="bold">API</text>
      <text x={310} y={71} textAnchor="middle" fill={color} fontSize="1.8" fontFamily="monospace" opacity="0.6">TOOLS</text>
    </g>
  );
}

function MemorySymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Register bank — stacked rows */}
      {[0, 4, 8, 12].map((dy, i) => (
        <rect key={i} x={272} y={140 + dy} width={26} height={3.5} rx="0.3"
          fill={color} fillOpacity={active ? (i === 0 ? 0.2 : 0.08) : 0.05}
          stroke={color} strokeWidth="0.3" />
      ))}
      {/* Address bus on left */}
      <line x1={272} y1={140} x2={268} y2={140} stroke={color} strokeWidth="0.4" />
      <line x1={272} y1={144} x2={268} y2={144} stroke={color} strokeWidth="0.4" />
      <line x1={272} y1={148} x2={268} y2={148} stroke={color} strokeWidth="0.4" />
      <text x={285} y={157} textAnchor="middle" fill={color} fontSize="2.2" fontFamily="monospace" opacity="0.6">MEMORY</text>
    </g>
  );
}

function AdaptabilitySymbol({ active, color }: { active: boolean; color: string }) {
  const op = active ? 1 : 0.45;
  return (
    <g opacity={op}>
      {/* Op-amp triangle */}
      <polygon points="183,140 183,156 195,148"
        fill={color} fillOpacity="0.1" stroke={color} strokeWidth="0.4" />
      {/* Feedback arc above */}
      <path d="M 195,145 Q 205,136 205,148 Q 205,160 195,151"
        fill="none" stroke={color} strokeWidth="0.5" />
      <polygon points="195,151 193,148 197,148" fill={color} opacity="0.7" />
      <text x={189} y={148} textAnchor="middle" fill={color} fontSize="2.5" fontFamily="monospace" fontWeight="bold">±</text>
      <text x={193} y={160} textAnchor="middle" fill={color} fontSize="2.2" fontFamily="monospace" opacity="0.6">ADAPT</text>
    </g>
  );
}

function AutonomySymbol({ active, color, tick }: { active: boolean; color: string; tick: number }) {
  const op = active ? 1 : 0.45;
  const angle = active ? (tick * 6) % 360 : 0;
  const rad = (angle * Math.PI) / 180;
  const dotX = 170 + 10 * Math.cos(rad);
  const dotY = 68 + 10 * Math.sin(rad);
  return (
    <g opacity={op}>
      {/* State bubble */}
      <circle cx={170} cy={68} r={12}
        fill={color} fillOpacity="0.06" stroke={color} strokeWidth="0.4" />
      {/* Circular FSM arrow */}
      <circle cx={170} cy={68} r={10}
        fill="none" stroke={color} strokeWidth="0.4" strokeDasharray="4 3" opacity="0.4" />
      {active && (
        <circle cx={dotX} cy={dotY} r="1.5" fill={color} opacity="0.9" />
      )}
      <text x={170} y={67} textAnchor="middle" fill={color} fontSize="3.5" fontFamily="monospace" fontWeight="bold">↻</text>
      <text x={170} y={72} textAnchor="middle" fill={color} fontSize="2.2" fontFamily="monospace" opacity="0.6">AUTO</text>
    </g>
  );
}

function AgentCoreSymbol({ active, color, tick }: { active: boolean; color: string; tick: number }) {
  const pulse = 0.06 + 0.03 * Math.sin(tick * 0.04);
  return (
    <g>
      {/* Outer glow */}
      <circle cx={240} cy={90} r={22}
        fill={color} fillOpacity={active ? 0.08 : pulse} />
      {/* Main body */}
      <rect x={224} y={76} width={32} height={28} rx="2"
        fill={color} fillOpacity={active ? 0.15 : 0.07}
        stroke={color} strokeWidth={active ? 0.8 : 0.5} />
      {/* Pin rows */}
      {[-6, -2, 2, 6].map((dy, i) => (
        <g key={i}>
          <line x1={224} y1={90 + dy} x2={220} y2={90 + dy} stroke={color} strokeWidth="0.4" />
          <line x1={256} y1={90 + dy} x2={260} y2={90 + dy} stroke={color} strokeWidth="0.4" />
        </g>
      ))}
      {/* Label */}
      <text x={240} y={87} textAnchor="middle" fill={color} fontSize="3.2" fontFamily="monospace" fontWeight="bold">AGENT</text>
      <text x={240} y={92} textAnchor="middle" fill={color} fontSize="2.2" fontFamily="monospace" opacity="0.7">CORE</text>
      <text x={240} y={97} textAnchor="middle" fill={color} fontSize="1.7" fontFamily="monospace" opacity="0.45">LLM + Planner</text>
    </g>
  );
}

/* ── Rating dots ─────────────────────────────────────────────────────────── */
function RatingDots({ score, color }: { score: number; color: string }) {
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className="w-2 h-2 rounded-full"
          style={{ background: n <= score ? color : `${color}25`, border: `1px solid ${color}55` }} />
      ))}
    </span>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function AIAgentsHologram() {
  const [mode, setMode] = useState<HologramMode>("idle");
  const [activeIdx, setActiveIdx] = useState(0);
  const [selected, setSelected] = useState<Characteristic | null>(null);
  const [tick, setTick] = useState(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => { tickRef.current += 1; setTick(t => t + 1); }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mode !== "play") return;
    const id = setInterval(() => setActiveIdx(i => (i + 1) % CHARS.length), 2200);
    return () => clearInterval(id);
  }, [mode]);

  const handleModeChange = useCallback((m: HologramMode) => {
    setMode(m);
    if (m === "idle") { setActiveIdx(0); setSelected(null); }
  }, []);

  const isActive = (id: string) => {
    if (mode === "idle") return false;
    if (mode === "failure") return true;
    return CHARS[activeIdx].id === id;
  };

  const activeChar = CHARS[activeIdx];
  const displayChar = selected ?? (mode !== "idle" ? activeChar : null);

  const packetPos = (tick % 60) / 60;

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* ── Main hologram ─────────────────────────────────────────────── */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border"
        style={{ background: "#080808" }}>

        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 space-y-1.5"
          style={{ background: "linear-gradient(to bottom,rgba(8,8,8,.95),transparent)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
              Top AI Agents — 5 Core Architecture Pillars
            </span>
            <ConfidenceBadgeTag confidence="VERIFIED" />
          </div>
          <HologramModeBar mode={mode} onModeChange={handleModeChange}
            currentStep={activeIdx} totalSteps={CHARS.length}
            onNextStep={() => setActiveIdx(i => Math.min(i + 1, CHARS.length - 1))}
            onPrevStep={() => setActiveIdx(i => Math.max(i - 1, 0))} />
        </div>

        <svg viewBox="0 0 480 170" className="w-full" style={{ minHeight: 340 }}>
          <defs>
            <pattern id="ai-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#111" strokeWidth="0.15" />
            </pattern>
            <pattern id="ai-via" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.5" fill="#222" />
            </pattern>
            <filter id="ai-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="ai-halo" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Substrate */}
          <rect width="480" height="170" fill="url(#ai-grid)" />
          <rect width="480" height="170" fill="url(#ai-via)" />

          {/* Pentagon backbone (interconnect ring) */}
          <polygon points={PENTAGON}
            fill="none"
            stroke={mode !== "idle" ? "#333" : "#1a1a1a"}
            strokeWidth="0.4"
            strokeDasharray="3 2"
            opacity={mode !== "idle" ? 0.5 : 0.25} />

          {/* Spoke traces: core → each satellite */}
          {CHARS.map((c, i) => {
            const active = mode !== "idle" && (mode === "failure" ? true : activeIdx === i);
            const px = 240 + packetPos * (c.cx - 240);
            const py = 90  + packetPos * (c.cy - 90);
            return (
              <g key={c.id}>
                <line x1={240} y1={90} x2={c.cx} y2={c.cy}
                  stroke={active ? c.color : "#1e1e1e"}
                  strokeWidth={active ? 1.2 : 0.5}
                  opacity={active ? 0.85 : 0.2} />
                {active && (
                  <line x1={240} y1={90} x2={c.cx} y2={c.cy}
                    stroke={c.color} strokeWidth="2.5" opacity="0.1" filter="url(#ai-glow)" />
                )}
                {active && (
                  <>
                    <circle cx={px} cy={py} r="2" fill={c.color} opacity="0.9" filter="url(#ai-glow)" />
                    <circle cx={240 + Math.max(0, packetPos - 0.18) * (c.cx - 240)}
                            cy={90  + Math.max(0, packetPos - 0.18) * (c.cy - 90)}
                            r="1" fill={c.color} opacity="0.35" />
                  </>
                )}
              </g>
            );
          })}

          {/* Ambient halos on each satellite (idle) */}
          {CHARS.map((c, i) => (
            <ellipse key={c.id} cx={c.cx} cy={c.cy} rx="18" ry="14"
              fill={c.color}
              fillOpacity={mode === "idle"
                ? 0.04 + 0.025 * Math.sin((tick + i * 22) * 0.04)
                : isActive(c.id) ? 0.07 : 0.015}
              filter="url(#ai-halo)" />
          ))}

          {/* Selection / active rings */}
          {CHARS.map((c, i) => {
            const highlight = (!selected && mode !== "idle" && activeIdx === i) || selected?.id === c.id;
            return highlight ? (
              <ellipse key={`sel-${c.id}`} cx={c.cx} cy={c.cy} rx="18" ry="15"
                fill="none" stroke={c.color} strokeWidth="0.6"
                strokeDasharray="3 2" opacity="0.7" filter="url(#ai-glow)" />
            ) : null;
          })}

          {/* Schematic symbols */}
          <ReasoningSymbol    active={isActive("reasoning")}    color={CHARS[0].color} />
          <ToolUseSymbol      active={isActive("tooluse")}      color={CHARS[1].color} />
          <MemorySymbol       active={isActive("memory")}       color={CHARS[2].color} />
          <AdaptabilitySymbol active={isActive("adaptability")} color={CHARS[3].color} />
          <AutonomySymbol     active={isActive("autonomy")}     color={CHARS[4].color} tick={tick} />
          <AgentCoreSymbol    active={mode !== "idle"}          color="#ffffff"        tick={tick} />

          {/* Clickable hit zones */}
          {CHARS.map(c => (
            <ellipse key={`hit-${c.id}`} cx={c.cx} cy={c.cy} rx="22" ry="18"
              fill="transparent" className="cursor-pointer"
              onClick={() => setSelected(selected?.id === c.id ? null : c)} />
          ))}

          {/* Number badges on satellites */}
          {CHARS.map((c, i) => {
            const active = isActive(c.id) || selected?.id === c.id;
            const badgeX = c.cx + (c.cx < 240 ? -20 : c.cx > 240 ? 20 : 0);
            const badgeY = c.cy + (c.cy < 90 ? -12 : 12);
            return (
              <g key={`badge-${c.id}`}>
                <circle cx={badgeX} cy={badgeY} r="4"
                  fill={c.color} fillOpacity={active ? 0.2 : 0.07}
                  stroke={c.color} strokeWidth="0.4" strokeOpacity={active ? 0.9 : 0.35} />
                <text x={badgeX} y={badgeY + 1.5} textAnchor="middle"
                  fill={c.color} fontSize="3.5" fontFamily="monospace" fontWeight="bold"
                  opacity={active ? 1 : 0.45}>{i + 1}</text>
              </g>
            );
          })}

          {/* Short label below each satellite */}
          {CHARS.map(c => {
            const active = isActive(c.id) || selected?.id === c.id;
            const labelY = c.cy + (c.cy < 90 ? 18 : -18);
            return (
              <text key={`lbl-${c.id}`} x={c.cx} y={labelY} textAnchor="middle"
                fill={c.color} fontSize="2.4" fontFamily="monospace" fontWeight="600"
                opacity={active ? 0.9 : 0.3}>
                {c.short}
              </text>
            );
          })}

          {/* Active characteristic tagline */}
          {mode !== "idle" && !selected && (
            <g>
              <rect x={10} y={155} width={460} height={11} rx="1"
                fill={activeChar.color + "12"} stroke={activeChar.color} strokeWidth="0.3" />
              <text x={240} y={162.5} textAnchor="middle"
                fill={activeChar.color} fontSize="2.8" fontFamily="monospace" opacity="0.9">
                {activeChar.tagline}
              </text>
            </g>
          )}

          {/* Header */}
          <text x="240" y="11" textAnchor="middle" fill="#444" fontSize="2.6"
            fontFamily="monospace">
            AUTONOMOUS · REASONING · TOOLS · MEMORY · ADAPTABLE
          </text>
        </svg>

        {/* Scanline */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.02 }}>
          <div className="absolute inset-x-0 h-px bg-primary animate-scan-line" />
        </div>

        {/* Source bar */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded"
            style={{ background: "rgba(8,8,8,.85)", border: "1px solid #1e1e1e" }}>
            Agents: Claude · Devin · Operator · Agentforce — 5 architectural commonalities
          </span>
          {mode !== "idle" && !selected && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ color: activeChar.color, background: "rgba(8,8,8,.85)", border: `1px solid ${activeChar.color}44` }}>
              {activeIdx + 1}/5 — {activeChar.short}
            </span>
          )}
        </div>
      </div>

      {/* ── Inspector panel ───────────────────────────────────────────── */}
      <div className="lg:w-72 fx-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,.06)" }}>
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            Pillar Inspector
          </span>
        </div>

        <AnimatePresence mode="wait">
          {displayChar ? (
            <motion.div key={displayChar.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <h4 className="text-sm font-semibold leading-tight mb-1" style={{ color: displayChar.color }}>
                  {displayChar.name}
                </h4>
                <ConfidenceBadgeTag confidence="VERIFIED" />
              </div>

              <p className="text-xs text-secondary-foreground leading-relaxed">
                {displayChar.description}
              </p>

              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Key requirements</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {displayChar.details.map((d, i) => (
                    <span key={i} className="px-1.5 py-0.5 text-[9px] font-mono rounded"
                      style={{ background: `${displayChar.color}14`, border: `1px solid ${displayChar.color}33`, color: displayChar.color }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent ratings</span>
                <div className="mt-1.5 space-y-1.5">
                  {AGENTS.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                        <span className="text-[10px] font-mono text-foreground truncate">{a.label}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">({a.org})</span>
                      </div>
                      <RatingDots score={displayChar.ratings[a.id] ?? 3} color={a.color} />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="p-4 flex-1 flex flex-col items-center justify-center gap-3">
              {/* Mini summary grid (idle state) */}
              <div className="w-full space-y-2">
                {CHARS.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 transition-colors hover:bg-white/5"
                    onClick={() => setSelected(c)}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0"
                      style={{ background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}44` }}>
                      {i + 1}
                    </span>
                    <span className="text-[10px] font-mono text-foreground flex-1 truncate">{c.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground text-center">
                Click a pillar or use mode bar
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
