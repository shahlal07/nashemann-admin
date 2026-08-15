"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X, ArrowUpRight, Megaphone } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPKR, formatDate } from "@/lib/utils";
import { decideApplicationAction, saveProgramSettingsAction } from "./actions";

const TABS = ["Program Settings", "Applications", "Active Influencers"] as const;
type Tab = (typeof TABS)[number];

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

const STATUS_TONE = { active: "success", suspended: "neutral", pending: "warning" } as const;

export type InfluencerApplicationRow = {
  id: string;
  name: string;
  email: string;
  socialHandle: string;
  platform: string;
  followerCount: number;
  pitch: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
};

export type InfluencerRow = {
  id: string;
  name: string;
  socialHandle: string;
  referralCode: string;
  cutPercent: number;
  status: "pending" | "active" | "suspended";
  referredCount: number;
  platformRevenueGenerated: number;
  influencerEarnings: number;
};

export type ProgramSettingsValue = {
  enabled: boolean;
  defaultCutPercent: number;
  minFollowerCount: number;
  cutDurationMonths: number;
};

export function InfluencersClient({
  initialApplications,
  influencers,
  initialSettings,
  totalEarningsOwed,
  activeCount,
}: {
  initialApplications: InfluencerApplicationRow[];
  influencers: InfluencerRow[];
  initialSettings: ProgramSettingsValue;
  totalEarningsOwed: number;
  activeCount: number;
}) {
  const [tab, setTab] = useState<Tab>("Applications");
  const [settings, setSettings] = useState(initialSettings);
  const [applications, setApplications] = useState(initialApplications);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [decidingId, setDecidingId] = useState<string | null>(null);

  function decide(id: string, status: "approved" | "rejected") {
    setDecidingId(id);
    startTransition(async () => {
      try {
        await decideApplicationAction(id, status);
        setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      } finally {
        setDecidingId(null);
      }
    });
  }

  function saveSettings() {
    startTransition(async () => {
      await saveProgramSettingsAction(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text)]">Influencer program</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-muted)]">
            Influencers who bring in businesses earn a cut of the platform&apos;s own fee revenue from those
            businesses — not the vendor&apos;s revenue.
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Megaphone size={13} /> Active influencers
          </p>
          <p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{activeCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[var(--text-muted)]">Owed this month</p>
          <p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{formatPKR(totalEarningsOwed)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[var(--text-muted)]">Pending applications</p>
          <p className="font-display mt-2 text-2xl font-semibold text-[var(--text)]">{pendingCount}</p>
        </Card>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
              tab === t ? "text-[var(--text)]" : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            }`}
          >
            {t}
            {tab === t && (
              <motion.div
                layoutId="influencer-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5"
                style={{ background: "var(--accent-gradient)" }}
              />
            )}
          </button>
        ))}
      </div>

      {tab === "Program Settings" && (
        <Card>
          <CardHeader
            title="How the program works"
            description="These rules apply platform-wide; individual influencers can still be given a custom cut % on their own profile."
            action={
              <Button variant="primary" onClick={saveSettings} disabled={pending}>
                {pending ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
              </Button>
            }
          />
          <div className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Program enabled</p>
              <p className="text-xs text-[var(--text-faint)]">Turn off to hide the public /influencers apply page.</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className={`h-6 w-11 shrink-0 rounded-full transition-colors ${settings.enabled ? "" : "bg-white/10"}`}
              style={settings.enabled ? { background: "var(--accent-gradient)" } : undefined}
            >
              <span
                className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${settings.enabled ? "translate-x-[22px]" : ""}`}
              />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelClass}>Default cut of platform revenue (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.defaultCutPercent}
                onChange={(e) => setSettings({ ...settings, defaultCutPercent: Number(e.target.value) })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Minimum followers to qualify</span>
              <input
                type="number"
                min={0}
                value={settings.minFollowerCount}
                onChange={(e) => setSettings({ ...settings, minFollowerCount: Number(e.target.value) })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Cut duration, months (0 = lifetime)</span>
              <input
                type="number"
                min={0}
                value={settings.cutDurationMonths}
                onChange={(e) => setSettings({ ...settings, cutDurationMonths: Number(e.target.value) })}
                className={inputClass}
              />
            </label>
          </div>
        </Card>
      )}

      {tab === "Applications" && (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-display text-base font-semibold text-[var(--text)]">{app.name}</h3>
                    <Badge tone="violet">{app.platform}</Badge>
                    <Badge tone="neutral">{app.followerCount.toLocaleString()} followers</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{app.pitch}</p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">
                    {app.socialHandle} · {app.email}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-faint)]">{formatDate(app.submittedAt)}</span>
              </div>

              {app.status === "pending" ? (
                <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={pending && decidingId === app.id}
                    onClick={() => decide(app.id, "approved")}
                  >
                    <Check size={14} /> Approve at {settings.defaultCutPercent}% cut
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending && decidingId === app.id}
                    onClick={() => decide(app.id, "rejected")}
                  >
                    <X size={14} /> Reject
                  </Button>
                </div>
              ) : (
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <Badge tone={app.status === "approved" ? "success" : "danger"}>
                    {app.status === "approved" ? "Approved" : "Rejected"}
                  </Badge>
                </div>
              )}
            </Card>
          ))}
          {applications.length === 0 && (
            <Card className="py-10 text-center text-sm text-[var(--text-faint)]">No applications.</Card>
          )}
        </div>
      )}

      {tab === "Active Influencers" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                  <th className="pb-3 pr-4">Influencer</th>
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Cut %</th>
                  <th className="pb-3 pr-4">Referred businesses</th>
                  <th className="pb-3 pr-4">Platform revenue generated</th>
                  <th className="pb-3 pr-4">Their earnings</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {influencers.map((inf) => (
                  <tr key={inf.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[var(--text)]">{inf.name}</p>
                      <p className="text-xs text-[var(--text-faint)]">{inf.socialHandle}</p>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-[var(--text-muted)]">{inf.referralCode}</td>
                    <td className="py-3 pr-4 text-[var(--text)]">{inf.cutPercent}%</td>
                    <td className="py-3 pr-4 text-[var(--text)]">{inf.referredCount}</td>
                    <td className="py-3 pr-4 text-[var(--text)]">{formatPKR(inf.platformRevenueGenerated)}</td>
                    <td className="py-3 pr-4 font-semibold text-[var(--text)]">{formatPKR(inf.influencerEarnings)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={STATUS_TONE[inf.status]}>{inf.status}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/influencers/${inf.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-violet)] hover:underline"
                      >
                        View <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {influencers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-[var(--text-faint)]">
                      No influencers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
