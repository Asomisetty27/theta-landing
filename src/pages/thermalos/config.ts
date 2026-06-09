// Routing — single source of truth for all surfaces.
//
//   THETA — startup / commercial surface
//     /theta              -> Landing.tsx  (product pitch, GPU animation)
//
//   THERMALOS — research / OSS public surface
//     /thermalos          -> ResearchLanding.tsx  (academic, findings, formula)
//     /thermalos/fleet    -> FleetDashboard.tsx   (live data demo)
//
//   THERMALOS APP — research/admin workspace
//     /thermalos/app          -> research hub (Overview)
//     /thermalos/app/<page>   -> findings, lab, advisor, publication, yc, roadmap…
//
// Each zone has its own base constant so any surface can move to a dedicated
// domain by editing one line here. No other file hardcodes app paths.

// ── Startup / commercial surface (Theta) ────────────────────────────────────
export const THETA_BASE = '/theta';

// ── Research / OSS surface (ThermalOS) ──────────────────────────────────────
export const SITE_BASE = '/thermalos';
export const FLEET_BASE = '/thermalos/fleet';

// ── Research/admin workspace ────────────────────────────────────────────────
export const RESEARCH_BASE = '/thermalos/app';

/** Public ThermalOS path, e.g. sitePath() -> '/thermalos'. */
export const sitePath = (p = ''): string =>
  p ? `${SITE_BASE}/${p.replace(/^\/+/, '')}` : SITE_BASE;

/** ThermalOS app path, e.g. researchPath('lab') -> '/thermalos/app/lab'. */
export const researchPath = (p = ''): string =>
  p ? `${RESEARCH_BASE}/${p.replace(/^\/+/, '')}` : RESEARCH_BASE;

// Research-hub inner route segments. The methodology page is "findings".
export const RESEARCH_SEGMENTS = [
  'findings', 'lab', 'roadmap', 'advisor', 'publication',
  'yc', 'command', 'dashboard', 'plan', 'entry',
] as const;

// Redirects from superseded URLs to their new home.
export const LEGACY_REDIRECTS: Record<string, string> = {
  // old marketing/product URLs
  '/landing': sitePath(),
  '/isotherm': sitePath(),
  '/isotherm/fleet': FLEET_BASE,
  // old flat research/app URLs → ThermalOS app hub
  '/thermalos/research': researchPath('findings'),
  '/thermalos/findings': researchPath('findings'),
  '/thermalos/lab': researchPath('lab'),
  '/thermalos/roadmap': researchPath('roadmap'),
  '/thermalos/advisor': researchPath('advisor'),
  '/thermalos/publication': researchPath('publication'),
  '/thermalos/yc': researchPath('yc'),
  '/thermalos/command': researchPath('command'),
  '/thermalos/dashboard': researchPath('dashboard'),
};
