"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { ConversationRow, SupportMessageRow } from "../SupportClient";
import { sendSupportReplyAction, closeSupportConversationAction, generateSupportReplyDraftAction } from "../actions";
import { useToast } from "@/components/ui/Toast";

export function ConversationThreadClient({
  conversationId,
  initialConversation,
}: {
  conversationId: string;
  initialConversation: ConversationRow | null;
}) {
  const supabase = createClient();
  const [conversation, setConversation] = useState<ConversationRow | null>(initialConversation);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel(`support-thread-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const incoming = payload.new as SupportMessageRow;
          setConversation((prev) => {
            if (!prev) return prev;
            if (prev.support_messages.some((m) => m.id === incoming.id)) return prev;
            return { ...prev, support_messages: [...prev.support_messages, incoming] };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  if (!conversation) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[var(--text-faint)]">Conversation not found.</p>
        <Link href="/support" className="mt-3 inline-block text-sm text-[var(--accent-violet)] hover:underline">
          Back to Support
        </Link>
      </div>
    );
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending || !conversation) return;
    setSending(true);
    const body = reply;
    setReply("");
    try {
      const result = await sendSupportReplyAction(conversationId, conversation.name, body);
      if ("error" in result) throw new Error(result.error);
      setConversation((prev) =>
        prev
          ? prev.support_messages.some((m) => m.id === result.id)
            ? prev
            : { ...prev, support_messages: [...prev.support_messages, result as SupportMessageRow] }
          : prev
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't send the reply.", "error");
    } finally {
      setSending(false);
    }
  }

  async function suggestReply() {
    if (!conversation) return;
    setAiBusy(true);
    try {
      const draft = await generateSupportReplyDraftAction({
        recipientName: conversation.name,
        messages: conversation.support_messages.map((m) => ({ senderType: m.sender_type, body: m.body })),
      });
      setReply(draft);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "AI reply drafting is unavailable right now.", "error");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleClose() {
    if (!conversation) return;
    setConversation((prev) => (prev ? { ...prev, status: "closed" } : prev));
    try {
      await closeSupportConversationAction(conversationId, conversation.name);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't close the conversation.", "error");
    }
  }

  return (
    <div>
      <Link href="/support" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        <ArrowLeft size={14} /> All conversations
      </Link>

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-[var(--text)]">{conversation.name}</h1>
          <p className="text-sm text-[var(--text-faint)]">{conversation.email}</p>
        </div>
        {conversation.status === "open" && (
          <Button variant="secondary" size="sm" onClick={handleClose}>
            <CheckCircle2 size={14} /> Mark closed
          </Button>
        )}
      </div>

      <Card className="flex h-[60vh] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {conversation.support_messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    m.sender_type === "admin" ? "text-black" : "bg-[var(--surface-hover)] text-[var(--text)]"
                  }`}
                  style={m.sender_type === "admin" ? { background: "var(--accent-gradient)" } : undefined}
                >
                  {m.body}
                </div>
                <p className={`mt-1 text-[0.65rem] text-[var(--text-faint)] ${m.sender_type === "admin" ? "text-right" : ""}`}>
                  {formatDateTime(m.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleReply} className="flex items-center gap-2 border-t border-[var(--border)] p-4">
          <button
            type="button"
            onClick={suggestReply}
            disabled={aiBusy}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            <Sparkles size={13} /> {aiBusy ? "Drafting…" : "Suggest reply"}
          </button>
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a reply…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-violet)]"
          />
          <button
            type="submit"
            disabled={sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black disabled:opacity-50"
            style={{ background: "var(--accent-gradient)" }}
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </form>
      </Card>
    </div>
  );
}
