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

  const { data: c } = await supabase
    .from("support_conversations")
    .select("*, profiles(name, email), vendors(name), support_messages(id, sender_type, body, created_at)")
    .eq("id", id)
    .order("created_at", { foreignTable: "support_messages", ascending: true })
    .maybeSingle();

  const conversation: ConversationRow | null = c
    ? {
        id: c.id,
        customer_id: c.customer_id,
        vendor_id: c.vendor_id,
        name: c.profiles?.name ?? "Unknown",
        email: c.profiles?.email ?? "",
        vendorName: c.vendors?.name ?? "Unknown store",
        status: c.status,
        admin_unread: c.admin_unread,
        created_at: c.created_at,
        support_messages: c.support_messages ?? [],
      }
    : null;

  if (conversation) {
    await supabase.from("support_conversations").update({ admin_unread: false }).eq("id", id);
  }

  return <ConversationThreadClient conversationId={id} initialConversation={conversation} />;
}
