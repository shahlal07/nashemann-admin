import type { ReactNode } from "react";
import { FounderShell } from "@/components/FounderShell";
import { requireFounder } from "@/lib/founders/authz";

export default async function FounderWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, membership } = await requireFounder();

  return (
    <FounderShell
      displayName={membership.display_name || user.email || "Founder"}
      capabilities={membership.capabilities}
      responsibilities={membership.responsibilities}
    >
      {children}
    </FounderShell>
  );
}
