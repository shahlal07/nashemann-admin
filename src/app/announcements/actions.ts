"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";
import { sendAnnouncementEmail } from "@/lib/email";
import type { AnnouncementCategory, SentAnnouncement } from "./AnnouncementsClient";

const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  product_update: "Product Update",
  policy_change: "Policy Change",
  promotion: "Offer / Promotion",
};

export async function sendAnnouncementAction(input: {
  category: AnnouncementCategory;
  title: string;
  message: string;
  recipientCount: number;
}): Promise<SentAnnouncement> {
  const { supabase, actor } = await requireMutatingStaff();

  // recipientCount from the client is display-only (active vendor count at
  // page load) -- the real recipient list, and the count actually recorded,
  // is the live set of vendor_admins at active vendors, read fresh here.
  const { data: recipients } = await supabase
    .from("vendor_admins")
    .select("email, vendors!inner(status)")
    .eq("vendors.status", "active");

  const recipientEmails = Array.from(new Set((recipients ?? []).map((r) => r.email).filter(Boolean)));

  const { data, error } = await supabase
    .from("sent_announcements")
    .insert({ category: input.category, title: input.title, message: input.message, recipient_count: recipientEmails.length })
    .select("id, category, title, message, recipient_count, sent_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't send the announcement.");

  await Promise.all(
    recipientEmails.map((to) =>
      sendAnnouncementEmail({ to, categoryLabel: CATEGORY_LABEL[input.category], title: input.title, message: input.message })
    )
  );

  await supabase.from("audit_log").insert({
    action: "announcement_sent",
    actor,
    entity: data.title,
    detail: `Sent to ${recipientEmails.length} vendor admin(s) — ${input.category}`,
  });

  revalidatePath("/announcements");
  revalidatePath("/audit-log");

  return {
    id: data.id,
    category: data.category,
    title: data.title,
    message: data.message,
    recipientCount: data.recipient_count,
    sentAt: data.sent_at,
  };
}
