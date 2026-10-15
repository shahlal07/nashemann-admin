"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createOwnerApprovalAction, reviewOwnerApprovalAction } from "../../actions";
import type { FounderResponsibility } from "@/lib/founders/capabilities";

export type ApprovalRow = {
  id: string;
  title: string;
  description: string | null;
  domain: string;
  status: string;
  requested_at: string;
  requested_by: string;
  reviewed_by: string | null;
  decision_reason: string | null;
};

const LABELS: Record<FounderResponsibility, string> = {
  shared_governance: "Shared governance",
  finance_governance: "Finance & governance",
  product_technology: "Product & technology",
  business_strategy: "Business & strategy",
  operations: "Operations",
};

const inputClass = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm";

export function ApprovalCenterClient({
  approvals,
  domains,
  currentUserId,
  canRequest,
  canReview,
}: {
  approvals: ApprovalRow[];
  domains: FounderResponsibility[];
  currentUserId: string;
  canRequest: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [requestBusy, startRequest] = useTransition();
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setRequestError(null);
    setRequestSuccess(false);
    startRequest(async () => {
      try {
        await createOwnerApprovalAction({
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          domain: String(form.get("domain") ?? ""),
        });
        formElement.reset();
        setRequestSuccess(true);
        router.refresh();
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : "Could not create approval request.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {canRequest && domains.length > 0 && (
        <form onSubmit={handleRequest} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="font-semibold">Request a founder decision</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Request title</span><input name="title" required minLength={3} maxLength={240} className={inputClass} placeholder="What needs approval?" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Domain</span><select name="domain" required defaultValue={domains[0]} className={inputClass}>{domains.map((domain) => <option key={domain} value={domain}>{LABELS[domain]}</option>)}</select></label>
          </div>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Context and rationale</span><textarea name="description" rows={3} maxLength={5000} className={inputClass} placeholder="Include context, options, and requested outcome…" /></label>
          {requestError && <p role="alert" className="text-sm text-red-600">{requestError}</p>}
          {requestSuccess && <p role="status" className="text-sm text-emerald-700">Request saved to the live approval queue.</p>}
          <button type="submit" disabled={requestBusy} className="rounded-xl bg-[var(--accent-violet)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{requestBusy ? "Submitting…" : "Submit request"}</button>
        </form>
      )}

      {approvals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="font-semibold">No approval requests in your assigned domains</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">New requests submitted by authorized owners will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              currentUserId={currentUserId}
              canReview={canReview && domains.includes(approval.domain as FounderResponsibility)}
              onReviewed={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  currentUserId,
  canReview,
  onReviewed,
}: {
  approval: ApprovalRow;
  currentUserId: string;
  canReview: boolean;
  onReviewed: () => void;
}) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const mayReview = canReview && approval.status === "pending" && approval.requested_by !== currentUserId;

  function handleReview(event: FormEvent<HTMLFormElement>, status: "approved" | "rejected") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "");
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await reviewOwnerApprovalAction({ id: approval.id, status, reason });
        setSuccess(status === "approved" ? "Request approved." : "Request rejected.");
        onReviewed();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not record the review.");
      }
    });
  }

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-semibold">{approval.title}</h2><p className="mt-1 text-xs text-[var(--text-muted)]">{LABELS[approval.domain as FounderResponsibility] ?? approval.domain} · Requested {new Date(approval.requested_at).toLocaleDateString()}</p></div>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs">{approval.status}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">{approval.description || "No description provided."}</p>
      {approval.decision_reason && <p className="mt-3 rounded-xl bg-[var(--surface-hover)] p-3 text-sm"><span className="font-medium">Review reason: </span>{approval.decision_reason}</p>}
      {mayReview && (
        <form className="mt-5 space-y-3" onSubmit={(event) => handleReview(event, "approved")}>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Review reason (required)</span><textarea name="reason" required minLength={3} maxLength={2000} rows={2} className={inputClass} placeholder="Record the rationale for the decision…" /></label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {success && <p role="status" className="text-sm text-emerald-700">{success}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">Approve request</button>
            <button type="button" disabled={busy} onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form?.reportValidity()) return;
              handleReview({ preventDefault: () => {}, currentTarget: form } as FormEvent<HTMLFormElement>, "rejected");
            }} className="rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-60">Reject request</button>
          </div>
        </form>
      )}
      {approval.status === "pending" && approval.requested_by === currentUserId && <p className="mt-4 text-xs text-[var(--text-muted)]">You cannot review your own request.</p>}
    </article>
  );
}
