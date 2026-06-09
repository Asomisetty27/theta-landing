import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  projects, systemDomains, type Project, type SystemDomain,
  type DiagramItem, type Subsystem,
} from "@/data/portfolioData";
import { useViewMode } from "@/contexts/ViewModeContext";
import {
  ConfidenceBadgeTag, StatusLight, PanelHeader, EvidencePending,
} from "@/components/ui/mission-ui";
import {
  ChevronRight, ChevronDown, FileText, Image as ImageIcon,
  ExternalLink, Box, Zap, Cpu, Wrench, Radio, Plane,
  Globe, AlertTriangle, CheckCircle2, Play, FlaskConical,
} from "lucide-react";
import RGMSystemPage from "@/components/RGMSystemPage";

const OtterInteractive = lazy(() => import("@/components/holograms/OtterInteractive"));
const FunckNetworkHologram = lazy(() => import("@/components/holograms/FunckNetworkHologram"));
const AirMotorHologram = lazy(() => import("@/components/holograms/AirMotorHologram"));
const RGMHologram = lazy(() => import("@/components/holograms/RGMHologram"));
const MetalDetectorHologram = lazy(() => import("@/components/holograms/MetalDetectorHologram"));
const PhaseDiagramInteractive = lazy(() => import("@/components/materials/PhaseDiagramInteractive"));
const CorrosionInteractive = lazy(() => import("@/components/materials/CorrosionInteractive"));
const PolymerStressStrain = lazy(() => import("@/components/materials/PolymerStressStrain"));
const CFRPComparison = lazy(() => import("@/components/materials/CFRPComparison"));
const DroneSystemHologram = lazy(() => import("@/components/holograms/DroneSystemHologram"));

import RecruiterProjectView from "@/components/sections/RecruiterProjectView";

type DetailTab = "brief" | "subsystems";

const domainIcons: Record<string, React.ElementType> = {
  signal: Radio,
  zap: Zap,
  cpu: Cpu,
  wrench: Wrench,
  flask: FlaskConical,
  drone: Plane,
};

function HologramLoader() {
  return (
    <div className="h-80 flex items-center justify-center text-muted-foreground font-mono text-sm animate-pulse">
      Initializing holographic display...
    </div>
  );
}

function ProjectHologram({ project }: { project: Project }) {
  if (!project.has3D) return null;
  return (
    <Suspense fallback={<HologramLoader />}>
      {project.id === "digital-systems" && <OtterInteractive />}
      {project.id === "funck" && <FunckNetworkHologram />}
      {project.id === "manufacturing-systems" && <AirMotorHologram />}
      {project.id === "rgm-machine" && <RGMHologram />}
      {project.id === "detect-7" && <MetalDetectorHologram />}
      {project.id === "materials-phases" && <PhaseDiagramInteractive />}
      {project.id === "materials-corrosion" && <CorrosionInteractive />}
      {project.id === "materials-polymers" && (
        <div className="space-y-4">
          <PolymerStressStrain />
          <CFRPComparison />
        </div>
      )}
      {project.id === "fpv-drone" && <DroneSystemHologram />}
    </Suspense>
  );
}

interface ProjectsSectionProps {
  initialProjectId?: string | null;
}

