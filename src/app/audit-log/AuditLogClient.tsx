"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

export type AuditLogEntry = {
  id: string;
  action: string;
  actor: string;
  entity: string;
  detail: string;
  at: string;
};

const ACTION_DOT: Record<string, string> = {
  vendor_created: "var(--success)",
  vendor_provisioned: "var(--success)",
  vendor_application_approved: "var(--success)",
  vendor_application_rejected: "var(--danger)",
  application_approved: "var(--success)",
  vendor_suspended: "var(--danger)",
  vendor_reactivated: "var(--success)",
  vendor_plan_changed: "var(--accent-amber)",
  vendor_theme_updated: "var(--accent-violet)",
  vendor_white_label_toggled: "var(--accent-violet)",
  vendor_admin_added: "var(--success)",
  vendor_admin_removed: "var(--danger)",
  settlement_marked_settled: "var(--info)",
  settlement_payment_recorded: "var(--success)",
  settlement_waived: "var(--accent-amber)",
  settlement_reversed: "var(--danger)",
  platform_fee_updated: "var(--accent-amber)",
  theme_updated: "var(--accent-violet)",
  coupon_created: "var(--success)",
  coupon_activated: "var(--success)",
  coupon_deactivated: "var(--accent-amber)",
  coupon_deleted: "var(--danger)",
  review_reply_posted: "var(--success)",
  review_reply_removed: "var(--accent-amber)",
  review_deleted: "var(--danger)",
  bug_report_confirmed: "var(--success)",
  bug_report_rejected: "var(--danger)",
  announcement_sent: "var(--info)",
  loyalty_points_adjusted: "var(--accent-amber)",
  loyalty_leaderboard_reset: "var(--danger)",
  support_message_sent: "var(--info)",
  support_reply_sent: "var(--info)",
  support_conversation_closed: "var(--accent-amber)",
  influencer_application_approved: "var(--success)",
  influencer_application_rejected: "var(--danger)",
  influencer_cut_updated: "var(--accent-amber)",
  influencer_suspended: "var(--danger)",
  influencer_reactivated: "var(--success)",
  influencer_program_settings_updated: "var(--accent-violet)",
  website_content_updated: "var(--accent-violet)",
  staff_invited: "var(--success)",
  staff_role_updated: "var(--accent-amber)",
  staff_removed: "var(--danger)",
  staff_password_changed: "var(--accent-amber)",
  staff_2fa_enabled: "var(--success)",
  staff_2fa_disabled: "var(--danger)",
};

export function AuditLogClient({ entries }: { entries: AuditLogEntry[] }) {
  const [query, setQuery] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const actors = useMemo(() => Array.from(new Set(entries.map((e) => e.actor))).sort(), [entries]);
  const actionCategories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.action.split("_")[0]));
    return Array.from(cats).sort();
  }, [entries]);

  const filtered = entries.filter((e) => {
    if (actorFilter !== "all" && e.actor !== actorFilter) return false;
    if (actionFilter !== "all" && !e.action.startsWith(actionFilter)) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!e.entity.toLowerCase().includes(q) && !e.detail.toLowerCase().includes(q) && !e.action.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm sm:max-w-xs">
          <Search size={15} className="text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entity or detail…"
            className="w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--text)]"
        >
          <option value="all">All staff</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm capitalize text-[var(--text)]"
        >
          <option value="all">All categories</option>
          {actionCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--text-faint)]">
          {filtered.length} of {entries.length}
        </span>
      </div>

      <Card>
        <StaggerGroup className="space-y-0">
          {filtered.map((entry, i) => (
            <StaggerItem key={entry.id}>
              <div className={`flex items-start gap-3 py-3.5 ${i !== filtered.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ACTION_DOT[entry.action] ?? "var(--text-faint)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text)]">
                    <span className="font-medium">{entry.actor}</span>{" "}
                    <span className="text-[var(--text-muted)]">{entry.action.replaceAll("_", " ")}</span>{" "}
                    <span className="font-medium">{entry.entity}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-faint)]">{entry.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-faint)]">{formatDateTime(entry.at)}</span>
              </div>
            </StaggerItem>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-faint)]">No activity matches these filters.</p>}
        </StaggerGroup>
      </Card>
    </div>
  );
}
