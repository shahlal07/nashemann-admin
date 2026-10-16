import { requireSuperAdmin } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import OwnerManagementIsland from "./OwnerManagementIsland";
import type { OwnerManagementRow } from "./OwnerManagementClient";

export const dynamic = "force-dynamic";

export default async function OwnerManagementPage() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    return <div className="rounded-xl border border-[var(--border)] p-5 text-sm text-[var(--danger)]">Could not load owner memberships. Check database permissions and try again.</div>;
  }

  const owners: OwnerManagementRow[] = (data ?? []).map((row) => ({
    userId: row.user_id,
    username: row.username ?? "",
    displayName: row.display_name ?? "",
    status: row.status,
    responsibilities: row.responsibilities ?? [],
    capabilities: row.capabilities ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return <OwnerManagementIsland initialOwners={owners} />;
}
