import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useViewMode } from "@/contexts/ViewModeContext";
import { SectionTitle } from "@/components/ui/mission-ui";
import { ChevronDown } from "lucide-react";

interface SkillEntry {
  name: string;
  evidence: string;
  projectLink?: string;
}

const skillCategories: { id: string; title: string; color: string; skills: SkillEntry[] }[] = [
  {
    id: "test",
    title: "Test & Validation",
    color: "neon-green",
    skills: [
      { name: "Debugging & Root Cause Analysis", evidence: "6 RGM failure modes resolved (EE 241)", projectLink: "rgm-machine" },
      { name: "Test Equipment (Oscilloscope, Function Generator)", evidence: "EE 241 lab equipment for all circuits", projectLink: "rgm-machine" },
      { name: "Signal Validation & Measurement", evidence: "EE 143 ADC/DAC pipeline verification", projectLink: "ee143-signal-system" },
      { name: "Metrology (Calipers, Micrometers)", evidence: "IME 144 part inspection ±0.001\"", projectLink: "manufacturing-systems" },
      { name: "Simulation vs Hardware Correlation", evidence: "LTSpice DAC sim verified against physical PCB", projectLink: "ee143-signal-system" },
    ],
  },
  {
    id: "analog",
    title: "Circuits & Analog Systems",
    color: "neon-cyan",
    skills: [
      { name: "Op-Amp Circuit Design", evidence: "Summing amp, voltage follower, Schmitt trigger (EE 241/143)", projectLink: "ee143-signal-system" },
      { name: "Sensor Integration", evidence: "Capacitive touch, photoresistor, inductance sensing (EE 241)", projectLink: "rgm-machine" },
      { name: "555 Timer / Oscillator Design", evidence: "LC oscillator metal detector — 8,760 Hz baseline", projectLink: "detect-7" },
      { name: "PCB Design & Reflow Soldering", evidence: "4-bit DAC PCB via Fusion 360 → reflow", projectLink: "ee143-signal-system" },
      { name: "LTSpice Simulation", evidence: "Pre-fabrication DAC verification", projectLink: "ee143-signal-system" },
      { name: "Soldering & Prototyping", evidence: "Breadboard + PCB assembly across EE 241 labs", projectLink: "rgm-machine" },
    ],
  },
  {
    id: "digital",
    title: "Digital Systems",
    color: "neon-magenta",
    skills: [
      { name: "SystemVerilog / HDL", evidence: "OTTER MCU — full RV32I CPU (CPE 233)", projectLink: "digital-systems" },
      { name: "RISC-V Architecture", evidence: "Instruction fetch/decode/execute pipeline", projectLink: "digital-systems" },
      { name: "FPGA Synthesis (Vivado)", evidence: "CPU synthesized and verified on FPGA", projectLink: "digital-systems" },
      { name: "FSM Design", evidence: "FETCH→EXEC control unit, Moore/Mealy machines", projectLink: "digital-systems" },
      { name: "Arduino / Embedded C++", evidence: "RGM: capacitive sensing, frequency measurement, MOSFET control", projectLink: "rgm-machine" },
    ],
  },
  {
    id: "tools",
    title: "Tools & Software",
    color: "neon-amber",
    skills: [
      { name: "CAD (SolidWorks, Fusion 360)", evidence: "IME 144 air motor + RGM custom parts", projectLink: "manufacturing-systems" },
      { name: "GD&T / Engineering Drawings (ASME Y14.5)", evidence: "All IME 144 production drawings", projectLink: "manufacturing-systems" },
      { name: "Manual Machining (Lathe & Mill)", evidence: "6 precision parts for air motor", projectLink: "manufacturing-systems" },
      { name: "React / TypeScript / Web Development", evidence: "Funck platform — funck.live", projectLink: "funck" },
      { name: "Git / Version Control", evidence: "All software projects", projectLink: "funck" },
    ],
  },
];

export default function SkillsSection() {
  const { mode } = useViewMode();
  const [expandedCategory, setExpandedCategory] = useState<string | null>("test");

  return (
    <section className="max-w-3xl mx-auto fx-blur-reveal">
      <SectionTitle>Skills</SectionTitle>

      <div className="space-y-3">
        {skillCategories.map((cat) => {
          const isOpen = expandedCategory === cat.id;
          return (
            <div key={cat.id} className="fx-glass rounded-lg overflow-hidden relative">
              {/* Top gradient accent — color-coded per category */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, hsl(var(--${cat.color}) / ${isOpen ? 0.6 : 0.3}), transparent)`,
                  transition: "all .3s",
                }}
              />
              <button
                onClick={() => setExpandedCategory(isOpen ? null : cat.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-panel-highlight/40 transition-all duration-200 relative group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      backgroundColor: `hsl(var(--${cat.color}))`,
                      boxShadow: isOpen ? `0 0 8px hsl(var(--${cat.color}) / 0.6)` : `0 0 4px hsl(var(--${cat.color}) / 0.3)`,
                    }}
                  />
                  <span className="text-sm font-semibold text-foreground">{cat.title}</span>
                  <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded"
                    style={{
                      background: `hsl(var(--${cat.color}) / 0.08)`,
                      border: `1px solid hsl(var(--${cat.color}) / 0.2)`,
                      color: `hsl(var(--${cat.color}))`,
                    }}>
                    {cat.skills.length}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 border-t border-panel-border pt-3 space-y-1.5">
                      {cat.skills.map((skill, i) => (
                        <motion.div
                          key={skill.name}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-start justify-between gap-3 px-3 py-2 rounded border border-panel-border hover:bg-panel-highlight transition-colors"
                        >
                          <div className="min-w-0">
                            <span className="text-sm text-foreground">{skill.name}</span>
                            {mode === "engineer" && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{skill.evidence}</p>
                            )}
                          </div>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5"
                            style={{
                              color: `hsl(var(--${cat.color}))`,
                              borderColor: `hsl(var(--${cat.color}) / 0.3)`,
                              backgroundColor: `hsl(var(--${cat.color}) / 0.08)`,
                            }}
                          >
                            VERIFIED
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
