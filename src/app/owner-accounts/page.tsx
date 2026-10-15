import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireStaff } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import { OwnerAccountsClient, type OwnerAccountRow } from "./OwnerAccountsClient";

export const dynamic = "force-dynamic";

export default async function OwnerAccountsPage() {
  const { staffProfile } = await requireStaff();
  if (staffProfile?.role !== "super_admin") redirect("/");

  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div>
        <PageHeader title="Owner accounts" description="Provision the three owner identities and assign their domains and capabilities." />
        <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-[var(--text)]">
          <h2 className="font-semibold">Owner account schema is not ready</h2>
          <p className="mt-2 leading-6 text-[var(--text-muted)]">
            Apply and verify the reviewed owner-membership migration before provisioning credentials. No fallback or mock owner records are shown.
          </p>
        </div>
      </div>
    );
  }

  const owners = await Promise.all((memberships ?? []).map(async (membership): Promise<OwnerAccountRow> => {
    const { data: authRecord } = await admin.auth.admin.getUserById(membership.user_id);
    return {
      user_id: membership.user_id,
      username: membership.username ?? null,
      display_name: membership.display_name ?? authRecord.user?.user_metadata?.name ?? null,
      email: authRecord.user?.email ?? "",
      status: membership.status,
      responsibilities: membership.responsibilities ?? [],
      capabilities: membership.capabilities ?? [],
      created_at: membership.created_at,
    };
  }));

  return (
    <div>
      <PageHeader
        title="Owner accounts"
        description="Super Admin-only management for the three owner/co-founder accounts. Credentials are handled by Supabase Auth; passwords are never stored in the owner membership table."
      />
      <OwnerAccountsClient owners={owners} />
    </div>
  );
}
