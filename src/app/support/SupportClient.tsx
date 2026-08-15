"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import { composeSupportMessageAction } from "./actions";

export type SupportMessageRow = {
  id: string;
  sender_type: "customer" | "admin";
  body: string;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  account_id: string | null;
  name: string;
  email: string;
  status: "open" | "closed";
  admin_unread: boolean;
  created_at: string;
  support_messages: SupportMessageRow[];
};

export type VendorWithAdmins = {
  id: string;
  name: string;
  subdomain: string;
  vendor_admins: { name: string; email: string }[];
};

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";

export function SupportClient({
  initialConversations,
  vendors,
}: {
  initialConversations: ConversationRow[];
  vendors: VendorWithAdmins[];
}) {
  const [conversations, setConversations] = useState<ConversationRow[]>(initialConversations);
  const [composing, setComposing] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleCompose(e: React.FormEvent) {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === recipient);
    if (!vendor || !body.trim() || sending) return;
    setSending(true);

    const owner = vendor.vendor_admins[0];
    const name = owner?.name ?? vendor.name;
    const email = owner?.email ?? `${vendor.subdomain}@nashemann.com`;
    const existing = conversations.find((c) => c.email.toLowerCase() === email.toLowerCase());

    try {
      const result = await composeSupportMessageAction({ vendorName: vendor.name, recipientName: name, recipientEmail: email, body });
      if (existing) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? { ...c, status: "open", admin_unread: true, support_messages: [...c.support_messages, result.message as SupportMessageRow] }
              : c
          )
        );
      } else {
        setConversations((prev) => [
          { ...(result.conversation as ConversationRow), support_messages: [result.message as SupportMessageRow] },
          ...prev,
        ]);
      }
      setBody("");
      setComposing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't send the message.");
    } finally {
      setSending(false);
    }
  }

  const lastPreview = (c: ConversationRow) => {
    const last = c.support_messages[c.support_messages.length - 1];
    if (!last) return "—";
    return (last.sender_type === "admin" ? "You: " : "") + last.body;
  };
  const lastAt = (c: ConversationRow) => c.support_messages[c.support_messages.length - 1]?.created_at ?? c.created_at;

  return (
    <div>
      <PageHeader
        title="Support"
        description="Conversations handed off from AI chat to a human — reply here."
        action={
          <Button variant="primary" onClick={() => setComposing((v) => !v)}>
            <Plus size={16} /> Message a vendor
          </Button>
        }
      />

      {composing && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <Card>
            <form onSubmit={handleCompose} className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Vendor</span>
                <select value={recipient} onChange={(e) => setRecipient(e.target.value)} required className={inputClass}>
                  <option value="" disabled>
                    Choose a vendor
                  </option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Message</span>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={3} className={inputClass} />
              </label>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={sending}>
                  {sending ? "Sending…" : "Send"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setComposing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <Card>
        <div className="divide-y divide-[var(--border)]">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/support/${c.id}`}
              className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0 hover:bg-[var(--surface-hover)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text)]">
                  {c.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{c.name}</p>
                    {c.admin_unread && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent-amber)" }} />}
                    {c.status === "closed" && <Badge tone="neutral">Closed</Badge>}
                  </div>
                  <p className="truncate text-xs text-[var(--text-faint)]">{lastPreview(c)}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-[var(--text-faint)]">{formatDateTime(lastAt(c))}</span>
            </Link>
          ))}
          {conversations.length === 0 && (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-faint)]">
              <Users size={15} /> No conversations yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
