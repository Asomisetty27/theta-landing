import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  label: string;
  sublabel: string;
  ms: number; // duration in ms to fill
  delay: number;
}

const TASKS: Task[] = [
  { id: "tel",  label: "TELEMETRY SYSTEMS",  sublabel: "pynvml · DCGM · 8,734 rows", ms: 820, delay: 80  },
  { id: "vlt",  label: "EVIDENCE VAULT",     sublabel: "Stage 1 · F1-F6 validated",   ms: 950, delay: 160 },
  { id: "dp",   label: "DATAPATH MODULE",    sublabel: "R_θ pipeline · v0.1.9",        ms: 720, delay: 0   },
  { id: "disp", label: "DISPLAY SUBSYS",     sublabel: "Space Grotesk · JetBrains",   ms: 640, delay: 240 },
];

const TOTAL_MS = 1300; // when all tasks are expected to finish

function TaskRow({ task, started }: { task: Task; started: boolean }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (!started) return;
    const delayId = setTimeout(() => {
      const begin = performance.now();
      startedAt.current = begin;
      const tick = (now: number) => {
        const elapsed = now - begin;
        const pct = Math.min(elapsed / task.ms, 1);
        setProgress(pct);
        if (pct < 1) {
          rafId.current = requestAnimationFrame(tick);
        } else {
          setDone(true);
        }
      };
      rafId.current = requestAnimationFrame(tick);
    }, task.delay);

    return () => {
      clearTimeout(delayId);
      cancelAnimationFrame(rafId.current);
    };
  }, [started, task.ms, task.delay]);

  const barW = Math.round(progress * 14);
  const barEmpty = 14 - barW;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: task.delay / 1000, duration: 0.22 }}
      className="flex items-center gap-3"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Status indicator */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300"
        style={{
          background: done ? "#D4AF37" : progress > 0 ? "hsl(38 90% 55%)" : "#525a55",
          boxShadow: done ? "0 0 6px #D4AF37" : progress > 0 ? "0 0 4px hsl(38 90% 55%)" : "none",
        }}
      />

      {/* ASCII progress bar */}
      <span
        className="text-xs flex-shrink-0 tabular-nums"
        style={{ color: done ? "#D4AF37" : "#6E91C8", letterSpacing: "0em" }}
      >
        [{("█").repeat(barW)}{("░").repeat(barEmpty)}]
      </span>

      {/* Label */}
      <span className="text-[11px] flex-shrink-0" style={{ color: done ? "#9FE1CB" : "#8A938F", letterSpacing: "0.08em" }}>
        {task.label}
      </span>

      {/* Sublabel + status */}
      <span className="text-[10px] truncate" style={{ color: "#525a55" }}>
        {done ? "✓ READY" : progress > 0 ? task.sublabel : "PENDING"}
      </span>
    </motion.div>
  );
}

export default function BootAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"booting" | "complete" | "exiting">("booting");
  const [allDone, setAllDone] = useState(false);

  // Start all tasks immediately
  const started = true;

  useEffect(() => {
    const t = setTimeout(() => setAllDone(true), TOTAL_MS + 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!allDone) return;
    const t1 = setTimeout(() => setPhase("complete"), 60);
    const t2 = setTimeout(() => setPhase("exiting"), 700);
    const t3 = setTimeout(() => onComplete(), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [allDone, onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exiting" && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "#07090E" }}
          exit={{ opacity: 0, scale: 1.01, filter: "blur(6px)" }}
          transition={{ duration: 0.42, ease: [0.22, 0.68, 0, 1.0] }}
        >
          {/* Scan line sweep */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute inset-x-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, hsl(170 80% 50% / 0.18), transparent)" }}
              animate={{ y: ["0vh", "100vh"] }}
              transition={{ duration: 2.8, ease: "linear", repeat: Infinity }}
            />
          </div>

          {/* Blueprint grid faint */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(110,145,200,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(110,145,200,.05) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              opacity: 0.6,
            }}
          />

          <div className="w-full max-w-[520px] px-8 relative">
            {/* Header */}
            <motion.div
              className="mb-7"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-1">
                {/* Hex badge */}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 1 L18.66 6 L18.66 14 L10 19 L1.34 14 L1.34 6 Z" stroke="hsl(43 68% 50%)" strokeWidth="1" fill="none" />
                  <circle cx="10" cy="10" r="2.5" fill="hsl(43 68% 50%)" />
                </svg>
                <h1
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "18px",
                    letterSpacing: "0.28em",
                    fontWeight: 500,
                    background: "linear-gradient(90deg, hsl(170 90% 70%), hsl(43 68% 50%))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  A.SOMISETTY
                </h1>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  color: "#525a55",
                  marginLeft: "32px",
                }}
              >
                MISSION CONSOLE · v2.0 · BOOT SEQUENCE INITIATED
              </div>
              <div className="mt-2.5 h-px" style={{ background: "linear-gradient(90deg, hsl(170 80% 50% / 0.4), transparent)" }} />
            </motion.div>

            {/* Task rows */}
            <div className="space-y-2.5 mb-7">
              {TASKS.map((task) => (
                <TaskRow key={task.id} task={task} started={started} />
              ))}
            </div>

            {/* Master progress bar */}
            <div className="mb-5">
              <div className="h-px rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: allDone ? "100%" : "92%" }}
                  transition={{ duration: allDone ? 0.3 : TOTAL_MS / 1000, ease: allDone ? "easeOut" : "linear" }}
                  style={{
                    background: phase === "complete"
                      ? "linear-gradient(90deg, #1D9E75, #D4AF37)"
                      : "linear-gradient(90deg, hsl(170 80% 40%), hsl(43 68% 50%))",
                  }}
                />
              </div>
            </div>

            {/* Status line */}
            <motion.div
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: "0.15em" }}
              animate={{ color: phase === "complete" ? "#D4AF37" : "#8A938F" }}
              transition={{ duration: 0.3 }}
            >
              {phase === "complete" ? (
                <span style={{ textShadow: "0 0 8px #D4AF37" }}>
                  ✓ ALL SYSTEMS NOMINAL — MOUNTING INTERFACE
                </span>
              ) : (
                <span>INITIALIZING SUBSYSTEMS...</span>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
