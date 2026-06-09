import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RthetaModel from "./RthetaModel";

/* ------------------------------------------------------------------ */
/* Methodology tab — framing for the GPU forensics thesis              */
/* ------------------------------------------------------------------ */

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-3">
      {children}
    </div>
  );
}

const STAGE_2_QUESTIONS = [
  "How to treat T_reference uncertainty at low power loads?",
  "Rolling average vs median filter vs steady-state window for power smoothing?",
  "Is the rule-based state classifier statistically valid, or should it be probabilistic?",
  "t-test vs Mann-Whitney U for small-sample recovery comparison?",
];

const STAGE_1_FINDINGS = [
  {
    title: "F1 dim-1 · starting temperature → R_theta variance",
    body: "E004 v1 rerun (2026-06-03) produced the cleanest demonstration of thermal memory possible: trials 1–2 started at 39–43°C → load R_theta ≈ 0.43, recovery ≈ 2.5. Trials 3–7 started at 48–49°C → load R_theta ≈ 0.59, recovery ≈ 3.1. Same workload, same hardware, ~35% R_theta delta from starting temperature alone. Utilization and raw power miss this entirely.",
  },
  {
    title: "F1 dim-2 · wait duration → recovery-time variance (v2, 2026-06-04)",
    body: "E004 v2 trials 1–2 used a 1800s pre-trial wait. Power recovery times collapsed: 3.2s and 5.2s, vs v1's 10–37s across all 7 trials. The 35°C thermal gate was unreachable on Colab T4 (idle floor ~37°C), but the 30-min wait normalized starts better than a gate would have — and revealed a 10x recovery-time improvement. The wait, not the gate, is the active variable. F1 has two memory dimensions: starting temp and wait duration. Trials 3–7 running now.",
  },
  {
    title: "Same-process termination leaves GPU in P0",
    body: "After killing a load process in-place (E002), the GPU stayed at P-state P0 (~30–31W, ~74°C) for the full 10-minute observation window, never returning to clean idle. The CUDA context held by the still-alive notebook process prevented recovery. R_theta during this zombie state ~1.54 C/W vs ~1.28 C/W clean idle — invisible to utilization monitoring (both show 0%).",
  },
  {
    title: "Child-process exit recovers cleanly · P-state to P8 in 5–6s",
    body: "Across all 7 E004 trials, P-state recovered to P8 in 5.1–6.1 seconds regardless of starting temperature — the cleanest recovery metric available. Temperature recovery scales with starting temp: cool start reaches T<55°C in 45s, warm start needs 116–160s. The asymmetry between same-process zombie and clean child-exit recovery is sharp and reproducible.",
  },
  {
    title: "Reproducibility holds within thermal regime (F5 conditional)",
    body: "Within thermally-consistent trials (E004 trials 3–7, all starting at 48–49°C), cross-trial CV is 2.0% — matching the original ~1.68% claim. Across mixed thermal regimes, CV is 14%. The 14% is not measurement noise — it is the F1 thermal-memory signature. Methodology lesson: reproducibility claims must condition on starting thermal state.",
  },
  {
    title: "Classifier achieves 100% with steady-state filter",
    body: "Naive Bayes (Gaussian) on raw 3,880-sample dataset: 87.0% accuracy. With a 15-second steady-state window (σ(R_theta) < 0.05 C/W): 99.9%. Random Forest: 100%. Steady-state filtering is the single highest-leverage preprocessing step — Kundu's hypothesis validated. Four classes: clean_idle, under_load, zombie_recovery, child_exit_recovery. Naive Bayes is preferred for publication (interpretable, model equation extractable).",
  },
  {
    title: "Rθ_eff fragility at low power: quantified sensitivity",
    body: "dR_theta/dT_amb = -1/P. At idle (~11W): 7.1% R_theta error per °C ambient error, 120% swing across realistic 18–35°C room range. At load (~68W): 2.0% per °C, 34.8% swing. Idle is 3.5× more sensitive than load. Publication framing options: (A) claim validity ≥30W only, or (B) present R_theta as a function of T_amb with confidence bands. Sensitivity analysis approach is Kundu-vetted.",
  },
];

function SensitivityTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <SectionLabel>T_reference uncertainty at low power loads</SectionLabel>
        <Card className="p-5">
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mb-3">
            The largest source of measurement error in Rθ_eff comes from T_reference (ambient temperature assumption). At idle (~9.5W), a ±5°C error in T_ref assumption causes a 35% swing in calculated Rθ_eff — exactly when anomaly detection needs precision most.
          </p>
          <div className="bg-[#0D0D0B] border border-white/[0.1] rounded p-4 mb-3">
            <div className="font-mono text-[11px] text-[#D8D2C2] mb-2">Stage 1 sensitivity analysis (F002)</div>
            <ul className="space-y-1.5 text-[12px] text-[#a8a89f]">
              <li>• Idle (9.5W): 35.3% Rθ_eff swing with ±5°C ambient error</li>
              <li>• Load (68W): 10.2% Rθ_eff swing with same ambient error</li>
              <li>• Error sensitivity is 3.5× worse at idle vs load</li>
              <li>• Cloud baseline (Colab) has no ambient sensor — T_ref = 25°C assumed</li>
            </ul>
          </div>
          <p className="text-[12px] text-[#888780] leading-relaxed">
            Solution: Stage 2 hardware includes ambient sensors. Until then, Rθ_eff at idle is treated as a relative signal (trend) rather than absolute (value), and anomalies are reported as deviations from a per-GPU baseline rather than global thresholds.
          </p>
        </Card>
      </div>

      <div>
        <SectionLabel>Power smoothing — rolling average vs median vs steady-state</SectionLabel>
        <Card className="p-5">
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mb-3">
            Telemetry power readings include measurement noise from the GPU's own power supply. Three smoothing methods were tested:
          </p>
          <div className="bg-[#0D0D0B] border border-white/[0.1] rounded p-4 mb-3">
            <div className="font-mono text-[11px] text-[#D8D2C2] mb-2">Stage 1 filter comparison (F003)</div>
            <ul className="space-y-1.5 text-[12px] text-[#a8a89f]">
              <li>• Rolling average (5s): R_theta std improved 3.5%</li>
              <li>• Median filter (5s): negligible improvement (&lt;0.5%)</li>
              <li>• Steady-state window (5s stable region): zero filtering needed</li>
            </ul>
          </div>
          <p className="text-[12px] text-[#888780] leading-relaxed">
            Decision: Use steady-state window. The null result from filtering confirms that power noise is not the dominant error source — T_reference uncertainty is. Filtering adds complexity without addressing root cause.
          </p>
        </Card>
      </div>
    </div>
  );
}

function ClassificationTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <SectionLabel>Probabilistic state classifier — fitted on Stage 1 data</SectionLabel>
        <Card className="p-5">
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mb-3">
            GPU thermal state must be inferred from telemetry to anchor Rθ_eff baselines. Following Kundu&apos;s direction, we replaced rule-based thresholds with a probabilistic classifier and compared Naive Bayes against Random Forest on the 3,880-sample expanded dataset.
          </p>
          <div className="bg-[#0D0D0B] border border-white/[0.1] rounded p-4 mb-3">
            <div className="font-mono text-[11px] text-[#D8D2C2] mb-2">5-fold CV accuracy · 4 classes</div>
            <ul className="space-y-1.5 text-[12px] text-[#a8a89f]">
              <li>• Naive Bayes (Gaussian) · raw: <span className="text-[#D8D2C2]">87.0% ± 1.2%</span></li>
              <li>• Naive Bayes (Gaussian) · w/ 15s steady-state filter: <span className="text-[#D8D2C2]">99.9% ± 0.1%</span></li>
              <li>• Random Forest · raw: 99.3% ± 0.2%</li>
              <li>• Random Forest · w/ steady-state filter: <span className="text-[#D8D2C2]">100.0% ± 0.0%</span></li>
            </ul>
          </div>
          <p className="text-[12px] text-[#888780] leading-relaxed">
            Classes: clean_idle · under_load · zombie_recovery · child_exit_recovery. Features: R_theta, power, util, P-state. Steady-state window (Kundu hypothesis) is the single highest-leverage preprocessing step — Naive Bayes gains 13 points of accuracy from it alone.
          </p>
        </Card>
      </div>

      <div>
        <SectionLabel>Naive Bayes model equation (class-conditional means)</SectionLabel>
        <Card className="p-5">
          <p className="text-[12px] text-[#a8a89f] leading-relaxed mb-3">
            Naive Bayes is preferred for publication: the model is an equation, not a black box. Each class has a Gaussian conditional density per feature. Decision: argmax over classes of P(class) × ∏ P(feature | class).
          </p>
          <div className="bg-[#0D0D0B] border border-white/[0.1] rounded p-4 mb-3">
            <div className="font-mono text-[11px] text-[#D8D2C2] mb-2">μ ± σ per class</div>
            <table className="text-[11px] font-mono text-[#a8a89f] w-full">
              <thead>
                <tr className="text-[#D8D2C2]">
                  <th className="text-left pr-3">Class</th>
                  <th className="text-right pr-3">Rθ (C/W)</th>
                  <th className="text-right pr-3">Power (W)</th>
                  <th className="text-right pr-3">Util (%)</th>
                  <th className="text-right">P-state</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="pr-3">clean_idle</td><td className="text-right pr-3">1.28 ± 0.21</td><td className="text-right pr-3">11.4 ± 2.0</td><td className="text-right pr-3">0.0</td><td className="text-right">P8</td></tr>
                <tr><td className="pr-3">under_load</td><td className="text-right pr-3">0.80 ± 0.37</td><td className="text-right pr-3">66.3 ± 8.2</td><td className="text-right pr-3">96.9</td><td className="text-right">P0</td></tr>
                <tr><td className="pr-3">zombie_recovery</td><td className="text-right pr-3">1.54 ± 0.05</td><td className="text-right pr-3">31.6 ± 0.7</td><td className="text-right pr-3">0.1</td><td className="text-right">P0</td></tr>
                <tr><td className="pr-3">child_exit_recovery</td><td className="text-right pr-3">2.04 ± 0.46</td><td className="text-right pr-3">12.6 ± 1.2</td><td className="text-right pr-3">0.0</td><td className="text-right">~P8</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[#888780] leading-relaxed">
            zombie_recovery is the tightest distribution (σ = 0.05 C/W) — the CUDA-context-retained state is remarkably consistent. child_exit_recovery is the noisiest (σ = 0.46) as expected for a thermal transient.
          </p>
        </Card>
      </div>

      <div>
        <SectionLabel>Next — Stage 2 validation on DGX B200</SectionLabel>
        <Card className="p-5">
          <ol className="space-y-1.5 text-[12px] text-[#a8a89f]">
            <li><span className="text-[#D8D2C2]">1. v2 trials 3–7</span> — <span className="text-[#D89A5C]">running in Colab now</span>, ~3.5hr ETA. Replicate v2 T1/T2 protocol with 1800s wait.</li>
            <li><span className="text-[#D8D2C2]">2. Retrain classifier on full v2 dataset</span> — confirm DT/NB stability with 7-trial v2 control</li>
            <li><span className="text-[#D8D2C2]">3. Power-cap sweep (E005–E008)</span> — 6 power levels on DGX B200, measured ambient</li>
            <li><span className="text-[#D8D2C2]">4. Lead-time testbed (E-LT)</span> — Sam returns Fall 2026, simulate cooling degradation</li>
            <li><span className="text-[#D8D2C2]">5. Conference submission</span> — Two-dimensional F1 finding + Naive Bayes equation + sensitivity bands</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

const FAULT_TAXONOMY = [
  {
    cause: "Dust accumulation",
    signature: "Intercept drifts up uniformly, gap (low_P − high_P) stable",
    timescale: "Weeks to months",
    detection: "drift_rate > 0.001 C/W per day, gap_trend < 0.015 C/W per day",
    remediation: "Clean heatsink fins and air filters",
    color: "#EF9F27",
  },
  {
    cause: "TIM pump-out / dry-out",
    signature: "Gap narrows over months — slope rotates around low-power anchor",
    timescale: "Months, accelerated by heavy thermal cycling",
    detection: "gap_trend < −0.025 C/W per day, fan RPM stable",
    remediation: "Schedule TIM replacement (repaste)",
    color: "#F87171",
  },
  {
    cause: "Fan bearing wear",
    signature: "Gap narrows + fan RPM declining at high power",
    timescale: "Weeks to months",
    detection: "gap_trend < −0.025 C/W per day, fan RPM slope < −0.005 %/s",
    remediation: "Replace cooling fan before failure",
    color: "#F87171",
  },
  {
    cause: "Airflow blockage",
    signature: "Sudden intra-session intercept step-change, gap stable",
    timescale: "Instant onset (cable, rack, HVAC)",
    detection: "intra_session_delta > 0.07 C/W within hours",
    remediation: "Check cable routing, rack clearance, HVAC",
    color: "#60A5FA",
  },
  {
    cause: "Mounting event",
    signature: "Inter-session intercept jump (contact pressure changed)",
    timescale: "Event-driven (maintenance, shipping)",
    detection: "session_delta > 0.08 C/W between consecutive power-on sessions",
    remediation: "Verify mounting hardware after last maintenance",
    color: "#60A5FA",
  },
  {
    cause: "HBM / VRAM thermal",
    signature: "R_θ elevated only under high memory-bandwidth load",
    timescale: "Workload-correlated, not monotonic over time",
    detection: "rtheta(mem_util > 70%) − rtheta(mem_util < 30%) > 0.06 C/W",
    remediation: "Reduce memory-intensive workload or check VRAM cooling",
    color: "#D8D2C2",
  },
];

function FaultTaxonomyTab() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <SectionLabel>Curve-shape classification · 6 failure modes · v0.1.9 (shipped 2026-06-05)</SectionLabel>
        <Card className="p-5">
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mb-3">
            R_θ at a single power level tells you that something is wrong. The <em>shape</em> of the R_θ-vs-power curve, and how that shape changes over time, tells you <em>what</em> is wrong. The curve has two independently variable degrees of freedom:
          </p>
          <ul className="space-y-1.5 text-[12px] text-[#a8a89f] mb-3 pl-4">
            <li>• <span className="text-[#D8D2C2] font-mono">Intercept</span> — R_θ at low power (5–25W), dominated by conduction</li>
            <li>• <span className="text-[#D8D2C2] font-mono">Gap</span> — intercept minus R_θ at high power (55W+), reflects active cooling efficiency</li>
          </ul>
          <p className="text-[12px] text-[#888780] leading-relaxed">
            Each failure mode deforms one or both in a characteristic way. The fault_classifier module (<span className="font-mono text-[#D8D2C2]">thermalos/agent/fault_classifier.py</span>) tracks both per GPU, computes drift rates over a 30-day rolling window, and emits causal diagnosis with remediation guidance — not just &quot;something is wrong&quot;.
          </p>
        </Card>
      </div>

      <div>
        <SectionLabel>The 6 failure signatures</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FAULT_TAXONOMY.map((f) => (
            <Card key={f.cause} className="p-4">
              <div className="flex items-start gap-2 mb-2">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: f.color }}
                />
                <div className="text-[13px] font-semibold text-[#E6F7F1] leading-snug">{f.cause}</div>
              </div>
              <div className="space-y-1.5 text-[11px] text-[#a8a89f] leading-relaxed">
                <div>
                  <span className="text-[#5a5a55] font-mono">Signature:</span> {f.signature}
                </div>
                <div>
                  <span className="text-[#5a5a55] font-mono">Timescale:</span> {f.timescale}
                </div>
                <div>
                  <span className="text-[#5a5a55] font-mono">Detection rule:</span>{" "}
                  <span className="font-mono text-[10px] text-[#D8D2C2]">{f.detection}</span>
                </div>
                <div className="pt-1.5 border-t border-white/[0.05] mt-2">
                  <span className="text-[#5a5a55] font-mono">Remediation:</span>{" "}
                  <span className="text-[#E6F7F1]">{f.remediation}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Discriminating matrix</SectionLabel>
        <Card className="p-5">
          <table className="text-[11px] font-mono text-[#a8a89f] w-full">
            <thead>
              <tr className="text-[#D8D2C2] border-b border-white/[0.1]">
                <th className="text-left pr-3 py-2">Cause</th>
                <th className="text-left pr-3 py-2">Intercept</th>
                <th className="text-left pr-3 py-2">Slope</th>
                <th className="text-left pr-3 py-2">Time scale</th>
                <th className="text-left py-2">Step vs drift</th>
              </tr>
            </thead>
            <tbody className="text-[10px]">
              <tr className="border-b border-white/[0.03]"><td className="pr-3 py-1.5">Dust</td><td className="pr-3">↑ uniform</td><td className="pr-3">flat</td><td className="pr-3">weeks</td><td>drift</td></tr>
              <tr className="border-b border-white/[0.03]"><td className="pr-3 py-1.5">TIM pump-out</td><td className="pr-3">minimal</td><td className="pr-3">↑ steepens</td><td className="pr-3">months</td><td>drift</td></tr>
              <tr className="border-b border-white/[0.03]"><td className="pr-3 py-1.5">Fan bearing</td><td className="pr-3">none low-P</td><td className="pr-3">↑ above thresh</td><td className="pr-3">weeks-months</td><td>drift</td></tr>
              <tr className="border-b border-white/[0.03]"><td className="pr-3 py-1.5">Airflow blockage</td><td className="pr-3">↑ uniform</td><td className="pr-3">flat</td><td className="pr-3">instant</td><td>step</td></tr>
              <tr className="border-b border-white/[0.03]"><td className="pr-3 py-1.5">Mounting event</td><td className="pr-3">↑ uniform</td><td className="pr-3">flat</td><td className="pr-3">event</td><td>inter-session step</td></tr>
              <tr><td className="pr-3 py-1.5">HBM thermal</td><td className="pr-3">workload-gated</td><td className="pr-3">workload-gated</td><td className="pr-3">correlated</td><td>neither</td></tr>
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <SectionLabel>Validation path</SectionLabel>
        <Card className="p-5">
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mb-3">
            The classifier ships in v0.1.9 but ground-truth labels come from controlled induction on the E-LT testbed (Sam, Fall 2026). Each failure mode gets its own induction protocol:
          </p>
          <ol className="space-y-1.5 text-[12px] text-[#a8a89f] pl-4">
            <li>1. <span className="text-[#D8D2C2]">Dust</span> — tape over heatsink fins, measure R_θ(P) before/after</li>
            <li>2. <span className="text-[#D8D2C2]">TIM</span> — bake cycles to accelerate pump-out, measure slope change</li>
            <li>3. <span className="text-[#D8D2C2]">Fan</span> — reduce fan RPM via PWM, confirm power-threshold signature</li>
            <li>4. <span className="text-[#D8D2C2]">Airflow</span> — restrict inlet with cardboard, confirm step-change + T_ref correlation</li>
            <li>5. <span className="text-[#D8D2C2]">Mounting</span> — reduce heatsink contact pressure, confirm intercept step</li>
          </ol>
          <p className="text-[12px] text-[#888780] leading-relaxed mt-3">
            No published paper has demonstrated this taxonomy from software telemetry alone. These five experiments are the E-LT paper&apos;s most novel contribution beyond the lead-time finding.
          </p>
        </Card>
      </div>
    </div>
  );
}

