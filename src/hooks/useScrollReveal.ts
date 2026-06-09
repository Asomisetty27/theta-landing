import { useRef } from "react";
import { useInView } from "framer-motion";

export function useScrollReveal(amount: number | "some" | "all" = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount });
  return { ref, isInView };
}
