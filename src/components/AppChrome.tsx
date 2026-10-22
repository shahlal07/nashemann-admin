"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";
import { OwnerShell } from "./OwnerShell";
import { ToastProvider } from "./ui/Toast";

const CHROME_LESS_PATHS = ["/login", "/owner-login"];

// The founder workspace prototype renders full-bleed inside its own iframe and
// owns the entire viewport, so the admin chrome is suppressed for it.
const CHROME_LESS_PREFIXES = ["/owners/workspace"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (
    CHROME_LESS_PATHS.includes(pathname) ||
    CHROME_LESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (pathname === "/owners" || pathname.startsWith("/owners/")) {
    return (
      <ToastProvider>
        <OwnerShell>{children}</OwnerShell>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
