/**
 * /verify - the theta certificate experience (demo, real device data).
 *
 * The moment this page sells: the GPU is assembled component by component in
 * front of the buyer, each layer scanned and graded as it lands, and only
 * when the whole unit stands complete does the score reveal - with exact,
 * factor-by-factor reasoning. CarFax-adjacent, instrument-grade.
 *
 * Honesty is part of the design: every verdict chip carries its evidence
 * grade (measured / ground-truthed / actuarial) from the component-health
 * capability audit, and the certificate prints what it will NOT claim.
 *
 * Data below is the real H100 SXM probed on 2026-07-15 (identity + numbers
 * from its capture); record fields are demo values pending the record store.
 *
 * ASSET SLOT: drop a Higgsfield exploded-view render at
 * src/assets/h100-exploded.png and set HERO_RENDER = true to back the CSS
 * plates with the photoreal layer art.
 */
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const HERO_RENDER = false; // flip when the Higgsfield asset lands

const CHAMPAGNE = "hsl(46 65% 52%)"; // --t-healthy lineage
const GOOD = "#4CC38A";
const ACTU = "#6E9ED8";

type Grade = "measured" | "ground-truthed" | "actuarial";

interface ScanStep {
  id: string;
  name: string;
  grade: Grade;
  verdict: JSX.Element;
  plate: { height: number; bg: string; border: string; detail?: "vrm" | "hbm" | "die" | "fins" };
}

const STEPS: ScanStep[] = [
  {
    id: "pcb", name: "PCB / interconnect", grade: "measured",
    verdict: <>PCIe <b>Gen5 x16 at full width</b> &middot; replay counter 0 over record &middot; no downtraining events</>,
    plate: { height: 52, bg: "linear-gradient(180deg,#15231C,#0E1813)", border: "#234534" },
  },
  {
    id: "vrm", name: "Power delivery", grade: "actuarial",
    verdict: <>No direct VRM telemetry exists (stated) &middot; covered by trend: <b>idle floor stable &plusmn;0.4 W</b>, zero power-fault events</>,
    plate: { height: 44, bg: "linear-gradient(180deg,#1D2330,#141926)", border: "#2B3550", detail: "vrm" },
  },
  {
    id: "hbm", name: "HBM3 memory, 80 GB", grade: "measured",
    verdict: <><b>0 uncorrectable</b> &middot; 0 remapped rows (512/512 headroom to the RMA threshold) &middot; bandwidth 0.87x spec today</>,
    plate: { height: 58, bg: "linear-gradient(180deg,#232A3D,#181E2E)", border: "#35406B", detail: "hbm" },
  },
  {
    id: "die", name: "GH100 die + TIM", grade: "ground-truthed",
    verdict: <>R&theta; <b>0.0555 C/W at 697.6 W</b> &middot; cohort 61st percentile &middot; no drift over 127 d &middot; mem-edge &Delta; -2.5 &deg;C</>,
    plate: { height: 64, bg: "linear-gradient(180deg,#2D2A22,#1D1B15)", border: "#57503A", detail: "die" },
  },
  {
    id: "cold", name: "Cold plate / cooling path", grade: "measured",
    verdict: <>Peak <b>69 &deg;C at 697 W</b> &middot; 16 &deg;C margin to the throttle knee &middot; 0 s thermal throttle in record</>,
    plate: { height: 48, bg: "linear-gradient(180deg,#20262E,#161B22)", border: "#39434F", detail: "fins" },
  },
  {
    id: "shroud", name: "SXM5 module, assembled", grade: "measured",
    verdict: <>Identity continuous: UUID + serial + thermal fingerprint match across all 124 anchors</>,
    plate: { height: 40, bg: "linear-gradient(180deg,#262C35,#1A1F27)", border: "#39434F" },
  },
];

const GRADE_COLOR: Record<Grade, string> = {
  measured: GOOD, "ground-truthed": CHAMPAGNE, actuarial: ACTU,
};

