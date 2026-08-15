"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";

export async function postReviewReplyAction(reviewId: string, entity: string, reply: string) {
  const { supabase, actor } = await requireMutatingStaff();
  const now = new Date().toISOString();

  const { error } = await supabase.from("reviews").update({ admin_reply_body: reply, admin_reply_at: now }).eq("id", reviewId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "review_reply_posted",
    actor,
    entity,
    detail: reply.length > 140 ? `${reply.slice(0, 140)}…` : reply,
  });

  revalidatePath("/reviews");
  revalidatePath("/audit-log");
  return now;
}

export async function removeReviewReplyAction(reviewId: string, entity: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("reviews").update({ admin_reply_body: null, admin_reply_at: null }).eq("id", reviewId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "review_reply_removed",
    actor,
    entity,
    detail: "Reply removed",
  });

  revalidatePath("/reviews");
  revalidatePath("/audit-log");
}

export async function deleteReviewAction(reviewId: string, entity: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "review_deleted",
    actor,
    entity,
    detail: "Deleted permanently",
  });

  revalidatePath("/reviews");
  revalidatePath("/audit-log");
}
