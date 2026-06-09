import HologramViewer, { type PartInfo } from "@/components/HologramViewer";

const airMotorParts: PartInfo[] = [
  {
    name: "Frame",
    description: "Main structural housing for all air motor components",
    function: "Provides mounting points and alignment for shaft, cylinder, and flywheel",
    position: [0, 0, 0],
    geometry: "box",
    scale: [2, 1.5, 1.5],
    color: "#888888",
    evidenceSource: "IME_144_MANUAL.pdf, pp.224-285",
    confidence: "CONCEPTUAL",
  },
  {
    name: "Cylinder",
    description: "Precision-bored cylinder housing for piston reciprocation",
    function: "Contains compressed air and guides piston movement",
    position: [0, 1.2, 0],
    geometry: "cylinder",
    scale: [0.6, 1.2, 0.6],
    color: "#44aaff",
    evidenceSource: "IME_144_MANUAL.pdf; Cylinder.SLDPRT",
    confidence: "CONCEPTUAL",
  },
  {
    name: "Piston",
    description: "Reciprocating piston machined on manual lathe",
    function: "Converts pneumatic pressure into linear motion driving the crank mechanism",
    position: [0, 1.8, 0],
    geometry: "cylinder",
    scale: [0.45, 0.5, 0.45],
    color: "#00d4aa",
    evidenceSource: "IME_144_MANUAL.pdf",
    confidence: "CONCEPTUAL",
  },
  {
    name: "Mainshaft",
    description: "Central rotating shaft connecting crank disk to flywheel",
    function: "Transmits rotational motion from crank mechanism to flywheel output",
    position: [0, 0, 0],
    geometry: "cylinder",
    scale: [0.15, 0.15, 3],
    rotation: [Math.PI / 2, 0, 0] as [number, number, number],
    color: "#ffaa00",
    evidenceSource: "IME_144_MANUAL.pdf",
    confidence: "CONCEPTUAL",
  },
  {
    name: "Crank Disk",
    description: "Converts linear piston motion into rotational shaft motion",
    function: "Eccentric connection between piston rod and mainshaft",
    position: [0, 0, -1.2],
    geometry: "cylinder",
    scale: [0.8, 0.15, 0.8],
    color: "#ff4488",
    evidenceSource: "IME_144_MANUAL.pdf; Crank_Disk-2.SLDPRT",
    confidence: "CONCEPTUAL",
  },
  {
    name: "Flywheel",
    description: "Provides rotational inertia for smooth continuous operation",
    function: "Stores kinetic energy to maintain rotation through piston dead points",
    position: [0, 0, 1.5],
    geometry: "cylinder",
    scale: [1.2, 0.2, 1.2],
    color: "#aa44ff",
    evidenceSource: "IME_144_MANUAL.pdf",
    confidence: "CONCEPTUAL",
  },
];

export default function AirMotorHologram() {
  return (
    <HologramViewer
      parts={airMotorParts}
      title="Air Motor Assembly — 3D Hologram"
      confidence="CONCEPTUAL"
      sourceFiles={[
        "IME_144_MANUAL.pdf",
        "Crank_Disk-2.SLDPRT",
        "Cylinder.SLDPRT",
        "IME_144_Mill_Part_1_Somisetty.SLDPRT",
        "IME_Screwdriver_Project_Somisetty.SLDPRT",
      ]}
      conceptualNote="Simplified assembly. CAD parts uploaded (.SLDPRT) but require .GLB export for verified geometry rendering."
    />
  );
}
