"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/owner-login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface-elevated)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="hidden rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] sm:inline-flex">
              Founder workspace
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="accent-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <LogOut size={15} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="space-y-2">
          <Link href="/owners" className="accent-ring flex items-center gap-3 rounded-lg bg-[var(--surface-hover)] px-3 py-2.5 text-sm font-medium text-[var(--text)]">
            <LayoutDashboard size={17} />
            Overview
          </Link>
          <div className="rounded-lg border border-[var(--border)] p-3 text-xs leading-5 text-[var(--text-muted)]">
            <ShieldCheck size={16} className="mb-2 text-[var(--accent-violet)]" />
            Founder permissions are checked on the server and by database policies.
          </div>
          <Link href="/" className="accent-ring flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">
            Staff admin sign-in <ArrowRight size={13} />
          </Link>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
