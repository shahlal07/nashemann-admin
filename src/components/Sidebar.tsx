"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";
import { NAV_SECTIONS } from "./nav-items";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type StaffRole } from "@/lib/roles";

function sectionContainsActive(section: (typeof NAV_SECTIONS)[number], pathname: string) {
  return section.items.some((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
}

const FINANCE_ROLES: StaffRole[] = ["super_admin", "admin", "finance"];

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // These used to read from mock-data.ts and never reflected real applications/
  // reports (e.g. showed "3 pending" with the sidebar's own /applications page
  // reading 0) -- every other page in this app was already live-Supabase, only
  // this badge count was stuck on the mock seed. Counts refetch on route change
  // so approving/rejecting on the list pages updates the badge without a reload.
  const [badgeValues, setBadgeValues] = useState<Record<string, number>>({
    pendingApplications: 0,
    pendingInfluencerApplications: 0,
    pendingBugReports: 0,
  });
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const [applications, influencers, bugs] = await Promise.all([
        supabase.from("vendor_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("influencer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bug_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (!active) return;
      setBadgeValues({
        pendingApplications: applications.count ?? 0,
        pendingInfluencerApplications: influencers.count ?? 0,
        pendingBugReports: bugs.count ?? 0,
      });
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  // Client-side role fetch purely to hide nav entries the viewer can't use --
  // the real gate is server-side (is_finance_staff() redirects + RLS).
  const [role, setRole] = useState<StaffRole | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("staff_profiles").select("role").eq("id", user.id).maybeSingle();
      if (active && data) setRole(data.role as StaffRole);
    })();
    return () => {
      active = false;
    };
  }, []);

  const canSeeFinance = role ? FINANCE_ROLES.includes(role) : true; // default open while loading to avoid a layout flash
  const visibleSections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((item) => !item.financeOnly || canSeeFinance),
  })).filter((s) => s.items.length > 0);

  // Sections start collapsed except whichever one contains the current page.
  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set(NAV_SECTIONS.map((s, i) => (sectionContainsActive(s, pathname) ? i : -1)).filter((i) => i >= 0))
  );

  // Re-expand the section for wherever the user navigates to next -- this is
  // a real "synchronize UI state with the current route" case, not a
  // derivable-from-props value, so it has to live in an effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenSections((prev) => {
      const next = new Set(prev);
      NAV_SECTIONS.forEach((s, i) => {
        if (sectionContainsActive(s, pathname)) next.add(i);
      });
      return next;
    });
  }, [pathname]);

  function toggleSection(i: number) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const content = (
    <>
      <div className="flex h-16 items-center border-b border-[var(--border)] px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {visibleSections.map((section, si) => {
          if (!section.label) {
            // The unlabeled top section (Overview) is never collapsible.
            return (
              <div key={si} className="space-y-1 pb-4">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} badgeValues={badgeValues} mobile={mobile} onNavigate={onNavigate} />
                ))}
              </div>
            );
          }

          const open = openSections.has(si);
          return (
            <div key={si} className="pb-1">
              <button
                type="button"
                onClick={() => toggleSection(si)}
                className="accent-ring flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-faint)] transition-colors hover:text-[var(--text-muted)]"
                aria-expanded={open}
              >
                {section.label}
                <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={prefersReducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 pt-1">
                      {section.items.map((item) => (
                        <NavLink key={item.href} item={item} pathname={pathname} badgeValues={badgeValues} mobile={mobile} onNavigate={onNavigate} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <div className="glass-panel flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5">
          <ShieldCheck size={16} className="shrink-0 text-[var(--accent-violet)]" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--text)]">{role ? ROLE_LABELS[role] : "Staff"}</p>
            <p className="truncate text-[0.7rem] text-[var(--text-faint)]">
              {role === "read_only" ? "View-only access" : "Platform access"}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  if (mobile) {
    return <div className="flex h-full flex-col bg-[var(--surface-elevated)]">{content}</div>;
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface-elevated)] lg:flex">
      {content}
    </aside>
  );
}

function NavLink({
  item,
  pathname,
  badgeValues,
  mobile,
  onNavigate,
}: {
  item: (typeof NAV_SECTIONS)[number]["items"][number];
  pathname: string;
  badgeValues: Record<string, number>;
  mobile: boolean;
  onNavigate?: () => void;
}) {
  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const badge = item.badgeKey ? badgeValues[item.badgeKey] : 0;
  const Icon = item.icon;
  const prefersReducedMotion = useReducedMotion();
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`accent-ring group relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive ? "text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId={mobile ? "nav-active-pill-mobile" : "nav-active-pill"}
          className="absolute inset-0 rounded-[var(--radius-sm)]"
          style={{ background: "var(--accent-gradient-soft)", border: "1px solid rgba(139,107,255,0.3)" }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon size={17} strokeWidth={2} className={`relative z-10 shrink-0 ${isActive ? "text-[var(--accent-violet)]" : ""}`} />
      <span className="relative z-10">{item.label}</span>
      {badge > 0 && (
        <span
          className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.7rem] font-semibold text-black"
          style={{ background: "var(--accent-amber)" }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
