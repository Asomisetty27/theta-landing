import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Github, Zap } from "lucide-react";

export default function ThermalOSBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: [0.22, 0.68, 0, 1.0] }}
      className="fx-glass relative rounded-lg p-5 mb-8 overflow-hidden hover:-translate-y-0.5 transition-transform duration-300"
      style={{
        borderLeft: "2px solid #1D9E75",
        boxShadow: "0 0 0 0.5px rgba(53,199,146,.06) inset, 0 8px 32px rgba(0,0,0,.35), 0 0 60px rgba(53,199,146,.04)",
      }}
    >
      {/* Animated top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, transparent 0%, #0F6E56 25%, #35C792 50%, #0F6E56 75%, transparent 100%)" }}
      />
      {/* Top radial green glow */}
      <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none opacity-60"
        style={{ background: "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(53,199,146,.10), transparent)" }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-mono tracking-[0.15em] uppercase fx-grad-text-green font-semibold">
              Active Project · Live
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(15,110,86,.25) 0%, rgba(15,110,86,.08) 100%)",
                border: "1px solid rgba(29,158,117,.4)",
                boxShadow: "0 0 0 0.5px rgba(53,199,146,.08) inset",
              }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#35C792] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#35C792]" style={{ boxShadow: "0 0 6px #35C792" }} />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9FE1CB]">
                Stage 1 Complete · Ship v0.1.9
              </span>
            </span>
          </div>
        </div>

        <h2 className="font-display text-lg md:text-xl tracking-wide text-foreground mb-1">
          <span className="fx-grad-text-green font-semibold">ThermalOS</span>{" "}
          <span className="text-secondary-foreground text-base md:text-lg">
            — Open-source GPU thermal-power forensics
          </span>
        </h2>

        <p className="font-mono text-[12px] text-[#9FE1CB]/80 mb-3">
          Real-time R_θ = ΔT/P · failure prediction · SDC detection · DCGM + Redfish fusion · Targeting YC W27
        </p>

        <p className="text-sm text-secondary-foreground leading-relaxed mb-4">
          Stage 1 (Tesla T4 / Colab, 8,734 telemetry rows) closed with controlled-variable evidence of GPU
          thermal memory: <span className="text-[#9FE1CB] font-semibold">a 2°C ambient delta produces a 3.5× change in power-recovery time</span> (n=7, within-condition CV 1.8%).
          Stage 2 deploys on Cal Poly's Noyce AI Factory DGX B200 cluster before fall semester.
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {["pynvml", "DCGM", "Redfish/BMC", "scikit-learn", "Prometheus", "FastAPI", "SLURM", "Supabase"].map((t) => (
            <span
              key={t}
              className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors hover:text-white"
              style={{
                background: "linear-gradient(135deg, rgba(15,110,86,.15) 0%, rgba(15,110,86,.05) 100%)",
                border: "1px solid rgba(29,158,117,.3)",
                color: "#9FE1CB",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { v: "3.5×", l: "recovery delta · 2°C ambient" },
            { v: "8,734", l: "Stage 1 telemetry rows" },
            { v: "v0.1.9", l: "live on PyPI" },
          ].map((s) => (
            <div key={s.l}
              className="rounded p-2 text-center relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(10,10,8,.7) 0%, rgba(10,10,8,.5) 100%)",
                border: "1px solid rgba(255,255,255,.06)",
                boxShadow: "inset 0 0 0 0.5px rgba(53,199,146,.04)",
              }}>
              <div className="font-display text-base tabular-nums font-semibold"
                style={{
                  background: "linear-gradient(135deg, #E8F5EE 0%, #35C792 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>{s.v}</div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/thermalos"
            className="fx-shimmer inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-white text-[12px] font-mono font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)",
              boxShadow: "0 4px 16px rgba(53,199,146,.18), 0 0 0 0.5px rgba(53,199,146,.2) inset",
            }}
          >
            <Zap size={12} />
            Open Dashboard
            <ArrowRight size={12} />
          </Link>
          <a
            href="https://github.com/Asomisetty27/thermalos"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-muted-foreground hover:text-foreground text-[12px] font-mono transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,.04) 0%, transparent 100%)",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <Github size={12} />
            GitHub
          </a>
        </div>
      </div>
    </motion.div>
  );
}
