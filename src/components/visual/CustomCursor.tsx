import { useEffect, useState, useCallback, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [state, setState] = useState<"default" | "hover" | "click">("default");
  const [visible, setVisible] = useState(false);

  // Inner dot — no lag
  const dotX = useMotionValue(-120);
  const dotY = useMotionValue(-120);

  // Outer ring — spring lag
  const rawX = useMotionValue(-120);
  const rawY = useMotionValue(-120);
  const ringX = useSpring(rawX, { stiffness: 180, damping: 20, mass: 0.6 });
  const ringY = useSpring(rawY, { stiffness: 180, damping: 20, mass: 0.6 });

  const stateRef = useRef(state);
  stateRef.current = state;

  const handleMove = useCallback((e: MouseEvent) => {
    dotX.set(e.clientX);
    dotY.set(e.clientY);
    rawX.set(e.clientX);
    rawY.set(e.clientY);
    setVisible(true);
  }, [dotX, dotY, rawX, rawY]);

  const handleOver = useCallback((e: MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest("button, a, [data-cursor], input, textarea, select, [role='button']")) {
      setState("hover");
    } else {
      setState("default");
    }
  }, []);

  const handleDown = useCallback(() => setState("click"), []);
  const handleUp = useCallback(() => setState(stateRef.current === "click" ? "default" : stateRef.current), []);
  const handleLeave = useCallback(() => setVisible(false), []);
  const handleEnter = useCallback(() => setVisible(true), []);

  useEffect(() => {
    // Hide on touch devices
    if ("ontouchstart" in window) return;
    document.body.classList.add("custom-cursor-active");


    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mouseover", handleOver, { passive: true });
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);
    document.documentElement.addEventListener("mouseleave", handleLeave);
    document.documentElement.addEventListener("mouseenter", handleEnter);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
      document.documentElement.removeEventListener("mouseenter", handleEnter);
      document.body.classList.remove("custom-cursor-active");
    };
  }, [handleMove, handleOver, handleDown, handleUp, handleLeave, handleEnter]);

  if ("ontouchstart" in (typeof window !== "undefined" ? window : {})) return null;

  const ringSize = state === "hover" ? 42 : state === "click" ? 16 : 28;
  const ringOpacity = state === "click" ? 0.9 : 0.55;
  const dotSize = state === "click" ? 3 : 4;

  return (
    <div
      style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 9999 }}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <motion.div
        style={{
          x: ringX,
          y: ringY,
          width: ringSize,
          height: ringSize,
          translateX: "-50%",
          translateY: "-50%",
          position: "absolute",
          borderRadius: "50%",
          border: `1px solid hsl(170 80% 50% / ${ringOpacity})`,
          boxShadow: `0 0 8px hsl(170 80% 50% / 0.25)`,
          opacity: visible ? 1 : 0,
          transition: "width 0.2s cubic-bezier(.22,.68,0,1.2), height 0.2s cubic-bezier(.22,.68,0,1.2), opacity 0.15s ease",
        }}
      />

      {/* Crosshair lines — only in default state */}
      {state === "default" && (
        <motion.div
          style={{
            x: ringX,
            y: ringY,
            translateX: "-50%",
            translateY: "-50%",
            position: "absolute",
            width: 10,
            height: 10,
            opacity: visible ? 0.4 : 0,
          }}
        >
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 1, background: "hsl(43 68% 50%)" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 1, height: 10, background: "hsl(43 68% 50%)" }} />
        </motion.div>
      )}

      {/* Inner dot */}
      <motion.div
        style={{
          x: dotX,
          y: dotY,
          width: dotSize,
          height: dotSize,
          translateX: "-50%",
          translateY: "-50%",
          position: "absolute",
          borderRadius: "50%",
          background: state === "hover" ? "hsl(43 70% 72%)" : "hsl(43 70% 55%)",
          boxShadow: `0 0 6px hsl(170 80% 50% / 0.7)`,
          opacity: visible ? 1 : 0,
          transition: "width 0.15s ease, height 0.15s ease, opacity 0.15s ease",
        }}
      />
    </div>
  );
}
