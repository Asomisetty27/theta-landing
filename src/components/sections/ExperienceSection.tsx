import { motion } from "framer-motion";
import { experiences } from "@/data/portfolioData";
import { useViewMode } from "@/contexts/ViewModeContext";
import { ConfidenceBadgeTag, SectionTitle } from "@/components/ui/mission-ui";
import { Building2, Calendar, TrendingDown } from "lucide-react";

export default function ExperienceSection() {
  const { mode } = useViewMode();

  return (
    <section className="max-w-3xl mx-auto fx-blur-reveal">
      <SectionTitle>Experience</SectionTitle>
      <p className="text-xs text-muted-foreground mb-6 -mt-2">Roles emphasizing process improvement, operational rigor, and regulated environments.</p>

      <div className="space-y-6">
        {experiences.map((exp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 0.68, 0, 1.0] }}
            className="fx-glass fx-card rounded-lg p-5 relative overflow-hidden"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.35), transparent)" }}
            />
            {/* Subtle top glow */}
            <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 60% 100% at 30% 0%, hsl(var(--primary) / 0.06), transparent)" }}
            />
            <div className="flex items-start justify-between mb-3 relative">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <div className="p-1.5 rounded"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))",
                      border: "1px solid hsl(var(--primary) / 0.2)",
                    }}>
                    <Building2 size={14} className="text-primary" />
                  </div>
                  {exp.company}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{exp.role} — {exp.location}</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 px-2 py-1 rounded"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid hsl(var(--border))",
                }}>
                <Calendar size={11} />
                {exp.period}
              </span>
            </div>

            <ul className="space-y-2">
              {exp.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">▸</span>
                  <div className="flex-1">
                    <span className="text-secondary-foreground">{b.text}</span>
                    {mode === "engineer" && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <ConfidenceBadgeTag confidence={b.confidence} />
                        {b.evidence_source && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ({b.evidence_source})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Process Improvement Card (Natera) */}
            {exp.processImprovement && (
              <div className="mt-4 border border-panel-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown size={14} className="text-neon-green" />
                  <span className="text-xs font-mono font-semibold text-neon-green uppercase tracking-wider">
                    Process Improvement
                  </span>
                </div>

                {/* Before / After */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="border border-neon-red/20 rounded p-2.5 bg-neon-red/5">
                    <div className="text-[10px] font-mono text-neon-red mb-1 uppercase">Before</div>
                    <div className="text-sm text-foreground font-mono">{exp.processImprovement.before}</div>
                  </div>
                  <div className="border border-neon-green/20 rounded p-2.5 bg-neon-green/5">
                    <div className="text-[10px] font-mono text-neon-green mb-1 uppercase">After</div>
                    <div className="text-sm text-foreground font-mono">{exp.processImprovement.after}</div>
                  </div>
                </div>

                {/* What Changed */}
                <div className="mb-3">
                  <div className="text-[10px] font-mono text-muted-foreground mb-1.5 uppercase">What Changed</div>
                  <ul className="space-y-1">
                    {exp.processImprovement.whatChanged.map((item, k) => (
                      <li key={k} className="text-xs text-secondary-foreground flex items-start gap-1.5">
                        <span className="text-neon-cyan mt-0.5">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Measurement Method */}
                <div className="text-[10px] font-mono text-neon-amber border border-neon-amber/20 rounded p-2 bg-neon-amber/5">
                  ⚠ {exp.processImprovement.measurementMethod}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
