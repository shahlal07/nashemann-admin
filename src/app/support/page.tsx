import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupportClient, type ConversationRow, type VendorWithAdmins } from "./SupportClient";

export default async function SupportInboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const [{ data: conversations }, { data: vendors }] = await Promise.all([
    supabase
      .from("support_conversations")
      .select("*, support_messages(id, sender_type, body, created_at)")
      .order("created_at", { ascending: false })
      .order("created_at", { foreignTable: "support_messages", ascending: true }),
    supabase
      .from("vendors")
      .select("id, name, subdomain, vendor_admins(name, email)")
      .order("name"),
  ]);

  return (
    <SupportClient
      initialConversations={(conversations ?? []) as ConversationRow[]}
      vendors={(vendors ?? []) as VendorWithAdmins[]}
    />
  );
}
