"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bell } from "lucide-react";

const NOTIFICATIONS = [
  { title: "Rewards program launched", detail: "Every vendor now earns tiers automatically.", time: "2d ago" },
  { title: "New: Monthly plan", detail: "Flat Rs 7,000/month now available for high-volume stores.", time: "5d ago" },
  { title: "Platform update", detail: "Faster checkout, better mobile performance.", time: "1w ago" },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="accent-ring relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell size={17} />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ background: "var(--accent-amber)" }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            />
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              className="glass-panel absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-[var(--radius-lg)]"
              style={{ background: "var(--surface-solid)", boxShadow: "var(--shadow-soft)" }}
              role="region"
              aria-label="Notifications"
            >
              <p className="border-b border-[var(--border)] px-4 py-3 text-xs font-semibold text-[var(--text-faint)]">
                Announcements
              </p>
              <div className="max-h-72 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.title} className="border-b border-[var(--border)] px-4 py-3 last:border-0 hover:bg-[var(--surface-hover)]">
                    <p className="text-sm font-medium text-[var(--text)]">{n.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-faint)]">{n.detail}</p>
                    <p className="mt-1 text-[0.65rem] text-[var(--text-faint)]">{n.time}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
