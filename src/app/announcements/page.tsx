import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementsClient, type SentAnnouncement } from "./AnnouncementsClient";

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const [{ data: sentRows }, { count: activeVendorCount }] = await Promise.all([
    supabase
      .from("sent_announcements")
      .select("id, category, title, message, recipient_count, sent_at")
      .order("sent_at", { ascending: false }),
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const sent: SentAnnouncement[] = (sentRows ?? []).map((a) => ({
    id: a.id,
    category: a.category,
    title: a.title,
    message: a.message,
    recipientCount: a.recipient_count,
    sentAt: a.sent_at,
  }));

  return <AnnouncementsClient initialSent={sent} recipientCount={activeVendorCount ?? 0} />;
}
