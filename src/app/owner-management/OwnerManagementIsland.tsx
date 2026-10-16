"use client";

import dynamic from "next/dynamic";
import type { OwnerManagementRow } from "./OwnerManagementClient";

const OwnerManagementClient = dynamic(
  () => import("./OwnerManagementClient").then((module) => module.OwnerManagementClient),
  {
    ssr: false,
    loading: () => <div className="glass-panel rounded-[var(--radius-lg)] p-5 text-sm text-[var(--text-muted)]" role="status">Loading founder access…</div>,
  },
);

export default function OwnerManagementIsland({ initialOwners }: { initialOwners: OwnerManagementRow[] }) {
  return <OwnerManagementClient initialOwners={initialOwners} />;
}
