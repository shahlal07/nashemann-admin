import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SupportClient, type ConversationRow, type VendorOwner } from "./SupportClient";

export default async function SupportInboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  // support_conversations has no name/email columns of its own -- customer_id
  // points at profiles, so the person's display name/email has to come from
  // that join. This page used to select fictional "name"/"email" columns
  // directly off support_conversations (they never existed on the live
  // schema) and always rendered undefined -- harmless while the table had
  // zero rows, but it crashes the moment a real conversation exists.
  const [{ data: rawConversations }, { data: vendors }, { data: vendorOwners }] = await Promise.all([
    supabase
      .from("support_conversations")
      .select("*, profiles(name, email), vendors(name), support_messages(id, sender_type, body, created_at)")
      .order("created_at", { ascending: false })
      .order("created_at", { foreignTable: "support_messages", ascending: true }),
    supabase.from("vendors").select("id, name, subdomain").order("name"),
    supabase.from("profiles").select("id, vendor_id, name, email").eq("role", "admin"),
  ]);

  const conversations: ConversationRow[] = (rawConversations ?? []).map((c) => ({
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
  }));

  const vendorNameById = new Map((vendors ?? []).map((v) => [v.id, v.name]));
  const owners: VendorOwner[] = (vendorOwners ?? [])
    .filter((p) => p.vendor_id)
    .map((p) => ({
      profileId: p.id,
      vendorId: p.vendor_id as string,
      vendorName: vendorNameById.get(p.vendor_id as string) ?? "Unknown store",
      adminName: p.name,
      adminEmail: p.email,
    }));

  return <SupportClient initialConversations={conversations} vendorOwners={owners} />;
}
