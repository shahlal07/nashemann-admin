"use client";

import { useRef, useState, type CSSProperties } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export function TiltCard({
  children,
  className,
  style,
  glare = true,
  strength = 12,
}: {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  glare?: boolean;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springConfig = { stiffness: 200, damping: 20 };
  const rotateX = useSpring(useTransform(y, [0, 1], [strength, -strength]), springConfig);
  const rotateY = useSpring(useTransform(x, [0, 1], [-strength, strength]), springConfig);
  const glareX = useTransform(x, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(y, [0, 1], ["0%", "100%"]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.15), transparent 55%)`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    x.set(0.5);
    y.set(0.5);
    setHovering(false);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 800,
        ...style,
      }}
      className={cn("glass-panel relative overflow-hidden rounded-[var(--radius-lg)]", className)}
    >
      {glare && (
        <motion.div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{ background: glareBackground, opacity: hovering ? 1 : 0 }}
        />
      )}
      <div style={{ transform: "translateZ(24px)" }}>{children}</div>
    </motion.div>
  );
}
