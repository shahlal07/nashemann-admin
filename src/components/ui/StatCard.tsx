"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 24, stiffness: 90 });

  useEffect(() => {
    if (!inView) return;
    motionValue.set(value);
    if (prefersReducedMotion) spring.jump(value);
  }, [inView, value, motionValue, spring, prefersReducedMotion]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = prefix + Math.round(v).toLocaleString("en-PK") + suffix;
    });
    return unsub;
  }, [spring, prefix, suffix]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  icon: Icon,
  trend,
  accent = "violet",
  href,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  accent?: "violet" | "amber";
  href?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const body = (
    <Card className={cn("relative overflow-hidden", href && "transition-colors hover:bg-[var(--surface-hover)]")}>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.15] blur-2xl"
        style={{ background: accent === "violet" ? "var(--accent-violet)" : "var(--accent-amber)" }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
          <p className="font-display mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
            <CountUp value={value} prefix={prefix} suffix={suffix} />
          </p>
          {trend && (
            <p className={`mt-2 text-xs font-medium ${trend.positive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% vs last month
            </p>
          )}
        </div>
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: accent === "violet" ? "rgba(139,107,255,0.14)" : "rgba(255,176,32,0.14)",
            color: accent === "violet" ? "var(--accent-violet)" : "var(--accent-amber)",
          }}
        >
          <Icon size={18} />
        </motion.div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="accent-ring block rounded-[var(--radius-lg)]">
        {body}
      </Link>
    );
  }

  return body;
}
