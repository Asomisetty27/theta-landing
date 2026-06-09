import { createContext, useContext, useState, ReactNode } from "react";

type ViewMode = "recruiter" | "engineer";

interface ViewModeContextType {
  mode: ViewMode;
  toggle: () => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  mode: "recruiter",
  toggle: () => {},
});

export const useViewMode = () => useContext(ViewModeContext);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>("recruiter");
  const toggle = () => setMode((m) => (m === "recruiter" ? "engineer" : "recruiter"));
  return (
    <ViewModeContext.Provider value={{ mode, toggle }}>
      {children}
    </ViewModeContext.Provider>
  );
}
