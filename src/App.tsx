import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FLEET_BASE, RESEARCH_BASE, THETA_BASE } from "./pages/thermalos/config.ts";

// Theta-focused landing site. Load only Theta routes.
const Landing          = lazy(() => import("./pages/thermalos/Landing.tsx"));
const ThermalOSLayout  = lazy(() => import("./pages/thermalos/ThermalOSLayout.tsx"));
const FleetDashboard   = lazy(() => import("./pages/thermalos/FleetDashboard.tsx"));
const AgentControlCenter = lazy(() => import("./pages/thermalos/AgentControlCenter.tsx"));
const ResearchLanding  = lazy(() => import("./pages/thermalos/ResearchLanding.tsx"));
const Publication      = lazy(() => import("./pages/thermalos/Publication.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div style={{ minHeight: "100vh", background: "#06060A" }} aria-busy="true" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* ══ THETA — public landing ══════════════════════════════════ */}
            <Route path="/" element={<Landing />} />
            <Route path={THETA_BASE} element={<Landing />} />
            {/* Lab kiosk — fullscreen "living data center" loop, no chrome.
                Same <DataCenterScene> as the website showcase section. */}
            <Route path={`${THETA_BASE}/kiosk/datacenter`} element={<DataCenterKiosk />} />

            {/* ══ THERMALOS — research / OSS public surface ═════════════════
                /thermalos          -> ResearchLanding (academic)
                /thermalos/fleet    -> FleetDashboard (live data demo) */}
            <Route path={SITE_BASE} element={<ResearchLanding />} />
            <Route path={FLEET_BASE} element={<FleetDashboard />} />

            {/* ══ THERMALOS APP — research/admin/advisor workspace ══════════ */}
            <Route path={RESEARCH_BASE} element={<ThermalOSLayout />}>
              <Route index element={<Overview />} />

              {/* Theta product routes */}
            <Route path={RESEARCH_BASE} element={<ThermalOSLayout />}>
              <Route path="agent"       element={<AgentControlCenter />} />
              <Route path="publication" element={<Publication />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
