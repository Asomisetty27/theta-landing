import { Pause, Play, SkipForward, SkipBack, AlertTriangle, Layers, Zap, Eye } from "lucide-react";

export type HologramMode = "idle" | "step" | "play" | "failure";

interface HologramModeBarProps {
  mode: HologramMode;
  onModeChange: (mode: HologramMode) => void;
  currentStep?: number;
  totalSteps?: number;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  label?: string;
}

const modeConfig: Record<HologramMode, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: Eye, label: "IDLE", color: "hsl(var(--muted-foreground))" },
  step: { icon: Layers, label: "STEP", color: "hsl(var(--neon-cyan))" },
  play: { icon: Play, label: "PLAY", color: "hsl(var(--neon-green))" },
  failure: { icon: AlertTriangle, label: "FAIL", color: "hsl(var(--neon-red))" },
};

export default function HologramModeBar({
  mode,
  onModeChange,
  currentStep,
  totalSteps,
  onNextStep,
  onPrevStep,
  label,
}: HologramModeBarProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Mode buttons */}
      {(Object.keys(modeConfig) as HologramMode[]).map((m) => {
        const cfg = modeConfig[m];
        const Icon = cfg.icon;
        const isActive = mode === m;
        return (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
              isActive
                ? "bg-opacity-15 border-opacity-40"
                : "border-panel-border text-muted-foreground hover:text-foreground hover:bg-panel-highlight"
            }`}
            style={isActive ? {
              color: cfg.color,
              borderColor: cfg.color,
              backgroundColor: `${cfg.color}15`,
            } : {}}
            title={cfg.label}
          >
            <Icon size={10} />
            <span className="hidden sm:inline">{cfg.label}</span>
          </button>
        );
      })}

      {/* Step controls */}
      {mode === "step" && totalSteps && (
        <div className="flex items-center gap-1 ml-2 border-l border-panel-border pl-2">
          <button
            onClick={onPrevStep}
            disabled={currentStep === 0}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 hover:bg-panel-highlight transition-colors"
          >
            <SkipBack size={12} />
          </button>
          <span className="text-[10px] font-mono text-primary min-w-[40px] text-center">
            {(currentStep ?? 0) + 1}/{totalSteps}
          </span>
          <button
            onClick={onNextStep}
            disabled={currentStep === (totalSteps - 1)}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 hover:bg-panel-highlight transition-colors"
          >
            <SkipForward size={12} />
          </button>
        </div>
      )}

      {mode === "play" && (
        <div className="flex items-center gap-1 ml-2 border-l border-panel-border pl-2">
          <Pause size={10} className="text-neon-green animate-pulse" />
          <span className="text-[10px] font-mono text-neon-green">
            {currentStep !== undefined && totalSteps ? `Stage ${(currentStep ?? 0) + 1}/${totalSteps}` : "RUNNING"}
          </span>
        </div>
      )}

      {label && (
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">{label}</span>
      )}
    </div>
  );
}
