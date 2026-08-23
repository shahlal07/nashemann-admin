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
  customer_id: string;
  vendor_id: string;
  name: string;
  email: string;
  vendorName: string;
  status: "open" | "closed";
  admin_unread: boolean;
  created_at: string;
  support_messages: SupportMessageRow[];
};

// Who a new "Message a vendor" conversation can be addressed to -- one row
// per vendor admin (support_conversations.customer_id references profiles,
// and profiles.vendor_id is how an admin's own profile ties back to their
// store), not the vendor itself.
export type VendorOwner = {
  profileId: string;
  vendorId: string;
  vendorName: string;
  adminName: string;
  adminEmail: string;
};

const inputClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent-violet)] accent-ring";

export function SupportClient({
  initialConversations,
  vendorOwners,
}: {
  initialConversations: ConversationRow[];
  vendorOwners: VendorOwner[];
}) {
  const [conversations, setConversations] = useState<ConversationRow[]>(initialConversations);
  const [composing, setComposing] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleCompose(e: React.FormEvent) {
    e.preventDefault();
    const owner = vendorOwners.find((o) => o.profileId === recipient);
    if (!owner || !body.trim() || sending) return;
    setSending(true);

    const existing = conversations.find((c) => c.customer_id === owner.profileId);

    try {
      const result = await composeSupportMessageAction({
        customerId: owner.profileId,
        vendorId: owner.vendorId,
        vendorName: owner.vendorName,
        recipientName: owner.adminName,
        body,
      });
      if (existing) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? { ...c, status: "open", admin_unread: false, support_messages: [...c.support_messages, result.message as SupportMessageRow] }
              : c
          )
        );
      } else {
        setConversations((prev) => [
          {
            id: result.conversationId,
            customer_id: owner.profileId,
            vendor_id: owner.vendorId,
            name: owner.adminName,
            email: owner.adminEmail,
            vendorName: owner.vendorName,
            status: "open",
            admin_unread: false,
            created_at: new Date().toISOString(),
            support_messages: [result.message as SupportMessageRow],
          },
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
        description="Conversations with vendor admins and customer chat handoffs — reply here."
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
                  {vendorOwners.map((o) => (
                    <option key={o.profileId} value={o.profileId}>
                      {o.vendorName} ({o.adminName})
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
                  {(c.name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--text)]">{c.name}</p>
                    <span className="shrink-0 text-xs text-[var(--text-faint)]">· {c.vendorName}</span>
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
