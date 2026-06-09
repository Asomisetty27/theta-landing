// ========== PORTFOLIO DATA MODEL ==========
export type ConfidenceBadge = "VERIFIED" | "CONCEPTUAL";

export interface EvidenceItem {
  id: string;
  fileName: string;
  page?: number;
  type: "pdf" | "image" | "screenshot" | "code" | "link" | "video";
  description: string;
  path?: string;
  url?: string;
}

export interface TrackedValue {
  value: string | number;
  unit?: string;
  evidence_source?: string;
  confidence: ConfidenceBadge;
}

export interface DiagramItem {
  id: string;
  title: string;
  confidence: ConfidenceBadge;
  derivedFrom: string[];
  description: string;
  imagePath?: string;
  conceptualNote?: string;
  engineeringNote?: boolean;
}

export interface FailureMode {
  problem: string;
  cause: string;
  fix: string;
  systemImpact: string;
  evidence_source?: string;
  confidence: ConfidenceBadge;
}

export interface VerificationRow {
  parameter: string;
  value: string;
  unit: string;
  evidence_source: string;
  confidence: ConfidenceBadge;
}

export interface RGMStage {
  number: number;
  name: string;
  labSource: string;
  whatItDoes: string;
  howItWorks: string;
  input: string;
  output: string;
  evidenceSource: string;
  keyComponents?: string[];
}

export interface Subsystem {
  id: string;
  title: string;
  description: string;
  details: string[];
  confidence: ConfidenceBadge;
  evidenceSource?: string;
}

export interface ProjectModule {
  problemStatement: string;
  systemOverview: string;
  systemArchitecture: string;
  subsystems?: Subsystem[];
  implementationNotes: string[];
  failureModes: FailureMode[];
  improvements: string[];
  validationResults?: string[];
  keyInsight?: string;
  verificationSummary?: VerificationRow[];
  ownershipDisclosure?: { owned: string[]; aiAssisted: string[] };
  rgmStages?: RGMStage[];
  achievements?: string[];
}

export type SystemDomain =
  | "signal-systems"
  | "electromechanical"
  | "digital-systems"
  | "manufacturing"
  | "materials"
  | "fpv-systems";

export type ProjectStatus = "COMPLETE" | "IN_PROGRESS" | "EVIDENCE_PENDING" | "ACTIVE";

export interface Project {
  id: string;
  name: string;
  codename: string;
  domain: SystemDomain;
  status: ProjectStatus;
  course?: string;
  statusColor: string;
  module: ProjectModule;
  diagrams: DiagramItem[];
  evidence: EvidenceItem[];
  techStack: string[];
  heroSummary: string;
  heroImage?: string;
  has3D?: boolean;
  hologramType?: "physical" | "system" | "network" | "interactive" | "scientific";
  videoPath?: string;
}

export interface SystemDomainInfo {
  id: SystemDomain;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
}

export const systemDomains: SystemDomainInfo[] = [
  {
    id: "signal-systems",
    name: "System Integration & Signal Pipelines",
    subtitle: "End-to-end analog↔digital systems, signal conditioning, ADC/DAC",
    icon: "signal",
    color: "neon-cyan",
  },
  {
    id: "electromechanical",
    name: "Electromechanical Systems",
    subtitle: "Multi-stage chain reactions, sensors, actuators, control loops",
    icon: "zap",
    color: "neon-green",
  },
  {
    id: "digital-systems",
    name: "Digital Systems & Computation",
    subtitle: "CPU architecture, FSMs, FPGA implementation, HDL design",
    icon: "cpu",
    color: "neon-magenta",
  },
  {
    id: "manufacturing",
    name: "Manufacturing & Physical Realization",
    subtitle: "CAD → fabrication → assembly, GD&T, machining, PCB",
    icon: "wrench",
    color: "neon-amber",
  },
  {
    id: "materials",
    name: "Materials Engineering & Material Selection",
    subtitle: "Structure–property–processing reasoning, phase transformations, degradation",
    icon: "flask",
    color: "neon-magenta",
  },
  {
    id: "fpv-systems",
    name: "FPV Flight Systems Integration",
    subtitle: "Propulsion, flight control, RF architecture, power regulation, digital video",
    icon: "drone",
    color: "neon-cyan",
  },
];

// ========== RGM STAGES (from Lab_Final_Report_Amogh_Somisetty.pdf) ==========
const rgmStages: RGMStage[] = [
  {
    number: 1,
    name: "Capacitive Touch Arduino Piano",
    labSource: "Lab 4",
    whatItDoes:
      "Input trigger for the entire RGM. User inputs correct 5-note sequence (keys 1, 3, 2, 4, 1) using four copper foil touch pads connected to Arduino Mega.",
    howItWorks:
      "Each pad uses RC circuit with 2.2 MΩ resistor. Touch increases capacitance beyond 1000 counts (CapacitiveSensor library). Unique tones (C4, D4, E4, F4) play via buzzer. After correct 5-note sequence, relay on pin 8 activates.",
    input: "Human touch — correct 5-note sequence",
    output: "Relay activation (pin 8 HIGH)",
    evidenceSource: "Lab_Final_Report, p3",
    keyComponents: ["Arduino Mega", "Copper foil pads", "2.2 MΩ resistors", "Buzzer", "CapacitiveSensor library"],
  },
  {
    number: 2,
    name: "Relay — Piano to Strobe Light",
    labSource: "Labs 2 & 4",
    whatItDoes: "Provides electrical isolation between the 5V Arduino and the 9V strobe light circuit.",
    howItWorks:
      "Arduino switches relay via BC548 NPN transistor. Relay closes normally-open contacts to connect 9V supply to strobe circuit. Flyback diode protects transistor from relay coil voltage spikes.",
    input: "Relay activation signal from piano Arduino",
    output: "9V power connected to strobe light circuit",
    evidenceSource: "Lab_Final_Report, p3",
    keyComponents: ["BC548 NPN transistor", "Relay module", "Flyback diode", "9V supply"],
  },
  {
    number: 3,
    name: "Strobe Light",
    labSource: "Lab 5",
    whatItDoes: "Produces bright flash to trigger light detector circuit.",
    howItWorks:
      "Three parts: (1) RC oscillator with Q1/Q2 transistors drives step-up transformer generating ~580V, (2) rectifier/capacitor stores high voltage, (3) SCR trigger circuit discharges energy into xenon flash tube. Flash rate = R3 × C3.",
    input: "9V from relay",
    output: "Bright xenon flash",
    evidenceSource: "Lab_Final_Report, p3",
    keyComponents: ["Step-up transformer", "Xenon flash tube", "SCR trigger", "RC oscillator (~580V)"],
  },
  {
    number: 4,
    name: "Light Detector with Schmitt Trigger",
    labSource: "Lab 2",
    whatItDoes: "Detects the strobe flash and outputs a clean digital signal to trigger the solenoid.",
    howItWorks:
      "Photoresistor and VR1 form voltage divider. Strobe flash causes V2 > V1 at Schmitt trigger input. Hysteresis prevents oscillation from ambient light. Output drives solenoid circuit.",
    input: "Strobe light flash",
    output: "Digital trigger signal to solenoid",
    evidenceSource: "Lab_Final_Report, p3–4",
    keyComponents: ["Photoresistor", "LM324 Op-Amp", "Schmitt trigger", "VR1 threshold pot"],
  },
  {
    number: 5,
    name: "Solenoid — Launches Steel Marble",
    labSource: "Lab 7",
    whatItDoes: "Physically launches steel marble into metal detector coil when triggered by light detector.",
    howItWorks:
      "Current through solenoid coil attracts inner plunger, pushing steel ball down track into inductor coil. Solenoid secured in track piece (6 in × 2 in × 1 in, 0.75 in cylindrical cutout).",
    input: "Trigger signal from light detector",
    output: "Steel marble launched into inductor coil",
    evidenceSource: "Lab_Final_Report, p4",
    keyComponents: ["Solenoid actuator", "Custom track (6×2×1 in)", "Steel marble"],
  },
  {
    number: 6,
    name: "555 Timer Metal Detector",
    labSource: "Lab 6",
    whatItDoes:
      "Senses steel marble inside inductor coil via frequency drop, signals Arduino to release electromagnet.",
    howItWorks:
      "NE555 in astable mode with LC oscillator. Without metal: 8,760 Hz. With marble: 8,310 Hz (5.1% drop, above 4% minimum). Arduino on pin 12 reads frequency with pulseIn() and sets electromagnet LOW when ≥4% drop detected.",
    input: "Steel marble enters inductor coil",
    output: "Frequency drop detection → Arduino signal",
    evidenceSource: "Lab_Final_Report, p4",
    keyComponents: ["NE555 timer", "LC oscillator", "Arduino Mega (pulseIn)", "Inductor coil"],
  },
  {
    number: 7,
    name: "Electromagnet Turns OFF — Ball Released",
    labSource: "Lab 7",
    whatItDoes: "Holds steel ball above tilt switch. Releases when metal detection confirmed.",
    howItWorks:
      "MOSFET on Arduino pin 11 controls electromagnet current. Initially HIGH (holding ball). Arduino detects ≥4% frequency drop → sets pin 11 LOW → MOSFET switches off → electromagnet releases ball. Shared ground required between Arduino and 9V supply.",
    input: "Arduino detection signal (≥4% frequency drop)",
    output: "Steel ball released from electromagnet",
    evidenceSource: "Lab_Final_Report, p4",
    keyComponents: ["MOSFET (N-Ch)", "Electromagnet", "Arduino pin 11", "Shared ground"],
  },
  {
    number: 8,
    name: "Metal Ball Drops onto Tilt Switch",
    labSource: "N/A",
    whatItDoes: "Steel ball falls under gravity onto tilt switch, physically actuating it.",
    howItWorks:
      "Tilt switch is normally open. Steel ball falls and tilts switch beyond threshold, closing circuit and sending signal to Arduino to update LCD.",
    input: "Steel ball released from electromagnet",
    output: "Tilt switch closed → Arduino digital input LOW",
    evidenceSource: "Lab_Final_Report, p5",
    keyComponents: ["Tilt switch (SPST, N.O.)", "Gravity"],
  },
  {
    number: 9,
    name: "LCD Displays 2 Rows of 16 White Blocks",
    labSource: "Last Step (Team Designed)",
    whatItDoes: "Displays confirmation — 2 rows of 16 white blocks each — completing the RGM sequence.",
    howItWorks:
      "Tilt switch connected to Arduino with INPUT_PULLUP. Default HIGH, switch closure pulls LOW. Arduino polls pin state, writes custom 0xFF block character to all 32 positions of I2C LCD (address 0x27). Clear visual confirmation of successful RGM completion.",
    input: "Tilt switch LOW signal",
    output: "LCD shows 2×16 white blocks (RGM complete)",
    evidenceSource: "Lab_Final_Report, p5–6",
    keyComponents: ["Arduino Mega", "Inland 16×2 I2C LCD (PCF8574)", "INPUT_PULLUP", "Custom block char"],
  },
];

