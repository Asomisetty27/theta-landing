import { Suspense, useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import * as THREE from "three";
import { ConfidenceBadgeTag } from "@/components/ui/mission-ui";
import type { ConfidenceBadge } from "@/data/portfolioData";
import { RotateCcw, Box, Layers, Eye } from "lucide-react";

// ========== HOLOGRAM MATERIAL ==========
function HologramMaterial({ color = "#00d4aa", wireframe = false }: { color?: string; wireframe?: boolean }) {
  return (
    <meshStandardMaterial
      color={color}
      transparent
      opacity={wireframe ? 0.15 : 0.6}
      wireframe={wireframe}
      emissive={color}
      emissiveIntensity={0.3}
      side={THREE.DoubleSide}
    />
  );
}

// ========== PART COMPONENT ==========
interface PartProps {
  name: string;
  position: [number, number, number];
  geometry: "box" | "cylinder" | "sphere" | "ring" | "cone";
  scale?: [number, number, number];
  color?: string;
  wireframe?: boolean;
  onClick?: () => void;
  hovered?: boolean;
  rotation?: [number, number, number];
}

function Part({ name, position, geometry, scale = [1,1,1], color = "#00d4aa", wireframe = false, onClick, hovered, rotation = [0,0,0] }: PartProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [localHover, setLocalHover] = useState(false);
  const isHighlighted = hovered || localHover;
  const finalColor = isHighlighted ? "#00ffcc" : color;

  const geo = useMemo(() => {
    switch (geometry) {
      case "cylinder": return <cylinderGeometry args={[0.5, 0.5, 1, 16]} />;
      case "sphere": return <sphereGeometry args={[0.5, 16, 16]} />;
      case "ring": return <torusGeometry args={[0.4, 0.1, 8, 16]} />;
      case "cone": return <coneGeometry args={[0.5, 1, 16]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  }, [geometry]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onPointerEnter={(e) => { e.stopPropagation(); setLocalHover(true); document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { setLocalHover(false); document.body.style.cursor = "auto"; }}
    >
      {geo}
      <HologramMaterial color={finalColor} wireframe={wireframe} />
      {isHighlighted && (
        <lineSegments>
          {geo}
          <lineBasicMaterial color="#00ffcc" transparent opacity={0.8} />
        </lineSegments>
      )}
    </mesh>
  );
}

// ========== IDLE ROTATION ==========
function IdleRotation({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (enabled && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });
  return <group ref={groupRef}>{children}</group>;
}

// ========== PART INFO ==========
export interface PartInfo {
  name: string;
  description: string;
  function: string;
  position: [number, number, number];
  geometry: "box" | "cylinder" | "sphere" | "ring" | "cone";
  scale?: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
  evidenceSource?: string;
  confidence: ConfidenceBadge;
}

// ========== HOLOGRAM VIEWER ==========
interface HologramViewerProps {
  parts: PartInfo[];
  title: string;
  confidence: ConfidenceBadge;
  sourceFiles?: string[];
  conceptualNote?: string;
}

export default function HologramViewer({ parts, title, confidence, sourceFiles = [], conceptualNote }: HologramViewerProps) {
  const [wireframe, setWireframe] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PartInfo | null>(null);
  const [idleRotate, setIdleRotate] = useState(true);
  const controlsRef = useRef<any>(null);

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    setIdleRotate(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-full">
      {/* 3D Canvas */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-panel-border" style={{ minHeight: 400 }}>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-background/90 to-transparent">
          <div className="flex items-center gap-2">
            <Box size={14} className="text-primary" />
            <span className="text-xs font-mono font-semibold text-primary tracking-wider uppercase">{title}</span>
            <ConfidenceBadgeTag confidence={confidence} />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={resetView} className="p-1.5 rounded hover:bg-panel-highlight transition-colors text-muted-foreground" title="Reset view">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => setWireframe(!wireframe)} className={`p-1.5 rounded transition-colors ${wireframe ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-panel-highlight"}`} title="Wireframe">
              <Layers size={14} />
            </button>
            <button onClick={() => setIdleRotate(!idleRotate)} className={`p-1.5 rounded transition-colors ${idleRotate ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-panel-highlight"}`} title="Auto-rotate">
              <Eye size={14} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <Canvas camera={{ position: [5, 4, 5], fov: 45 }} style={{ background: "hsl(220, 20%, 3%)" }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={0.5} color="#00d4aa" />
            <pointLight position={[-10, 5, -10]} intensity={0.3} color="#4488ff" />

            <IdleRotation enabled={idleRotate}>
              {parts.map((part, i) => (
                <Part
                  key={i}
                  name={part.name}
                  position={part.position}
                  geometry={part.geometry}
                  scale={part.scale}
                  color={part.color}
                  wireframe={wireframe}
                  rotation={part.rotation}
                  onClick={() => { setSelectedPart(part); setIdleRotate(false); }}
                  hovered={selectedPart?.name === part.name}
                />
              ))}
            </IdleRotation>

            <Grid
              infiniteGrid
              cellSize={1}
              sectionSize={5}
              cellColor="#0a3a3a"
              sectionColor="#0a5a5a"
              fadeDistance={20}
              position={[0, -2, 0]}
            />

            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.05}
              onStart={() => setIdleRotate(false)}
            />
          </Suspense>
        </Canvas>

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden opacity-[0.03]">
          <div className="absolute inset-x-0 h-px bg-primary animate-scan-line" />
        </div>

        {conceptualNote && (
          <div className="absolute bottom-2 left-2 right-2 z-10 text-[10px] font-mono text-neon-amber bg-background/80 rounded px-2 py-1 border border-neon-amber/20">
            ⚠ CONCEPTUAL 3D — {conceptualNote}
          </div>
        )}
      </div>

      {/* Inspection Panel */}
      <div className="lg:w-72 panel-glass rounded-lg overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-panel-border">
          <span className="text-[10px] font-mono font-semibold text-muted-foreground tracking-wider uppercase">
            Part Inspection
          </span>
        </div>

        {selectedPart ? (
          <div className="p-3 space-y-3 overflow-y-auto flex-1">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">{selectedPart.name}</h4>
              <ConfidenceBadgeTag confidence={selectedPart.confidence} />
            </div>

            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Description</span>
              <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selectedPart.description}</p>
            </div>

            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Function in System</span>
              <p className="text-xs text-secondary-foreground leading-relaxed mt-0.5">{selectedPart.function}</p>
            </div>

            {selectedPart.evidenceSource && (
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Evidence Source</span>
                <p className="text-xs text-primary font-mono mt-0.5">{selectedPart.evidenceSource}</p>
              </div>
            )}

            {selectedPart.confidence === "CONCEPTUAL" && (
              <div className="text-[10px] font-mono text-neon-amber border border-neon-amber/20 rounded p-2 bg-neon-amber/5">
                Shape is simplified conceptual representation. Not derived from CAD geometry.
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground font-mono text-center">
              Click a part to inspect
            </p>
          </div>
        )}

        {/* Source files */}
        {sourceFiles.length > 0 && (
          <div className="p-3 border-t border-panel-border">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Model Sources</span>
            <div className="mt-1 space-y-0.5">
              {sourceFiles.map((f, i) => (
                <div key={i} className="text-[10px] font-mono text-primary/80 truncate">{f}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
