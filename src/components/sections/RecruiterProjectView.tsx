import { motion } from "framer-motion";
import { type Project } from "@/data/portfolioData";
import { recruiterSummaries } from "@/data/interviewData";
import { CheckCircle2 } from "lucide-react";

interface RecruiterProjectViewProps {
  project: Project;
}

export default function RecruiterProjectView({ project }: RecruiterProjectViewProps) {
  const summary = recruiterSummaries[project.id];

  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Quick Summary */}
      <div className="panel-glass rounded-lg p-5 border-l-2 border-l-primary">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-primary uppercase mb-3">
          Quick Summary
        </h3>
        <div className="space-y-2 text-sm text-secondary-foreground leading-relaxed">
          <p><span className="text-foreground font-medium">What:</span> {summary.whatIsIt}</p>
          <p><span className="text-foreground font-medium">Why it matters:</span> {summary.whyItMatters}</p>
          <p><span className="text-foreground font-medium">What I built:</span> {summary.whatYouBuilt}</p>
        </div>
      </div>

      {/* Key Outcomes */}
      <div className="panel-glass rounded-lg p-5">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-primary uppercase mb-3 flex items-center gap-1.5">
          <CheckCircle2 size={12} /> Key Outcomes
        </h3>
        <ul className="space-y-1.5">
          {summary.keyOutcomes.map((outcome, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-secondary-foreground">
              <span className="text-neon-green mt-0.5 flex-shrink-0">▸</span>
              {outcome}
            </li>
          ))}
        </ul>
      </div>

      {/* Skills Demonstrated */}
      <div className="panel-glass rounded-lg p-5">
        <h3 className="text-xs font-mono font-semibold tracking-wider text-primary uppercase mb-3">
          Skills Demonstrated
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {summary.skillsDemonstrated.map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-1 text-xs font-mono rounded-full border border-primary/30 bg-primary/5 text-primary"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
