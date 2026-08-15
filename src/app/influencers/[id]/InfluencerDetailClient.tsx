"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, Store, Percent } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, VendorStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPKR, formatDate } from "@/lib/utils";
import { updateInfluencerCutAction, setInfluencerStatusAction } from "../actions";

const STATUS_TONE = { active: "success", suspended: "neutral", pending: "warning" } as const;

export type ReferredVendorRow = {
  id: string;
  name: string;
  status: string;
  joinedAt: string;
  logoEmoji: string;
  platformRevenue: number;
};

export function InfluencerDetailClient({
  influencerId,
  name,
  socialHandle,
  platform,
  followerCount,
  initialStatus,
  initialCutPercent,
  referredVendors,
  platformRevenueGenerated,
}: {
  influencerId: string;
  name: string;
  socialHandle: string;
  platform: string;
  followerCount: number;
  initialStatus: "pending" | "active" | "suspended";
  initialCutPercent: number;
  referredVendors: ReferredVendorRow[];
  platformRevenueGenerated: number;
}) {
  const [cutPercent, setCutPercent] = useState(initialCutPercent);
  const [status, setStatus] = useState(initialStatus);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const influencerEarnings = Math.round(platformRevenueGenerated * (cutPercent / 100));

  function save() {
    startTransition(async () => {
      await updateInfluencerCutAction(influencerId, name, cutPercent);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  function toggleStatus() {
    const next = status === "suspended" ? "active" : "suspended";
    startTransition(async () => {
      await setInfluencerStatusAction(influencerId, name, next);
      setStatus(next);
    });
  }

  return (
    <div>
      <Link
        href="/influencers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft size={14} /> All influencers
      </Link>

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold text-[var(--text)]">{name}</h1>
            <Badge tone={STATUS_TONE[status]}>{status}</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {socialHandle} · {platform} · {followerCount.toLocaleString()} followers
          </p>
        </div>
        <Button variant={status === "suspended" ? "primary" : "danger"} size="sm" onClick={toggleStatus} disabled={pending}>
          {status === "suspended" ? "Reactivate" : "Suspend"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Store size={13} /> Referred businesses
          </p>
          <p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{referredVendors.length}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Wallet size={13} /> Platform revenue generated
          </p>
          <p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{formatPKR(platformRevenueGenerated)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Percent size={13} /> Their earnings ({cutPercent}%)
          </p>
          <p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{formatPKR(influencerEarnings)}</p>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Referred businesses" description="Each business's platform-fee revenue feeds this influencer's cut." />
        <div className="divide-y divide-[var(--border)]">
          {referredVendors.map((v) => (
            <Link
              key={v.id}
              href={`/vendors/${v.id}`}
              className="flex items-center justify-between py-3 hover:bg-[var(--surface-hover)]"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{v.logoEmoji}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{v.name}</p>
                  <p className="text-xs text-[var(--text-faint)]">Joined {formatDate(v.joinedAt)}</p>
                </div>
              </div>
              <VendorStatusBadge status={v.status} />
            </Link>
          ))}
          {referredVendors.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--text-faint)]">No referrals yet.</p>
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Revenue share"
          description="Override the program default for this influencer specifically."
          action={
            <Button variant="primary" size="sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </Button>
          }
        />
        <label className="block max-w-xs">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Cut of platform revenue (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={cutPercent}
            onChange={(e) => setCutPercent(Number(e.target.value))}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]"
          />
        </label>
      </Card>
    </div>
  );
}
