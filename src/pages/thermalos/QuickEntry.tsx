import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Check, AlertCircle, Loader2, LogOut } from "lucide-react";

const ADVISOR_EMAIL = "sokundu@calpoly.edu"; // unused here, allowlist is checked server-side

interface FormStatus {
  state: "idle" | "submitting" | "success" | "error";
  message?: string;
}

async function callSheetWrite(tab: string, values: (string | number)[]): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in. Use Advisor sign-in to enable writes.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheet-write`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ tab, values }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[#141412] border border-white/[0.07] rounded-md ${className}`}
      style={{ borderWidth: "0.5px" }}
    >
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: FormStatus }) {
  if (status.state === "idle") return null;
  const styles = {
    submitting: { bg: "#B8733315", border: "#B8733340", fg: "#D89A5C", icon: Loader2 },
    success:    { bg: "#0F6E5615", border: "#1D9E7540", fg: "#D4AF37", icon: Check },
    error:      { bg: "#f8717115", border: "#f8717140", fg: "#f87171", icon: AlertCircle },
  }[status.state];

  const Icon = styles.icon;
  const spin = status.state === "submitting";

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono"
      style={{ background: styles.bg, border: `0.5px solid ${styles.border}`, color: styles.fg }}
    >
      <Icon size={11} className={spin ? "animate-spin" : ""} />
      <span>{status.message || status.state}</span>
    </div>
  );
}

// ─── Task form ────────────────────────────────────────────────────────────────

function TaskForm() {
  const [priority, setPriority] = useState("P1 — High");
  const [phase, setPhase] = useState("Phase 0 — Foundation");
  const [milestone, setMilestone] = useState("");
  const [owner, setOwner] = useState("Amogh");
  const [track, setTrack] = useState("Software");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone.trim()) return;
    setStatus({ state: "submitting", message: "Writing to sheet..." });
    try {
      // 📋 Today Plan columns: A=priority, B=phase, C=milestone, D=owner, E=track, F=notes
      await callSheetWrite("📋 Today Plan", [priority, phase, milestone, owner, track, notes]);
      setStatus({ state: "success", message: "Added to Today Plan" });
      setMilestone("");
      setNotes("");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Priority">
          <Select value={priority} onChange={setPriority} options={["P0 — Critical", "P1 — High", "P2 — Normal"]} />
        </Field>
        <Field label="Phase">
          <Select
            value={phase}
            onChange={setPhase}
            options={["Phase 0 — Foundation", "Phase 1 — Experiments", "Phase 2 — Anomaly Detection", "Phase 3 — Validation", "Phase 4 — YC Application"]}
          />
        </Field>
        <Field label="Owner">
          <Select value={owner} onChange={setOwner} options={["Amogh", "Sam", "Both", "Kundu"]} />
        </Field>
        <Field label="Track">
          <Select value={track} onChange={setTrack} options={["Software", "Hardware", "Comms", "Research"]} />
        </Field>
      </div>
      <Field label="Milestone">
        <input
          value={milestone}
          onChange={(e) => setMilestone(e.target.value)}
          required
          placeholder="e.g. Run E005 power-cap sweep on Stage 2 hardware"
          className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60"
        />
      </Field>
      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Context, dependencies, links..."
          className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 resize-none focus:outline-none focus:border-[#1D9E75]/60"
        />
      </Field>
      <div className="flex items-center justify-end gap-3">
        <StatusPill status={status} />
        <button
          type="submit"
          disabled={!milestone.trim() || status.state === "submitting"}
          className="px-4 py-2 rounded text-[12px] font-mono bg-[#1D9E75] text-white hover:bg-[#22b589] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add to Today Plan
        </button>
      </div>
    </form>
  );
}

// ─── Outreach form ────────────────────────────────────────────────────────────

function OutreachForm() {
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("GPU Cloud");
  const [contactStatus, setContactStatus] = useState("Contacted");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState("P1 — High");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !org.trim()) return;
    setStatus({ state: "submitting", message: "Writing to sheet..." });
    try {
      // 📬 Outreach columns: name, org, role, email, type, status, date, priority, notes
      await callSheetWrite("📬 Outreach", [name, org, role, email, type, contactStatus, date, priority, notes]);
      setStatus({ state: "success", message: "Added to Outreach" });
      setName(""); setOrg(""); setRole(""); setEmail(""); setNotes("");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required
            placeholder="Marcus Webb"
            className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60" />
        </Field>
        <Field label="Organization">
          <input value={org} onChange={(e) => setOrg(e.target.value)} required
            placeholder="Lambda Labs"
            className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60" />
        </Field>
        <Field label="Role">
          <input value={role} onChange={(e) => setRole(e.target.value)}
            placeholder="Head of Infra"
            className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60" />
        </Field>
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
            placeholder="mwebb@lambdalabs.com"
            className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60" />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={setType}
            options={["GPU Cloud", "AI Inference", "HPC Lab", "Advisor", "Investor", "Other"]} />
        </Field>
        <Field label="Status">
          <Select value={contactStatus} onChange={setContactStatus}
            options={["Not Contacted", "Contacted", "Replied", "Meeting Set", "Positive Quote", "No Response"]} />
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60" />
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={setPriority}
            options={["P0 — Critical", "P1 — High", "P2 — Normal"]} />
        </Field>
      </div>
      <Field label="Notes / pain quote">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder='Their pain in their own words. e.g. "We have no idea if our GPUs are throttling silently."'
          className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 resize-none focus:outline-none focus:border-[#1D9E75]/60" />
      </Field>
      <div className="flex items-center justify-end gap-3">
        <StatusPill status={status} />
        <button type="submit" disabled={!name.trim() || !org.trim() || status.state === "submitting"}
          className="px-4 py-2 rounded text-[12px] font-mono bg-[#1D9E75] text-white hover:bg-[#22b589] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Add to Outreach
        </button>
      </div>
    </form>
  );
}

