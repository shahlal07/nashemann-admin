"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";

export async function confirmBugReportAction(reportId: string, title: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const patch = {
    status: "confirmed" as const,
    reward_granted: true,
    admin_note: "Confirmed — Rs 500 platform credit applied.",
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