// ========== RGM FAILURE MODES (from Lab_Final_Report, Section 3) ==========
const rgmFailureModes: FailureMode[] = [
  {
    problem: "Strobe light not flashing",
    cause: "Broken transistor lead in oscillator stage of strobe PCB",
    fix: "Replaced transistor and verified correct orientation; oscillator resumed and strobe flashed",
    systemImpact: "Entire downstream chain (light detector → solenoid → detection → release) was blocked",
    evidence_source: "Lab_Final_Report, p10–11",
    confidence: "VERIFIED",
  },
  {
    problem: "Light detector triggered by ambient light",
    cause: "Photoresistor/VR1 voltage divider reference too low — room lighting exceeded threshold",
    fix: "Adjusted VR1 to raise threshold so only high-intensity strobe flash triggers Schmitt trigger",
    systemImpact: "False triggering caused premature solenoid activation without strobe input",
    evidence_source: "Lab_Final_Report, p11",
    confidence: "VERIFIED",
  },
  {
    problem: "Electromagnet releasing immediately after piano key press",
    cause: "Small frequency fluctuations in 555 oscillator falsely exceeded threshold before marble entered coil",
    fix: "Implemented streak counter (STREAK_N=5), added RELEASE_DELAY (600ms), adjusted TRIP_DELTA threshold",
    systemImpact: "Ball dropped before metal detection, breaking chain at stage 7",
    evidence_source: "Lab_Final_Report, p11",
    confidence: "VERIFIED",
  },
  {
    problem: "MOSFET not switching reliably",
    cause: "No common ground between Arduino (USB 5V) and external 9V supply — undefined gate-source voltage",
    fix: "Connected both grounds together; MOSFET functioned correctly afterward",
    systemImpact: "Electromagnet could not be controlled, preventing ball release",
    evidence_source: "Lab_Final_Report, p12",
    confidence: "VERIFIED",
  },
  {
    problem: "Metal detector threshold tuning issues",
    cause: "Baseline ~8,760 Hz → with marble ~8,310 Hz (5.1% drop). Percent change calculation was noisy",
    fix: "Used fixed TRIP_DELTA=150 Hz instead of percent calculation; eliminated false triggers while maintaining detection",
    systemImpact: "Inconsistent detection causing missed or false electromagnet releases",
    evidence_source: "Lab_Final_Report, p12",
    confidence: "VERIFIED",
  },
  {
    problem: "RC time constant discrepancy (Lab 4)",
    cause:
      "38.5% error in charging, 12.8% in discharging — due to oscilloscope cursor positioning, component tolerances, breadboard contact resistance",
    fix: "Changed resistor to 20 kΩ which decreased percent error; documented tolerance effects",
    systemImpact: "Affected timing accuracy of capacitive touch detection",
    evidence_source: "Lab_Final_Report, p12",
    confidence: "VERIFIED",
  },
];

