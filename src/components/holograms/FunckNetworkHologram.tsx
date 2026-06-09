import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";

interface NetworkNode {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  description: string;
  role: string;
}

interface StateNode {
  id: string;
  name: string;
  color: string;
}

const nodes: NetworkNode[] = [
  { id: "client", name: "Client (React)", x: 10, y: 50, color: "#00d4aa", description: "React frontend built with Lovable", role: "User-facing UI for event browsing, ticket purchase, and QR display" },
  { id: "app", name: "Lovable App", x: 30, y: 50, color: "#44aaff", description: "Application layer built on Lovable platform", role: "Business logic, routing, state management, UI components" },
  { id: "supabase", name: "Supabase", x: 50, y: 35, color: "#00ff88", description: "PostgreSQL + Auth + Edge Functions", role: "Database, authentication, real-time subscriptions, serverless functions" },
  { id: "stripe", name: "Stripe Connect", x: 70, y: 25, color: "#ffaa00", description: "Payment processing + organizer payouts", role: "Ticket payments, Connect payouts to event organizers, split-pay" },
  { id: "resend", name: "Resend", x: 70, y: 60, color: "#ff4488", description: "Transactional email delivery", role: "QR ticket delivery, purchase confirmations, event notifications" },
];

const edges: [string, string][] = [
  ["client", "app"],
  ["app", "supabase"],
  ["supabase", "stripe"],
  ["supabase", "resend"],
];

const ticketStates: StateNode[] = [
  { id: "unpaid", name: "UNPAID", color: "#666" },
  { id: "paid", name: "PAID", color: "#ffaa00" },
  { id: "issued", name: "ISSUED (QR)", color: "#00d4aa" },
  { id: "scanned", name: "SCANNED", color: "#44aaff" },
  { id: "locked", name: "LOCKED", color: "#ff4488" },
];

export default function FunckNetworkHologram() {
  const [selected, setSelected] = useState<NetworkNode | null>(null);

  const getNodePos = (id: string) => {
    const n = nodes.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3" style={{ minHeight: 450 }}>
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border bg-[hsl(220,20%,3%)]">
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-background/90 to-transparent">
          <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">
            Funck — Systems Hologram
          </span>
          <ConfidenceBadgeTag confidence="CONCEPTUAL" />
        </div>

        <svg viewBox="0 0 100 80" className="w-full h-full" style={{ minHeight: 350 }}>
          <defs>
            <pattern id="funck-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="hsl(43,68%,50%)" strokeWidth="0.05" opacity="0.1" />
            </pattern>
          </defs>
          <rect width="100" height="80" fill="url(#funck-grid)" />

          {/* Edges */}
          {edges.map(([from, to], i) => {
            const a = getNodePos(from);
            const b = getNodePos(to);
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#00d4aa" strokeWidth="0.3" opacity="0.3" strokeDasharray="1 0.5" />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selected?.id === node.id;
            return (
              <g key={node.id} onClick={() => setSelected(isSelected ? null : node)} className="cursor-pointer">
                <circle cx={node.x} cy={node.y} r={isSelected ? 5 : 4} fill={node.color} fillOpacity={isSelected ? 0.3 : 0.1} stroke={node.color} strokeWidth={isSelected ? 0.5 : 0.3} />
                {isSelected && <circle cx={node.x} cy={node.y} r="6" fill="none" stroke={node.color} strokeWidth="0.15" opacity="0.4" />}
                <text x={node.x} y={node.y + 7} textAnchor="middle" fill={node.color} fontSize="2" fontFamily="monospace" fontWeight="bold">
                  {node.name}
                </text>
              </g>
            );
          })}

          {/* Ticket Lifecycle */}
          <text x="50" y="73" textAnchor="middle" fill="#666" fontSize="1.5" fontFamily="monospace">
            Ticket Lifecycle:
          </text>
          {ticketStates.map((s, i) => (
            <g key={s.id}>
              <rect x={8 + i * 18} y={75} width={14} height={4} rx="0.5" fill={s.color} fillOpacity="0.15" stroke={s.color} strokeWidth="0.2" />
              <text x={15 + i * 18} y={77.5} textAnchor="middle" fill={s.color} fontSize="1.4" fontFamily="monospace" fontWeight="bold">
                {s.name}
              </text>
              {i < ticketStates.length - 1 && (
                <text x={22 + i * 18} y={77.5} textAnchor="middle" fill="#444" fontSize="2" fontFamily="monospace">→</text>
              )}
            </g>
          ))}
        </svg>

        {/* Scanline */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="absolute inset-x-0 h-px bg-primary animate-scan-line" />
        </div>

        <div className="absolute bottom-2 left-2 right-2 z-10 text-[10px] font-mono text-neon-amber bg-background/80 rounded px-2 py-1 border border-neon-amber/20">
          ⚠ CONCEPTUAL — Architecture based on stated tech stack. Reflects production system at funck.live.
        </div>
      </div>

      {/* Inspector */}
      <div className="lg:w-72 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">Node Inspection</span>
        </div>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-3 flex-1">
              <div>
                <h4 className="text-sm font-semibold" style={{ color: selected.color }}>{selected.name}</h4>
                <ConfidenceBadgeTag confidence="CONCEPTUAL" />
              </div>
              <p className="text-xs text-secondary-foreground">{selected.description}</p>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Role in System</span>
                <p className="text-xs text-secondary-foreground mt-0.5">{selected.role}</p>
              </div>
            </motion.div>
          ) : (
            <div className="p-4 flex-1 flex items-center justify-center">
              <p className="text-xs text-muted-foreground font-mono text-center">Click a node to inspect</p>
            </div>
          )}
        </AnimatePresence>

        {/* Ownership Disclosure */}
        <div className="p-3 border-t border-panel-border space-y-2">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">Ownership</span>
          <div className="text-[10px] space-y-1">
            <div className="text-neon-green">▸ I owned: requirements, user flow, product decisions, deployment, validation</div>
            <div className="text-neon-cyan">▸ AI-assisted: code generation via Lovable</div>
          </div>
        </div>
      </div>
    </div>
  );
}
