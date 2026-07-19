# Amogh Somisetty

San Luis Obispo, CA · (925) 236-2600 · somisett@calpoly.edu
github.com/Asomisetty27 · amogh.site

**Target role:** Cadence Silicon Solutions Group (SSG) — Design Engineering Intern, Fall 2026 (San Jose, CA)

---

## Summary

Electrical Engineering student focused on digital design and design verification. Built a multi-cycle **RISC-V (RV32I) CPU in SystemVerilog** and synthesized, placed-and-routed, and verified it on a Basys-3 FPGA through the Xilinx Vivado (Tcl-driven) flow. Strong RTL and FSM fundamentals paired with hands-on debug: resolved 6+ documented failure modes across a 9-stage electromechanical system via systematic root-cause analysis. Comfortable automating flows with Python, Bash, and Tcl, and documenting work with test-and-verify rigor.

---

## Education

**California Polytechnic State University, San Luis Obispo** — San Luis Obispo, CA
Bachelor of Science, Electrical Engineering · Expected June 2028 (Junior standing, Fall 2026)

**Relevant coursework:** Computer Design & RISC-V Architecture (CPE 233), Digital Design (CPE 133), Electronics & Analog Circuits (EE 241), Circuit Analysis & Instrumentation (EE 143), Manufacturing Processes (IME 144), Materials Engineering (MATE 210/215)

---

## Technical Skills

- **HDL & Digital Design:** SystemVerilog, RTL design, finite-state machines (Moore/Mealy), RISC-V RV32I ISA, datapath & control-unit design, combinational/sequential logic, timing analysis
- **Design Verification & Debug:** testbench simulation, waveform debugging, functional validation against ISA/spec, root-cause analysis, failure-mode documentation, test-plan mindset
- **EDA & Tools:** Xilinx Vivado (synthesis, place & route, timing closure), Basys-3 FPGA, LTspice, Autodesk Fusion 360
- **Scripting & Automation:** Tcl (Vivado synthesis/PnR flows), Bash/shell, Python, Git, GitHub Actions (CI)
- **Embedded & Analog:** C/C++ (Arduino/embedded), op-amp signal conditioning, ADC/DAC systems, PCB design (schematic → layout → reflow)

---

## Projects

### OTTER Multi-Cycle RISC-V CPU — SystemVerilog · Vivado · Basys-3 FPGA  (CPE 233)
- Designed a complete multi-cycle **RV32I** processor from gates up in SystemVerilog: PC → instruction memory → decode → 32×32 dual-read register file → 10-operation ALU → dual-port memory → writeback.
- Implemented a 2-state (FETCH/EXEC) FSM control unit and a branch-condition generator (`br_eq`, `br_lt`, `br_ltu`); built an immediate generator covering I/S/B/U/J instruction formats.
- Synthesized, placed-and-routed, and verified the design on a **Basys-3 FPGA via the Vivado flow**; debugged a branch-target miscalculation by gating `PCWrite` to the EXEC state and validating against the RISC-V ISA reference.

### Digital Systems & FSM Design — Vivado · FPGA  (CPE 133)
- Built combinational and sequential logic blocks — multiplexers, decoders, D-flip-flops, shift registers, counters, and clock dividers — and implemented FSMs using binary, one-hot, and gray state encodings.
- Managed clock-domain division and synthesized/place-and-routed designs onto FPGA hardware.

### End-to-End Analog↔Digital Signal System + 4-bit DAC — EE 143
- Designed, simulated (LTspice), fabricated, and integrated a **4-bit binary-weighted DAC** (LM1458, 1206 SMD resistors) on a 1×1″ 2-layer PCB; validated it inside a full audio → Arduino ADC → DAC → speaker pipeline.
- Achieved 62.5 mV/step resolution with measured-vs-theoretical error within ±1 LSB across all 16 codes; resolved analog loading with a unity-gain buffer stage.

### 9-Stage Electromechanical System — Embedded C++ · Analog Design  (EE 241)
- Integrated a sequentially dependent 9-stage system (capacitive sensing → relay isolation → 580 V strobe → Schmitt-trigger detector → solenoid launcher → 555-timer metal detector → electromagnet release → tilt switch → LCD).
- Implemented frequency-domain metal detection (5.1% shift, ~8.76 kHz → 8.31 kHz) with streak-based filtering; **diagnosed and resolved 6 distinct failure modes** across electrical, mechanical, and firmware domains via root-cause analysis.

---

## Experience

**Natera** — Engineering/Operations Intern · Pleasanton, CA · Summer 2025
- Mapped a validation-and-packaging workflow, identified bottlenecks, and removed redundant verification steps, reducing cycle time from ~20 min to ~10–12 min (observed estimate).
- Standardized the workflow and authored reference documentation adopted by the team for consistency.

**CVS Pharmacy** — Pharmacy Technician (CA state certified) · Dublin, CA · Jun 2023 – Jun 2024
- Maintained accuracy and regulatory compliance under time pressure in a high-volume retail pharmacy.

---

## Leadership & Activities

- **Poly-Engineering Consulting (Cal Poly):** designed and shipped an internal role-aware operating system (PEC Nexus) unifying project execution, scheduling, and permissions.
- Varsity wrestling (4 years) · Eagle Scout candidate (11 years, Scouting) · CPR/First Aid certified.
