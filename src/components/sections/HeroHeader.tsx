import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const NAME_CHARS = "AMOGH SOMISETTY".split("");
const COORDS = "37.1350° N / 120.6166° W";

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, "0");
      setTime(`${h}:${m}:${s}.${ms}`);
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, []);
  return <span className="t-mono-xs t-tabular" style={{ color: "var(--t-faint)" }}>{time}</span>;
}

export default function HeroHeader() {
  return (
    <div className="mb-8 relative select-none">
      {/* Radial glow behind name */}
      <div
        className="absolute -inset-8 -z-10 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 18% 50%, hsl(170 80% 50% / 0.07), transparent)",
        }}
      />

      {/* Top status bar */}
      <motion.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <span className="t-mono-xs" style={{ color: "var(--t-blueprint-ink)", letterSpacing: "0.14em" }}>
          {COORDS} — SLO, CA
        </span>
        <LiveClock />
      </motion.div>

      {/* Divider */}
      <div
        className="mb-4 h-px"
        style={{ background: "linear-gradient(90deg, hsl(170 80% 50% / 0.25), hsl(170 80% 50% / 0.06) 60%, transparent)" }}
      />

      {/* Name — character-by-character spring reveal */}
      <div className="overflow-hidden">
        <h1
          style={{
            fontFamily: "var(--t-font-display)",
            fontSize: "clamp(38px, 6vw, 56px)",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 0,
          }}
        >
          {NAME_CHARS.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              transition={{
                delay: 0.18 + i * 0.032,
                duration: 0.55,
                ease: [0.22, 0.68, 0, 1.1],
              }}
              style={{
                display: "inline-block",
                background: ch === " " ? "none" : "linear-gradient(160deg, hsl(43 75% 78%) 0%, hsl(43 68% 50%) 50%, hsl(34 60% 40%) 100%)",
                WebkitBackgroundClip: ch === " " ? "unset" : "text",
                WebkitTextFillColor: ch === " " ? "transparent" : "transparent",
                backgroundClip: ch === " " ? "unset" : "text",
                width: ch === " " ? "0.3em" : "auto",
              }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </h1>
      </div>

      {/* Subtitle */}
      <motion.p
        className="font-mono text-base mt-3 leading-snug"
        style={{ color: "var(--t-text)" }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        Systems-Oriented Electrical Engineer
      </motion.p>

      {/* Status strip */}
      <motion.div
        className="flex flex-wrap items-center gap-3 mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.35 }}
      >
        <span className="flex items-center gap-1.5 t-mono-xs" style={{ color: "var(--t-healthy)" }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D4AF37] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#D4AF37]" style={{ boxShadow: "0 0 6px #D4AF37" }} />
          </span>
          SYS NOMINAL
        </span>
        <span className="t-mono-xs" style={{ color: "var(--t-faint)" }}>◆</span>
        <span className="t-mono-xs" style={{ color: "var(--t-muted)" }}>CAL POLY EE · SOPHOMORE</span>
        <span className="t-mono-xs" style={{ color: "var(--t-faint)" }}>◆</span>
        <span className="t-mono-xs" style={{ color: "var(--t-blueprint-ink)" }}>YC W27 TARGET</span>
      </motion.div>
    </div>
  );
}
