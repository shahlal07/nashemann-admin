"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";
import { OwnerShell } from "./OwnerShell";
import { ToastProvider } from "./ui/Toast";

const CHROME_LESS_PATHS = ["/login", "/owner-login"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (CHROME_LESS_PATHS.includes(pathname)) {
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
