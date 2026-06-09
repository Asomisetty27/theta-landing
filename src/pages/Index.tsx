import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BootAnimation from "@/components/BootAnimation";
import MissionNav from "@/components/MissionNav";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import OverviewSection from "@/components/sections/OverviewSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ContactSection from "@/components/sections/ContactSection";
import QuickviewSection from "@/components/sections/QuickviewSection";
import GradientOrbs from "@/components/visual/GradientOrbs";
import FilmGrain from "@/components/visual/FilmGrain";
import CustomCursor from "@/components/visual/CustomCursor";
import ParticleField from "@/components/visual/ParticleField";

export default function Index() {
  const [booted, setBooted] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);

  const handleBootComplete = useCallback(() => setBooted(true), []);

  const handleNavigateToProject = useCallback((projectId: string) => {
    setTargetProjectId(projectId);
    setActiveSection("projects");
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection onNavigateToProject={handleNavigateToProject} />;
      case "projects":
        return <ProjectsSection initialProjectId={targetProjectId} />;
      case "experience":
        return <ExperienceSection />;
      case "skills":
        return <SkillsSection />;
      case "contact":
        return <ContactSection />;
      case "quickview":
        return <QuickviewSection />;
      default:
        return <OverviewSection onNavigateToProject={handleNavigateToProject} />;
    }
  };

  return (
    <ViewModeProvider>
      <CustomCursor />
      {!booted && <BootAnimation onComplete={handleBootComplete} />}

      {booted && (
        <div className="min-h-screen bg-background relative">
          {/* Ambient layers */}
          <ParticleField count={48} />
          <GradientOrbs variant="mixed" fixed />
          <FilmGrain fixed opacity={0.02} />

          {/* Subtle background grid (kept — adds technical credibility above orbs) */}
          <div
            className="fixed inset-0 pointer-events-none opacity-[0.04]"
            style={{
              zIndex: 1,
              backgroundImage: `linear-gradient(hsl(var(--primary) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.25) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />

          {/* Vignette — top + bottom fade so orbs blend smoothly */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: 1,
              background:
                "radial-gradient(ellipse 100% 60% at center, transparent 0%, transparent 60%, rgba(0,0,0,0.4) 100%)",
            }}
          />

          <MissionNav activeSection={activeSection} onNavigate={(s) => { setActiveSection(s); if (s !== "projects") setTargetProjectId(null); }} />

          <main className="pt-20 pb-16 px-4 relative" style={{ zIndex: 10 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.32, ease: [0.22, 0.68, 0, 1.0] }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
    </ViewModeProvider>
  );
}