// ─── Findings form ────────────────────────────────────────────────────────────

function FindingsForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [stage, setStage] = useState("Stage 1");
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setStatus({ state: "submitting", message: "Writing to sheet..." });
    try {
      await callSheetWrite("🧠 Findings", [stage, title, body]);
      setStatus({ state: "success", message: "Added to Findings" });
      setTitle(""); setBody("");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Stage">
          <Select value={stage} onChange={setStage}
            options={["Stage 1", "Stage 2", "Stage 3", "Stage 4"]} />
        </Field>
      </div>
      <Field label="Finding title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required
          placeholder="e.g. R_theta captures thermal history utilization cannot"
          className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60" />
      </Field>
      <Field label="Body">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4}
          placeholder="Explanation with specific numbers, e.g. clean idle ~1.28 C/W, under load ~0.72 C/W..."
          className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 resize-none focus:outline-none focus:border-[#1D9E75]/60" />
      </Field>
      <div className="flex items-center justify-end gap-3">
        <StatusPill status={status} />
        <button type="submit" disabled={!title.trim() || !body.trim() || status.state === "submitting"}
          className="px-4 py-2 rounded text-[12px] font-mono bg-[#1D9E75] text-white hover:bg-[#22b589] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Add to Findings
        </button>
      </div>
    </form>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#5a5a55] mb-1">{label}</div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TABS = [
  { value: "task",     label: "Task",     sub: "→ Today Plan", Component: TaskForm },
  { value: "outreach", label: "Outreach", sub: "→ Outreach",   Component: OutreachForm },
  { value: "finding",  label: "Finding",  sub: "→ Findings",   Component: FindingsForm },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function QuickEntry() {
  useEffect(() => { document.title = "ThermalOS -- Quick Entry | amogh.site"; }, []);

  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: TabValue = (TABS.find((t) => t.value === raw)?.value ?? "task");

  const onTabChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "task") next.delete("tab"); else next.set("tab", v);
    setParams(next, { replace: true });
  };

  const [session, setSession] = useState<Session | null>(null);
  const [signInError, setSignInError] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) setSignInError(error.message);
    else setMagicLinkSent(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-1">
            ThermalOS -- Quick Entry
          </div>
          <h1 className="text-[22px] md:text-[26px] font-semibold text-[#E6F7F1] tracking-tight">
            Write to the sheet from here
          </h1>
          <p className="text-[12px] text-[#888780] mt-1 max-w-2xl">
            Tasks, outreach contacts, and findings go straight into the Google Sheet via the sheet-write Edge Function. Stamps source = &quot;Site entry&quot;.
          </p>
        </div>
        {session?.user?.email && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0F6E56]/15 border border-[#1D9E75]/30">
            <span className="text-[11px] font-mono text-[#D8D2C2]">
              {session.user.email}
            </span>
            <button onClick={handleSignOut} className="flex items-center gap-1 text-[10px] font-mono text-[#5a5a55] hover:text-[#888780] transition-colors">
              <LogOut size={10} /> Sign out
            </button>
          </div>
        )}
      </div>

      {!session ? (
        <Card className="p-5">
          <div className="text-[12px] text-[#a8a89f] mb-3">
            Sign in to enable writes. Only allowlisted emails can write to the sheet.
          </div>
          {magicLinkSent ? (
            <div className="px-3 py-2 rounded bg-[#EF9F27]/10 border border-[#EF9F27]/30 text-[12px] font-mono text-[#EF9F27]">
              Check your email for a sign-in link.
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="flex flex-wrap gap-2 items-center">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="your-email@domain.com"
                className="flex-1 bg-[#0D0D0B] border border-white/[0.1] rounded text-[12px] text-[#E6F7F1] px-3 py-2 focus:outline-none focus:border-[#1D9E75]/60 min-w-[200px]" />
              <button type="submit"
                className="px-4 py-2 rounded text-[12px] font-mono bg-[#1D9E75] text-white hover:bg-[#22b589] transition-colors">
                Send magic link
              </button>
              {signInError && <span className="text-[10px] font-mono text-[#f87171]">{signInError}</span>}
            </form>
          )}
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={onTabChange} className="w-full">
          <TabsList className="bg-transparent p-0 h-auto border-b border-white/[0.07] rounded-none w-full justify-start gap-0 mb-6 overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}
                className="data-[state=active]:bg-transparent data-[state=active]:text-[#D4AF37] data-[state=active]:border-[#1D9E75] text-[#888780] hover:text-[#E6F7F1] rounded-none border-b-2 border-transparent px-4 py-2.5 text-[12px] font-mono uppercase tracking-[0.1em] shadow-none data-[state=active]:shadow-none transition-colors flex-col items-start gap-0.5 h-auto">
                <span>{t.label}</span>
                <span className="text-[9px] normal-case tracking-normal text-[#5a5a55] font-mono">{t.sub}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-0">
              <Card className="p-5">
                <t.Component />
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
