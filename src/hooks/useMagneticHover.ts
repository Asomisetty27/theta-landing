import { useRef, useCallback } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export function useMagneticHover(strength = 0.45) {
  const ref = useRef<HTMLElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springCfg = { stiffness: 380, damping: 26, mass: 0.5 };
  const x = useSpring(rawX, springCfg);
  const y = useSpring(rawY, springCfg);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      rawX.set((e.clientX - (rect.left + rect.width / 2)) * strength);
      rawY.set((e.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [rawX, rawY, strength]
  );

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return { ref, x, y, onMouseMove, onMouseLeave };
}
