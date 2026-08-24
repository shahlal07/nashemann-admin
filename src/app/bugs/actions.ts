"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";

// bug-report-screenshots is a private bucket -- staff need a signed URL,
// not a raw path, to actually view an attached screenshot.
export async function getBugScreenshotUrl(path: string): Promise<string | null> {
  const { supabase } = await requireMutatingStaff();
  const { data, error } = await supabase.storage.from("bug-report-screenshots").createSignedUrl(path, 600);
  if (error) return null;
  return data.signedUrl;
}

// Rs 500 platform credit only applies to nashemann.store's own reporters
// (the ones with a platform_accounts credit balance to grant into) --
// storefront customers and vendor-admin staff have no such balance in this
// app, so those get a plain confirmation instead of a reward claim that
// nothing actually pays out.
export async function confirmBugReportAction(reportId: string, title: string, rewardEligible: boolean) {
  const { supabase, actor } = await requireMutatingStaff();

  const patch = {
    status: "confirmed" as const,
    reward_granted: rewardEligible,
    admin_note: rewardEligible ? "Confirmed — Rs 500 platform credit applied." : "Confirmed.",
    reviewed_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("bug_reports").update(patch).eq("id", reportId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "bug_report_confirmed",
    actor,
    entity: title,
    detail: "Confirmed, Rs 500 platform credit granted",
  });

  revalidatePath("/bugs");
  revalidatePath("/audit-log");
}

export async function rejectBugReportAction(reportId: string, title: string, note: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const patch = { status: "rejected" as const, admin_note: note, reviewed_at: new Date().toISOString() };
  const { error } = await supabase.from("bug_reports").update(patch).eq("id", reportId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "bug_report_rejected",
    actor,
    entity: title,
    detail: note,
  });

  revalidatePath("/bugs");
  revalidatePath("/audit-log");
}
