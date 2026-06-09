import { personalInfo, projects, experiences } from "@/data/portfolioData";

export default function QuickviewSection() {
  const handlePrint = () => window.print();

  const topProjects = [
    projects.find((p) => p.id === "ee143-signal-system")!,
    projects.find((p) => p.id === "rgm-machine")!,
    projects.find((p) => p.id === "digital-systems")!,
    projects.find((p) => p.id === "fpv-drone")!,
  ].filter(Boolean);

  return (
    <section className="max-w-3xl mx-auto">
      <div className="no-print flex items-center justify-between mb-6">
        <h2 className="font-display text-xl tracking-wider text-primary neon-text-cyan">
          Quickview
        </h2>
        <button
          onClick={handlePrint}
          className="px-4 py-1.5 text-xs font-mono rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
        >
          PRINT / EXPORT PDF
        </button>
      </div>

      {/* Printable content */}
      <div className="panel-glass rounded-lg p-6 print:bg-transparent print:border-0 print:shadow-none print:p-0">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-panel-border print:border-black/20">
          <h1 className="text-2xl font-bold text-foreground print:text-black">
            {personalInfo.name}
          </h1>
          <p className="text-sm text-muted-foreground print:text-gray-600">
            {personalInfo.title} — {personalInfo.university}
          </p>
          <p className="text-xs font-mono text-muted-foreground print:text-gray-500 mt-1">
            {personalInfo.email} · {personalInfo.phone}
          </p>
        </div>

        {/* Flagship Systems */}
        <h3 className="text-xs font-mono font-semibold tracking-wider text-primary print:text-black uppercase mb-3">
          Flagship Systems
        </h3>
        <div className="space-y-4 mb-6">
          {topProjects.map((p) => (
            <div key={p.id} className="border-l-2 border-primary/40 print:border-black/30 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground print:text-black">{p.name}</span>
                {p.course && (
                  <span className="text-[10px] font-mono text-muted-foreground">({p.course})</span>
                )}
              </div>
              <p className="text-xs text-secondary-foreground print:text-gray-700 mt-0.5 leading-relaxed">
                {p.heroSummary}
              </p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {p.techStack.slice(0, 5).map((t) => (
                  <span key={t} className="text-[10px] font-mono text-muted-foreground print:text-gray-500">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Experience */}
        <h3 className="text-xs font-mono font-semibold tracking-wider text-primary print:text-black uppercase mb-3">
          Experience
        </h3>
        <div className="space-y-3 mb-6">
          {experiences.map((exp, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-foreground print:text-black">
                  {exp.company} — {exp.role}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground print:text-gray-500">
                  {exp.period}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5">
                {exp.bullets.slice(0, 2).map((b, j) => (
                  <li key={j} className="text-xs text-secondary-foreground print:text-gray-700 flex items-start gap-1.5">
                    <span className="text-primary print:text-black">▸</span>
                    {b.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Additional */}
        <h3 className="text-xs font-mono font-semibold tracking-wider text-primary print:text-black uppercase mb-2">
          Additional
        </h3>
        <ul className="space-y-0.5">
          {personalInfo.extras.map((e) => (
            <li key={e} className="text-xs text-secondary-foreground print:text-gray-700 flex items-start gap-1.5">
              <span className="text-primary/60 print:text-gray-400">◆</span>
              {e}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
