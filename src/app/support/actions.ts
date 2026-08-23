"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff, requireStaff } from "@/lib/authz";
import { groqComplete, type ChatMessage } from "@/lib/groq";

// support_conversations/support_messages have no direct INSERT/UPDATE RLS
// policies at all -- every write goes through SECURITY DEFINER RPCs
// (send_admin_support_message here; the matching customer-side ones are
// used by vendor-admins). This used to insert raw rows with a "name"/"email"
// column pair that never existed on the live support_conversations schema,
// which would have failed outright once it hit a real (non-superadmin-bypass)
// RLS check -- replaced with the real RPC, which also handles "does this
// customer already have an open conversation with this vendor" itself.
type SupportMessage = { id: string; sender_type: "customer" | "admin"; body: string; created_at: string };
type ActionError = { error: string };

// Next.js redacts thrown Server Action errors to a generic
// "Server Components render" message + digest in production -- returning
// { error } instead of throwing is what lets the real RPC failure reason
// (e.g. "A vendor must be specified" from send_admin_support_message when
// the caller isn't recognized as super-admin) actually reach the UI.
export async function composeSupportMessageAction(input: {
  customerId: string;
  vendorId: string;
  vendorName: string;
  recipientName: string;
  body: string;
}): Promise<{ conversationId: string; message: SupportMessage } | ActionError> {
  const { supabase, actor } = await requireMutatingStaff();

  const { data: conversationId, error } = await supabase.rpc("send_admin_support_message", {
    p_customer_id: input.customerId,
    p_body: input.body,
    p_vendor_id: input.vendorId,
  });
  if (error || !conversationId) return { error: error?.message ?? "Couldn't send the message." };

  const { data: message, error: msgError } = await supabase
    .from("support_messages")
    .select("id, sender_type, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (msgError || !message) return { error: msgError?.message ?? "Message sent, but couldn't load it back." };

  await supabase.from("audit_log").insert({
    action: "support_message_sent",
    actor,
    entity: `${input.recipientName} (${input.vendorName})`,
    detail: input.body.length > 140 ? `${input.body.slice(0, 140)}…` : input.body,
  });

  revalidatePath("/support");
  revalidatePath("/audit-log");

  return { conversationId: conversationId as string, message };
}

export async function sendSupportReplyAction(conversationId: string, entity: string, body: string): Promise<SupportMessage | ActionError> {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.rpc("send_admin_support_message", {
    p_customer_id: null,
    p_body: body,
    p_conversation_id: conversationId,
  });
  if (error) return { error: error.message };

  const { data: message, error: msgError } = await supabase
    .from("support_messages")
    .select("id, sender_type, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (msgError || !message) return { error: msgError?.message ?? "Reply sent, but couldn't load it back." };

  await supabase.from("audit_log").insert({
    action: "support_reply_sent",
    actor,
    entity,
    detail: body.length > 140 ? `${body.slice(0, 140)}…` : body,
  });

  revalidatePath(`/support/${conversationId}`);
  revalidatePath("/support");
  revalidatePath("/audit-log");

  return message;
}

const SUPPORT_REPLY_SYSTEM_PROMPT = `You are drafting a short, helpful, concise reply as the Nashemann platform superadmin, replying to a vendor's support message inside the admin dashboard. Only state facts you are given in the conversation history -- never invent order numbers, amounts, or policies. If you don't have enough information to give a real answer, draft a brief reply asking a clarifying question instead of guessing. Reply with only the message text, no quotes, no preamble.`;

export async function generateSupportReplyDraftAction(input: {
  recipientName: string;
  messages: { senderType: "customer" | "admin"; body: string }[];
}) {
  // Read-only (drafting text, not sending it), so any signed-in staff member can use it.
  await requireStaff();

  const history: ChatMessage[] = input.messages.slice(-12).map((m) => ({
    role: m.senderType === "admin" ? "assistant" : "user",
    content: m.body,
  }));

  const draft = await groqComplete([
    { role: "system", content: SUPPORT_REPLY_SYSTEM_PROMPT },
    { role: "user", content: `Conversation with ${input.recipientName} so far:` },
    ...history,
    { role: "user", content: "Draft the next reply as the superadmin." },
  ]);

  return draft;
}

export async function closeSupportConversationAction(conversationId: string, entity: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("support_conversations").update({ status: "closed" }).eq("id", conversationId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "support_conversation_closed",
    actor,
    entity,
    detail: "Marked closed",
  });

  revalidatePath(`/support/${conversationId}`);
  revalidatePath("/support");
  revalidatePath("/audit-log");
}
