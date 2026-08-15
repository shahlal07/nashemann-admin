"use client";

import { useState } from "react";
import { Gift, Users, Award, Minus, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { formatPKR } from "@/lib/utils";
import { adjustLoyaltyPointsAction, resetLoyaltyLeaderboardEntryAction } from "./actions";

export type LeaderboardEntry = {
  id: string;
  name: string;
  email: string;
  lifetimePoints: number;
  credits: number;
};

export type TopReferrer = { name: string; conversions: number };

export type RewardRedemption = { name: string; tier: string; couponCode: string; credits: number };

export function LoyaltyClient({
  initialLeaderboard,
  topReferrers,
  redemptions,
}: {
  initialLeaderboard: LeaderboardEntry[];
  topReferrers: TopReferrer[];
  redemptions: RewardRedemption[];
}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [delta, setDelta] = useState<Record<string, string>>({});
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

  async function applyDelta(id: string) {
    const value = Number(delta[id] ?? 0);
    if (!value) return;
    const entry = leaderboard.find((e) => e.id === id);
    if (!entry) return;
    const nextPoints = Math.max(0, entry.lifetimePoints + value);
    try {
      await adjustLoyaltyPointsAction(id, entry.name, value, nextPoints);
      setLeaderboard((prev) => prev.map((e) => (e.id === id ? { ...e, lifetimePoints: nextPoints } : e)));
      setDelta((prev) => ({ ...prev, [id]: "" }));
    } catch {
      // no-op: leave the leaderboard as-is on failure
    }
  }

  async function removeFromLeaderboard(id: string) {
    const entry = leaderboard.find((e) => e.id === id);
    if (!entry) return;
    try {
      await resetLoyaltyLeaderboardEntryAction(id, entry.name);
      setLeaderboard((prev) => prev.map((e) => (e.id === id ? { ...e, lifetimePoints: 0, credits: 0 } : e)));
      setConfirmingRemove(null);
    } catch {
      // no-op
    }
  }

  const totalCredits = redemptions.reduce((s, r) => s + r.credits, 0);
  const totalConversions = topReferrers.reduce((s, r) => s + r.conversions, 0);

  return (
    <div>
      <PageHeader
        title="Rewards & Referrals"
        description="Vendor referral conversions and reward-credit redemptions across the platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Referral conversions" value={totalConversions} icon={Users} />
        <StatCard label="Credits redeemed" value={totalCredits} prefix="Rs " icon={Gift} accent="amber" />
        <StatCard label="Vendors on leaderboard" value={leaderboard.length} icon={Award} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top referrers" />
          <div className="divide-y divide-[var(--border)]">
            {topReferrers.map((r, i) => (
              <div key={r.name} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-[var(--text)]">
                  #{i + 1} {r.name}
                </span>
                <span className="text-sm font-semibold text-[var(--success)]">{r.conversions} referred</span>
              </div>
            ))}
            {topReferrers.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-faint)]">No successful referrals yet.</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent redemptions" />
          <div className="divide-y divide-[var(--border)]">
            {redemptions.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-[var(--text)]">{r.name}</p>
                  <p className="text-xs text-[var(--text-faint)]">
                    {r.tier} · {r.couponCode}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">-{formatPKR(r.credits)}</span>
              </div>
            ))}
            {redemptions.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-faint)]">No redemptions yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Manage leaderboard" description="Manually adjust a vendor's lifetime points, or reset them off the board." />
        <div className="divide-y divide-[var(--border)]">
          {leaderboard.map((e, i) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  #{i + 1} {e.name}
                </p>
                <p className="text-xs text-[var(--text-faint)]">
                  {e.lifetimePoints.toLocaleString()} lifetime pts · {formatPKR(e.credits)} spendable credits
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={delta[e.id] ?? ""}
                  onChange={(ev) => setDelta((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                  placeholder="±50"
                  className="w-20 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent-violet)]"
                />
                <Button size="sm" variant="secondary" onClick={() => applyDelta(e.id)}>
                  {Number(delta[e.id] ?? 0) < 0 ? <Minus size={12} /> : <Plus size={12} />} Apply
                </Button>
                {confirmingRemove === e.id ? (
                  <>
                    <span className="text-xs text-[var(--text-faint)]">Reset to 0?</span>
                    <Button size="sm" variant="danger" onClick={() => removeFromLeaderboard(e.id)}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmingRemove(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => setConfirmingRemove(e.id)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-faint)]">No vendors on the leaderboard yet.</p>}
        </div>
      </Card>
    </div>
  );
}
