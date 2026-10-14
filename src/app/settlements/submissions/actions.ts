"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";
import { sendVendorPaymentReviewEmail } from "@/lib/email";

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

  try {
    const { data: submission } = await supabase
      .from("vendor_payment_submissions")
      .select("vendor_id, amount, reference, vendors(name, contact_email), settlements(month, platform_fee, adjustment_total, amount_paid)")
      .eq("id", submissionId)
      .single();
    if (submission) {
      const vendor = submission.vendors as unknown as { name: string; contact_email: string | null } | null;
      const settlement = submission.settlements as unknown as { month: string; platform_fee: number; adjustment_total: number; amount_paid: number } | null;
      const { data: owner } = await supabase
        .from("vendor_admins")
        .select("email")
        .eq("vendor_id", submission.vendor_id)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();
      const to = vendor?.contact_email || owner?.email;
      if (to && settlement) {
        await sendVendorPaymentReviewEmail({
          to,
          vendorName: vendor?.name ?? "Vendor",
          monthLabel: new Date(`${settlement.month}T00:00:00.000Z`).toLocaleDateString("en-PK", { month: "long", year: "numeric", timeZone: "UTC" }),
          amount: Number(submission.amount),
          balanceDue: Math.max(0, Number(settlement.platform_fee) + Number(settlement.adjustment_total ?? 0) - Number(settlement.amount_paid ?? 0)),
          reference: submission.reference,
          decision,
          reviewNote,
        });
      }
    }
  } catch (notifyError) {
    console.error("Payment submission notification failed:", notifyError);
  }

  revalidatePath("/settlements/submissions");
  revalidatePath("/settlements");
  revalidatePath("/vendors");
  revalidatePath("/audit-log");
}
