import { Activity, GitBranch, GitCommit, Workflow } from "lucide-react";
import { requireOwner } from "@/lib/owner-authz";
import { DecisionCreateForm } from "../decisions/DecisionCreateForm";
import { getRepositoryHealth } from "@/lib/founders/github-health";
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
import { FOUNDER_WORKSPACES, getWorkspaceAccess } from "@/lib/founders/workspaces";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

type FeatureRequestRow = { target_platform: string; status: string };

export default async function FounderTechnologyPage() {
  const { supabase, membership } = await requireOwner();
  const access = getWorkspaceAccess(membership, "technology");
  const workspace = FOUNDER_WORKSPACES.technology;

  const [health, decisionResult, featureResult] = await Promise.all([
    getRepositoryHealth(),
    supabase
      .from("owner_decisions")
      .select("id, title, summary, status, created_at")
      .eq("domain", "product_technology")
      .order("created_at", { ascending: false })
      .limit(50),
    // Shared feature register — readable by any founder with governance.read
    // (RLS enforces this); used here for workspace-level roadmap stats.
    supabase
      .from("owner_feature_requests")
      .select("target_platform, status")
      .in("target_platform", ["technology", "whole_panel"])
      .limit(500),
  ]);

  const techDecisions = (decisionResult.data ?? []) as { id: string; title: string; summary: string | null; status: string; created_at: string }[];
  const features = (featureResult.data ?? []) as FeatureRequestRow[];
  const openFeatures = features.filter((row) => row.status === "proposed" || row.status === "approved" || row.status === "in_progress").length;
  const shippedFeatures = features.filter((row) => row.status === "shipped").length;
  const canCreateDecision = access.canEdit;

  return (
    <WorkspacePage
      workspaceKey="technology"
      access={access}
      viewerLabel={membership.display_name || membership.username || "founder"}
    >
      <WorkspaceHero
        crumb={`Technology workspace · ${workspace.subtitle}`}
        title="Turn the roadmap into"
        accentTitle="releases."
        description="Product and engineering leadership: repository health, technical decisions, and the shared feature register targets that affect Technology and the whole panel."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PageStat
          label="Open feature proposals"
          value={featureResult.error ? "—" : openFeatures}
          foot="TECHNOLOGY + WHOLE PANEL"
        />
        <PageStat label="Shipped proposals" value={featureResult.error ? "—" : shippedFeatures} foot="FROM THE SHARED REGISTER" />
        <PageStat label="Technical decisions" value={decisionResult.error ? "—" : techDecisions.length} foot="PRODUCT · TECHNOLOGY DOMAIN" />
        <PageStat
          label="Your access"
          value={access.canEdit ? "Edit" : "Preview"}
          foot={access.canEdit ? "TECHNOLOGY OWNER" : "READ-ONLY FOR YOUR ACCOUNT"}
        />
      </div>

      {featureResult.error && (
        <WarningPanel
          title="Feature register stats are unavailable"
          message="The shared feature register could not be loaded for this workspace. No numbers are estimated."
        />
      )}

      {!health.configured && (
        <WarningPanel title="GitHub integration needs a server token" message={health.message} />
      )}

      {health.configured && health.repositories.length === 0 && (
        <WarningPanel title="No repositories configured" message="Repository health will appear once the GitHub integration lists the implementation repositories." />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {health.repositories.map((repo) => (
          <article key={repo.fullName} className="panel-hairline rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{repo.name}</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{repo.fullName}</p>
              </div>
              <a href={repo.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-hover)]">Open repository</a>
            </div>

            {repo.error ? (
              <div className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-4">
                <p className="text-sm font-medium">Live data unavailable</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{repo.error}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <GitBranch size={17} className="mt-0.5 text-[var(--accent-violet-deep)]" />
                  <div><p className="text-xs text-[var(--text-muted)]">Default branch</p><p className="mt-1 text-sm font-medium">{repo.defaultBranch || "Unavailable"}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <GitCommit size={17} className="mt-0.5 text-[var(--accent-violet-deep)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-muted)]">Latest commit</p>
                    {repo.latestCommit ? (
                      <>
                        <a href={repo.latestCommit.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm font-medium hover:underline">{repo.latestCommit.sha} · {repo.latestCommit.message}</a>
                        <p className="mt-1 text-xs text-[var(--text-faint)]">{formatDate(repo.latestCommit.date)}</p>
                      </>
                    ) : <p className="mt-1 text-sm">No commit data returned.</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Workflow size={17} className="mt-0.5 text-[var(--accent-violet-deep)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-muted)]">Latest workflow run</p>
                    {repo.latestWorkflow ? (
                      <>
                        <a href={repo.latestWorkflow.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm font-medium hover:underline">{repo.latestWorkflow.name}</a>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Status: {repo.latestWorkflow.status} · Conclusion: {repo.latestWorkflow.conclusion || "not concluded"}</p>
                        <p className="mt-1 text-xs text-[var(--text-faint)]">{formatDate(repo.latestWorkflow.updatedAt)}</p>
                      </>
                    ) : <p className="mt-1 text-sm">No workflow run returned.</p>}
                  </div>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      <PanelCard
        title="Product & technology decisions"
        description="Live records for the product-technology domain, persisted in Supabase."
        badge={<StatusPill tone={canCreateDecision ? "violet" : "neutral"}>{canCreateDecision ? "You can record decisions" : "Read-only"}</StatusPill>}
      >
        {canCreateDecision && <DecisionCreateForm domains={["product_technology"]} />}
        {decisionResult.error ? (
          <p className="mt-4 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">Decision records are temporarily unavailable. No sample records are substituted.</p>
        ) : techDecisions.length === 0 ? (
          <div className="mt-4">
            <EmptyPanel title="No technical decisions recorded" message="Proposals created by the Technology owner appear here once recorded." />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {techDecisions.map((decision) => (
              <article key={decision.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">{decision.title}</h3>
                  <StatusPill tone={decision.status === "proposed" ? "violet" : "neutral"}>{decision.status}</StatusPill>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{decision.summary || "No rationale recorded."}</p>
                <p className="mt-2 text-xs text-[var(--text-faint)]">{new Date(decision.created_at).toLocaleDateString()}</p>
              </article>
            ))}
          </div>
        )}
      </PanelCard>

      <SoftNote>
        Repository status is sourced from GitHub at request time and does not imply a production deployment is healthy.
        Security and permission reviews are a shared founder duty: validate inputs, authenticate every mutation, enforce
        authorization server-side, and keep an audit trail for sensitive changes.
      </SoftNote>

      <p className="flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]">
        <Activity size={14} className="mt-0.5 shrink-0" />
        Deployment-provider integration must be configured separately before deployment status can be reported.
      </p>
    </WorkspacePage>
  );
}
