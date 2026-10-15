import { CheckSquare } from "lucide-react";
import { requireFounder } from "@/lib/founders/authz";
import { ApprovalCenterClient, type ApprovalRow } from "./ApprovalCenterClient";

const domainLabels: Record<string, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

export const dynamic = "force-dynamic";

export default async function FounderApprovalsPage() {
  const { supabase, user, membership } = await requireFounder("approvals.read");
  const { data, error } = await (supabase.from("owner_approvals") as any)
    .select("id, title, description, domain, status, requested_at, requested_by, reviewed_by, decision_reason")
    .order("requested_at", { ascending: false })
    .limit(100);

  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-violet-deep)]">Governance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Approval center</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
        Requests are stored in Supabase and filtered by your assigned owner domains. The current workflow records one authorized, non-requester review per request; do not use it to execute financial transactions or other high-impact actions until the founders ratify formal quorum and threshold rules.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {membership.responsibilities.map((domain) => (
          <span key={domain} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {domainLabels[domain] ?? domain}
          </span>
        ))}
      </div>

      {error ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
          <CheckSquare size={24} className="text-[var(--text-muted)]" />
          <h2 className="mt-4 font-semibold">Approval queue unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">The reviewed owner-domain migration may not be deployed yet, or this account may not have the required database access. No fallback data is shown.</p>
        </div>
      ) : (
        <div className="mt-7">
          <ApprovalCenterClient
            approvals={(data ?? []) as ApprovalRow[]}
            domains={membership.responsibilities}
            currentUserId={user.id}
            canRequest={membership.capabilities.includes("approvals.request")}
            canReview={membership.capabilities.includes("approvals.review")}
          />
        </div>
      )}
    </section>
  );
}