const REASONS = [
  { pts: "100", cls: "zero", text: "Baseline: verified identity, chain intact, active probe completed", cite: "START" },
  { pts: "-3", cls: "neg", text: "Cooling: Rθ 0.0555 C/W at 697.6 W sits in its cohort's 61st percentile (above median, inside the normal band)", cite: "GROUND-TRUTHED METHOD" },
  { pts: "-2", cls: "neg", text: "Record coverage 94.1%: one 2.1-day gap (agent offline 03-05 May), stated on the record", cite: "MEASURED" },
  { pts: "-4", cls: "neg", text: "Sustained power-cap residency 31% of loaded hours (deliberate 700 W cap; duty intensity, not a defect)", cite: "MEASURED" },
  { pts: "+0", cls: "pos", text: "Memory: 0 uncorrectable errors, 0 remapped rows, full RMA-threshold headroom", cite: "MEASURED, NVIDIA POLICY SCALE" },
  { pts: "+0", cls: "pos", text: "No hardware incidents in record, so no recurrence window is open", cite: "ACTUARIAL" },
  { pts: "= 91", cls: "zero", text: "Tier A: sound condition, honest duty history, zero silicon events", cite: "TIERED UNTIL CORPUS CALIBRATION" },
];

function PlateDetail({ kind }: { kind?: ScanStep["plate"]["detail"] }) {
  if (kind === "vrm") return (
    <div style={{ position: "absolute", inset: 8, display: "flex", gap: 6 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ flex: 1, borderRadius: 3, background: "#243050", border: "1px solid #31406B" }} />
      ))}
    </div>
  );
  if (kind === "hbm") return (
    <div style={{ position: "absolute", inset: 8, display: "flex", gap: 6 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} style={{ flex: 1, borderRadius: 4, background: "#2B3352", border: "1px solid #3D4A80" }} />
      ))}
    </div>
  );
  if (kind === "die") return (
    <div style={{
      position: "absolute", left: "50%", top: "50%", width: 120, height: 40,
      margin: "-20px 0 0 -60px", borderRadius: 4, background: "#3A3526", border: "1px solid #6B6144",
    }} />
  );
  if (kind === "fins") return (
    <div style={{ position: "absolute", inset: 7, display: "flex", gap: 4 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} style={{ flex: 1, background: "#242B34", borderRadius: 2 }} />
      ))}
    </div>
  );
  return null;
}