// ========== PROJECTS ==========
export const projects: Project[] = [
  // ===== DOMAIN: SIGNAL SYSTEMS =====
  {
    id: "ee143-signal-system",
    name: "End-to-End Analog ↔ Digital Signal System",
    codename: "EE143-SYS",
    domain: "signal-systems",
    course: "EE 143",
    status: "COMPLETE",
    statusColor: "neon-green",
    heroSummary:
      "Designed, simulated, fabricated, and integrated a 4-bit binary-weighted DAC (LM1458 + 1206 resistors) on a 1×1\" 2-layer OshPark PCB, then validated it inside the full audio→Arduino ADC→DAC→speaker pipeline. Achieved 62.5 mV/step resolution with measured-vs-theoretical error within ±1 LSB across all 16 codes. Co-authored with Joyce Han.",
    has3D: false,
    hologramType: "system",
    module: {
      problemStatement:
        "How do you convert an analog audio signal to digital, process it, and reconstruct it through a hand-fabricated 4-bit DAC — accounting for loading, level-shifting, quantization, and sampling distortion at every stage?",
      systemOverview:
        "End-to-end analog→digital→analog pipeline built across nine EE 143 labs (chassis CAD, soldering, instrumentation, op-amps, PCB design, reflow, integration). Capstone delivered a fabricated 4-bit binary-weighted DAC validated in standalone (binary counter) and system-level (Arduino ADC + audio source + speaker) tests.",
      systemArchitecture:
        "Audio Source → Level-Shifting Op-Amp (LM1458, AC→0–1 V) → Arduino ADC (10-bit, mapped to 4-bit via ×0.014663) → PORTB digital lines → Custom 4-bit Binary-Weighted DAC PCB (LM1458, 80k/40k/20k/10k + 10k feedback, second stage ×–0.1) → Speaker / Oscilloscope",
      subsystems: [
        {
          id: "chassis",
          title: "Chassis CAD & 3D Print (Exp 1)",
          description:
            "Designed a 150 × 150 × 3 mm Fusion 360 chassis with self-centering 3 mm standoffs and filleted lip to mount the Arduino + 1\" DAC PCB. Exported as binary STL and 3D-printed for the bench setup.",
          details: [
            "Fusion 360 sketch → extrude → projected mounting holes → 0.75 mm offset face on standoff bases",
            "0.5 mm fillet on standoff pin tops for self-centering into PCB holes",
            "3 mm two-sided extruded lip with 3 mm outside / 1.5 mm inside corner fillets",
            "Output: binary STL → PLA print",
          ],
          confidence: "VERIFIED",
          evidenceSource: "EE 143 Experiment 1 lab manual + completed chassis",
        },
        {
          id: "measurement",
          title: "Measurement & Instrumentation (Exp 3, 4)",
          description:
            "Bench instrumentation fundamentals: oscilloscope triggering, function-generator 50 Ω vs Hi-Z behaviour, DMM accuracy budgeting, and reverse-engineering an unknown PCB via Ohm/Kirchhoff.",
          details: [
            "Oscilloscope trigger modes: edge / auto / normal / single",
            "50 Ω source impedance: amplitude doubles when terminated Hi-Z vs 50 Ω load",
            "5½-digit DMM accuracy: 0.25 % + 1 count on 10 kΩ range — propagated through error analysis",
            "Reverse-engineered PCB topology from in-circuit ohmmeter readings + isolation test",
          ],
          confidence: "VERIFIED",
          evidenceSource: "EE 143 Experiments 3 & 4 lab manuals",
        },
        {
          id: "soldering",
          title: "Soldering & Hand Assembly (Exp 2, 8)",
          description:
            "Hand and reflow soldering of through-hole and 1206 surface-mount parts; learned wetting/tinning, cold-joint diagnosis, flux chemistry, tombstoning, and bridging recovery.",
          details: [
            "Tinning + wetting protocol; iron tip cleaned every cycle to prevent oxidation",
            "Surface-mount IC procedure: tack opposite-corner pin first, then anchor adjacent pin",
            "Reflow profile: preheat → soak → reflow → cooling on bench oven",
            "Failure modes diagnosed: cold joints, lifted pads, tombstoning, solder bridges",
          ],
          confidence: "VERIFIED",
          evidenceSource: "EE 143 Experiments 2 & 8 lab manuals",
        },
        {
          id: "analog-conditioning",
          title: "Analog Conditioning — Op-Amp Systems (Exp 5, 7)",
          description:
            "Built voltage-follower buffer to defeat loading effects, then a summing-amp audio level-shifter that translates a ±250 mV AC source into the 0–1 V window the Arduino ADC expects.",
          details: [
            "Voltage follower (unity-gain buffer) eliminates loading from finite ADC input impedance",
            "Summing amplifier with DC offset shifts AC audio to 0–1 V at op-amp output",
            "Practical current source design from Exp 7 used as bias for downstream stages",
            "Datasheet-driven design: rail-to-rail behaviour, slew rate, input offset, CMRR",
          ],
          confidence: "VERIFIED",
          evidenceSource: "EE 143 Experiments 5 & 7 lab manuals",
        },
        {
          id: "pcb-dac",
          title: "4-bit DAC: Schematic → SPICE → PCB → Fab (Exp 6, Final)",
          description:
            "Binary-weighted resistor DAC built around an LM1458 op-amp on a 1×1\" 2-layer OshPark PCB. Verified in LTspice (universal Op-Amp2, ±12 V) before fabrication; PCB designed in Autodesk Fusion.",
          details: [
            "Resistor ladder: 80 kΩ (LSB) / 40 kΩ / 20 kΩ / 10 kΩ + 10 kΩ feedback — all 1206 SMD",
            "First op-amp stage: −0.625 V per LSB into summing node",
            "Second op-amp stage: gain = −0.1 → flips polarity, scales to +62.5 mV/LSB",
            "Full-scale output ≈ 0.94 V at code 15; resolution = 62.5 mV/step",
            "LTspice PULSE sources (0–5 V, 2 s period on bit 0) swept all 16 input combinations",
            "PCB: 2-layer FR-4, 1 oz Cu, OshPark purple solder mask — $20.10 total ($10.10 boards + $10 ship)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Final project report (Han & Somisetty) + EE 143 Exp 6 lab manual",
        },
        {
          id: "system-integration",
          title: "System Integration — Audio → ADC → DAC → Speaker (Exp 9)",
          description:
            "Capstone integration: audio source → level-shifter → Arduino Uno (10-bit ADC, mapped to 4-bit via PORTB) → fabricated DAC → oscilloscope + speaker. Validated against function-generator reference signal.",
          details: [
            "Arduino sketch: analogRead(A0) × 0.014663 → PORTB = output & 0x0F (DDRB = 0x0F on pins 8–11)",
            "Standalone DAC test driven by 74163 binary counter to confirm monotonic 4-bit transfer",
            "System test: function-generator sinusoid → DAC staircase reconstruction on scope",
            "Final stage: music source → speaker, audibly demonstrating 4-bit quantization artefacts",
          ],
          confidence: "VERIFIED",
          evidenceSource: "EE 143 Exp 9 lab manual + final project report",
        },
      ],
      implementationNotes: [
        "Co-designed and co-authored with Joyce Han (EE, Cal Poly SLO); IEEE-format final report submitted Dec 2025",
        "Chose binary-weighted topology over R-2R: 4 input resistors + 1 feedback at standard 1206 values, lowest part count for 4-bit",
        "LTspice simulation values matched bench oscilloscope measurements within ±1 LSB across all 16 codes",
        "Continuity-checked PCB before powering ±12 V — caught one solder bridge prior to first power-on",
        "Component placement minimised trace length: LM1458 centred, digital inputs left, analog output + audio jack right, single-point analog ground",
      ],
      failureModes: [
        {
          problem: "Source loading by Arduino ADC input",
          cause: "Finite ADC input impedance draws current from the audio source, dropping measured voltage below true source voltage",
          fix: "Inserted LM1458 voltage follower (unity-gain buffer) between source and ADC input",
          systemImpact: "Without buffer, sampled waveform amplitude was depressed and asymmetric",
          confidence: "VERIFIED",
        },
        {
          problem: "Signal outside 0–5 V ADC window",
          cause: "Bipolar AC audio swing centred on 0 V cannot be sampled by single-ended Arduino ADC",
          fix: "Summing amplifier with DC offset (Exp 7) shifts AC into 0–1 V band before ADC",
          systemImpact: "Clipping at rails would have destroyed half-cycles of the reconstructed output",
          confidence: "VERIFIED",
        },
        {
          problem: "Audible quantization distortion in speaker output",
          cause: "4-bit resolution provides only 16 levels (62.5 mV step), insufficient for clean audio reproduction",
          fix: "Documented as fundamental limit of low-resolution conversion; recommended 8/12-bit DAC + reconstruction filter for production",
          systemImpact: "Reconstructed waveform shows stair-step artefacts most visible at waveform extrema",
          confidence: "VERIFIED",
        },
      ],
      improvements: [
        "Move to R-2R ladder for ≥8-bit resolution (BWR resistor matching becomes impractical above 4 bits)",
        "Add anti-aliasing low-pass filter before ADC and reconstruction LPF after DAC output",
        "Replace LM1458 with rail-to-rail precision op-amp for tighter linearity",
        "Increase Arduino sampling rate via direct ADC register access (skip analogRead overhead)",
      ],
      keyInsight:
        "A working signal pipeline is a chain of impedance and resolution decisions. Loading effects, level-shifting, quantization step size, and analog reconstruction each compound — and the only way to know your system actually works is to instrument it end-to-end with a known reference (binary counter for the DAC, function-generator sinusoid for the full chain) and compare measured output to LTspice prediction within ±1 LSB.",
    },
    diagrams: [],
    evidence: [
      {
        id: "ee143-final-report",
        fileName: "Final_Project_EE143_Post-lab_9.pdf",
        type: "pdf",
        description:
          "IEEE-format final report (Han & Somisetty) — schematic, LTspice simulation, Fusion PCB design, OshPark fabrication, assembly, and Exp 9 system-level integration test of the 4-bit binary-weighted DAC.",
      },
      {
        id: "ee143-lab-sequence",
        fileName: "EE143_Exp1-9_LabManuals.pdf",
        type: "pdf",
        description:
          "Nine EE 143 lab manuals forming the build chain: Chassis CAD (Exp 1) → Soldering (Exp 2) → Instrumentation (Exp 3,4) → Op-Amps (Exp 5,7) → PCB DAC (Exp 6) → Reflow (Exp 8) → System Integration (Exp 9).",
      },
    ],
    techStack: [
      "LM1458 Op-Amp",
      "Arduino Uno (10-bit ADC)",
      "Binary-Weighted DAC",
      "LTspice",
      "Autodesk Fusion (PCB + CAD)",
      "OshPark Fabrication",
      "Reflow + Hand Soldering",
      "Oscilloscope / Function Gen / DMM",
      "1206 SMD",
    ],
  },

  // ===== DOMAIN: ELECTROMECHANICAL =====
  {
    id: "rgm-machine",
    name: "Rube Goldberg Electromechanical System",
    codename: "RGM-9",
    domain: "electromechanical",
    course: "EE 241",
    status: "COMPLETE",
    statusColor: "neon-green",
    heroSummary:
      "Built and debugged a 9-stage electromechanical chain integrating capacitive sensing, high-voltage strobe generation, optical detection, frequency-domain metal detection, and electromagnetic actuation. Resolved 6 failure modes across electrical, mechanical, and software boundaries. All stages verified in live demonstration.",
    heroImage: "/evidence/rgm-complete-setup.jpg",
    videoPath: "/evidence/rgm-demo.mp4",
    has3D: true,
    hologramType: "physical",
    module: {
      problemStatement:
        "Design a nine-stage Rube Goldberg Machine where each stage must reliably trigger the next with no manual intervention. Any single failure breaks the entire chain.",
      systemOverview:
        "Nine-stage electromechanical chain reaction integrating circuits from EE 241 Labs 2–7 plus a team-designed final step. The system spans capacitive sensing, power switching, high-voltage generation, optical detection, electromagnetic actuation, frequency-based metal detection, and digital I/O — all sequentially dependent.",
      systemArchitecture:
        "Piano (capacitive touch) → Relay (5V→9V isolation) → Strobe (~580V flash) → Light Detector (Schmitt trigger) → Solenoid (marble launch) → 555 Metal Detector (8,760→8,310 Hz) → Electromagnet (MOSFET release) → Tilt Switch → LCD (2×16 white blocks)",
      subsystems: [
        {
          id: "capacitive-input",
          title: "Capacitive Input Detection",
          description:
            "Four copper foil touch pads with RC circuits detect finger touch via capacitance change exceeding 1000 counts",
          details: [
            "2.2 MΩ resistors create RC time constant",
            "CapacitiveSensor library measures charge time",
            "5-note sequence validation (1, 3, 2, 4, 1)",
            "Buzzer feedback: C4, D4, E4, F4 tones",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_Final_Report, p3",
        },
        {
          id: "light-sensing",
          title: "Light Sensing + Schmitt Trigger",
          description:
            "Photoresistor voltage divider with hysteresis-based Schmitt trigger discriminates strobe flash from ambient light",
          details: [
            "Photoresistor + VR1 voltage divider sets threshold",
            "LM324 op-amp comparator with hysteresis",
            "VR1 adjusted to reject room lighting",
            "Clean digital output for solenoid trigger",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_Final_Report, p3-4",
        },
        {
          id: "solenoid-actuation",
          title: "Solenoid Actuation",
          description: "Electromagnetic solenoid launches steel marble from custom track into inductor coil",
          details: [
            "Custom track: 6×2×1 in with 0.75 in cylindrical cutout",
            "Solenoid plunger pushes steel ball",
            "BJT drive circuit with flyback diode protection",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_Final_Report, p4",
        },
        {
          id: "metal-detection",
          title: "Metal Detection via Frequency Shift",
          description: "NE555 LC oscillator baseline 8,760 Hz drops to 8,310 Hz (5.1%) when steel marble enters coil",
          details: [
            "NE555 astable mode with L1=0.5mH, C2/C3=2.2µF",
            "Baseline: 8,760 Hz → Metal-present: 8,310 Hz",
            "5.1% drop exceeds 4% minimum threshold",
            "Arduino pulseIn() on pin 12 measures frequency",
            "STREAK_N=5 consecutive readings required",
            "TRIP_DELTA=150 Hz fixed threshold",
            "RELEASE_DELAY=600ms debounce",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_Final_Report, p4",
        },
        {
          id: "electromagnet-release",
          title: "Electromagnet Release",
          description: "MOSFET-controlled electromagnet holds ball; releases on confirmed frequency drop detection",
          details: [
            "N-channel MOSFET on Arduino pin 11",
            "Initially HIGH (holding ball)",
            "Arduino sets LOW after streak confirmation",
            "Shared ground critical between Arduino and 9V",
            "Flyback diode protects MOSFET from back-EMF",
            "Holding force: 2.5 kg at 5V",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_Final_Report, p4",
        },
      ],
      implementationNotes: [
        "5-note capacitive sequence (1,3,2,4,1) with 2.2MΩ RC pads triggers relay",
        "BC548 NPN transistor switches relay; flyback diode protects from relay coil spikes",
        "Strobe generates ~580V via step-up transformer and RC oscillator",
        "Schmitt trigger with adjusted VR1 filters ambient light; only strobe flash triggers",
        "Solenoid launches marble from custom 6×2×1 in track into inductor coil",
        "NE555 astable LC oscillator: baseline 8,760 Hz → 8,310 Hz with metal (5.1% drop)",
        "Arduino pulseIn() on pin 12; STREAK_N=5, TRIP_DELTA=150 Hz, RELEASE_DELAY=600ms",
        "MOSFET on pin 11 controls electromagnet; shared ground required between Arduino and 9V",
        "Tilt switch with INPUT_PULLUP; default HIGH, closure to GND triggers LCD fill",
        "I2C LCD (0x27) fills all 32 positions with custom 0xFF block character",
      ],
      failureModes: rgmFailureModes,
      improvements: [
        "Digital frequency counter for more precise threshold detection",
        "PCB-based integration instead of breadboard for reliability",
        "Timing measurement between stages for performance analysis",
        "Wireless monitoring of each stage status",
      ],
      validationResults: [
        "Capacitive piano recognized proper 5-note sequence",
        "Relay successfully switched 9V power supply",
        "Strobe flashed in sequence",
        "Light detector only responded to strobe flash (not ambient)",
        "Solenoid successfully launched steel ball",
        "555 metal detector achieved 5.1% frequency change",
        "Electromagnet released only after confirmed detection",
        "Tilt switch triggered correctly (LOW with INPUT_PULLUP)",
        "LCD displayed 2 rows of 16 white blocks",
      ],
      verificationSummary: [
        {
          parameter: "Baseline Frequency",
          value: "8,760",
          unit: "Hz",
          evidence_source: "Lab_Final_Report, p4",
          confidence: "VERIFIED",
        },
        {
          parameter: "Metal-Present Frequency",
          value: "8,310",
          unit: "Hz",
          evidence_source: "Lab_Final_Report, p4",
          confidence: "VERIFIED",
        },
        {
          parameter: "Frequency Drop",
          value: "5.1",
          unit: "%",
          evidence_source: "Lab_Final_Report, p4",
          confidence: "VERIFIED",
        },
        {
          parameter: "Min Required Drop",
          value: "4",
          unit: "%",
          evidence_source: "Lab_Final_Report, p4",
          confidence: "VERIFIED",
        },
        {
          parameter: "TRIP_DELTA",
          value: "150",
          unit: "Hz",
          evidence_source: "Lab_Final_Report, p7 (code)",
          confidence: "VERIFIED",
        },
        {
          parameter: "BASE_FREQ",
          value: "8,600",
          unit: "Hz",
          evidence_source: "Lab_Final_Report, p7 (code)",
          confidence: "VERIFIED",
        },
        {
          parameter: "STREAK_N",
          value: "5",
          unit: "readings",
          evidence_source: "Lab_Final_Report, p7 (code)",
          confidence: "VERIFIED",
        },
        {
          parameter: "RELEASE_DELAY",
          value: "600",
          unit: "ms",
          evidence_source: "Lab_Final_Report, p7 (code)",
          confidence: "VERIFIED",
        },
        {
          parameter: "Strobe HV",
          value: "~580",
          unit: "V",
          evidence_source: "Lab_Final_Report, p3",
          confidence: "VERIFIED",
        },
        {
          parameter: "Total Stages",
          value: "9",
          unit: "stages",
          evidence_source: "Lab_Final_Report, p2",
          confidence: "VERIFIED",
        },
      ],
      rgmStages,
      achievements: [
        "Capacitive piano successfully recognized the proper sequence of 5 notes",
        "Relay successfully switched 9V power supply",
        "Strobe successfully flashed in sequence",
        "Light detector only responded to strobe flash",
        "Solenoid successfully launched steel ball",
        "555 metal detector achieved 5.1% frequency change",
        "Electromagnet only released after confirmed detection",
        "Tilt switch triggered correctly (LOW with INPUT_PULLUP)",
        "LCD displayed 2 rows of 16 white blocks",
      ],
      keyInsight:
        "Each stage must correctly produce an output that triggers the next. A single failure anywhere in the chain halts the entire system. Debugging required understanding signal propagation across domain boundaries — capacitive, optical, mechanical, electromagnetic, and digital.",
    },
    diagrams: [
      {
        id: "rgm-setup-photo",
        title: "Complete RGM Setup",
        confidence: "VERIFIED",
        derivedFrom: ["Lab_Final_Report_Amogh_Somisetty.pdf, p1"],
        description: "Complete RGM system as demonstrated in class on March 10, 2026.",
        imagePath: "/evidence/rgm-complete-setup.jpg",
      },
      {
        id: "rgm-block-diagram",
        title: "RGM Step-by-Step Block Diagram",
        confidence: "VERIFIED",
        derivedFrom: ["Lab_Final_Report_Amogh_Somisetty.pdf, p2"],
        description:
          "Nine-stage block diagram from Piano Key → LCD Display showing decision logic at frequency detection step.",
        imagePath: "/evidence/rgm-block-diagram.png",
      },
      {
        id: "rgm-last-step-schematic",
        title: "Last Step Schematic — Tilt Switch + I2C LCD",
        confidence: "VERIFIED",
        derivedFrom: ["Lab_Final_Report_Amogh_Somisetty.pdf, p6"],
        description:
          "Arduino digital input with INPUT_PULLUP, tilt switch SPST connection, Inland 16×2 LCD I2C backpack (PCF8574, address 0x27).",
        imagePath: "/evidence/rgm-last-step-schematic.png",
      },
      {
        id: "lab6-555-schematic",
        title: "555 Timer Metal Detector Schematic",
        confidence: "VERIFIED",
        derivedFrom: ["EE_241_Lab_6_Electric_Circuit_Analysis_1.pdf"],
        description:
          "TLC555 timer circuit with L1=0.5mH, C2/C3=2.2µF, R1=10K, R2=12K, R3=10K, R4=47K, C1=0.1µF, 9VDC supply.",
        imagePath: "/evidence/ee241-lab6-555timer.jpg",
      },
      {
        id: "lab7-drive-circuit",
        title: "Solenoid Drive Circuit (BJT)",
        confidence: "VERIFIED",
        derivedFrom: ["EE_241_Lab_7_Electric_Circuit_Analysis.pdf"],
        description:
          "BJT (TIP1E) drive circuit: base resistor (1K/2.2K), flyback diode (1N4004/MUR348), collector to solenoid, emitter to GND.",
        imagePath: "/evidence/ee241-lab7-drive-circuit.png",
      },
    ],
    evidence: [
      {
        id: "rgm-report",
        fileName: "Lab_Final_Report_Amogh_Somisetty.pdf",
        type: "pdf",
        description:
          "EE 241-01 Final RGM Project Report (15 pages). All 9 stages, schematics, code, failure modes, and discussion.",
      },
      {
        id: "rgm-demo-video",
        fileName: "EE_241_Final_Demonstration.mp4",
        type: "video",
        description:
          "Video demonstration of all nine RGM stages operating in sequence during class demo on March 10, 2026.",
        path: "/evidence/rgm-demo.mp4",
      },
      {
        id: "rgm-solenoid-cad",
        fileName: "Solenoid_Track_v2.f3d",
        type: "image",
        description: "Fusion 360 CAD file for solenoid track piece (6×2×1 in, 0.75 in cylindrical cutout).",
      },
      {
        id: "rgm-light-detector-cad",
        fileName: "Light_detector_Somisetty_A_CA.f3d",
        type: "image",
        description: "Fusion 360 CAD file for light detector housing.",
      },
    ],
    techStack: [
      "Arduino Mega",
      "555 Timer",
      "MOSFET",
      "Solenoid",
      "Electromagnet",
      "Schmitt Trigger",
      "I2C LCD",
      "Capacitive Touch",
      "Op-Amps",
    ],
  },

  // ===== DOMAIN: DIGITAL SYSTEMS =====
  {
    id: "digital-systems",
    name: "Digital Systems — FPGA & CPU Architecture",
    codename: "DIGI-SYS",
    domain: "digital-systems",
    course: "CPE 233 / CPE 133",
    status: "COMPLETE",
    statusColor: "neon-green",
    heroSummary:
      "Designed a multi-cycle RISC-V CPU (OTTER MCU) from gates up in SystemVerilog — full RV32I ISA, 10 ALU operations, 2-state FSM control unit, 32×32 register file. Synthesized and verified on Basys-3 FPGA via Vivado.",
    has3D: true,
    hologramType: "interactive",
    module: {
      problemStatement:
        "How do you design a complete CPU from gates up — implementing instruction fetch, decode, execute, and memory access cycles with correct timing and control?",
      systemOverview:
        "Comprehensive digital systems work spanning CPU architecture (OTTER MCU in SystemVerilog), finite state machines, and FPGA implementation of combinational and sequential logic.",
      systemArchitecture:
        "OTTER MCU: PC → IMEM → Decode → RF(32×32) → ALU(10 ops) → Memory → Writeback. CU_FSM: FETCH→EXEC. Branch logic: br_eq, br_lt, br_ltu. Immediate Gen: I/S/B/U/J types.",
      subsystems: [
        {
          id: "otter-cpu",
          title: "OTTER Multi-Cycle RISC-V CPU",
          description: "Complete RV32I processor with multi-cycle datapath, FSM control unit, and dual-port memory",
          details: [
            "PC supports 4 sources: PC+4, jalr, branch, jal",
            "ALU: add, sub, and, or, xor, slt, sltu, sra, sll, lui-copy",
            "Branch Condition Generator: br_eq, br_lt, br_ltu → CU_DCDR",
            "Register File: 32×32 dual-read, single-write with rf_wr_sel MUX",
            "Memory: dual-port (ADDR1=PC, ADDR2=ALU), RDEN1/2, WE2, SIZE, SIGN",
            "FSM: FETCH → EXEC (2-cycle minimum)",
            "Immediate Generator: I, S, B, U, J type encoding",
            "IOBUS interface for peripheral I/O",
          ],
          confidence: "VERIFIED",
          evidenceSource: "OTTER_Architecture_No_Interrupts_1.pdf",
        },
        {
          id: "fsm-systems",
          title: "FSM-Based Control Systems",
          description: "State machine design for sequential control including timing and transition logic",
          details: [
            "Moore and Mealy machine implementations",
            "State encoding strategies: binary, one-hot, gray",
            "Timing control via clock division",
            "Output logic and state transition tables",
          ],
          confidence: "CONCEPTUAL",
          evidenceSource: "CPE 133 / CPE 233 coursework — evidence upload pending",
        },
        {
          id: "fpga-implementation",
          title: "FPGA Implementation",
          description:
            "Digital logic building blocks implemented on FPGA: multiplexers, flip-flops, shift registers, clock dividers",
          details: [
            "Combinational: MUX, decoder, encoder",
            "Sequential: D-FF, shift registers, counters",
            "Clock domain management and division",
            "Synthesis and place-and-route via Vivado",
          ],
          confidence: "CONCEPTUAL",
          evidenceSource: "CPE 133 labs — evidence upload pending",
        },
      ],
      implementationNotes: [
        "OTTER MCU written in SystemVerilog, synthesized in Vivado",
        "PC supports 4 sources: PC+4, jalr, branch, jal via pcSource MUX",
        "ALU: 10 operations selected by alu_fun[3:0]",
        "Branch: br_eq, br_lt, br_ltu signals to CU_DCDR",
        "RF: dual-read (rs1, rs2), single-write with rf_wr_sel MUX",
        "Memory: dual-port BRAM, byte/half/word access with sign extension",
        "FSM states: FETCH, EXEC — minimum 2 cycles per instruction",
      ],
      failureModes: [
        {
          problem: "Branch target miscalculation",
          cause: "pcSource MUX not properly gated by PCWrite signal",
          fix: "PCWrite only asserts during EXEC state; verified via BRANCH_ADDR_GEN module",
          systemImpact: "Incorrect program flow on branch instructions",
          evidence_source: "OTTER_Architecture_No_Interrupts_1.pdf, p1",
          confidence: "VERIFIED",
        },
      ],
      improvements: [
        "Add pipeline stages (IF/ID/EX/MEM/WB)",
        "Implement interrupt handling (INTR, CSR_reg path)",
        "Hazard detection and forwarding logic",
        "Expand to RV32IM (multiply/divide)",
      ],
      keyInsight:
        "Timing is everything in digital systems. The difference between combinational and sequential logic determines when data is valid. State machines control the system — every instruction's execution is a sequence of precisely-timed control signals that must be generated in the correct order.",
      verificationSummary: [
        {
          parameter: "ISA",
          value: "RV32I",
          unit: "",
          evidence_source: "OTTER_Architecture, p1",
          confidence: "VERIFIED",
        },
        {
          parameter: "ALU Operations",
          value: "10",
          unit: "functions",
          evidence_source: "OTTER_Architecture, p1",
          confidence: "VERIFIED",
        },
        {
          parameter: "Register File",
          value: "32×32",
          unit: "bit",
          evidence_source: "OTTER_Architecture, p1",
          confidence: "VERIFIED",
        },
        {
          parameter: "FSM States",
          value: "2",
          unit: "(FETCH, EXEC)",
          evidence_source: "OTTER_Architecture, p1",
          confidence: "VERIFIED",
        },
        {
          parameter: "PC Sources",
          value: "4",
          unit: "MUX inputs",
          evidence_source: "OTTER_Architecture, p1",
          confidence: "VERIFIED",
        },
      ],
    },
    diagrams: [
      {
        id: "otter-datapath-verified",
        title: "OTTER MCU Full Datapath",
        confidence: "VERIFIED",
        derivedFrom: ["OTTER_Architecture_No_Interrupts_1.pdf"],
        description: "Complete RISC-V OTTER MCU datapath showing all modules and signal paths.",
        imagePath: "/evidence/otter-datapath.jpg",
      },
    ],
    evidence: [
      {
        id: "otter-arch-pdf",
        fileName: "OTTER_Architecture_No_Interrupts_1.pdf",
        type: "pdf",
        description: "Full OTTER MCU architecture diagram with datapath, control unit, and ALU table",
        path: "/evidence/otter-datapath.jpg",
      },
      {
        id: "riscv-asm-manual",
        fileName: "RISC-V_Assembler_Manual.pdf",
        type: "pdf",
        description: "RISC-V OTTER Assembly Manual v4.04 — ISA formats, opcodes, instructions",
      },
    ],
    techStack: ["SystemVerilog", "Vivado", "RISC-V ISA", "FPGA", "FSM Design"],
  },

  // ===== DOMAIN: MANUFACTURING =====
  {
    id: "manufacturing-systems",
    name: "Manufacturing & CAD Systems",
    codename: "MFG-SYS",
    domain: "manufacturing",
    course: "IME 144",
    status: "COMPLETE",
    statusColor: "neon-green",
    heroSummary:
      "Executed the full design-to-manufacturing pipeline: parametric CAD → engineering drawings per ASME Y14.5 GD&T → manual machining on lathe and mill → dimensional inspection → assembly. Produced 6 precision parts for a working pneumatic air motor.",
    has3D: true,
    hologramType: "physical",
    module: {
      problemStatement:
        "How do you take a design from CAD model to physical part — accounting for tolerances, material properties, and manufacturing constraints at every step?",
      systemOverview:
        "Complete design-to-manufacturing pipeline for a pneumatic air motor. Covers parametric CAD modeling, engineering drawings with GD&T per ASME Y14.5, manual machining on lathe and mill, metrology, and final assembly.",
      systemArchitecture:
        "CAD Model (SolidWorks) → Engineering Drawing (GD&T) → Production Plan → Material Selection → Machining (Lathe/Mill) → Inspection (Metrology) → Assembly",
      subsystems: [
        {
          id: "cad-modeling",
          title: "CAD Modeling & Parametric Design",
          description: "SolidWorks parametric models with dimensional constraints, mates, and assembly verification",
          details: [
            "Parametric feature-based modeling",
            "Assembly constraints and mate definitions",
            "Interference detection",
            "Drawing generation from 3D models",
          ],
          confidence: "VERIFIED",
          evidenceSource: "SolidWorks part files (.SLDPRT)",
        },
        {
          id: "machining",
          title: "Manual Machining Operations",
          description: "Precision machining on manual lathe and milling machine with calculated feeds and speeds",
          details: [
            "Lathe operations: facing, turning, boring, threading",
            "Mill operations: face milling, slot milling, drilling",
            "Feeds & speeds calculated per material and tool",
            "Sawing, threading, broaching operations",
          ],
          confidence: "VERIFIED",
          evidenceSource: "IME_144_MANUAL.pdf, pp.224-285",
        },
        {
          id: "metrology",
          title: "Metrology & Inspection",
          description: "Dimensional inspection using precision measurement tools",
          details: [
            "Calipers: ±0.001 in resolution",
            "Micrometers: ±0.0001 in resolution",
            "Dial indicators for runout and flatness",
            "Gage blocks for calibration verification",
          ],
          confidence: "VERIFIED",
          evidenceSource: "IME_144_MANUAL.pdf",
        },
      ],
      implementationNotes: [
        "Parts: Crank Disk, Cylinder, Flywheel, Frame, Mainshaft, Piston",
        "Processes: Turning (lathe), Milling, Sawing, Threading, Broaching",
        "Measuring: Calipers, Micrometers, Dial indicators, Gage blocks",
        "GD&T per ASME Y14.5 standard",
        "Feeds & speeds calculated per material and operation",
        "Production planning documents created for each part",
      ],
      failureModes: [],
      improvements: [
        "CNC machining for higher precision repeatability",
        "Alternative materials (aluminum alloys) for weight reduction",
      ],
      keyInsight:
        "The gap between a CAD model and a physical part is defined by tolerances. Real-world manufacturing introduces variation from tool wear, thermal expansion, fixturing, and operator technique. GD&T communicates design intent so manufacturing and inspection can verify parts independently.",
    },
    diagrams: [
      {
        id: "ime144-cover-verified",
        title: "Air Motor Assembly Reference",
        confidence: "VERIFIED",
        derivedFrom: ["IME_144_MANUAL.pdf"],
        description: "Air motor assembly illustration from IME 144 course manual.",
        imagePath: "/evidence/ime144-cover.jpg",
      },
    ],
    evidence: [
      {
        id: "ime144-manual",
        fileName: "IME_144_MANUAL.pdf",
        type: "pdf",
        description:
          "Full IME 144 Manual: engineering drawings, GD&T, machining processes, air motor project (pp.224-285).",
        path: "/evidence/ime144-cover.jpg",
      },
      {
        id: "ime144-crank",
        fileName: "Crank_Disk-2.SLDPRT",
        type: "image",
        description: "SolidWorks part file for Crank Disk",
      },
      {
        id: "ime144-cylinder",
        fileName: "Cylinder.SLDPRT",
        type: "image",
        description: "SolidWorks part file for Cylinder",
      },
      {
        id: "ime144-mill",
        fileName: "IME_144_Mill_Part_1_Somisetty.SLDPRT",
        type: "image",
        description: "SolidWorks part file for milled component",
      },
      {
        id: "ime144-screwdriver",
        fileName: "IME_Screwdriver_Project_Somisetty.SLDPRT",
        type: "image",
        description: "SolidWorks screwdriver project file",
      },
    ],
    techStack: ["Manual Lathe", "Manual Mill", "GD&T", "SolidWorks", "Metrology", "Production Planning"],
  },

  // ===== FUNCK (cross-domain: web/systems) =====
  {
    id: "funck",
    name: "FUNCK — Mobile-First Event Operating System",
    codename: "FUNCK",
    domain: "signal-systems",
    course: undefined,
    status: "ACTIVE",
    statusColor: "neon-cyan",
    heroSummary:
      "Production-ready, mobile-first event platform for creating, filling, and operating events end-to-end. Refined into a conversion-optimized OS with hardened mobile Safari behavior, repaired verification email infrastructure, and edge-function OG preview rendering. Live at funck.live.",
    has3D: true,
    hologramType: "network",
    module: {
      problemStatement:
        "How do you turn a feature-focused event app into a conversion-optimized operating system that hosts can trust to create, fill, and run real events on mobile?",
      systemOverview:
        "Mobile-first event OS spanning host onboarding, event creation, share-oriented RSVP funnel, lifecycle operations (before/during/after), Stripe-backed ticketing, QR issuance, and admin tooling — engineered for real-device reliability.",
      systemArchitecture:
        "Client (React, mobile-first) → Lovable App → Supabase (PostgreSQL + Auth + Edge Functions) → Stripe (payments + Connect payouts) → Resend (verification + transactional email) → Edge functions (OG preview rendering, keep-alive)",
      implementationNotes: [
        "Mobile-first event creation, management, and RSVP flows",
        "Guest conversion and share-oriented RSVP funnel",
        "Host onboarding, readiness, and retention improvements",
        "Full event lifecycle support: pre-event, live, and post-event",
        "Safari hardening: safe-area, viewport, and real-device UX fixes",
        "Diagnosed and repaired broken verification email delivery (missing queue infrastructure)",
        "Admin system consolidated and locked to a single email",
        "Keep-alive workaround for Supabase inactivity pausing",
        "Edge-function based OG preview infrastructure for invite sharing",
      ],
      failureModes: [
        {
          problem: "Verification emails not being delivered",
          cause: "Missing queue infrastructure between auth events and email provider",
          fix: "Rebuilt verification pipeline through edge function + Resend with proper retry/queue handling",
          systemImpact: "Blocked new user signups and host onboarding entirely",
          confidence: "VERIFIED",
        },
        {
          problem: "Production UI mismatch on iOS Safari only",
          cause: "Safe-area insets and viewport height behavior differing from desktop/Chrome",
          fix: "Hardened layout with safe-area env() padding and dynamic viewport units; validated on real devices",
          systemImpact: "Broken layouts on the primary target platform (mobile Safari)",
          confidence: "VERIFIED",
        },
      ],
      improvements: [
        "Open Graph preview headers for invite link rendering (current critical blocker)",
        "Concurrency controls for ticket purchase race conditions",
        "Idempotency keys for Stripe payment intents",
        "Load testing for high-demand events",
      ],
      ownershipDisclosure: {
        owned: [
          "Product strategy, conversion optimization, and UX direction",
          "Host onboarding and event lifecycle design",
          "Mobile Safari debugging and real-device validation",
          "Infrastructure debugging (email queue, OG preview, keep-alive)",
          "Integration architecture (Stripe, Supabase, Resend, edge functions)",
          "Deployment and production operations",
        ],
        aiAssisted: ["Code generation via Lovable AI — used for implementation acceleration"],
      },
    },
    diagrams: [
      {
        id: "funck-arch",
        title: "Platform Architecture",
        confidence: "CONCEPTUAL",
        derivedFrom: [],
        description:
          "Client (React/Lovable, mobile-first) → Supabase (DB + Auth + Edge Functions) → Stripe (Payments + Connect) → Resend (Verification + Email) → Edge functions (OG preview, keep-alive)",
        conceptualNote: "Architecture reflects actual production system at funck.live.",
      },
    ],
    evidence: [
      {
        id: "funck-live",
        fileName: "www.funck.live",
        type: "link",
        description: "Live production URL",
        url: "https://www.funck.live",
      },
    ],
    techStack: ["React", "Lovable", "Supabase", "Edge Functions", "Stripe", "Resend", "TypeScript"],
  },

  // ===== PEC NEXUS (cross-domain: internal tools / systems) =====
  {
    id: "pec-nexus",
    name: "PEC Nexus — Role-Aware Internal Operating System",
    codename: "PEC-NEXUS",
    domain: "signal-systems",
    course: undefined,
    status: "ACTIVE",
    statusColor: "neon-cyan",
    heroSummary:
      "Role-aware internal operating system for Poly-Engineering Consulting unifying project execution, training, scheduling, messaging, and permissions. Designed around three operating modes — Purpose, Competition, and Contract — to reduce redundancy, clarify roles, and scale internal coordination.",
    has3D: false,
    hologramType: "network",
    module: {
      problemStatement:
        "How do you replace a fragmented set of club tools with a single role-aware operating system that mirrors how the organization actually executes work across projects, training, and operations?",
      systemOverview:
        "Internal OS structured around three operating modes — Purpose, Competition, and Contract — with role-aware workflows for PMs, Tech Leads, and members. Unifies project execution, training, scheduling, messaging, and permissions into one scalable platform.",
      systemArchitecture:
        "Client (React, role-aware UI) → Lovable App (workflow + permissions layer) → Supabase (PostgreSQL + Auth + RLS) → Mission Control surface → Training (Learn + Grind) + Scheduling + Stage-based Project Execution",
      implementationNotes: [
        "Three-mode architecture: Purpose, Competition, Contract",
        "Role-aware workflows for PMs, Tech Leads, and members",
        "Mission Control command surface for action prioritization",
        "Unified Training system combining Learn + Grind",
        "Active and passive scheduling with intelligent planning concepts",
        "Stage-based project execution and deliverable workflows",
        "Identity mapping, permissions, and self-healing admin logic",
        "Navigation compression to reduce surface complexity",
        "Group workflows and structured internal operations",
      ],
      failureModes: [],
      improvements: [
        "Telemetry on workflow adoption and bottleneck stages",
        "Automated permission audits across roles and modes",
        "Deeper integration between Training progression and project staffing",
      ],
      ownershipDisclosure: {
        owned: [
          "Product architecture and three-mode system design",
          "Role-based UX strategy and permissions model",
          "Workflow architecture across projects, training, and scheduling",
          "End-to-end build, iteration, and rollout to the organization",
        ],
        aiAssisted: ["Code generation via Lovable AI — used for implementation acceleration"],
      },
    },
    diagrams: [
      {
        id: "pec-nexus-arch",
        title: "PEC Nexus — System Architecture",
        confidence: "CONCEPTUAL",
        derivedFrom: [],
        description:
          "Role-aware client → Workflow + permissions layer → Supabase (DB + Auth + RLS) → Mission Control + Training + Scheduling + Stage-based Execution",
        conceptualNote: "Architecture reflects the deployed internal operating system for Poly-Engineering Consulting.",
      },
    ],
    evidence: [],
    techStack: ["React", "Lovable", "Supabase", "Workflow Architecture", "Role-Based UX", "TypeScript"],
  },

  // ===== DOMAIN: MATERIALS ENGINEERING =====
  // PROJECT GROUP A: Phases, Transformations, Microstructure
  {
    id: "materials-phases",
    name: "Phases, Microstructure, and Property Control in Engineering Alloys",
    codename: "MATE-PHASE",
    domain: "materials",
    course: "MATE 210 / MATE 215",
    status: "COMPLETE",
    statusColor: "neon-amber",
    heroSummary:
      "Phase diagram reasoning, cold work/recrystallization mechanics, and heat treatment of steels. Structure–property–processing control from eutectic solidification through eutectoid transformation.",
    has3D: true,
    hologramType: "scientific",
    module: {
      problemStatement:
        "How do phase diagrams, deformation history, and thermal processing combine to control the microstructure and mechanical properties of engineering alloys?",
      systemOverview:
        "Integrates three interconnected materials concepts: (1) binary phase diagram interpretation and cooling behavior, (2) cold work → recovery → recrystallization → grain growth progression, and (3) Fe-C phase transformations and heat treatment logic for steels.",
      systemArchitecture:
        "Composition + Temperature → Phase Diagram → Phase Fields → Microstructure Prediction → Property Control | Deformation → Dislocation Density → Annealing → Recrystallization → Grain Size → Properties | Austenitize → Cooling Rate → Pearlite/Bainite/Martensite → Hardness/Ductility",
      subsystems: [
        {
          id: "phase-diagrams",
          title: "Phase Diagram Reasoning (Pb-Sn Eutectic)",
          description:
            "Binary eutectic phase diagram interpretation: phase fields, eutectic composition/temperature, cooling paths, and primary/proeutectic phase formation. Pb-Sn system used as the model eutectic.",
          details: [
            "Pb-Sn eutectic system: eutectic at 61.9 wt% Sn, 183°C (Lab 4, p3–4)",
            "α solvus: max solubility 18.3 wt% Sn at 183°C; β solvus: 97.8 wt% Sn at 183°C (Lab 4, p3)",
            "Pure Pb melts at 327°C, pure Sn at 232°C (Lab 4, Fig.1)",
            "Cooling curve features: slope change (α+L region) and thermal arrest (eutectic at 183°C) (Lab 4, p4–5)",
            "Proeutectic α forms above eutectic T; eutectic reaction L → α + β occurs at 183°C (Lab 4, p5)",
            "Lever rule calculates phase fractions from tie lines in two-phase regions (Lab 4, p2)",
            "Hypoeutectic: primary α + eutectic; Hypereutectic: primary β + eutectic (Lab 4, p5)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_4_Phase_Diagrams_Spring_2017_1.pdf, pp.1–8",
        },
        {
          id: "cold-work-recrystallization",
          title: "Cold Work and Recrystallization",
          description:
            "Dislocation mechanics linking strain hardening, recovery, recrystallization, and grain growth to mechanical property changes. Demonstrated on α-brass (70Cu-30Zn).",
          details: [
            "Cold work creates and multiplies dislocations → 'dislocation traffic jam' resists further deformation (Lab 7, p1–2)",
            "Strain hardening: each successive bend requires more force as dislocation density increases (Lab 7, p2)",
            "Recovery: atoms rearrange to lower-strain config at elevated T; minimal property change (Lab 7, p3)",
            "Recrystallization: nucleation and growth of new strain-free grains from cold-worked structure (Lab 7, p3–4)",
            "Grain growth: continued heating causes recrystallized grains to coarsen (Lab 7, p3)",
            "α-brass micrographs show progression: slip lines → tiny new grains → partial recrystallization → fully recrystallized (Lab 7, Fig.2A–D, 75x)",
            "TRex ≈ 0.3–0.5 × melting temperature (K), also depends on amount of cold work (Lab 7, p5)",
            "Property reversal: annealing restores ductility and reduces yield strength back toward pre-cold-worked state (Lab 7, Fig.3)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_7_Cold_Work_and_Annealing_SPR_2017.pdf, pp.1–8",
        },
        {
          id: "heat-treatment-steels",
          title: "Heat Treatment of Steels",
          description:
            "Fe-C eutectoid transformation: austenite → pearlite/ferrite/cementite. Steels used: 1018, 1050, 1095 (plain carbon). TTT diagram interpretation for non-equilibrium structures.",
          details: [
            "Eutectoid composition: 0.77 wt% C at 727°C (Lab 8, Fig.1, p2)",
            "Austenite (γ-FCC) is the high-temperature starting phase — all C dissolved interstitially (Lab 8, p2)",
            "Ferrite (α-BCC): nearly pure Fe, max 0.022 wt% C — soft and deformable (Lab 8, p3)",
            "Cementite (Fe₃C): 6.67 wt% C — extremely hard and brittle (Lab 8, p3)",
            "Eutectoid reaction: γ → α + Fe₃C produces pearlite — alternating lamellae of ferrite and cementite (Lab 8, p3, Fig.2)",
            "Hypoeutectoid (<0.77%C): proeutectoid ferrite + pearlite (Lab 8, p4, Fig.3)",
            "Hypereutectoid (>0.77%C): proeutectoid cementite 'ribbons' + pearlite (Lab 8, p5, Fig.4)",
            "Rapid cooling (quench) → martensite (BCT, hard, brittle) — C trapped, no time for diffusion (Lab 8, p5–6)",
            "IT/TTT diagrams map transformation products vs time at constant temperature (Lab 8, p6, Fig.5)",
            "Bainite forms at intermediate cooling rates — finer than pearlite (Lab 8, p6)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_8_Steel_Heat_Treatment_SPR_2017.pdf, pp.1–10",
        },
      ],
      implementationNotes: [
        "Phase diagram interpretation requires understanding of Gibbs phase rule: F = C - P + 1 (for constant pressure)",
        "Lever rule provides quantitative phase fractions at any T and composition",
        "Recrystallization temperature typically 0.3–0.5 × melting point (K)",
        "TTT diagrams are isothermal; CCT diagrams better represent continuous cooling",
      ],
      failureModes: [
        {
          problem: "Unexpected brittleness after cold working",
          cause: "Excessive cold work without intermediate annealing — ductility exhausted",
          fix: "Introduce intermediate annealing steps to restore ductility before further deformation",
          systemImpact: "Part fractures during forming or in service",
          confidence: "CONCEPTUAL",
        },
        {
          problem: "Inconsistent hardness after heat treatment",
          cause: "Non-uniform cooling rate — section thickness variations cause different transformation products",
          fix: "Control quench severity and part geometry; consider jominy hardenability analysis",
          systemImpact: "Mixed martensite/pearlite regions with unpredictable mechanical behavior",
          confidence: "CONCEPTUAL",
        },
      ],
      improvements: [
        "Add quantitative lever rule calculator",
        "Include real micrograph annotations when evidence uploaded",
        "Add Jominy hardenability exploration",
      ],
      keyInsight:
        "Structure controls properties. Processing controls structure. Therefore, processing controls properties. Every decision about composition, temperature, time, and cooling rate determines what phases form, what microstructure develops, and what mechanical behavior results.",
    },
    diagrams: [],
    evidence: [
      {
        id: "lab4-pdf",
        fileName: "Lab_4_Phase_Diagrams_Spring_2017_1.pdf",
        type: "pdf",
        description: "Pb-Sn eutectic phase diagram lab — cooling curves, phase fields, lever rule, microstructure",
      },
      {
        id: "lab7-pdf",
        fileName: "Lab_7_Cold_Work_and_Annealing_SPR_2017.pdf",
        type: "pdf",
        description: "α-brass cold work and annealing — dislocation mechanics, recrystallization, micrographs",
      },
      {
        id: "lab8-pdf",
        fileName: "Lab_8_Steel_Heat_Treatment_SPR_2017.pdf",
        type: "pdf",
        description: "Fe-C heat treatment — austenite transformation, pearlite, martensite, TTT diagrams",
      },
    ],
    techStack: ["Phase Diagrams", "Metallography", "Heat Treatment", "Mechanical Testing", "Microstructure Analysis"],
  },

  // PROJECT GROUP B: Corrosion
  {
    id: "materials-corrosion",
    name: "Corrosion, Electrochemical Failure, and Prevention",
    codename: "MATE-CORR",
    domain: "materials",
    course: "MATE 210",
    status: "COMPLETE",
    statusColor: "neon-amber",
    heroSummary:
      "Electrochemical corrosion fundamentals: anode/cathode/electrolyte/path model, galvanic series reasoning, and design strategies for corrosion prevention in engineering systems.",
    has3D: true,
    hologramType: "scientific",
    module: {
      problemStatement:
        "How does electrochemical corrosion degrade materials, and how can engineers interrupt the corrosion mechanism through design?",
      systemOverview:
        "Corrosion as a systems-level failure mode: four required elements (anode, cathode, electrolyte, electrical path), galvanic series for material selection, and engineering strategies to prevent or mitigate material degradation.",
      systemArchitecture:
        "Anode (oxidation: M → M²⁺ + 2e⁻) → Electrical Path (e⁻ flow) → Cathode (reduction: O₂ + 2H₂O + 4e⁻ → 4OH⁻) → Electrolyte (ion transport) → Anode (cycle)",
      subsystems: [
        {
          id: "corrosion-fundamentals",
          title: "Corrosion Fundamentals",
          description:
            "Four required elements for corrosion: anode, cathode, electrolyte, and electrical path. Remove any one to stop corrosion.",
          details: [
            "Anode: metal that undergoes oxidation — Fe⁰ → Fe²⁺ + 2e⁻ (Lab 5, p2, Eq.1)",
            "Cathode: site where reduction occurs — ½O₂ + H₂O + 2e⁻ → 2(OH)⁻ (Lab 5, p2, Eq.2)",
            "Electrolyte: ionic conduction medium (water) transporting ions between anode and cathode (Lab 5, p2, Fig.1)",
            "Electrical path: metallic connection for electron flow from anode to cathode (Lab 5, p4)",
            "Combined: Fe + ½O₂ + H₂O → Fe²⁺ + 2(OH)⁻ → Fe(OH)₂ → Fe(OH)₃ (rust) (Lab 5, p3, Eqs.3–5)",
            "All four components must be present — remove any one and corrosion stops (Lab 5, p4)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_5_Corrosion_SPR_2017_Materials_Lab.pdf, pp.1–6",
        },
        {
          id: "galvanic-series",
          title: "Corrosion Potential & Galvanic Series",
          description:
            "Why some metals corrode preferentially when coupled — electrode potential determines anodic/cathodic behavior",
          details: [
            "Corrosion potential measured by interrupting external circuit with voltmeter (Lab 5, p5, Fig.3)",
            "More negative potential → more anodic → preferentially corrodes (Lab 5, p5)",
            "Galvanic series: Mg (most negative) → Zn → Steel → Cu → Ag → Pt → Graphite (Lab 5, p6, Fig.4)",
            "Large potential difference between coupled metals → faster galvanic corrosion rate (Lab 5, p5)",
            "Area ratio effect: small anode + large cathode → accelerated attack at anode (Lab 5, p3)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_5_Corrosion_SPR_2017_Materials_Lab.pdf, pp.4–6",
        },
        {
          id: "corrosion-prevention",
          title: "Design Implications & Prevention",
          description:
            "Engineering strategies to interrupt the corrosion cell by removing one of the four required elements",
          details: [
            "Coatings/barriers: remove electrolyte contact (paint, anodizing, sealants) (Lab 5, p4)",
            "Cathodic protection: sacrificial anode shifts corrosion to expendable metal (Lab 5, p4)",
            "Material selection: choose metals close in galvanic series to minimize potential difference (Lab 5, p6)",
            "Design: avoid crevices, ensure drainage, minimize dissimilar metal contact (Lab 5, p4)",
            "Break electrical path: insulating gaskets between dissimilar metals (Lab 5, p4)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_5_Corrosion_SPR_2017_Materials_Lab.pdf, pp.3–6",
        },
      ],
      implementationNotes: [
        "Corrosion requires ALL FOUR elements simultaneously",
        "Removing any single element stops the corrosion process",
        "Galvanic corrosion is the most common in multi-material assemblies",
        "Design review should check for dissimilar metal contact in electrolyte",
      ],
      failureModes: [
        {
          problem: "Accelerated galvanic corrosion at fastener joints",
          cause: "Steel fasteners in aluminum structure with moisture ingress — large cathode/small anode ratio",
          fix: "Use insulating washers, select compatible alloys, or apply protective coatings",
          systemImpact: "Rapid localized metal loss at fastener holes, structural integrity compromised",
          confidence: "CONCEPTUAL",
        },
      ],
      improvements: [
        "Add interactive galvanic series explorer",
        "Include real corrosion sample images when evidence uploaded",
      ],
      keyInsight:
        "Corrosion is not random — it is a predictable electrochemical process. Every corrosion failure can be traced to the presence of all four elements: anode, cathode, electrolyte, and electrical path. Engineering prevention means deliberately eliminating at least one.",
    },
    diagrams: [],
    evidence: [
      {
        id: "lab5-pdf",
        fileName: "Lab_5_Corrosion_SPR_2017_Materials_Lab.pdf",
        type: "pdf",
        description:
          "Metal corrosion lab — electrochemical fundamentals, galvanic series, 4-component model, prevention",
      },
    ],
    techStack: [
      "Electrochemistry",
      "Galvanic Series",
      "Failure Analysis",
      "Material Selection",
      "Corrosion Prevention",
    ],
  },

  // PROJECT GROUP C: Polymers & Lightweight Materials
  {
    id: "materials-polymers",
    name: "Lightweight Materials, Mechanical Behavior, and Transport Design",
    codename: "MATE-POLY",
    domain: "materials",
    course: "MATE 210 / MATE 215",
    status: "COMPLETE",
    statusColor: "neon-amber",
    heroSummary:
      "Thermoplastic structure–property relationships and CFRP vs 6061-T6 aluminum analysis for transit vehicle design. Structure–properties–processing–performance framework applied to real transport engineering decisions.",
    has3D: true,
    hologramType: "scientific",
    module: {
      problemStatement:
        "How do molecular structure and processing control the mechanical behavior of polymers, and how do composite materials compare to metals for lightweight transport applications?",
      systemOverview:
        "Two interconnected modules: (1) thermoplastic polymer mechanical behavior driven by molecular structure and secondary bonding, and (2) CFRP vs 6061-T6 aluminum material selection analysis for bus rapid transit and rail applications.",
      systemArchitecture:
        "Molecular Structure (chain architecture, bonding) → Processing (temperature, forming) → Microstructure (crystallinity, orientation) → Properties (E, σy, εf) → Performance (specific strength, cost, lifecycle)",
      subsystems: [
        {
          id: "thermoplastics",
          title: "Thermoplastic Mechanical Behavior",
          description:
            "How molecular structure, secondary bonding, and chain motion control stiffness, strength, and ductility in engineering polymers",
          details: [
            "PE: simple –(CH₂–CH₂)– backbone, no side groups → chains slide easily → weak, ductile (Lab 6, p1–2)",
            "PVC: Cl substitution creates dipole-dipole forces → strength up to 3× PE (Lab 6, p2, Fig.2)",
            "PS: bulky phenyl pendant group severely restricts chain rotation → rigid, brittle (Lab 6, p3, Fig.4a)",
            "PC: carbonate linkages → balanced stiffness + ductility, high impact resistance (Lab 6, p4, Fig.4b)",
            "PMMA: methyl + ester polar side groups → dipole interactions → stiff, brittle, optically clear (Lab 6, p4, Fig.5)",
            "Secondary bonds (van der Waals, H-bond) control TP properties — not primary backbone bonds (Lab 6, p2–3)",
            "Tensile test: modulus (E) from elastic slope, yield strength (σY), % elongation for ductility (Lab 6, p4–5, Fig.7)",
            "Chain mobility analogy: smooth ropes (PE) slide easily; ropes with bumps (PS) resist sliding (Lab 6, p3)",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Lab_6_Polymer_Mechanical_Properties_SPR_2017.pdf, pp.1–6",
        },
        {
          id: "cfrp-vs-aluminum",
          title: "CFRP vs 6061-T6 Aluminum for Transit",
          description:
            "Structure–properties–processing–performance comparison for short-haul BRT and longer-range rail applications",
          details: [
            "CFRP: high specific strength (σ/ρ), excellent fatigue, but high cost and complex repair",
            "6061-T6: moderate specific strength, well-understood processing, lower cost, easier repair",
            "Short-haul BRT: frequent acceleration/braking → weight savings from CFRP maximize energy efficiency",
            "Long-range rail: constant speed operation → cost-effectiveness of aluminum may dominate",
            "Lifecycle considerations: CFRP repair costs vs aluminum recyclability",
            "Density: CFRP ~1.6 g/cm³ vs 6061-T6 ~2.7 g/cm³",
            "Tensile strength: CFRP ~600–3000 MPa vs 6061-T6 ~310 MPa",
          ],
          confidence: "CONCEPTUAL",
          evidenceSource: "CFRP vs Aluminum white paper — upload pending for VERIFIED status",
        },
      ],
      implementationNotes: [
        "Structure–properties–processing–performance is the central framework",
        "Specific strength (σ/ρ) is the critical metric for weight-sensitive transport",
        "Material selection is always application-dependent — no universally 'best' material",
        "CFRP advantages diminish when weight savings don't significantly affect energy consumption",
      ],
      failureModes: [
        {
          problem: "Polymer creep under sustained load",
          cause: "Viscoelastic behavior — chain sliding under stress at temperatures near Tg",
          fix: "Select polymer with Tg well above service temperature; reduce sustained stress",
          systemImpact: "Dimensional instability and eventual failure under constant load",
          confidence: "CONCEPTUAL",
        },
        {
          problem: "CFRP delamination under impact",
          cause: "Interlaminar shear failure — weak matrix-dominated property in through-thickness direction",
          fix: "Add interleaved toughening layers; design for damage tolerance inspection",
          systemImpact: "Hidden internal damage not visible on surface — requires NDT for detection",
          confidence: "CONCEPTUAL",
        },
      ],
      improvements: [
        "Add cost-per-performance comparison calculator",
        "Include stress-strain data from actual tensile tests when evidence uploaded",
        "Add Ashby chart exploration module",
      ],
      keyInsight:
        "Material selection is never about finding the 'strongest' material — it's about matching the structure–properties–processing–performance chain to application requirements. CFRP wins on specific strength; aluminum wins on cost and repairability. The right choice depends on the system context.",
    },
    diagrams: [],
    evidence: [
      {
        id: "lab6-pdf",
        fileName: "Lab_6_Polymer_Mechanical_Properties_SPR_2017.pdf",
        type: "pdf",
        description:
          "Thermoplastic polymer mechanical properties — tensile testing, structure-property relationships, PE/PVC/PS/PC/PMMA",
      },
    ],
    techStack: [
      "Polymer Science",
      "Composite Materials",
      "Material Selection",
      "Mechanical Testing",
      "Transport Engineering",
    ],
  },
  // ===== DOMAIN: FPV FLIGHT SYSTEMS =====
  {
    id: "fpv-drone",
    name: "HD FPV Micro Drone System Integration",
    codename: "FPV-ACROBEE",
    domain: "fpv-systems",
    status: "ACTIVE",
    statusColor: "neon-cyan",
    heroSummary:
      "Analyzed a 75 mm HD FPV drone as a densely integrated electromechanical system — six coupled subsystems (propulsion, flight control, power regulation, RF control, digital video, structure) with documented failure modes and cross-subsystem constraint propagation at 70 g dry weight.",
    has3D: true,
    hologramType: "system",
    module: {
      problemStatement:
        "How do you integrate propulsion, flight control, power regulation, RF control, and HD digital video into a 75 mm airframe weighing ~70 g while managing thermal, vibration, packaging, and performance constraints?",
      systemOverview:
        "NewBeeDrone AcroBee75 G4 BNF HD with DJI O3 — a tightly constrained micro FPV platform where every subsystem (structure, propulsion, flight control, radio control, digital video, power) interacts and imposes constraints on every other subsystem. This project analyzes the platform at the systems integration level.",
      systemArchitecture:
        "Battery (2S LiPo) → XT30 → BeeBrain HD G4 AIO [STM32G474 FC + 4×20A ESC + ELRS 3.0 Rx] → 4× 0804 12000KV Motors → 40mm Tri-blade Props\n                         → 10V 2A BEC → DJI O3 Air Unit (HD Video + OSD)\n                         → 5V 2A BEC → Logic/Peripherals\nCockroach75 Frame + AcroBee75 HD O3 Canopy → Packaging / Antenna / Crash Geometry",
      subsystems: [
        {
          id: "structure",
          title: "Structure & Mechanical Packaging",
          description:
            "Cockroach75 frame provides structural skeleton with ducted motor mounts. AcroBee75 HD O3 canopy protects camera/VTX assembly and routes antennas.",
          details: [
            "Cockroach75 frame: 75 mm motor-to-motor, ducted propeller protection",
            "Ducts serve as structural guards, indoor crash protection, and prop noise shielding",
            "Duct tradeoff: increased drag vs crash survivability and indoor safety",
            "Canopy geometry: camera tilt angle, O3 unit mounting, antenna exit paths",
            "Compact packaging forces vertical stacking: frame → AIO → O3 → canopy",
            "Center of gravity managed by battery mount position (typically bottom or rear)",
            "Dry weight ~70.19 g — every gram affects thrust-to-weight ratio",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Platform specification / known hardware stack",
        },
        {
          id: "propulsion",
          title: "Propulsion System",
          description:
            "Four 0804 12000KV brushless motors with 40 mm tri-blade propellers driven by 4×20A ESC channels with Bluejay 48 kHz firmware.",
          details: [
            "0804 motors: 8 mm stator diameter, 4 mm stator height — micro-class brushless",
            "12000KV: high RPM-per-volt rating suited for 2S (7.4–8.4V) low-voltage operation",
            "High KV + small stator = very high RPM operation, requiring quality bearings",
            "40 mm tri-blade props: increased blade area for thrust at the cost of efficiency",
            "Tri-blade tradeoff: better low-speed control feel and responsiveness vs bi-blade efficiency",
            "Motor vibration directly couples into frame → camera → video quality",
            "Bluejay 48 kHz ESC firmware: high switching frequency for smoother motor commutation",
            "Bidirectional DShot600: enables RPM telemetry for RPM-based filtering in Betaflight",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Platform specification / known hardware stack",
        },
        {
          id: "flight-control",
          title: "Flight Control & Processing",
          description:
            "BeeBrain HD G4 AIO board with STM32G474 MCU running Betaflight — the coordination core for all motor control, sensor fusion, and peripheral management.",
          details: [
            "STM32G474: ARM Cortex-M4F, 170 MHz, FPU — substantial processing for a micro FC",
            "PID control loop: gyroscope → error calculation → motor speed adjustment at kHz rates",
            "FC as timing and coordination core: manages ESC commands, receiver input, OSD data",
            "DShot600 protocol: digital motor command at 600 kbit/s, no calibration needed",
            "Bidirectional DShot: motors report RPM back to FC for RPM filtering",
            "RPM filtering critical on micro platforms: reduces vibration-induced noise in gyro data",
            "AIO integration: FC + ESC + receiver on single PCB reduces wiring and weight",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Platform specification / known hardware stack",
        },
        {
          id: "radio-control",
          title: "Radio / Control-Link Architecture",
          description:
            "Stock platform includes integrated ELRS 3.0 diversity receiver on UART2. Alternative control-link integration (TBS Tracer) analyzed as a system architecture challenge.",
          details: [
            "Built-in ExpressLRS 3.0 diversity receiver: two antenna paths for link robustness",
            "ELRS on UART2: serial protocol to FC for control commands",
            "Diversity antenna logic: selects stronger signal path during rapid reorientation",
            "RF link robustness critical: 75 mm craft reorients rapidly during acrobatic flight",
            "Alternative control-link analysis: TBS Mambo transmitter uses Tracer protocol",
            "Tracer ≠ ELRS — different RF protocol, different receiver hardware required",
            "Integration challenge: serial/RF architecture mismatch, not just a binding issue",
            "External receiver integration would require: UART reassignment, physical mounting, antenna routing within canopy constraints",
          ],
          confidence: "VERIFIED",
          evidenceSource:
            "Platform specification / known hardware stack — Tracer integration is analysis only, not completed",
        },
        {
          id: "digital-video",
          title: "Digital Video — DJI O3 Air Unit",
          description:
            "DJI O3 as premium HD video payload — transforms platform design constraints due to its weight, power draw, and thermal output.",
          details: [
            "DJI O3: HD digital video transmission with low-latency FPV feed",
            "O3 is the heaviest single component on the platform — dominant mass contributor",
            "Requires dedicated 10V 2A BEC: substantial regulated power draw",
            "Thermal output from O3 affects canopy airflow design and component placement",
            "Video quality directly affected by motor vibration → prop balance → frame stiffness chain",
            "O3 serial/control path to FC for OSD overlay and camera control",
            "Antenna placement: must clear carbon fiber frame (RF-opaque) for signal quality",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Platform specification / known hardware stack",
        },
        {
          id: "power-architecture",
          title: "Power Architecture",
          description:
            "Multi-rail regulated power distribution from 2S LiPo through XT30 connector, with dedicated BECs for O3 and logic systems.",
          details: [
            "Battery input: 1–2S LiPo (typically 2S 450–550 mAh for HD builds)",
            "XT30 connector: rated for continuous current demands of 4×20A ESC channels",
            "High-current path: battery → ESC power stage → motors (unregulated, direct battery voltage)",
            "10V 2A BEC: dedicated regulated rail for DJI O3 — critical for stable video",
            "5V 2A BEC: logic rail for FC, receiver, peripherals",
            "Regulator stability matters: O3 power dips cause video artifacts or brownouts",
            "Battery tradeoff: 450 mAh (lighter, more agile) vs 550 mAh (longer flight, heavier)",
            "Battery sag under load directly affects motor authority and O3 stability",
          ],
          confidence: "VERIFIED",
          evidenceSource: "Platform specification / known hardware stack",
        },
      ],
      implementationNotes: [
        "Platform analyzed as six tightly coupled subsystems, not isolated components",
        "Every subsystem imposes constraints on every other: weight, power, vibration, RF, thermal, packaging",
        "Stock ELRS receiver is integrated; TBS Tracer integration is an analyzed modification path, not a completed build",
        "All specifications from known platform hardware — no fabricated measurements or test results",
      ],
      failureModes: [
        {
          problem: "Battery sag under aggressive throttle",
          cause: "2S LiPo internal resistance causes voltage drop under high-current motor demand",
          fix: "Use higher-C-rating cells; manage throttle profiles; monitor voltage telemetry",
          systemImpact: "Reduced motor authority, potential O3 brownout if regulator input drops below minimum",
          confidence: "VERIFIED",
        },
        {
          problem: "Motor vibration degrading video quality",
          cause: "Unbalanced props or worn motor bearings transmit vibration through frame to O3 camera",
          fix: "Balance props; replace worn bearings; tune RPM filtering in Betaflight",
          systemImpact: "Jello effect in HD video; degraded gyro readings affecting flight stability",
          confidence: "VERIFIED",
        },
        {
          problem: "Antenna placement causing RF dead zones",
          cause: "Carbon fiber frame blocks RF; antenna trapped inside canopy without clear radiation path",
          fix: "Route antennas to exit canopy with clear exposure; avoid carbon fiber obstruction",
          systemImpact: "Control-link failsafe events during certain flight orientations",
          confidence: "VERIFIED",
        },
        {
          problem: "Receiver ecosystem mismatch (ELRS vs Tracer)",
          cause: "TBS Mambo transmitter uses Tracer protocol; onboard receiver is ELRS — incompatible RF protocols",
          fix: "Either bind an ELRS transmitter module to Mambo, or install external Tracer receiver",
          systemImpact: "Cannot fly without resolving control-link architecture — fundamental system integration issue",
          confidence: "VERIFIED",
        },
        {
          problem: "O3 regulator thermal burden in canopy",
          cause: "10V 2A BEC dissipates heat in enclosed canopy space with limited airflow",
          fix: "Ensure canopy ventilation; monitor BEC temperature; consider flight duration limits",
          systemImpact: "Thermal throttling or regulator instability affecting video feed",
          confidence: "CONCEPTUAL",
        },
      ],
      improvements: [
        "Complete TBS Tracer external receiver integration with documented UART remap and antenna routing",
        "Add flight performance data: thrust-to-weight measurement, flight time characterization",
        "Document Betaflight PID tuning process and RPM filter configuration",
        "Photograph actual assembly stack and wiring for VERIFIED visual evidence",
      ],
      keyInsight:
        "This platform demonstrates that even a 70-gram drone is a complex integrated system where power, control, RF, thermal, vibration, and packaging all interact. Engineering reasoning — not just component selection — determines whether the system works reliably.",
      ownershipDisclosure: {
        owned: [
          "Platform analysis and systems-level documentation",
          "Subsystem interaction and constraint reasoning",
          "Control-link architecture mismatch analysis",
          "Failure mode identification and engineering logic",
        ],
        aiAssisted: [
          "Portfolio presentation and visual layout",
          "Hologram reconstruction from known component specifications",
        ],
      },
    },
    diagrams: [
      {
        id: "fpv-block-diagram",
        title: "Reconstructed System Block Diagram",
        confidence: "CONCEPTUAL",
        derivedFrom: ["Known platform components", "Standard UAV integration practice"],
        description:
          "Likely relationships between battery, AIO flight controller, ESC channels, motors, receiver, DJI O3, BEC rails, and frame/canopy assembly. Derived from known components and standard engineering integration logic — not an original manufacturer schematic.",
        conceptualNote:
          "RECONSTRUCTED FROM KNOWN COMPONENTS — derived from platform specs and standard engineering practice",
      },
      {
        id: "fpv-power-map",
        title: "Likely Power Architecture",
        confidence: "CONCEPTUAL",
        derivedFrom: ["Known BEC specs", "Standard multi-rail UAV power design"],
        description:
          "Power distribution: battery → high-current ESC stage (unregulated), 10V BEC → O3, 5V BEC → logic. Architecture diagram, not exact manufacturer schematic.",
        conceptualNote:
          "RECONSTRUCTED — likely power distribution based on known BEC specifications and standard practice",
      },
      {
        id: "fpv-assembly-stack",
        title: "Likely Assembly Stack",
        confidence: "CONCEPTUAL",
        derivedFrom: ["Known form factors", "Packaging constraints"],
        description:
          "Physical layering: frame base → motor mounts → AIO board (centered) → O3 (upper/front) → canopy → battery (external). Most plausible layout given known component dimensions.",
        conceptualNote:
          "LIKELY ASSEMBLY ARCHITECTURE — based on known form factors, not verified from disassembly photos",
      },
    ],
    evidence: [],
    techStack: [
      "Embedded Systems",
      "Brushless Motor Control",
      "RF Architecture",
      "Power Regulation",
      "DShot Protocol",
      "Betaflight",
      "System Integration",
      "Mechanical Packaging",
    ],
  },
];

// ========== EXPERIENCE ==========
export interface ExperienceItem {
  company: string;
  role: string;
  location: string;
  period: string;
  bullets: { text: string; confidence: ConfidenceBadge; evidence_source?: string }[];
  processImprovement?: {
    before: string;
    after: string;
    whatChanged: string[];
    measurementMethod: string;
  };
}

export const experiences: ExperienceItem[] = [
  {
    company: "Natera",
    role: "Intern",
    location: "Pleasanton, CA",
    period: "Summer 2025",
    bullets: [
      {
        text: "Reduced validation and packaging cycle time from ~20 min to ~10–12 min by mapping the workflow, identifying bottlenecks, and eliminating redundant verification steps",
        confidence: "CONCEPTUAL",
        evidence_source: "Observed estimate — formal time study pending",
      },
      {
        text: "Standardized packaging workflow and authored reference documentation adopted by the team for consistency",
        confidence: "CONCEPTUAL",
        evidence_source: "Observed estimate",
      },
    ],
    processImprovement: {
      before: "~20 min per validation + packaging cycle (observed estimate)",
      after: "~10–12 min per cycle (observed estimate)",
      whatChanged: [
        "Identified bottleneck in sequential verification steps",
        "Removed redundant checks that didn't affect quality",
        "Standardized packaging workflow sequence",
        "Created reference documentation for consistency",
      ],
      measurementMethod:
        "Observed estimate based on timed walkthroughs. Formal time study with statistical sampling not conducted.",
    },
  },
  {
    company: "CVS Pharmacy",
    role: "Pharmacy Technician",
    location: "Dublin, CA",
    period: "June 2023 – June 2024",
    bullets: [
      {
        text: "California state certified pharmacy technician — processed prescriptions, managed controlled substance inventory, and handled patient consultations in a high-volume retail pharmacy",
        confidence: "VERIFIED",
      },
      {
        text: "Maintained accuracy under time pressure while ensuring regulatory compliance across all fulfillment workflows",
        confidence: "VERIFIED",
      },
    ],
  },
];

// ========== SKILLS ==========
export const skills = {
  core: ["Systems Thinking", "Test & Validation Mindset", "Technical Documentation", "Debugging & Root Cause Analysis"],
  technical: [
    { name: "SystemVerilog / HDL", evidence: "OTTER CPU project (CPE 233)", confidence: "VERIFIED" as ConfidenceBadge },
    { name: "Analog Circuit Design", evidence: "EE 241 Labs 1-7 + RGM", confidence: "VERIFIED" as ConfidenceBadge },
    {
      name: "Manual Machining (Lathe & Mill)",
      evidence: "IME 144 Air Motor",
      confidence: "VERIFIED" as ConfidenceBadge,
    },
    { name: "GD&T / Engineering Drawings", evidence: "IME 144 Manual", confidence: "VERIFIED" as ConfidenceBadge },
    {
      name: "CAD (SolidWorks, Fusion 360)",
      evidence: "IME 144 + RGM CAD files",
      confidence: "VERIFIED" as ConfidenceBadge,
    },
    { name: "RISC-V Assembly", evidence: "RISC-V_Assembler_Manual.pdf", confidence: "VERIFIED" as ConfidenceBadge },
    {
      name: "Arduino / Embedded C++",
      evidence: "RGM Final Report (Arduino Mega)",
      confidence: "VERIFIED" as ConfidenceBadge,
    },
    { name: "LTSpice Simulation", evidence: "EE 241 Lab 6", confidence: "VERIFIED" as ConfidenceBadge },
    {
      name: "Web Development (React/TS)",
      evidence: "Funck platform (funck.live)",
      confidence: "VERIFIED" as ConfidenceBadge,
    },
    { name: "Soldering & Prototyping", evidence: "EE 241 lab work + RGM", confidence: "VERIFIED" as ConfidenceBadge },
    {
      name: "Test Equipment (Scope/FGen)",
      evidence: "EE 241 lab equipment",
      confidence: "VERIFIED" as ConfidenceBadge,
    },
    { name: "PCB Design & Reflow", evidence: "EE 143 DAC PCB", confidence: "CONCEPTUAL" as ConfidenceBadge },
    { name: "Materials Engineering", evidence: "MATE 210/215 coursework", confidence: "CONCEPTUAL" as ConfidenceBadge },
    { name: "Phase Diagram Analysis", evidence: "MATE 210 labs", confidence: "CONCEPTUAL" as ConfidenceBadge },
  ],
};

// ========== PERSONAL INFO ==========
export const personalInfo = {
  name: "Amogh Somisetty",
  title: "Electrical Engineering",
  university: "California Polytechnic State University, San Luis Obispo",
  phone: "(925) 236-2600",
  email: "somisett@calpoly.edu",
  extras: [
    "Varsity wrestling — 4 years",
    "California state certified pharmacy technician",
    "Eagle Scout candidate — 11 years in Boy Scouts",
    "CPR/First Aid certified (open to recertification)",
  ],
};
