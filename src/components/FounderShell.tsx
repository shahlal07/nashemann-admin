"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowUpRight,
  Activity,
  Bell,
  CheckSquare,
  LogOut,
  CircleDollarSign,
  Compass,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/owners", label: "Overview", icon: LayoutDashboard, capability: "workspace.read" },
  { href: "/owners/decisions", label: "Decisions", icon: FileText, capability: "governance.read" },
  { href: "/owners/approvals", label: "Approvals", icon: CheckSquare, capability: "approvals.read" },
  { href: "/owners/finance", label: "Finance", icon: CircleDollarSign, capability: "finance.read", responsibility: "finance_governance" },
  { href: "/owners/technology", label: "Product & technology", icon: Workflow, capability: "technology.read", responsibility: "product_technology" },
  { href: "/owners/strategy", label: "Business & strategy", icon: Compass, capability: "strategy.read", responsibility: "business_strategy" },
  { href: "/owners/operations", label: "Operations", icon: Activity, capability: "governance.read", responsibility: "operations" },
] as const;

type FounderShellProps = {
  children: React.ReactNode;
  displayName: string;
  capabilities: string[];
  responsibilities: string[];
};

export function FounderShell({
  children,
  displayName,
  capabilities,
  responsibilities,
}: FounderShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/owners/login");
    router.refresh();
  }
  const visibleItems = NAV_ITEMS.filter((item) => capabilities.includes(item.capability) && (!("responsibility" in item) || responsibilities.includes(item.responsibility)));

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <Link href="/owners" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-violet)] text-white">
              <Compass size={20} />
            </span>
            <span>
              <span className="block font-semibold tracking-tight">Nashemann</span>
              <span className="block text-xs text-[var(--text-muted)]">Founder workspace</span>
            </span>
          </Link>
        </div>

        <div className="px-4 py-5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Workspace
          </p>
          <nav aria-label="Founder workspace" className="mt-3 space-y-1">
            {visibleItems.map(({ href, label, icon: Icon }) => {
              const active = href === "/owners" ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--surface-hover)] font-medium text-[var(--accent-violet-deep)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-elevated)] p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-hover)] text-sm font-semibold text-[var(--accent-violet-deep)]">
              {displayName.trim().charAt(0).toUpperCase() || "F"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{displayName}</span>
              <span className="block text-xs text-[var(--text-muted)]">Co-Founder</span>
            </span>
            <ShieldCheck size={16} className="text-[var(--text-muted)]" aria-label="Authorized membership" />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/90 px-5 backdrop-blur-xl lg:px-8">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Nashemann / Owners</p>
            <p className="text-sm font-semibold">Founder workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-64 truncate text-sm text-[var(--text-muted)] sm:block">{displayName}</span>
            <span className="grid size-9 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)]" title="Notifications are not connected yet">
              <Bell size={16} />
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-7 lg:px-10 lg:py-9">
          {responsibilities.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Your areas:</span>
              {responsibilities.map((responsibility) => (
                <span key={responsibility} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-muted)]">
                  {responsibility.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          )}
          {children}
          <footer className="mt-12 flex flex-col gap-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>Nashemann founder workspace · Access is capability-scoped</span>
            <span className="inline-flex items-center gap-1">Admin and vendor access remain separate <ArrowUpRight size={12} /></span>
          </footer>
        </main>
      </div>
    </div>
  );
}
