"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import { sendAnnouncementAction } from "./actions";

export type AnnouncementCategory = "product_update" | "policy_change" | "promotion";

export type SentAnnouncement = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  message: string;
  recipientCount: number;
  sentAt: string;
};

export const ANNOUNCEMENT_CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  product_update: "Product Update",
  policy_change: "Policy Change",
  promotion: "Offer / Promotion",
};

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";
const labelClass = "mb-1.5 block text-xs font-medium text-[var(--text-muted)]";

export function AnnouncementsClient({
  initialSent,
  recipientCount,
}: {
  initialSent: SentAnnouncement[];
  recipientCount: number;
}) {
  const [sent, setSent] = useState<SentAnnouncement[]>(initialSent);
  const [category, setCategory] = useState<AnnouncementCategory>("product_update");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      const record = await sendAnnouncementAction({ category, title, message, recipientCount });
      setSent((prev) => [record, ...prev]);
      setJustSent(recipientCount);
      setTitle("");
      setMessage("");
      setTimeout(() => setJustSent(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't send the announcement.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Send a one-off notification (in-app + email) to every vendor admin who hasn't opted out of that category."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className={labelClass}>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)} className={inputClass}>
                {Object.entries(ANNOUNCEMENT_CATEGORY_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
                placeholder="Rewards program tier update"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={1000}
                rows={5}
                placeholder="We've added a new Flagship tier for vendors doing 2,000+ orders/month…"
                className={inputClass}
              />
            </label>
            <p className="text-xs text-[var(--text-faint)]">Will reach {recipientCount} active vendor admin(s).</p>
            <Button type="submit" variant="primary" disabled={sending}>
              <Radio size={15} /> {sending ? "Sending…" : "Send Announcement"}
            </Button>
            {justSent !== null && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-sm text-[var(--success)]">
                <CheckCircle2 size={14} /> Sent to {justSent} vendor(s)
              </motion.p>
            )}
          </form>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-semibold text-[var(--text)]">Recently sent</p>
          <div className="space-y-3">
            {sent.map((a) => (
              <div key={a.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)]">
                    {ANNOUNCEMENT_CATEGORY_LABEL[a.category]}
                  </span>
                  <span className="text-[0.7rem] text-[var(--text-faint)]">{formatDateTime(a.sentAt)}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--text)]">{a.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{a.message}</p>
                <p className="mt-1.5 text-[0.7rem] text-[var(--text-faint)]">Sent to {a.recipientCount} vendor(s)</p>
              </div>
            ))}
            {sent.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-faint)]">Nothing sent yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
