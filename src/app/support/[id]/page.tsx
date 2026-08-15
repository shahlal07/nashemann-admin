import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationThreadClient } from "./ConversationThreadClient";
import type { ConversationRow } from "../SupportClient";

export default async function SupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: conversation } = await supabase
    .from("support_conversations")
    .select("*, support_messages(id, sender_type, body, created_at)")
    .eq("id", id)
    .order("created_at", { foreignTable: "support_messages", ascending: true })
    .maybeSingle();

  if (conversation) {
    await supabase.from("support_conversations").update({ admin_unread: false }).eq("id", id);
  }

  return (
    <ConversationThreadClient
      conversationId={id}
      initialConversation={conversation as ConversationRow | null}
    />
  );
}
