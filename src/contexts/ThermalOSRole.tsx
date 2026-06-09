import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const ADVISOR_EMAIL = "sokundu@calpoly.edu";
const ADMIN_EMAILS = ["asomisetty27@gmail.com"];

export type ThermalOSRole = "public" | "admin" | "advisor";

interface RoleCtx {
  session: Session | null;
  role: ThermalOSRole;
  loading: boolean;
}

const Ctx = createContext<RoleCtx>({ session: null, role: "public", loading: true });

export function ThermalOSRoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const email = session?.user?.email ?? "";
  const role: ThermalOSRole =
    email === ADVISOR_EMAIL ? "advisor"
    : ADMIN_EMAILS.includes(email) ? "admin"
    : "public"; // authenticated but not explicitly listed → still public

  return <Ctx.Provider value={{ session, role, loading }}>{children}</Ctx.Provider>;
}

export function useThermalOSRole() {
  return useContext(Ctx);
}
