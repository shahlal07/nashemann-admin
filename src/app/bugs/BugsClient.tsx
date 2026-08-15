"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Check, X, Gift, ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { confirmBugReportAction, rejectBugReportAction } from "./actions";
import { formatDateTime } from "@/lib/utils";

export type BugReportStatus = "pending" | "confirmed" | "rejected";

export type BugReportRow = {
  id: string;
  title: string;
  description: string;
  status: BugReportStatus;
  admin_note: string | null;
  reward_granted: boolean;
  reporter_name: string;
  reporter_email: string;
  screenshot_url: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const TABS = ["all", "pending", "confirmed", "rejected"] as const;
const STATUS_TONE: Record<BugReportStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  rejected: "danger",
};

export function BugsClient({ initialReports }: { initialReports: BugReportRow[] }) {
  const [reports, setReports] = useState<BugReportRow[]>(initialReports);
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    confirmed: reports.filter((r) => r.status === "confirmed").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  };
  const filtered = tab === "all" ? reports : reports.filter((r) => r.status === tab);

  async function confirmReport(id: string) {
    const target = reports.find((r) => r.id === id);
    const patch = {
      status: "confirmed" as const,
      reward_granted: true,
      admin_note: "Confirmed — Rs 500 platform credit applied.",
      reviewed_at: new Date().toISOString(),
    };
    const prev = reports;
    setReports((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      await confirmBugReportAction(id, target?.title ?? "Bug report");
    } catch (err) {
      setReports(prev);
      alert(err instanceof Error ? err.message : "Couldn't confirm the report.");
    }
  }

  async function reject(id: string) {
    if (!note.trim()) return;
    const target = reports.find((r) => r.id === id);
    const patch = { status: "rejected" as const, admin_note: note, reviewed_at: new Date().toISOString() };
    const prev = reports;
    setReports((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setRejectingId(null);
    setNote("");
    try {
      await rejectBugReportAction(id, target?.title ?? "Bug report", patch.admin_note);
    } catch (err) {
      setReports(prev);
      alert(err instanceof Error ? err.message : "Couldn't reject the report.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Bug reports"
        description="Confirming a real bug grants the reporter platform credit. Rejecting requires a short note the reporter can see."
      />

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "text-black" : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
            style={tab === t ? { background: "var(--accent-gradient)" } : undefined}
          >
            {t} ({counts[t]})
          </button>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <div key={r.id} className="py-3.5 first:pt-0 last:pb-0">
                <button
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{r.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                      {r.reporter_name} · {r.reporter_email} · {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={STATUS_TONE[r.status]}>
                      {r.status === "confirmed" ? (
                        <>
                          Confirmed <Gift size={11} /> +Rs 500
                        </>
                      ) : (
                        r.status
                      )}
                    </Badge>
                    <ChevronDown size={16} className={`text-[var(--text-faint)] transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 overflow-hidden pl-1">
                    <p className="text-sm text-[var(--text-muted)]">{r.description}</p>

                    {r.screenshot_url && (
                      <div className="mt-3">
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                          <ImageIcon size={12} /> Attached screenshot
                        </p>
                        <a href={r.screenshot_url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- reporter-uploaded, arbitrary remote URL */}
                          <img
                            src={r.screenshot_url}
                            alt="Reported bug screenshot"
                            className="max-h-64 rounded-[var(--radius-md)] border border-[var(--border)] object-contain"
                          />
                        </a>
                      </div>
                    )}

                    {r.status === "pending" && rejectingId !== r.id && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="primary" onClick={() => confirmReport(r.id)}>
                          <Check size={13} /> Confirm — grant Rs 500
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setRejectingId(r.id)}>
                          <X size={13} /> Reject
                        </Button>
                      </div>
                    )}

                    {rejectingId === r.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                          placeholder="Why isn't this a bug? (the reporter sees this)"
                          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="danger" disabled={!note.trim()} onClick={() => reject(r.id)}>
                            Confirm reject
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setRejectingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {r.status !== "pending" && r.admin_note && (
                      <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--surface)] p-3">
                        <p className="text-xs font-semibold text-[var(--text-muted)]">Your note ({formatDateTime(r.reviewed_at)})</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{r.admin_note}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-faint)]">Nothing here.</p>}
        </div>
      </Card>
    </div>
  );
}
