import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Activity, FlaskConical, Route,
  Users, BookOpen, Menu, X, Loader2, Cpu, LogIn, Terminal, Zap,
} from "lucide-react";
import { useIsFetching } from "@tanstack/react-query";
import { ThermalOSRoleProvider, useThermalOSRole } from "@/contexts/ThermalOSRole";
import { RESEARCH_BASE, researchPath } from "./config";

interface NavItem {
  to: string;
  label: string;
  sub: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const PUBLIC_NAV: NavItem[] = [
  { to: researchPath(),            label: "Overview",   sub: "What & where we are",    icon: LayoutDashboard, end: true },
  { to: researchPath("agent"),     label: "Agent",      sub: "5-pillar command center", icon: Zap },
  { to: researchPath("findings"),  label: "Findings",   sub: "Methodology & findings", icon: FlaskConical },
  { to: researchPath("yc"),        label: "YC",         sub: "Evidence & milestones",  icon: Cpu },
];

const ADMIN_NAV: NavItem[] = [
  { to: researchPath("agent"),      label: "Agent",       sub: "5-pillar command center", icon: Zap, end: true },
  { to: researchPath("command"),    label: "Command",     sub: "The one thing",          icon: Terminal },
  { to: researchPath("lab"),        label: "Lab",         sub: "Telemetry & runs",       icon: Activity },
  { to: researchPath("findings"),   label: "Findings",    sub: "Methodology & findings", icon: FlaskConical },
  { to: researchPath("advisor"),    label: "Advisor",     sub: "Questions & decisions",  icon: Users },
  { to: researchPath("publication"),label: "Publication", sub: "Conference tracker",     icon: BookOpen },
  { to: researchPath("yc"),         label: "YC",          sub: "Evidence & milestones",  icon: Cpu },
  { to: researchPath("roadmap"),    label: "Roadmap",     sub: "4-stage tracker",        icon: Route },
];

const ADVISOR_NAV: NavItem[] = [
  { to: researchPath("lab"),        label: "Lab",         sub: "Telemetry & runs",       icon: Activity },
  { to: researchPath("findings"),   label: "Findings",    sub: "Methodology & findings", icon: FlaskConical },
  { to: researchPath("advisor"),    label: "Advisor",     sub: "Questions & decisions",  icon: Users, end: true },
  { to: researchPath("publication"),label: "Publication", sub: "Conference tracker",     icon: BookOpen },
];

function UTCClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[11px] tabular-nums hidden md:inline" style={{ color: "var(--t-faint)" }}>
      {now.toISOString().slice(11, 19)} UTC
    </span>
  );
}

/* Isotherm mark — core dot + concentric rings. Ring spacing encodes R_theta: wider = healthy. */
function IsothermMark({ size = 20 }: { size?: number }) {
  const c = size / 2;
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
      <circle cx={c} cy={c} r={r * 0.15} fill="var(--t-healthy)" />
      <circle cx={c} cy={c} r={r * 0.38} stroke="var(--t-healthy)" strokeWidth="0.9" strokeOpacity="0.75" />
      <circle cx={c} cy={c} r={r * 0.62} stroke="var(--t-healthy)" strokeWidth="0.7" strokeOpacity="0.45" />
      <circle cx={c} cy={c} r={r * 0.84} stroke="var(--t-healthy)" strokeWidth="0.55" strokeOpacity="0.22" />
    </svg>
  );
}

/* Faint isotherm field bleeding from the top-right corner — the "structure" depth layer. */
function IsothermTexture() {
  return (
    <div
      className="pointer-events-none fixed top-0 right-0 overflow-hidden"
      style={{ width: 520, height: 520, zIndex: 0 }}
      aria-hidden
    >
      <svg width="520" height="520" viewBox="0 0 520 520" fill="none" style={{ position: "absolute", top: -60, right: -60 }}>
        <circle cx="480" cy="40" r="90"  stroke="var(--t-healthy)" strokeWidth="0.9" strokeOpacity="0.06" />
        <circle cx="480" cy="40" r="170" stroke="var(--t-healthy)" strokeWidth="0.75" strokeOpacity="0.05" />
        <circle cx="480" cy="40" r="265" stroke="var(--t-healthy)" strokeWidth="0.6" strokeOpacity="0.04" />
        <circle cx="480" cy="40" r="370" stroke="var(--t-drift)"   strokeWidth="0.5" strokeOpacity="0.03" />
        <circle cx="480" cy="40" r="480" stroke="var(--t-caution)" strokeWidth="0.4" strokeOpacity="0.02" />
      </svg>
    </div>
  );
}

function InnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fetching = useIsFetching();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role, session } = useThermalOSRole();

  const navItems = role === "admin" ? ADMIN_NAV : role === "advisor" ? ADVISOR_NAV : PUBLIC_NAV;
  const roleLabel = role === "admin" ? "Admin" : role === "advisor" ? "Advisor" : null;
  const roleFg = role === "admin" ? "var(--t-healthy)" : "#D89A5C";

  useEffect(() => {
    if (role === "admin" && pathname === RESEARCH_BASE) {
      navigate(researchPath("command"), { replace: true });
    }
    if (role === "advisor" && pathname === RESEARCH_BASE) {
      navigate(researchPath("advisor"), { replace: true });
    }
  }, [role, pathname, navigate]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    const prev = link?.href;
    const tmp = document.createElement("link");
    tmp.rel = "icon";
    tmp.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><circle cx='10' cy='10' r='2' fill='%23D4AF37'/><circle cx='10' cy='10' r='5' stroke='%23D4AF37' stroke-width='1' fill='none' opacity='.6'/><circle cx='10' cy='10' r='8.5' stroke='%23D4AF37' stroke-width='.7' fill='none' opacity='.3'/></svg>";
    document.head.appendChild(tmp);
    return () => { tmp.remove(); if (link && prev) link.href = prev; };
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  return (
    <div
      className="min-h-screen font-sans relative"
      style={{ background: "var(--t-surface-0, var(--t-abyss))", color: "var(--t-text)" }}
    >
      {/* Blueprint grid — shared visual language with the public landing. */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          opacity: 0.5,
          backgroundImage:
            "linear-gradient(var(--t-blueprint, rgba(56,120,220,0.10)) 1px, transparent 1px), linear-gradient(90deg, var(--t-blueprint, rgba(56,120,220,0.10)) 1px, transparent 1px)",
          backgroundSize: "80px 80px, 80px 80px",
        }}
        aria-hidden
      />
      <IsothermTexture />

      {/* Topbar */}
      <header
        className="sticky top-0 z-30 h-14 backdrop-blur flex items-center px-3 md:px-5 gap-3"
        style={{
          background: "color-mix(in srgb, var(--t-abyss) 88%, transparent)",
          borderBottom: "1px solid var(--t-border)",
        }}
      >
        <button
          className="md:hidden p-1.5 rounded hover:bg-white/[0.05]"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link
          to="/"
          className="text-[11px] font-mono transition-colors whitespace-nowrap"
          style={{ color: "var(--t-faint)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t-healthy)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t-faint)")}
        >
          ← Portfolio
        </Link>

        <div className="flex items-center gap-2.5 ml-2">
          <IsothermMark size={20} />
          <div className="flex items-baseline gap-2">
            <span
              className="font-display font-semibold text-[16px] md:text-[17px] lowercase"
              style={{ color: "var(--t-text)", letterSpacing: "-0.02em" }}
            >
              thermalos
            </span>
            <span className="font-mono text-[10px] hidden sm:inline" style={{ color: "var(--t-healthy)" }}>
              / research
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {fetching > 0 && <Loader2 size={14} className="animate-spin" style={{ color: "var(--t-healthy)" }} />}

        {roleLabel && (
          <span
            className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full hidden sm:inline"
            style={{ color: roleFg, background: `color-mix(in srgb, ${roleFg} 12%, transparent)`, border: `0.5px solid color-mix(in srgb, ${roleFg} 35%, transparent)` }}
          >
            {roleLabel} · {session?.user?.email?.split("@")[0]}
          </span>
        )}

        {role === "public" && (
          <Link
            to={researchPath("advisor")}
            className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono transition-colors px-2 py-1 rounded"
            style={{ color: "var(--t-muted)", border: "1px solid var(--t-border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t-healthy)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t-muted)")}
          >
            <LogIn size={11} /> Sign in
          </Link>
        )}

        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--t-stable) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-stable) 35%, transparent)",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full animate-thermal-pulse"
              style={{ background: "var(--t-healthy)" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "var(--t-healthy)" }}
            />
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--t-healthy)" }}>Live</span>
        </div>

        <UTCClock />
      </header>

      <div className="flex relative z-10">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:sticky top-14 left-0 z-20 w-52 h-[calc(100vh-3.5rem)] transition-transform overflow-y-auto`}
          style={{ background: "var(--t-abyss)", borderRight: "1px solid var(--t-border)" }}
        >
          <nav className="p-3 space-y-1">
            {navItems.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    `flex items-start gap-2.5 px-2.5 py-2 rounded border-l-2 transition-colors ${
                      isActive ? "" : "border-transparent hover:bg-white/[0.03]"
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          borderLeftColor: "var(--t-stable)",
                          background: "color-mix(in srgb, var(--t-stable) 10%, transparent)",
                          color: "var(--t-healthy)",
                        }
                      : { color: "var(--t-muted)" }
                  }
                >
                  <Icon size={14} className="mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-tight">{it.label}</div>
                    <div className="text-[10px] font-mono leading-tight mt-0.5" style={{ color: "var(--t-faint)" }}>{it.sub}</div>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          <div
            className="p-3 mt-2 text-[9px] font-mono leading-relaxed"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--t-border) 60%, transparent)", color: "var(--t-faint)" }}
          >
            {role === "advisor" ? (
              <>Advisor view · Research data only<br />Business sections hidden</>
            ) : (
              <>Amogh (EE · Cal Poly) · Sam (ME · Cal Poly)<br />YC W27 · GPU thermal forensics</>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 top-14 bg-black/60 z-10" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <Outlet />
          <footer
            className="mt-10 pt-4 text-[10px] font-mono text-center"
            style={{ borderTop: "1px solid var(--t-border)", color: "var(--t-faint)" }}
          >
            ThermalOS · Amogh (EE · Cal Poly) + Sam (ME · Cal Poly) · YC W27
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function ThermalOSLayout() {
  return (
    <ThermalOSRoleProvider>
      <InnerLayout />
    </ThermalOSRoleProvider>
  );
}
