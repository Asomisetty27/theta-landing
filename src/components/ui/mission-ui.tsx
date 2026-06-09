import type { ConfidenceBadge } from "@/data/portfolioData";
import { Shield, AlertTriangle, Clock } from "lucide-react";

export function ConfidenceBadgeTag({ confidence }: { confidence: ConfidenceBadge }) {
  if (confidence === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider rounded-full border border-neon-green/40 bg-neon-green/10 text-neon-green">
        <Shield size={10} />
        VERIFIED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider rounded-full border border-neon-amber/40 bg-neon-amber/10 text-neon-amber">
      <AlertTriangle size={10} />
      CONCEPTUAL
    </span>
  );
}

export function StatusLight({ color }: { color: string }) {
  const colorMap: Record<string, string> = {
    "neon-green": "bg-neon-green",
    "neon-cyan": "bg-neon-cyan",
    "neon-amber": "bg-neon-amber",
    "neon-red": "bg-neon-red",
    "neon-magenta": "bg-neon-magenta",
  };
  const cls = colorMap[color] || "bg-neon-cyan";
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${cls} animate-status-pulse`} />
  );
}

export function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-panel-border">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-neon-red/60" />
        <span className="w-2 h-2 rounded-full bg-neon-amber/60" />
        <span className="w-2 h-2 rounded-full bg-neon-green/60" />
      </div>
      <span className="text-xs font-mono font-semibold tracking-wider text-muted-foreground uppercase">
        {children}
      </span>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl tracking-wider text-primary neon-text-cyan mb-6">
      {children}
    </h2>
  );
}

export function EvidencePending({ items }: { items: string[] }) {
  return (
    <div className="border border-neon-amber/20 rounded-lg p-4 bg-neon-amber/5">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={14} className="text-neon-amber" />
        <span className="text-xs font-mono font-semibold tracking-wider text-neon-amber uppercase">
          Evidence Pending
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="text-neon-amber/60">→</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
