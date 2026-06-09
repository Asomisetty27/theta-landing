import { useRef, useCallback } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";

export function useTilt(maxDeg = 10) {
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScale = useMotionValue(1);

  const spring = { stiffness: 280, damping: 28 };
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [maxDeg, -maxDeg]), spring);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-maxDeg, maxDeg]), spring);
  const scale = useSpring(rawScale, { stiffness: 380, damping: 28 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      rawX.set((e.clientX - r.left) / r.width - 0.5);
      rawY.set((e.clientY - r.top) / r.height - 0.5);
      rawScale.set(1.025);
    },
    [rawX, rawY, rawScale]
  );

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    rawScale.set(1);
  }, [rawX, rawY, rawScale]);

  return {
    ref,
    tiltStyle: { rotateX, rotateY, scale, transformPerspective: 900 },
    onMouseMove,
    onMouseLeave,
  };
}