export default function ProjectsSection({ initialProjectId }: ProjectsSectionProps) {
  const { mode } = useViewMode();
  const [rgmFullView, setRgmFullView] = useState(false);

  const initialProject = initialProjectId 
    ? projects.find((p) => p.id === initialProjectId) 
    : undefined;

  const [activeDomain, setActiveDomain] = useState<SystemDomain>(
    initialProject?.domain || "electromechanical"
  );
  const [selectedProject, setSelectedProject] = useState<Project>(
    initialProject || projects.find((p) => p.id === "rgm-machine")!
  );
  const [detailTab, setDetailTab] = useState<DetailTab>("brief");
  const [expandedSubsystems, setExpandedSubsystems] = useState<Set<string>>(new Set());

  const domainProjects = projects.filter((p) => p.domain === activeDomain);

  const toggleSubsystem = (id: string) => {
    setExpandedSubsystems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (rgmFullView) {
    return <RGMSystemPage onBack={() => setRgmFullView(false)} />;
  }

  return (
    <section className="max-w-7xl mx-auto fx-blur-reveal">
      {/* Domain Selector — fx-card hover + active gradient glow */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-6">
        {systemDomains.map((domain) => {
          const Icon = domainIcons[domain.icon] || Zap;
          const isActive = activeDomain === domain.id;
          const count = projects.filter((p) => p.domain === domain.id).length;
          return (
            <button
              key={domain.id}
              onClick={() => {
                setActiveDomain(domain.id);
                const firstProject = projects.find((p) => p.domain === domain.id);
                if (firstProject) {
                  setSelectedProject(firstProject);
                  setDetailTab("brief");
                }
              }}
              className={`fx-card text-left p-3 rounded-lg border relative overflow-hidden ${
                isActive ? "" : "border-panel-border hover:border-panel-highlight"
              }`}
              style={isActive ? {
                borderColor: `hsl(var(--${domain.color}) / 0.45)`,
                background: `linear-gradient(135deg, hsl(var(--${domain.color}) / 0.10) 0%, hsl(var(--${domain.color}) / 0.02) 100%)`,
                boxShadow: `0 0 0 1px hsl(var(--${domain.color}) / 0.10), 0 8px 24px rgba(0,0,0,0.25), inset 0 0 0 0.5px hsl(var(--${domain.color}) / 0.05)`,
              } : {}}
            >
              {/* Active state: top accent line + radial glow */}
              {isActive && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${domain.color}) / 0.7), transparent)` }}
                  />
                  <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 80% 100% at 50% 0%, hsl(var(--${domain.color}) / 0.12), transparent)` }}
                  />
                </>
              )}
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={isActive ? "" : "text-muted-foreground"}
                    style={isActive ? { color: `hsl(var(--${domain.color}))`, filter: `drop-shadow(0 0 4px hsl(var(--${domain.color}) / 0.4))` } : {}}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{count} {count === 1 ? "system" : "systems"}</span>
                </div>
                <div className="text-xs font-semibold text-foreground leading-tight">{domain.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{domain.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Three-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Project Navigator — fx-glass + active gradient state */}
        <div className="lg:col-span-2 fx-glass rounded-lg overflow-hidden">
          <PanelHeader>
            {systemDomains.find((d) => d.id === activeDomain)?.name || "Projects"}
          </PanelHeader>
          <div className="p-2 space-y-0.5 max-h-[80vh] overflow-y-auto">
            {domainProjects.map((p) => {
              const isSelected = selectedProject.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProject(p); setDetailTab("brief"); setExpandedSubsystems(new Set()); }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-all duration-200 relative ${
                    isSelected
                      ? "border border-primary/30"
                      : "hover:bg-panel-highlight border border-transparent"
                  }`}
                  style={isSelected ? {
                    background: "linear-gradient(90deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 100%)",
                  } : {}}
                >
                  {/* Active left accent rail */}
                  {isSelected && (
                    <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                      style={{
                        background: "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.3))",
                        boxShadow: "0 0 6px hsl(var(--primary) / 0.5)",
                      }}
                    />
                  )}
                  <StatusLight color={p.statusColor} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-mono font-semibold truncate ${isSelected ? "fx-grad-text-cyan" : "text-foreground"}`}>{p.codename}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{p.name}</div>
                  </div>
                  {p.has3D && <Box size={9} className={`flex-shrink-0 transition-colors ${isSelected ? "text-primary" : "text-primary/50"}`} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center + Right: Hologram-first layout */}
        <div className="lg:col-span-10 space-y-4">
          {/* RECRUITER VIEW — always shown first in recruiter mode */}
          {mode === "recruiter" && (
            <RecruiterProjectView project={selectedProject} />
          )}

          {/* HOLOGRAM — always visible (but after recruiter summary in recruiter mode) */}
          {selectedProject.has3D && (mode === "engineer" || detailTab === "brief") && (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedProject.id + "-holo"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ProjectHologram project={selectedProject} />
              </motion.div>
            </AnimatePresence>
          )}

          {/* RGM full view button — shimmer + gradient */}
          {selectedProject.id === "rgm-machine" && (
            <button
              onClick={() => setRgmFullView(true)}
              className="fx-shimmer group relative px-4 py-2 text-xs font-mono rounded-md transition-all duration-200 hover:scale-[1.02]"
              style={{
                border: "1px solid hsl(var(--neon-green) / 0.4)",
                background: "linear-gradient(135deg, hsl(var(--neon-green) / 0.12) 0%, hsl(var(--neon-green) / 0.03) 100%)",
                color: "hsl(var(--neon-green))",
                boxShadow: "0 0 0 0.5px hsl(var(--neon-green) / 0.08) inset, 0 4px 16px hsl(var(--neon-green) / 0.08)",
              }}
            >
              <span className="relative flex items-center gap-2">
                FULL SYSTEM VIEW
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </span>
            </button>
          )}

          {/* Detail tabs — gradient active state */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDetailTab("brief")}
              className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all duration-200 relative ${
                detailTab === "brief"
                  ? "text-primary"
                  : "border-panel-border text-muted-foreground hover:text-foreground"
              }`}
              style={detailTab === "brief" ? {
                borderColor: "hsl(var(--primary) / 0.4)",
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.14) 0%, hsl(var(--primary) / 0.03) 100%)",
                boxShadow: "0 0 0 0.5px hsl(var(--primary) / 0.08) inset",
              } : {}}
            >
              SYSTEM BRIEF
            </button>
            {selectedProject.module.subsystems && selectedProject.module.subsystems.length > 0 && (
              <button
                onClick={() => setDetailTab("subsystems")}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all duration-200 ${
                  detailTab === "subsystems"
                    ? "text-primary"
                    : "border-panel-border text-muted-foreground hover:text-foreground"
                }`}
                style={detailTab === "subsystems" ? {
                  borderColor: "hsl(var(--primary) / 0.4)",
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.14) 0%, hsl(var(--primary) / 0.03) 100%)",
                  boxShadow: "0 0 0 0.5px hsl(var(--primary) / 0.08) inset",
                } : {}}
              >
                SUBSYSTEMS
              </button>
            )}
          </div>

          {/* Detail content */}
          <AnimatePresence mode="wait">
            {detailTab === "subsystems" && selectedProject.module.subsystems ? (
              <motion.div key={selectedProject.id + "-sub"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SubsystemsPanel
                  subsystems={selectedProject.module.subsystems}
                  expanded={expandedSubsystems}
                  onToggle={toggleSubsystem}
                  mode={mode}
                />
              </motion.div>
            ) : (
              <motion.div key={selectedProject.id + "-brief"} initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.32, ease: [0.22, 0.68, 0, 1.0] }}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-3 fx-glass rounded-lg overflow-hidden relative">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)" }}
                    />
                    <PanelHeader>System Brief — {selectedProject.codename}</PanelHeader>
                    <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
                      {/* Hero */}
                      <div>
                        <h3 className="text-base font-semibold text-foreground mb-1">{selectedProject.name}</h3>
                        <p className="text-sm text-secondary-foreground leading-relaxed mb-2">{selectedProject.heroSummary}</p>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                          {selectedProject.course && <span>{selectedProject.course}</span>}
                          <span className="text-primary/40">|</span>
                          <span>{selectedProject.status}</span>
                          <span className="text-primary/40">|</span>
                          <span>{systemDomains.find(d => d.id === selectedProject.domain)?.name}</span>
                        </div>
                      </div>

                      {/* Problem Statement */}
                      <div>
                        <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1.5 uppercase">Problem</h4>
                        <p className="text-sm text-secondary-foreground leading-relaxed italic">{selectedProject.module.problemStatement}</p>
                      </div>

                      {/* System Overview */}
                      <div>
                        <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1.5 uppercase">System Overview</h4>
                        <p className="text-sm text-secondary-foreground leading-relaxed">{selectedProject.module.systemOverview}</p>
                      </div>

                      {/* Architecture */}
                      {mode === "engineer" && (
                        <div>
                          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1.5 uppercase">System Architecture</h4>
                          <div className="font-mono text-xs text-neon-cyan bg-background/50 rounded p-3 border border-panel-border leading-relaxed whitespace-pre-wrap">
                            {selectedProject.module.systemArchitecture}
                          </div>
                        </div>
                      )}

                      {/* Video */}
                      {selectedProject.videoPath && (
                        <div>
                          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1.5 uppercase flex items-center gap-1.5">
                            <Play size={12} /> Video Demonstration
                          </h4>
                          <video controls className="w-full rounded border border-panel-border" preload="metadata">
                            <source src={selectedProject.videoPath} type="video/mp4" />
                          </video>
                        </div>
                      )}

                      {/* Verification Summary */}
                      {selectedProject.module.verificationSummary && selectedProject.module.verificationSummary.length > 0 && (
                        <div>
                          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-2 uppercase">Verification Summary</h4>
                          <div className="border border-panel-border rounded overflow-hidden">
                            <table className="w-full text-xs">
                              <thead><tr className="border-b border-panel-border bg-panel-highlight/50">
                                <th className="text-left px-3 py-1.5 font-mono text-muted-foreground">Parameter</th>
                                <th className="text-left px-3 py-1.5 font-mono text-muted-foreground">Value</th>
                                <th className="text-left px-3 py-1.5 font-mono text-muted-foreground hidden sm:table-cell">Source</th>
                              </tr></thead>
                              <tbody>
                                {selectedProject.module.verificationSummary.slice(0, mode === "engineer" ? undefined : 5).map((row, i) => (
                                  <tr key={i} className="border-b border-panel-border/50 last:border-0">
                                    <td className="px-3 py-1.5 text-foreground">{row.parameter}</td>
                                    <td className="px-3 py-1.5 text-neon-cyan font-mono">{row.value} {row.unit}</td>
                                    <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell">{row.evidence_source}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Failure Modes */}
                      {selectedProject.module.failureModes.length > 0 && (
                        <div>
                          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1.5 uppercase flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Failure Modes & Debugging
                          </h4>
                          <div className="space-y-2">
                            {selectedProject.module.failureModes.slice(0, mode === "engineer" ? undefined : 3).map((fm, i) => (
                              <div key={i} className="text-xs border border-panel-border rounded p-2">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-neon-red font-mono">⚠ {fm.problem}</span>
                                  <ConfidenceBadgeTag confidence={fm.confidence} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                                  <div className="text-muted-foreground"><span className="text-neon-amber">Cause:</span> {fm.cause}</div>
                                  <div className="text-muted-foreground"><span className="text-neon-green">Fix:</span> {fm.fix}</div>
                                </div>
                                {fm.systemImpact && <div className="mt-1 text-muted-foreground"><span className="text-neon-magenta">Impact:</span> {fm.systemImpact}</div>}
                                {fm.evidence_source && <div className="mt-1 text-[10px] text-muted-foreground">Source: {fm.evidence_source}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Insight */}
                      {selectedProject.module.keyInsight && (
                        <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
                          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1 uppercase">Key Insight</h4>
                          <p className="text-xs text-secondary-foreground leading-relaxed">{selectedProject.module.keyInsight}</p>
                        </div>
                      )}

                      {/* Validation Results */}
                      {selectedProject.module.validationResults && selectedProject.module.validationResults.length > 0 && (
                        <div>
                          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1.5 uppercase flex items-center gap-1.5">
                            <CheckCircle2 size={12} /> Validation Results
                          </h4>
                          <div className="space-y-1">
                            {selectedProject.module.validationResults.map((r, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-secondary-foreground">
                                <CheckCircle2 size={10} className="text-neon-green mt-0.5 flex-shrink-0" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ownership */}
                      {selectedProject.module.ownershipDisclosure && (
                        <div>
                          <h4 className="text-xs font-mono font-semibold text-primary tracking-wider mb-1.5 uppercase">Ownership Disclosure</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="border border-neon-green/20 rounded p-2.5 bg-neon-green/5">
                              <div className="text-[10px] font-mono font-semibold text-neon-green mb-1.5 uppercase">I Owned</div>
                              <ul className="space-y-1">{selectedProject.module.ownershipDisclosure.owned.map((item, i) => (
                                <li key={i} className="text-xs text-secondary-foreground flex items-start gap-1.5"><span className="text-neon-green mt-0.5">▸</span>{item}</li>
                              ))}</ul>
                            </div>
                            <div className="border border-neon-cyan/20 rounded p-2.5 bg-neon-cyan/5">
                              <div className="text-[10px] font-mono font-semibold text-neon-cyan mb-1.5 uppercase">AI-Assisted</div>
                              <ul className="space-y-1">{selectedProject.module.ownershipDisclosure.aiAssisted.map((item, i) => (
                                <li key={i} className="text-xs text-secondary-foreground flex items-start gap-1.5"><span className="text-neon-cyan mt-0.5">▸</span>{item}</li>
                              ))}</ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tech Stack */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-panel-border">
                        {selectedProject.techStack.map((t) => (
                          <span key={t} className="px-2 py-0.5 text-[10px] font-mono rounded border border-panel-border text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Evidence — fx-glass + accent */}
                  <div className="lg:col-span-2 fx-glass rounded-lg overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(var(--neon-green) / 0.4), transparent)" }}
                    />
                    <PanelHeader>Evidence</PanelHeader>
                    <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                      {selectedProject.status === "EVIDENCE_PENDING" && (
                        <EvidencePending items={["Upload lab reports and screenshots", "Add schematics and waveform captures", "Include PCB layouts and simulation files"]} />
                      )}
                      <VisualGallery project={selectedProject} />
                      <EngineeringNotes project={selectedProject} />
                      <EvidenceVault project={selectedProject} />
                      {selectedProject.id === "funck" && (
                        <div className="border border-neon-cyan/30 rounded-lg p-4 bg-neon-cyan/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe size={14} className="text-neon-cyan" />
                            <span className="text-xs font-mono font-semibold text-neon-cyan uppercase">Live System</span>
                          </div>
                          <a href="https://www.funck.live" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-mono">www.funck.live</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* ========== SUBSYSTEMS PANEL ========== */
function SubsystemsPanel({ subsystems, expanded, onToggle, mode }: {
  subsystems: Subsystem[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  mode: string;
}) {
  return (
    <div className="fx-glass rounded-lg overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)" }}
      />
      <PanelHeader>Subsystem Modules</PanelHeader>
      <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
        {subsystems.map((sub) => {
          const isOpen = expanded.has(sub.id);
          return (
            <div key={sub.id}
              className="rounded-lg overflow-hidden transition-all duration-200"
              style={{
                border: isOpen ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid hsl(var(--panel-border))",
                background: isOpen ? "linear-gradient(135deg, hsl(var(--primary) / 0.04) 0%, transparent 100%)" : "transparent",
              }}
            >
              <button
                onClick={() => onToggle(sub.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-panel-highlight/40 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ConfidenceBadgeTag confidence={sub.confidence} />
                  <span className="text-sm font-semibold text-foreground truncate">{sub.title}</span>
                </div>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-3 border-t border-panel-border pt-3">
                      <p className="text-sm text-secondary-foreground leading-relaxed">{sub.description}</p>
                      {(mode === "engineer" || sub.details.length <= 4) && (
                        <ul className="space-y-1">
                          {sub.details.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-secondary-foreground">
                              <span className="text-primary/50 mt-0.5 font-mono">{String(i + 1).padStart(2, "0")}</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                      {sub.evidenceSource && (
                        <div className="text-[10px] font-mono text-muted-foreground">Source: {sub.evidenceSource}</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========== SUB-COMPONENTS ========== */
function VisualGallery({ project }: { project: Project }) {
  const mainDiagrams = project.diagrams.filter((d) => !d.engineeringNote);
  if (mainDiagrams.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-mono font-semibold text-muted-foreground tracking-wider mb-3 uppercase">Visual Evidence</h4>
      <div className="space-y-3">{mainDiagrams.map((d) => <DiagramCard key={d.id} diagram={d} />)}</div>
    </div>
  );
}

function EngineeringNotes({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const conceptualDiagrams = project.diagrams.filter((d) => d.engineeringNote);
  if (conceptualDiagrams.length === 0) return null;
  return (
    <div className="border border-panel-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-panel-highlight transition-colors">
        <span className="uppercase tracking-wider">Engineering Notes (Conceptual)</span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-3 border-t border-panel-border pt-3">
              {conceptualDiagrams.map((d) => <DiagramCard key={d.id} diagram={d} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EvidenceVault({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-mono font-semibold text-muted-foreground tracking-wider uppercase">Evidence Vault</h4>
        {project.evidence.length > 0 && <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-mono text-primary hover:underline">{expanded ? "COLLAPSE" : "EXPAND"}</button>}
      </div>
      {project.evidence.length === 0 ? (
        <EvidencePending items={["Upload lab reports", "Add schematics and waveforms", "Include test results"]} />
      ) : (
        <div className="space-y-2">
          {project.evidence.map((ev) => (
            <div key={ev.id} className="border border-panel-border rounded p-2.5 text-xs">
              <div className="flex items-center gap-2 mb-1">
                {ev.type === "pdf" ? <FileText size={12} className="text-neon-cyan" /> :
                 ev.type === "video" ? <Play size={12} className="text-neon-green" /> :
                 ev.type === "link" ? <ExternalLink size={12} className="text-neon-cyan" /> :
                 <ImageIcon size={12} className="text-neon-cyan" />}
                <span className="font-mono font-semibold text-foreground truncate">{ev.fileName}</span>
              </div>
              {expanded && <p className="text-muted-foreground mt-1 leading-relaxed">{ev.description}</p>}
              {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-1 inline-block font-mono">{ev.url}</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiagramCard({ diagram }: { diagram: DiagramItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-panel-border rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-panel-highlight transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <ConfidenceBadgeTag confidence={diagram.confidence} />
          <span className="text-xs font-semibold text-foreground truncate">{diagram.title}</span>
        </div>
        <ChevronRight size={12} className={`text-muted-foreground transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2">
              <p className="text-xs text-secondary-foreground leading-relaxed">{diagram.description}</p>
              {diagram.imagePath && (
                <div className="border border-panel-border rounded overflow-hidden bg-background">
                  <img src={diagram.imagePath} alt={diagram.title} className="w-full h-auto" loading="lazy" />
                </div>
              )}
              {diagram.conceptualNote && (
                <div className="text-[10px] font-mono text-neon-amber border border-neon-amber/20 rounded p-2 bg-neon-amber/5">⚠ {diagram.conceptualNote}</div>
              )}
              <div className="text-[10px] font-mono text-muted-foreground">
                Derived from: {diagram.derivedFrom.length > 0 ? diagram.derivedFrom.join(", ") : "No direct evidence uploaded"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
