"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";

export async function reviewVendorPaymentSubmissionAction(
  submissionId: string,
  decision: "confirmed" | "rejected",
  formData: FormData,
) {
  const { supabase } = await requireSuperAdmin();
  const reviewNote = String(formData.get("reviewNote") ?? "").trim().slice(0, 1000);
  if (decision === "rejected" && !reviewNote) {
    throw new Error("Add a reason when rejecting a payment submission.");
  }

  const { error } = await supabase.rpc("review_vendor_payment_submission", {
    p_submission_id: submissionId,
    p_decision: decision,
    p_review_note: reviewNote,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settlements/submissions");
  revalidatePath("/settlements");
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
}
