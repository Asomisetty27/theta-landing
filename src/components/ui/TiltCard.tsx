import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTilt } from "@/hooks/useTilt";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  maxDeg?: number;
  style?: React.CSSProperties;
}

export default function TiltCard({ children, className, onClick, maxDeg = 9, style }: Props) {
  const { ref, tiltStyle, onMouseMove, onMouseLeave } = useTilt(maxDeg);

  return (
    <motion.div
      ref={ref}
      style={{ ...tiltStyle, ...style }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
}
