import { Megaphone } from "lucide-react";
import { requireOwner } from "@/lib/owner-authz";
import { DecisionCreateForm } from "../decisions/DecisionCreateForm";
import {
  EmptyPanel,
  PageStat,
  PanelCard,
  SoftNote,
  StatusPill,
  WarningPanel,
  WorkspaceHero,
  WorkspacePage,
} from "@/components/owners/workspace-ui";
import { getWorkspaceAccess } from "@/lib/founders/workspaces";

export const dynamic = "force-dynamic";

type StrategyDecision = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
};

type FeatureRequestRow = { status: string };

export default async function FounderMarketingPage() {
  const { supabase, membership } = await requireOwner();
  const access = getWorkspaceAccess(membership, "marketing");

  const [decisionResult, featureResult] = await Promise.all([
    supabase
      .from("owner_decisions")
      .select("id, title, summary, status, created_at")
      .eq("domain", "business_strategy")
      .order("created_at", { ascending: false })
      .limit(100),
    // Shared feature register rows targeting marketing (RLS: governance.read).
    supabase
      .from("owner_feature_requests")
      .select("status")
      .eq("target_platform", "marketing")
      .limit(500),
  ]);

  const decisions = (decisionResult.data ?? []) as StrategyDecision[];
  const features = (featureResult.data ?? []) as FeatureRequestRow[];
  const openMarketingFeatures = features.filter((row) => row.status === "proposed" || row.status === "approved" || row.status === "in_progress").length;

  return (
    <WorkspacePage workspaceKey="marketing" access={access} viewerLabel={membership.display_name || membership.username || "founder"}>
      <WorkspaceHero
        crumb="Marketing workspace · CAMPAIGNS · SALES · BRAND"
        title="Make growth"
        accentTitle="measurable."
        description="Marketing and growth leadership: business-strategy decisions, the marketing targets in the shared feature register, and the operating checklist for campaigns, vendors and customer experience."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PageStat label="Strategy decisions" value={decisionResult.error ? "—" : decisions.length} foot="BUSINESS STRATEGY DOMAIN" />
        <PageStat label="Open marketing proposals" value={featureResult.error ? "—" : openMarketingFeatures} foot="FROM THE SHARED REGISTER" />
        <PageStat label="Your access" value={access.canEdit ? "Edit" : "Preview"} foot={access.canEdit ? "MARKETING OWNER" : "READ-ONLY FOR YOUR ACCOUNT"} />
        <PageStat label="Campaign analytics" value="Not connected" foot="NO BACKEND DATA SOURCE YET" />
      </div>

      {(decisionResult.error || featureResult.error) && (
        <WarningPanel
          title="Some marketing records are unavailable"
          message="One or more registers could not be loaded. Affected values are shown as unavailable rather than estimated."
        />
      )}

      <PanelCard
        title="Marketing & strategy decisions"
        description="Live records for the business-strategy domain, persisted in Supabase and protected by domain-specific row-level security."
        badge={<StatusPill tone={access.canEdit ? "pink" : "neutral"}>{access.canEdit ? "You can record decisions" : "Read-only"}</StatusPill>}
      >
        {access.canEdit && <DecisionCreateForm domains={["business_strategy"]} />}
        {decisionResult.error ? (
          <p className="mt-4 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">Strategy records are temporarily unavailable. No sample records are substituted.</p>
        ) : decisions.length === 0 ? (
          <div className="mt-4">
            <EmptyPanel title="No strategy decisions recorded" message="Proposals created by the Marketing owner appear here once recorded." />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {decisions.map((decision) => (
              <article key={decision.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{decision.title}</h3>
                  <StatusPill tone={decision.status === "proposed" ? "pink" : "neutral"}>{decision.status}</StatusPill>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{decision.summary || "No rationale recorded."}</p>
                <p className="mt-2 text-xs text-[var(--text-faint)]">Created {new Date(decision.created_at).toLocaleDateString()}</p>
              </article>
            ))}
          </div>
        )}
      </PanelCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Growth review" description="The recurring questions this workspace is responsible for answering.">
          <div className="divide-y divide-[var(--border)]">
            {[
              ["Acquisition", "Which channels produce qualified leads?"],
              ["Activation", "Where do new customers get stuck?"],
              ["Retention", "Why do customers stay or leave?"],
            ].map(([title, question]) => (
              <div key={title} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">{question}</p>
                </div>
                <StatusPill tone="cyan">Weekly</StatusPill>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Not yet connected" description="Honest state of the marketing modules from the design reference.">
          <div className="divide-y divide-[var(--border)]">
            {[
              ["Campaign tracker", "No campaign backend is connected; no sample campaigns are shown."],
              ["Lead & client pipeline", "Sales pipeline storage is not connected to this workspace yet."],
              ["Vendor operations board", "Vendor data lives in the marketplace backend and is not surfaced here yet."],
            ].map(([title, note]) => (
              <div key={title} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">{note}</p>
                </div>
                <StatusPill tone="warn">Backend required</StatusPill>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>

      <SoftNote>
        Experiment brief template: hypothesis → audience → channel → budget → success metric → owner → review date.
        Campaign, pipeline and vendor modules will be wired to real backend records before any numbers appear here —
        fabricated marketing data is never displayed.
      </SoftNote>

      <p className="flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]">
        <Megaphone size={14} className="mt-0.5 shrink-0" />
        Marketing workspace identity comes from your authenticated Supabase membership (business-strategy responsibility
        with strategy capabilities) — never from a client-side role selector.
      </p>
    </WorkspacePage>
  );
}
