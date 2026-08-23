"use client";

import { useState } from "react";
import { Star, Trash2, Sparkles, Store } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { postReviewReplyAction, removeReviewReplyAction, deleteReviewAction, generateReviewReplyDraftAction } from "./actions";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export type ReviewRow = {
  id: string;
  vendor_id: string;
  vendor: { name: string } | null;
  product_name: string;
  rating: number;
  title: string | null;
  body: string;
  verified_purchase: boolean;
  customer_name: string;
  created_at: string;
  admin_reply_body: string | null;
  admin_reply_at: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} className={i < rating ? "fill-[var(--accent-amber)] text-[var(--accent-amber)]" : "text-[var(--border-strong)]"} />
      ))}
    </div>
  );
}

export function ReviewsClient({ initialReviews }: { initialReviews: ReviewRow[] }) {
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [unrepliedOnly, setUnrepliedOnly] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const { showToast } = useToast();

  const filtered = reviews.filter((r) => {
    if (ratingFilter !== "all" && r.rating !== ratingFilter) return false;
    if (unrepliedOnly && r.admin_reply_body) return false;
    return true;
  });

  function startReply(r: ReviewRow) {
    setReplyingId(r.id);
    setDraft(r.admin_reply_body ?? "");
  }

  async function aiSuggest(r: ReviewRow) {
    setAiBusy(true);
    try {
      const suggestion = await generateReviewReplyDraftAction({
        vendorName: r.vendor?.name ?? "this vendor",
        productName: r.product_name,
        rating: r.rating,
        title: r.title,
        body: r.body,
      });
      setDraft(suggestion);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "AI reply drafting is unavailable right now.", "error");
    } finally {
      setAiBusy(false);
    }
  }

  async function postReply(id: string) {
    const target = reviews.find((r) => r.id === id);
    const prev = reviews;
    const optimisticNow = new Date().toISOString();
    setReviews((p) => p.map((r) => (r.id === id ? { ...r, admin_reply_body: draft, admin_reply_at: optimisticNow } : r)));
    setReplyingId(null);
    setDraft("");
    try {
      await postReviewReplyAction(id, target?.product_name ?? "Review", draft);
    } catch (err) {
      setReviews(prev);
      alert(err instanceof Error ? err.message : "Couldn't post the reply.");
    }
  }

  async function removeReply(id: string) {
    const target = reviews.find((r) => r.id === id);
    const prev = reviews;
    setReviews((p) => p.map((r) => (r.id === id ? { ...r, admin_reply_body: null, admin_reply_at: null } : r)));
    try {
      await removeReviewReplyAction(id, target?.product_name ?? "Review");
    } catch (err) {
      setReviews(prev);
      alert(err instanceof Error ? err.message : "Couldn't remove the reply.");
    }
  }

  async function deleteReview(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    const target = reviews.find((r) => r.id === id);
    const prev = reviews;
    setReviews((p) => p.filter((r) => r.id !== id));
    try {
      await deleteReviewAction(id, target?.product_name ?? "Review");
    } catch (err) {
      setReviews(prev);
      alert(err instanceof Error ? err.message : "Couldn't delete the review.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Every review across every vendor's storefront — reply publicly, or remove reviews that are dishonest or abusive."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm text-[var(--text)]"
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <input type="checkbox" checked={unrepliedOnly} onChange={(e) => setUnrepliedOnly(e.target.checked)} />
          Unreplied only
        </label>
        <span className="text-xs text-[var(--text-faint)]">
          {filtered.length} of {reviews.length}
        </span>
      </div>

      <Card>
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((r) => (
            <div key={r.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} />
                    {r.verified_purchase && <Badge tone="success">Verified Purchase</Badge>}
                    <Badge tone="neutral">
                      <Store size={10} /> {r.vendor?.name ?? "Unknown vendor"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[var(--text)]">{r.product_name}</p>
                  {r.title && <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">{r.title}</p>}
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{r.body}</p>
                  <p className="mt-1.5 text-xs text-[var(--text-faint)]">
                    {r.customer_name} · {formatDate(r.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startReply(r)}>
                    {r.admin_reply_body ? "Edit reply" : "Reply"}
                  </Button>
                  <button onClick={() => deleteReview(r.id)} className="text-[var(--text-faint)] hover:text-[var(--danger)]" aria-label="Delete review">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {r.admin_reply_body && replyingId !== r.id && (
                <div className="mt-3 ml-4 rounded-[var(--radius-sm)] border-l-2 border-[var(--accent-violet)] bg-[var(--surface)] p-3">
                  <p className="text-xs font-semibold text-[var(--accent-violet)]">Your reply</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{r.admin_reply_body}</p>
                  <button onClick={() => removeReply(r.id)} className="mt-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--danger)]">
                    Remove reply
                  </button>
                </div>
              )}

              {replyingId === r.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    placeholder="Write a public reply…"
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" type="button" onClick={() => aiSuggest(r)} disabled={aiBusy}>
                      <Sparkles size={13} /> {aiBusy ? "Drafting…" : "Generate AI Reply"}
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => postReply(r.id)} disabled={!draft.trim()}>
                      Post Reply
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setReplyingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-faint)]">No reviews match these filters.</p>}
        </div>
      </Card>
    </div>
  );
}