function MethodologyTab() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Definition */}
      <div>
        <SectionLabel>Definition</SectionLabel>
        <Card className="p-5">
          <div className="font-mono text-[13px] text-[#D8D2C2] mb-3 leading-relaxed">
            Rθ_eff = (T_hot − T_reference) / P_dissipated
          </div>
          <p className="text-[13px] text-[#a8a89f] leading-relaxed">
            Effective thermal resistance is the steady-state temperature rise per watt of power dissipated. A
            healthy cooling path holds Rθ_eff stable across workloads. A degrading one drifts upward — silently,
            before any throttle event surfaces in performance metrics.
          </p>
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mt-2">
            ThermalOS treats Rθ_eff as a forensic signal: not just <em>how hot is this GPU</em>, but{" "}
            <em>is the cooling path doing what it&rsquo;s supposed to do?</em> The thesis is that anomalies in
            Rθ_eff, power regime, and recovery behavior — measurable from telemetry alone — predict failures
            that current monitoring stacks miss.
          </p>
        </Card>
      </div>

      {/* Stage 1 findings */}
      <div>
        <SectionLabel>Stage 1 findings — Tesla T4 / Colab / 8,734 rows / 14 child-exit trials (v2 complete · controlled-variable F1)</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STAGE_1_FINDINGS.map((f) => (
            <Card key={f.title} className="p-4">
              <div className="text-[13px] font-semibold text-[#E6F7F1] mb-1.5 leading-snug">{f.title}</div>
              <p className="text-[12px] text-[#a8a89f] leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Stage 2 open questions */}
      <div>
        <SectionLabel>Stage 2 — open methodological questions</SectionLabel>
        <Card className="p-5">
          <p className="text-[12px] text-[#888780] mb-4 leading-relaxed">
            Questions for Prof. Kundu (Cal Poly EE) and other advisors as we move from cloud baseline to
            dedicated GPU hardware:
          </p>
          <ol className="space-y-2.5">
            {STAGE_2_QUESTIONS.map((q, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-[#E6F7F1] leading-relaxed">
                <span className="text-[#5a5a55] font-mono w-5 flex-shrink-0">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Supporting rig evidence */}
      <div>
        <SectionLabel>Supporting evidence — physical rig</SectionLabel>
        <Card className="p-5">
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mb-3">
            Alongside the GPU telemetry work, we maintain a controlled physical rig measuring Rθ across
            thermal interface materials, mounting pressures, and fault conditions. The rig data is{" "}
            <span className="text-[#D8D2C2]">not the headline result</span> — it&rsquo;s the methodological
            ground truth that lets us calibrate what &ldquo;normal&rdquo; cooling-path behavior looks like
            against a sensor-instrumented baseline.
          </p>
          <p className="text-[12px] text-[#888780] leading-relaxed">
            Use the <span className="text-[#D8D2C2] font-mono">Rθ vs Pressure</span> tab to inspect the
            regression model, and <span className="text-[#D8D2C2] font-mono">TIM Materials</span> for the
            cross-material benchmark.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const MOAT_DIMENSIONS = [
  {
    id: 1,
    name: "Validated lead-time data",
    status: "unproven" as const,
    current: "Stage 1 confirms R_θ separates thermal states. Lead-time (does R_θ rise before throttle?) is unvalidated.",
    target: "E-LT: n ≥ 10 controlled fault inductions showing R_θ rise minutes before throttle event.",
    timeline: "Fall 2026 · Sam's heater-block testbed",
    why: "If lead-time is real → predictive maintenance product. If not → diagnostic tool. Different business.",
  },
  {
    id: 2,
    name: "Per-GPU baseline history",
    status: "not_built" as const,
    current: "Agent computes R_θ live but does not persist anything. Every restart starts cold. No concept of 'this GPU's normal.'",
    target: "theta calibrate writes ~/.theta/baselines/<gpu_uuid>.json. Anomaly detection drifts against per-GPU history, not fleet average.",
    timeline: "P1 — implement before first operator install",
    why: "Accumulated fingerprints can't be copied. Each install makes the model smarter for that GPU.",
  },
  {
    id: 3,
    name: "Operator workflow integration",
    status: "not_built" as const,
    current: "Agent emits Prometheus metrics and webhook alerts. That's a feature, not a product.",
    target: "SLURM job annotation (Cal Poly AI Factory first), Grafana annotation hook, PagerDuty thermal context.",
    timeline: "Stage 3 · AI Factory deployment · Grafana hook is low-effort",
    why: "Operators already drown in alerts. Sticky when it integrates into workflows they open at 2am.",
  },
  {
    id: 4,
    name: "Cross-vendor support",
    status: "gap" as const,
    current: "All calibration data from Colab T4. T4 thresholds will misfire on A100, H100, H200, B200, MI300X.",
    target: "Calibration mode learns per-GPU-model idle floor automatically. Ships with NVIDIA defaults derived from Stage 2 experiments.",
    timeline: "Required before any external operator install",
    why: "Real operators run mixed racks. A tool that only works on T4 is a science fair entry.",
  },
  {
    id: 5,
    name: "Failure/degradation dataset",
    status: "planned" as const,
    current: "Fault taxonomy defined (6 modes, v0.1.9). No ground-truth labeled fault signatures collected yet.",
    target: "E-LT testbed: controlled induction of dust, TIM, fan, blockage, mounting, HBM faults. Each with labeled R_θ(P) curve.",
    timeline: "Fall 2026 · Sam's heater-block testbed",
    why: "Labeled fault dataset enables supervised training. No competitor has this without running the same experiments.",
  },
  {
    id: 6,
    name: "Trusted alert calibration",
    status: "partial" as const,
    current: "Thresholds set from T4 Stage 1 data. Ensemble voting (NB+DT) reduces false positives. No per-operator feedback loop.",
    target: "Per-GPU-model alert thresholds learned from operator feedback. False-positive rate tracked and minimized over time.",
    timeline: "Requires live installs to collect feedback",
    why: "Each install that doesn't cry wolf builds trust. Trust is the prerequisite for operators to pay.",
  },
];

const MOAT_STATUS = {
  unproven:  { label: "Unproven",   color: "#F87171" },
  not_built: { label: "Not built",  color: "#E8B23A" },
  gap:       { label: "Gap",        color: "#E8B23A" },
  partial:   { label: "Partial",    color: "#60A5FA" },
  planned:   { label: "Planned",    color: "#888780" },
  built:     { label: "Built",      color: "#D4AF37" },
};

function MoatTab() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <SectionLabel>The defensibility problem</SectionLabel>
        <Card className="p-5">
          <p className="text-[13px] text-[#a8a89f] leading-relaxed mb-3">
            The R_θ = ΔT/P equation is physics. A bigger company can copy it in one sprint. The moat cannot be the equation — it has to be built on top of it, in data, workflow integration, and calibration that takes time and operator access to accumulate.
          </p>
          <div className="font-mono text-[11px] text-[#5a5a55] border-t border-white/[0.05] pt-3 mt-3">
            Current stage: technical wedge is credible. Market timing is real. Missing proof: customer/operator validation.
          </div>
        </Card>
      </div>

      <div>
        <SectionLabel>Six moat dimensions — build status</SectionLabel>
        <div className="space-y-3">
          {MOAT_DIMENSIONS.map((m) => {
            const s = MOAT_STATUS[m.status];
            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-[10px] font-mono text-[#5a5a55] pt-0.5 w-4 flex-shrink-0">{m.id}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[13px] font-semibold text-[#E6F7F1]">{m.name}</span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{ color: s.color, background: `${s.color}18`, border: `0.5px solid ${s.color}40` }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#888780] leading-relaxed italic mb-2">
                      {m.why}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-[#0D0D0B] rounded p-2.5">
                        <div className="text-[9px] font-mono text-[#5a5a55] uppercase tracking-wider mb-1">Now</div>
                        <p className="text-[11px] text-[#888780] leading-relaxed">{m.current}</p>
                      </div>
                      <div className="bg-[#0D0D0B] rounded p-2.5">
                        <div className="text-[9px] font-mono text-[#D8D2C2] uppercase tracking-wider mb-1">Target</div>
                        <p className="text-[11px] text-[#a8a89f] leading-relaxed">{m.target}</p>
                        <div className="text-[9px] font-mono text-[#5a5a55] mt-1.5">{m.timeline}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>The highest-leverage next move</SectionLabel>
        <Card className="p-5">
          <div className="text-[13px] font-semibold text-[#E6F7F1] mb-3">
            Get one real operator to install ThermalOS and react to what it shows.
          </div>
          <p className="text-[12px] text-[#888780] leading-relaxed mb-4">
            Not "take a meeting." Not "validate interest." Install it. Then collect: what did it detect, was it useful, did it match their intuition, would they keep it running, what would they pay for, what workflow should it integrate with.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {["RunPod (awaiting reply)", "Vast.ai (awaiting reply)", "Lambda Labs (awaiting reply)", "Cal Poly AI Factory (Lupo proposal ready)", "theta calibrate (P1 — build this week)", "Grafana annotation hook (low effort)"].map((item) => (
              <div key={item} className="bg-[#0D0D0B] rounded p-2 text-[11px] font-mono text-[#888780]">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const TABS = [
  { value: "methodology",    label: "Methodology",     sub: "Framing & findings",      Component: MethodologyTab },
  { value: "sensitivity",    label: "Sensitivity",     sub: "T_ref & power smoothing", Component: SensitivityTab },
  { value: "classification", label: "Classification",  sub: "Rule-based vs Bayesian",  Component: ClassificationTab },
  { value: "faults",         label: "Fault Taxonomy",  sub: "6 modes · v0.1.9",        Component: FaultTaxonomyTab },
  { value: "moat",           label: "Moat",            sub: "6 dimensions · status",   Component: MoatTab },
  { value: "rtheta",         label: "Rθ vs Pressure",  sub: "Regression model",        Component: RthetaModel },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function Research() {
  useEffect(() => { document.title = "ThermalOS — Research | amogh.site"; }, []);

  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: TabValue = (TABS.find((t) => t.value === raw)?.value ?? "methodology");

  const onTabChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "methodology") next.delete("tab"); else next.set("tab", v);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <div className="mb-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#5a5a55] mb-1">
          ThermalOS · Research
        </div>
        <h1 className="text-[22px] md:text-[26px] font-semibold text-[#E6F7F1] tracking-tight">
          Methodology &amp; findings
        </h1>
        <p className="text-[12px] text-[#888780] mt-1 max-w-2xl">
          How we define Rθ_eff, what Stage 1 surfaced, and the supporting rig work that calibrates the model.
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
            {t.value === "rtheta" && (
              <div className="mb-4 px-3 py-2 rounded bg-[#888780]/10 border border-[#888780]/25 text-[11px] font-mono text-[#888780]">
                ME track · physical rig data · not yet running · launching fall 2026
              </div>
            )}
            <t.Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
