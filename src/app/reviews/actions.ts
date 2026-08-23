"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff, requireStaff } from "@/lib/authz";
import { groqComplete } from "@/lib/groq";

export async function generateReviewReplyDraftAction(input: {
  vendorName: string;
  productName: string;
  rating: number;
  title: string | null;
  body: string;
}) {
  // Read-only (drafting text, not posting it), so any signed-in staff member can use it.
  await requireStaff();

  const draft = await groqComplete([
    {
      role: "system",
      content: `You are writing a short, warm, professional public reply as the platform superadmin to a customer review on vendor ${input.vendorName}. Keep it 2-3 sentences. Don't invent specifics you weren't given. Reply with only the reply text, no quotes, no preamble.`,
    },
    {
      role: "user",
      content: `Product: ${input.productName}\nRating: ${input.rating}/5${input.title ? `\nTitle: ${input.title}` : ""}\nReview: ${input.body}`,
    },
  ]);

  return draft;
}

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
