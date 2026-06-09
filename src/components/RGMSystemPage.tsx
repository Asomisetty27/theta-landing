import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { projects, type RGMStage, type FailureMode } from "@/data/portfolioData";
import { useViewMode } from "@/contexts/ViewModeContext";
import { ConfidenceBadgeTag, PanelHeader } from "@/components/ui/mission-ui";
import { ChevronDown, AlertTriangle, CheckCircle2, Play, ArrowRight } from "lucide-react";

const RGMHologram = lazy(() => import("@/components/holograms/RGMHologram"));

const rgmProject = projects.find(p => p.id === "rgm-machine")!;
const stages = rgmProject.module.rgmStages || [];
const failureModes = rgmProject.module.failureModes;
const validationResults = rgmProject.module.validationResults || [];

const stageColors = [
  "#00d4aa", "#44aaff", "#ffaa00", "#ff4488", "#00aaff",
  "#00ff88", "#ff6644", "#ffcc00", "#00ffcc",
];

export default function RGMSystemPage({ onBack }: { onBack: () => void }) {
  const { mode } = useViewMode();
  const [selectedStage, setSelectedStage] = useState<RGMStage | null>(null);
  const [showFailures, setShowFailures] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="text-xs font-mono text-muted-foreground hover:text-primary mb-2 flex items-center gap-1">
          ← Back to Projects
        </button>
        <h1 className="font-display text-2xl md:text-3xl tracking-wider text-primary neon-text-cyan">
          Rube Goldberg Machine
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          9-Stage Electromechanical Chain Reaction — EE 241-01 | Winter 2026
        </p>
      </div>

      {/* HOLOGRAM — always visible */}
      <Suspense fallback={<div className="h-80 flex items-center justify-center text-muted-foreground font-mono text-sm animate-pulse">Loading holographic display...</div>}>
        <RGMHologram />
      </Suspense>

      {/* Problem + System Overview */}
      <div className="panel-glass rounded-lg p-4 border-l-2 border-l-neon-green">
        <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-2 uppercase">System Problem</h4>
        <p className="text-sm text-secondary-foreground leading-relaxed mb-3">{rgmProject.module.problemStatement}</p>
        <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-2 uppercase">System Overview</h4>
        <p className="text-sm text-secondary-foreground leading-relaxed">{rgmProject.module.systemOverview}</p>
      </div>

      {/* Hero evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rgmProject.heroImage && (
          <div className="panel-glass rounded-lg overflow-hidden">
            <PanelHeader>Setup Photo — VERIFIED</PanelHeader>
            <div className="p-2">
              <img src={rgmProject.heroImage} alt="Complete RGM Setup" className="w-full rounded" loading="lazy" />
              <div className="text-[10px] font-mono text-muted-foreground mt-1 px-1">
                Source: Lab_Final_Report, p1 (Figure 1)
              </div>
            </div>
          </div>
        )}
        {rgmProject.videoPath && (
          <div className="panel-glass rounded-lg overflow-hidden">
            <PanelHeader>
              <span className="flex items-center gap-1.5"><Play size={12} /> Video Demonstration — VERIFIED</span>
            </PanelHeader>
            <div className="p-2">
              <video controls className="w-full rounded" preload="metadata">
                <source src={rgmProject.videoPath} type="video/mp4" />
              </video>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 px-1">
                EE_241_Final_Demonstration.mp4 — March 10, 2026
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Flow */}
      <div className="panel-glass rounded-lg overflow-hidden">
        <PanelHeader>Nine-Stage Signal Chain</PanelHeader>
        <div className="p-4">
          {/* Block diagram */}
          <div className="mb-4 border border-panel-border rounded overflow-hidden">
            <img src="/evidence/rgm-block-diagram.png" alt="RGM Block Diagram" className="w-full" loading="lazy" />
            <div className="text-[10px] font-mono text-muted-foreground px-2 py-1 border-t border-panel-border flex items-center gap-2">
              <ConfidenceBadgeTag confidence="VERIFIED" />
              Lab_Final_Report, p2
            </div>
          </div>

          {/* Signal chain visualization */}
          <div className="flex flex-wrap items-center gap-1 mb-4 px-2">
            {stages.map((stage, i) => (
              <div key={stage.number} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedStage(selectedStage?.number === stage.number ? null : stage)}
                  className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${
                    selectedStage?.number === stage.number
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground border border-transparent hover:border-panel-border"
                  }`}
                  style={selectedStage?.number === stage.number ? { color: stageColors[i] } : {}}
                >
                  {stage.number}
                </button>
                {i < stages.length - 1 && <ArrowRight size={10} className="text-muted-foreground/30" />}
              </div>
            ))}
          </div>

          {/* Interactive stages grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {stages.map((stage, i) => {
              const isSelected = selectedStage?.number === stage.number;
              const color = stageColors[i];
              return (
                <button
                  key={stage.number}
                  onClick={() => setSelectedStage(isSelected ? null : stage)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-panel-border hover:border-primary/20 hover:bg-panel-highlight"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
                      style={{ backgroundColor: color + "20", color, border: `1px solid ${color}40` }}
                    >
                      {stage.number}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">{stage.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">{stage.labSource}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Stage Detail */}
      <AnimatePresence mode="wait">
        {selectedStage && (
          <motion.div
            key={selectedStage.number}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="panel-glass rounded-lg overflow-hidden"
          >
            <PanelHeader>Stage {selectedStage.number}: {selectedStage.name}</PanelHeader>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-mono font-semibold text-primary uppercase mb-1">What It Does</h4>
                  <p className="text-sm text-secondary-foreground leading-relaxed">{selectedStage.whatItDoes}</p>
                </div>
                <div>
                  <h4 className="text-xs font-mono font-semibold text-primary uppercase mb-1">How It Works</h4>
                  <p className="text-sm text-secondary-foreground leading-relaxed">{selectedStage.howItWorks}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-neon-amber/20 rounded p-2.5 bg-neon-amber/5">
                  <div className="text-[10px] font-mono text-neon-amber mb-1 uppercase">Stage Input</div>
                  <div className="text-xs text-foreground">{selectedStage.input}</div>
                </div>
                <div className="border border-neon-green/20 rounded p-2.5 bg-neon-green/5">
                  <div className="text-[10px] font-mono text-neon-green mb-1 uppercase">Stage Output</div>
                  <div className="text-xs text-foreground">{selectedStage.output}</div>
                </div>
              </div>
              {selectedStage.keyComponents && (
                <div>
                  <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase mb-1.5">Key Components</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStage.keyComponents.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 text-[10px] font-mono rounded border border-panel-border text-muted-foreground">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-[10px] font-mono text-muted-foreground">Evidence: {selectedStage.evidenceSource}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Summary */}
      {rgmProject.module.verificationSummary && rgmProject.module.verificationSummary.length > 0 && (
        <div className="panel-glass rounded-lg overflow-hidden">
          <PanelHeader>Verification Summary — Cited Values</PanelHeader>
          <div className="p-4">
            <div className="border border-panel-border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-panel-border bg-panel-highlight/50">
                    <th className="text-left px-3 py-1.5 font-mono text-muted-foreground">Parameter</th>
                    <th className="text-left px-3 py-1.5 font-mono text-muted-foreground">Value</th>
                    <th className="text-left px-3 py-1.5 font-mono text-muted-foreground hidden sm:table-cell">Source</th>
                    <th className="text-left px-3 py-1.5 font-mono text-muted-foreground hidden md:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rgmProject.module.verificationSummary.map((row, i) => (
                    <tr key={i} className="border-b border-panel-border/50 last:border-0">
                      <td className="px-3 py-1.5 text-foreground">{row.parameter}</td>
                      <td className="px-3 py-1.5 text-neon-cyan font-mono">{row.value} {row.unit}</td>
                      <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell">{row.evidence_source}</td>
                      <td className="px-3 py-1.5 hidden md:table-cell"><ConfidenceBadgeTag confidence={row.confidence} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schematics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel-glass rounded-lg overflow-hidden">
          <PanelHeader>Last Step — Tilt Switch + I2C LCD</PanelHeader>
          <div className="p-2">
            <img src="/evidence/rgm-last-step-schematic.png" alt="Last Step Schematic" className="w-full rounded" loading="lazy" />
            <div className="text-[10px] font-mono text-muted-foreground mt-1 px-1 flex items-center gap-2">
              <ConfidenceBadgeTag confidence="VERIFIED" />
              Lab_Final_Report, p6
            </div>
          </div>
          {mode === "engineer" && (
            <div className="px-4 pb-4 text-xs text-secondary-foreground space-y-1">
              <p>• TILT_PIN uses INPUT_PULLUP — default HIGH, closure pulls LOW</p>
              <p>• I2C LCD: 0x27 via PCF8574 backpack</p>
              <p>• fillLCD() writes custom 0xFF block to all 32 positions</p>
            </div>
          )}
        </div>
        <div className="panel-glass rounded-lg overflow-hidden">
          <PanelHeader>555 Timer Metal Detector</PanelHeader>
          <div className="p-2">
            <img src="/evidence/ee241-lab6-555timer.jpg" alt="555 Timer Schematic" className="w-full rounded" loading="lazy" />
            <div className="text-[10px] font-mono text-muted-foreground mt-1 px-1 flex items-center gap-2">
              <ConfidenceBadgeTag confidence="VERIFIED" />
              EE_241_Lab_6
            </div>
          </div>
        </div>
      </div>

      {/* Failure Modes */}
      <div className="panel-glass rounded-lg overflow-hidden">
        <button
          onClick={() => setShowFailures(!showFailures)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-panel-highlight transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-neon-amber" />
            <span className="text-xs font-mono font-semibold text-neon-amber tracking-wider uppercase">
              Debugging & Failure Modes ({failureModes.length} Issues Resolved)
            </span>
          </div>
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showFailures ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showFailures && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-3 border-t border-panel-border pt-3">
                {failureModes.map((fm, i) => (
                  <FailureModeCard key={i} fm={fm} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Validation */}
      {validationResults.length > 0 && (
        <div className="panel-glass rounded-lg overflow-hidden">
          <PanelHeader>Demo Day — All 9 Stages Verified</PanelHeader>
          <div className="p-4 space-y-1.5">
            {validationResults.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-secondary-foreground">
                <CheckCircle2 size={12} className="text-neon-green mt-0.5 flex-shrink-0" />
                <span>{a}</span>
              </div>
            ))}
            <div className="text-[10px] font-mono text-muted-foreground mt-2 pt-2 border-t border-panel-border">
              Source: Lab_Final_Report, p13
            </div>
          </div>
        </div>
      )}

      {/* Key Insight */}
      {rgmProject.module.keyInsight && (
        <div className="panel-glass rounded-lg p-4 border-l-2 border-l-primary">
          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1 uppercase">Key Insight</h4>
          <p className="text-sm text-secondary-foreground leading-relaxed">{rgmProject.module.keyInsight}</p>
        </div>
      )}
    </div>
  );
}

function FailureModeCard({ fm, index }: { fm: FailureMode; index: number }) {
  return (
    <div className="border border-panel-border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono font-semibold text-neon-red">
          Issue {index + 1}: {fm.problem}
        </span>
        <ConfidenceBadgeTag confidence={fm.confidence} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="border border-neon-red/15 rounded p-2 bg-neon-red/5">
          <div className="text-[10px] font-mono text-neon-red mb-0.5 uppercase">Problem</div>
          <div className="text-secondary-foreground">{fm.problem}</div>
        </div>
        <div className="border border-neon-amber/15 rounded p-2 bg-neon-amber/5">
          <div className="text-[10px] font-mono text-neon-amber mb-0.5 uppercase">Cause</div>
          <div className="text-secondary-foreground">{fm.cause}</div>
        </div>
        <div className="border border-neon-green/15 rounded p-2 bg-neon-green/5">
          <div className="text-[10px] font-mono text-neon-green mb-0.5 uppercase">Fix</div>
          <div className="text-secondary-foreground">{fm.fix}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="text-neon-magenta">System Impact:</span> {fm.systemImpact}
      </div>
      {fm.evidence_source && (
        <div className="text-[10px] font-mono text-muted-foreground">Source: {fm.evidence_source}</div>
      )}
    </div>
  );
}