export default function Verify() {
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(0);       // plates on screen
  const [logged, setLogged] = useState(0);       // verdicts in the rail
  const [scanY, setScanY] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, reduced ? 0 : ms));
  }, [reduced]);

  // plate stack geometry (bottom-up offsets)
  const offsets: number[] = [];
  let acc = 6;
  for (const s of STEPS) { offsets.push(acc); acc += s.plate.height + 8; }

  const runStep = useCallback((i: number) => {
    if (i >= STEPS.length) { later(() => setDone(true), 400); return; }
    setLanded(i + 1);
    later(() => {
      setScanY(offsets[i] + STEPS[i].plate.height / 2);
      later(() => {
        setScanY(null);
        setLogged(i + 1);
        later(() => runStep(i + 1), 260);
      }, 700);
    }, 620);
  }, [later]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = useCallback(() => {
    clearTimers();
    setScanY(null); setLanded(STEPS.length); setLogged(STEPS.length); setDone(true);
  }, []);

  const replay = useCallback(() => {
    clearTimers();
    setLanded(0); setLogged(0); setDone(false); setScore(0); setScanY(null);
    later(() => runStep(0), 500);
  }, [later, runStep]);

  useEffect(() => {
    if (reduced) { skip(); return clearTimers; }
    later(() => runStep(0), 600);
    return clearTimers;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!done) return;
    const c = animate(0, 91, {
      duration: reduced ? 0 : 1.4, ease: [0.2, 0.8, 0.3, 1],
      onUpdate: (v) => setScore(Math.round(v)),
    });
    return () => c.stop();
  }, [done, reduced]);

  const mono = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
  const panel: React.CSSProperties = {
    background: "#12161D", border: "1px solid #232A35", borderRadius: 10, padding: 18,
  };
  const eyebrow: React.CSSProperties = {
    fontFamily: mono, fontSize: 11, letterSpacing: "0.18em",
    textTransform: "uppercase", color: "#5A6270",
  };

  return (
    <div style={{ background: "#0A0C10", minHeight: "100vh", color: "#E8EBEF", fontSize: 15 }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "28px 20px 80px" }}>
        <header style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          borderBottom: "1px solid #232A35", paddingBottom: 14, gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: "0.08em" }}>
            <b style={{ color: CHAMPAGNE, fontWeight: 600 }}>theta</b> &middot; verify
          </div>
          <div style={{ fontFamily: mono, fontSize: 12, color: "#8A93A0" }}>
            CERT th-9f27c4a1 &middot; <span style={{ color: GOOD }}>countersigned &#10003;</span> &middot; anchored chain intact &#10003;
          </div>
        </header>

        <div style={{
          display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginTop: 22,
        }} className="verify-stage">
          {/* assembly */}
          <section style={panel}>
            <span style={eyebrow}>Component verification: NVIDIA H100 80GB HBM3</span>
            <div style={{
              position: "relative", height: 400, display: "flex",
              alignItems: "flex-end", justifyContent: "center", overflow: "hidden",
            }}>
              <div style={{ position: "relative", width: 340, height: 370 }}>
                {HERO_RENDER && (
                  <img src="/src/assets/h100-exploded.png" alt=""
                       style={{ position: "absolute", inset: 0, width: "100%", opacity: 0.9 }} />
                )}
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ y: -460, opacity: 0, scale: 1.04 }}
                    animate={i < landed ? { y: 0, opacity: 1, scale: 1 } : {}}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    style={{
                      position: "absolute", left: 0, width: 340,
                      bottom: offsets[i], height: s.plate.height,
                      borderRadius: 8, background: s.plate.bg,
                      border: `1px solid ${s.plate.border}`,
                    }}
                  >
                    <PlateDetail kind={s.plate.detail} />
                    <span style={{
                      position: "absolute", right: 8, top: 6, fontFamily: mono,
                      fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                      color: "rgba(232,235,239,.55)",
                    }}>{s.name}</span>
                  </motion.div>
                ))}
                <AnimatePresence>
                  {scanY !== null && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{
                        position: "absolute", left: -12, right: -12, height: 3,
                        bottom: scanY, borderRadius: 2,
                        background: `linear-gradient(90deg,transparent,${CHAMPAGNE} 30%,#FFF 50%,${CHAMPAGNE} 70%,transparent)`,
                        boxShadow: `0 0 18px 2px ${CHAMPAGNE}88`,
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* scan log */}
          <section style={{ ...panel, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={eyebrow}>Scan log</span>
              {!done && (
                <button onClick={skip} style={{
                  fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", color: "#8A93A0",
                  background: "none", border: "1px solid #232A35", borderRadius: 6,
                  padding: "5px 12px", cursor: "pointer",
                }}>skip &rarr;</button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 340 }}>
              <AnimatePresence>
                {STEPS.slice(0, logged).map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      border: "1px solid #232A35", borderLeft: `3px solid ${GRADE_COLOR[s.grade]}`,
                      borderRadius: 6, padding: "9px 12px", background: "#161B24",
                    }}
                  >
                    <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {s.name}
                    </span>
                    <span style={{
                      fontFamily: mono, fontSize: 10, letterSpacing: "0.12em", padding: "2px 7px",
                      borderRadius: 99, border: `1px solid ${GRADE_COLOR[s.grade]}`,
                      color: GRADE_COLOR[s.grade], marginLeft: 8, whiteSpace: "nowrap",
                    }}>{s.grade}</span>
                    <div style={{ fontSize: 13, color: "#8A93A0", marginTop: 3 }}>{s.verdict}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        {/* score reveal */}
        <AnimatePresence>
          {done && (
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              style={{ ...panel, marginTop: 18 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 26, alignItems: "center" }}
                   className="verify-score">
                <div style={{ width: 168, height: 168, position: "relative" }}>
                  <svg width="168" height="168" viewBox="0 0 168 168" style={{ transform: "rotate(-90deg)" }}
                       role="img" aria-label="condition score 91 of 100">
                    <circle cx="84" cy="84" r="74" fill="none" stroke="#232A35" strokeWidth="10" />
                    <motion.circle
                      cx="84" cy="84" r="74" fill="none" stroke={CHAMPAGNE} strokeWidth="10"
                      strokeLinecap="round" strokeDasharray={465}
                      initial={{ strokeDashoffset: 465 }}
                      animate={{ strokeDashoffset: 465 * (1 - 91 / 100) }}
                      transition={{ duration: reduced ? 0 : 1.4, ease: [0.2, 0.8, 0.3, 1] }}
                    />
                  </svg>
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <b style={{ fontFamily: mono, fontSize: 44, fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                      {score}
                    </b>
                    <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.2em", color: CHAMPAGNE }}>TIER A</span>
                  </div>
                </div>
                <div>
                  <div style={{
                    display: "inline-flex", gap: 8, alignItems: "center", fontFamily: mono,
                    fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: GOOD,
                    border: `1px solid ${GOOD}`, borderRadius: 99, padding: "4px 12px", marginBottom: 10,
                  }}>&#9679; record-backed &middot; countersigned &middot; 127-day record</div>
                  <h2 style={{ fontSize: 15, fontFamily: mono, letterSpacing: "0.06em", margin: "0 0 4px" }}>
                    Condition 91 / 100: exact reasoning, factor by factor
                  </h2>
                  <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                    {REASONS.map((r, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduced ? 0 : 0.15 * i, duration: 0.35 }}
                        style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 12, fontSize: 13.5 }}
                      >
                        <span style={{
                          fontFamily: mono, textAlign: "right", fontVariantNumeric: "tabular-nums",
                          color: r.cls === "neg" ? "#E0762E" : r.cls === "pos" ? GOOD : "#5A6270",
                        }}>{r.pts}</span>
                        <span>{r.text} <small style={{ color: "#5A6270", fontFamily: mono, fontSize: 10.5, letterSpacing: "0.05em" }}>{r.cite}</small></span>
                      </motion.li>
                    ))}
                  </ul>
                  <button onClick={replay} style={{
                    marginTop: 14, fontFamily: mono, fontSize: 11, letterSpacing: "0.1em",
                    color: CHAMPAGNE, background: "none", border: `1px solid ${CHAMPAGNE}55`,
                    borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                  }}>replay scan</button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* refusals: the trust block */}
        <section style={{
          border: "1px dashed #8A7345", borderRadius: 10, padding: "16px 18px", marginTop: 18,
        }}>
          <span style={{ ...eyebrow, color: CHAMPAGNE }}>What this certificate will not claim</span>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#8A93A0", fontSize: 13.5 }}>
            <li style={{ marginBottom: 6 }}>No failure-date prediction. Five-fleet analysis found no thermal precursor for memory or detachment failures (permutation-nulled, in a paper in preparation).</li>
            <li style={{ marginBottom: 6 }}>No performance loss projected from R&theta; elevation. No stable coefficient exists below the throttle knee; loss appears only as observed throttle residency.</li>
            <li style={{ marginBottom: 6 }}>No physical inspection. Connectors, corrosion, and mounting are outside telemetry scope.</li>
            <li>Power-delivery internals are covered actuarially (trend + incident history), not by direct measurement. Stated, not hidden.</li>
          </ul>
        </section>

        <style>{`
          @media (max-width: 820px) {
            .verify-stage { grid-template-columns: 1fr !important; }
            .verify-score { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
