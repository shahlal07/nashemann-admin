"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";
import type { AnnouncementCategory, SentAnnouncement } from "./AnnouncementsClient";

export async function sendAnnouncementAction(input: {
  category: AnnouncementCategory;
  title: string;
  message: string;
  recipientCount: number;
}): Promise<SentAnnouncement> {
  const { supabase, actor } = await requireMutatingStaff();

  const { data, error } = await supabase
    .from("sent_announcements")
    .insert({ category: input.category, title: input.title, message: input.message, recipient_count: input.recipientCount })
    .select("id, category, title, message, recipient_count, sent_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't send the announcement.");

  await supabase.from("audit_log").insert({
    action: "announcement_sent",
    actor,
    entity: data.title,
    detail: `Sent to ${input.recipientCount} vendor admin(s) — ${input.category}`,
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
