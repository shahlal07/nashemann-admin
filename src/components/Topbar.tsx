"use client";

import { usePathname } from "next/navigation";
import { Search, Menu } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";

function currentLabel(pathname: string): string {
  const exact = NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact.label;

  // A dynamic sub-route (e.g. /vendors/v2) has its own heading inside
  // the page itself -- don't let a shorter parent nav item's href match it
  // via startsWith and show a misleading breadcrumb.
  if (/^\/vendors\/[^/]+$/.test(pathname) && !pathname.endsWith("/new")) return "Vendor Details";

  const match = [...NAV_ITEMS]
    .filter((i) => i.href !== "/")
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname.startsWith(i.href + "/") || pathname === i.href);
  return match?.label ?? "Overview";
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[var(--border)] bg-[var(--bg)]/80 px-5 backdrop-blur-xl lg:pl-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <div>
        <p className="text-xs font-medium text-[var(--text-faint)]">Nashemann · Platform</p>
        <h1 className="font-display text-base font-semibold text-[var(--text)]">{currentLabel(pathname)}</h1>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--text-faint)] transition-colors hover:border-[var(--border-strong)] sm:flex">
          <Search size={15} />
          <span>Search vendors, applications…</span>
          <kbd className="ml-6 rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[0.65rem] text-[var(--text-faint)]">
            ⌘K
          </kbd>
        </div>

        <NotificationBell />
        <ThemeToggle />

        <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-black" style={{ background: "var(--accent-gradient)" }}>
          SA
        </div>
      </div>
    </header>
  );
}
