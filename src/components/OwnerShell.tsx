"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/owner-login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-2xl"
      >
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Logo />
            <span className="hidden h-6 w-px bg-[var(--border-strong)] sm:block" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold tracking-[-0.01em]">Co-Founder Workspace</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-faint)]">Company overview & governance</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] text-[var(--text-muted)] md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Secure session
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="accent-ring inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)] disabled:opacity-60 sm:px-4 sm:text-sm"
            >
              <LogOut size={15} />
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
            </button>
          </div>
        </div>
      </motion.header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:px-10 lg:py-9">
        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.42, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 lg:sticky lg:top-[100px] lg:h-fit"
        >
          <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)] lg:block">Workspace</p>
          <nav aria-label="Founder workspace" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            <motion.div whileHover={reduceMotion ? undefined : { x: 2 }} whileTap={reduceMotion ? undefined : { scale: 0.99 }} className="shrink-0">
              <Link
                href="/owners"
                aria-current={pathname === "/owners" ? "page" : undefined}
                className={"accent-ring flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium transition " + (pathname === "/owners" ? "border-[rgba(139,107,255,.25)] bg-[var(--accent-gradient-soft)] text-[var(--text)] shadow-[0_8px_24px_rgba(139,107,255,.06)]" : "border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--text)]")}
              >
                <LayoutDashboard size={17} className={pathname === "/owners" ? "text-[var(--accent-violet-deep)]" : ""} />
                Overview
                {pathname === "/owners" && <Check size={14} className="ml-auto hidden text-[var(--accent-violet-deep)] lg:block" />}
              </Link>
            </motion.div>
          </nav>

          <div className="mt-7 hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:block">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(139,107,255,.12)] text-[var(--accent-violet-deep)]"><ShieldCheck size={17} /></div>
            <p className="text-sm font-semibold">Access, by design</p>
            <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">Your membership and capabilities determine what you can see and do.</p>
            <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-[10px] text-[var(--text-faint)]">
              <Sparkles size={12} /> Private founder environment
            </div>
          </div>

          <Link href="/" className="accent-ring mt-5 hidden items-center gap-2 px-3 text-xs text-[var(--text-faint)] transition hover:text-[var(--text)] lg:inline-flex">
            Staff administration <ArrowUpRight size={13} />
          </Link>
        </motion.aside>

        <motion.main
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: reduceMotion ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
