"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "./AdminShell";

const CHROME_LESS_PATHS = ["/login"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (CHROME_LESS_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
