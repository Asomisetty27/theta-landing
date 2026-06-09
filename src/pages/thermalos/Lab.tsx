import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LiveTelemetry from "./LiveTelemetry";
import Experiments from "./Experiments";
import Alerts from "./Alerts";

const TABS = [
  { value: "live",        label: "Live",        sub: "Real-time stream",   Component: LiveTelemetry },
  { value: "experiments", label: "Experiments", sub: "Per-run inspection", Component: Experiments   },
  { value: "alerts",      label: "Alerts",      sub: "Anomaly events",     Component: Alerts        },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function Lab() {
  useEffect(() => { document.title = "ThermalOS — Lab | amogh.site"; }, []);

  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: TabValue = (TABS.find((t) => t.value === raw)?.value ?? "live");

  const onTabChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "live") next.delete("tab"); else next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-1">
          ThermalOS · Lab
        </div>
        <h1 className="text-[22px] md:text-[26px] font-semibold text-[#E6F7F1] tracking-tight">
          Telemetry &amp; experiment runs
        </h1>
        <p className="text-[12px] text-[#888780] mt-1 max-w-2xl">
          Live and historical measurements from the rig and GPU collector. Each tab is a different lens on the same{" "}
          <span className="text-[#D8D2C2] font-mono">📡 Measurements</span> data stream.
        </p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList className="bg-transparent p-0 h-auto border-b border-white/[0.07] rounded-none w-full justify-start gap-0 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] data-[state=active]:border-[#1D9E75] text-[#888780] hover:text-[#E6F7F1] rounded-none border-b-2 border-transparent px-4 py-2.5 text-[12px] font-mono uppercase tracking-[0.1em] shadow-none data-[state=active]:shadow-none transition-colors flex-col items-start gap-0.5 h-auto"
            >
              <span>{t.label}</span>
              <span className="text-[9px] normal-case tracking-normal text-[#5a5a55] font-mono">{t.sub}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-0">
            <t.Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
