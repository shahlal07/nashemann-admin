"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";
import { ToastProvider } from "./ui/Toast";

const CHROME_LESS_PATHS = ["/login", "/owners/login", "/owners/access", "/owners/forbidden"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (CHROME_LESS_PATHS.includes(pathname) || pathname.startsWith("/owners")) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
