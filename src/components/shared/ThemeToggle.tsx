"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // localStorage isn't readable during SSR, so this can't be a lazy
    // useState initializer without causing a hydration-mismatch instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getStoredTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  }

  if (!mounted) return <div className={className} style={{ width: 36, height: 36 }} />;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`accent-ring relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)] ${className ?? ""}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={prefersReducedMotion ? { opacity: 0 } : { rotate: -90, opacity: 0, scale: 0.6 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { rotate: 0, opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
          className="absolute"
        >
          {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
