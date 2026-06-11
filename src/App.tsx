import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RESEARCH_ORIGIN, THETA_BASE } from "./pages/thermalos/config.ts";

// runtheta.com is the CLIENT/PRODUCT surface only. All research surfaces
// (ResearchLanding, FleetDashboard, the /thermalos/app workspace) live on
// the portfolio site — see RESEARCH_ORIGIN in config.ts. Old /thermalos*
// links on this domain hard-redirect across, preserving the path.
const Landing = lazy(() => import("./pages/thermalos/Landing.tsx"));

const queryClient = new QueryClient();

const Blank = () => <div style={{ minHeight: "100vh", background: "#06060A" }} aria-busy="true" />;

// Cross-domain redirect that preserves the full requested path, so
// runtheta.com/thermalos/app/lab → amogh.site/thermalos/app/lab.
const ResearchRedirect = () => {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    window.location.replace(`${RESEARCH_ORIGIN}${pathname}${search}${hash}`);
  }, [pathname, search, hash]);
  return <Blank />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Blank />}>
          <Routes>
            {/* ── Public landing — the product ────────────────────── */}
            <Route path="/" element={<Landing />} />
            <Route path={THETA_BASE} element={<Landing />} />

            {/* ── Research moved to the portfolio site ────────────── */}
            <Route path="/thermalos/*" element={<ResearchRedirect />} />
            <Route path="/thermalos" element={<ResearchRedirect />} />

            {/* Catch-all → landing */}
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
