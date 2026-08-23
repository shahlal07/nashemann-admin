"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff, requireStaff } from "@/lib/authz";
import { groqComplete, type ChatMessage } from "@/lib/groq";

export async function composeSupportMessageAction(input: { vendorName: string; recipientName: string; recipientEmail: string; body: string }) {
  const { supabase, actor } = await requireMutatingStaff();

  const existing = await supabase
    .from("support_conversations")
    .select("id")
    .ilike("email", input.recipientEmail)
    .maybeSingle();

  let conversationId: string;
  let conversation: unknown = null;

  if (existing.data) {
    conversationId = existing.data.id;
    const { error } = await supabase.from("support_conversations").update({ status: "open", admin_unread: true }).eq("id", conversationId);
    if (error) throw new Error(error.message);
  } else {
    const { data: convo, error: convoError } = await supabase
      .from("support_conversations")
      .insert({ name: input.recipientName, email: input.recipientEmail, status: "open", admin_unread: true })
      .select()
      .single();
    if (convoError || !convo) throw new Error(convoError?.message ?? "Couldn't start the conversation.");
    conversationId = convo.id;
    conversation = convo;
  }

  const { data: message, error: msgError } = await supabase
    .from("support_messages")
    .insert({ conversation_id: conversationId, sender_type: "customer", body: input.body })
    .select()
    .single();
  if (msgError || !message) throw new Error(msgError?.message ?? "Couldn't send the message.");

  await supabase.from("audit_log").insert({
    action: "support_message_sent",
    actor,
    entity: `${input.recipientName} (${input.vendorName})`,
    detail: input.body.length > 140 ? `${input.body.slice(0, 140)}…` : input.body,
  });

  revalidatePath("/support");
  revalidatePath("/audit-log");

  return { conversationId, conversation, message };
}

export async function sendSupportReplyAction(conversationId: string, entity: string, body: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { data: message, error } = await supabase
    .from("support_messages")
    .insert({ conversation_id: conversationId, sender_type: "admin", body })
    .select()
    .single();
  if (error || !message) throw new Error(error?.message ?? "Couldn't send the reply.");

  await supabase.from("support_conversations").update({ admin_unread: false }).eq("id", conversationId);

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
