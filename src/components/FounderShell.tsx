"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  Bell,
  CheckSquare,
  CircleDollarSign,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Workflow,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/owners", label: "Executive overview", icon: LayoutDashboard, capability: "workspace.read" },
  { href: "/owners/decisions", label: "Founder decisions", icon: FileText, capability: "governance.read" },
  { href: "/owners/approvals", label: "Approval center", icon: CheckSquare, capability: "approvals.read" },
  { href: "/owners/finance", label: "Finance & settlements", icon: CircleDollarSign, capability: "finance.read", responsibility: "finance_governance" },
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

const DOMAIN_LABELS: Record<string, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

export function FounderShell({ children, displayName, capabilities, responsibilities }: FounderShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);


  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/owners/login");
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      capabilities.includes(item.capability) &&
      (!("responsibility" in item) || responsibilities.includes(item.responsibility)),
  );
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "OW";

  const navigation = (
    <nav aria-label="Founder workspace" className="mt-3 space-y-1">
      {visibleItems.map(({ href, label, icon: Icon }) => {
        const active = href === "/owners" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMobileOpen(false)}
            className={[
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200",
              active
                ? "border-[rgba(216,180,90,0.22)] bg-[rgba(216,180,90,0.12)] font-semibold text-[#f0d492]"
                : "border-transparent text-[var(--text-muted)] hover:border-white/5 hover:bg-white/[0.045] hover:text-[var(--text)]",
            ].join(" ")}
          >
            <Icon size={17} strokeWidth={1.8} className={active ? "text-[#d8b45a]" : "text-current"} />
            <span className="min-w-0 flex-1">{label}</span>
            {active && <span className="size-1.5 rounded-full bg-[#d8b45a]" />}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (
    <>
      <div className="flex min-h-[76px] items-center gap-3 border-b border-white/[0.07] px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f0d492] to-[#b38b35] text-base font-extrabold text-[#151108] shadow-[0_8px_26px_rgba(216,180,90,0.16)]">N</span>
        <span>
          <span className="block text-sm font-semibold tracking-wide text-[#f2f3f7]">Nashemann</span>
          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#d8b45a]">Owner workspace</span>
        </span>
      </div>
      <div className="px-3 py-5">
        <p className="px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#687286]">Workspace navigation</p>
        {navigation}
      </div>
      <div className="mt-auto border-t border-white/[0.07] p-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f0d492] to-[#b38b35] text-xs font-bold text-[#151108]">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[#e8ecf4]">{displayName}</span>
            <span className="mt-0.5 block text-[10px] text-[#8994a8]">Authorized owner</span>
          </span>
          <ShieldCheck size={15} className="shrink-0 text-[#3dd6c0]" aria-label="Authorized membership" />
        </div>
        <button type="button" onClick={handleSignOut} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-[#8994a8] transition-colors hover:bg-[rgba(229,100,108,0.1)] hover:text-[#e5646c]" aria-label="Sign out of owner workspace">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="owner-workspace min-h-screen text-[var(--text)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_85%_-10%,rgba(216,180,90,0.075),transparent_60%),radial-gradient(700px_500px_at_-10%_110%,rgba(61,214,192,0.045),transparent_60%)]" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[256px] flex-col border-r border-white/[0.07] bg-[#0c111c]/95 backdrop-blur-xl lg:flex">
        {sidebar}
      </aside>

      {mobileOpen && (
        <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm lg:hidden" />
      )}
      <aside aria-label="Mobile navigation" className={["fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col border-r border-white/10 bg-[#0c111c] shadow-2xl transition-transform duration-300 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full"].join(" ")}>
        <div className="flex justify-end border-b border-white/[0.07] p-3">
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-[#9aa5b8] hover:bg-white/5"><X size={18} /></button>
        </div>
        {sidebar}
      </aside>

      <div className="min-h-screen lg:pl-[256px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.07] bg-[#0a0e16]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-[#aab4c5] hover:bg-white/5 lg:hidden"><Menu size={18} /></button>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#6f7b90]">Nashemann <span className="px-1 text-[#d8b45a]">/</span> Owners</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[#e8ecf4]">{visibleItems.find((item) => item.href === "/owners" ? pathname === item.href : pathname.startsWith(item.href))?.label ?? "Owner workspace"}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-48 truncate text-xs text-[#8994a8] md:block">{displayName}</span>
            <span className="grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#9aa5b8]" title="Notifications are not connected yet"><Bell size={16} /></span>
            <span className="grid size-9 place-items-center rounded-xl border border-[rgba(216,180,90,0.22)] bg-[rgba(216,180,90,0.1)] text-xs font-bold text-[#f0d492]">{initials}</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9 lg:py-9">
          {responsibilities.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7f8ba0]">Your access</span>
              {responsibilities.map((responsibility) => (
                <span key={responsibility} className="rounded-full border border-white/[0.09] bg-white/[0.025] px-3 py-1.5 text-[10px] font-medium capitalize tracking-wide text-[#aeb8c8]">
                  {DOMAIN_LABELS[responsibility] ?? responsibility.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          )}
          {children}
          <footer className="mt-12 flex flex-col gap-2 border-t border-white/[0.07] pt-5 text-[10px] text-[#788499] sm:flex-row sm:items-center sm:justify-between">
            <span>Nashemann owner workspace <span className="px-1 text-[#d8b45a]">·</span> Capability-scoped access</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-[#3dd6c0]" /> Staff and vendor access remain separate</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
