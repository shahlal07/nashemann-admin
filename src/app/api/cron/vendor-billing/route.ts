import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendBillingJobFailureEmail, sendSettlementReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ReminderStage = "before_due_7" | "due_today" | "overdue_3" | "overdue_7" | "suspended_10";

function getReminderStage(daysUntilDue: number, billingSuspended: boolean): ReminderStage | null {
  if (billingSuspended) return "suspended_10";
  if (daysUntilDue > 0 && daysUntilDue <= 7) return "before_due_7";
  if (daysUntilDue === 0) return "due_today";
  if (daysUntilDue <= -10) return null;
  if (daysUntilDue <= -7) return "overdue_7";
  if (daysUntilDue <= -3) return "overdue_3";
  return null;
}

function monthLabel(month: string) {
  return new Date(`${month}T00:00:00.000Z`).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Vendor billing cron is missing Supabase server environment variables.");
    return NextResponse.json({ error: "Billing job is not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: run, error: runInsertError } = await supabase
    .from("billing_job_runs")
    .insert({ job_name: "vendor-billing-daily", status: "running" })
    .select("id")
    .single();
  if (runInsertError || !run) {
    console.error("Unable to record billing job start:", runInsertError?.message);
    return NextResponse.json({ error: "Unable to record billing job run" }, { status: 500 });
  }

  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      .toISOString()
      .slice(0, 10);

    const { data: billingResult, error: billingError } = await supabase.rpc("process_vendor_billing", {
      p_month: previousMonth,
    });
    if (billingError) throw new Error(billingError.message);

    const { data: settlements, error: settlementError } = await supabase
      .from("settlements")
      .select("id, vendor_id, month, due_date, platform_fee, adjustment_total, amount_paid, status")
      .in("status", ["pending", "partially_paid"]);
    if (settlementError) throw new Error(settlementError.message);

    const outstanding = (settlements ?? []).filter((s) =>
      s.due_date && Number(s.platform_fee) + Number(s.adjustment_total ?? 0) > Number(s.amount_paid ?? 0)
    );
    const vendorIds = [...new Set(outstanding.map((s) => s.vendor_id))];
    const [{ data: vendors, error: vendorsError }, { data: owners, error: ownersError }] = vendorIds.length
      ? await Promise.all([
          supabase.from("vendors").select("id, name, contact_email, status, billing_suspended_at, billing_suspension_settlement_id").in("id", vendorIds),
          supabase.from("vendor_admins").select("vendor_id, email, role").in("vendor_id", vendorIds).eq("role", "owner"),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (vendorsError) throw new Error(vendorsError.message);
    if (ownersError) throw new Error(ownersError.message);

    const vendorById = new Map((vendors ?? []).map((v) => [v.id, v]));
    const ownerEmailByVendor = new Map<string, string>();
    for (const owner of owners ?? []) {
      if (owner.email && !ownerEmailByVendor.has(owner.vendor_id)) ownerEmailByVendor.set(owner.vendor_id, owner.email);
    }

    let remindersSent = 0;
    let remindersFailed = 0;
    let remindersSkipped = 0;

    for (const settlement of outstanding) {
      const due = new Date(`${settlement.due_date}T00:00:00.000Z`);
      const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86400000);
      const vendor = vendorById.get(settlement.vendor_id) ?? null;
      const stage = getReminderStage(daysUntilDue, Boolean(vendor?.billing_suspended_at && vendor?.billing_suspension_settlement_id === settlement.id));
      if (!stage) continue;

      const { data: existing, error: existingError } = await supabase
        .from("billing_reminder_log")
        .select("id, status, attempts")
        .eq("settlement_id", settlement.id)
        .eq("reminder_stage", stage)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing?.status === "sent") {
        remindersSkipped++;
        continue;
      }

      const to = vendor?.contact_email || ownerEmailByVendor.get(settlement.vendor_id);
      const nextAttempt = Number(existing?.attempts ?? 0) + 1;
      let logId = existing?.id;

      if (existing) {
        await supabase.from("billing_reminder_log").update({
          status: "pending",
          attempts: nextAttempt,
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        const { data: inserted, error: logError } = await supabase
          .from("billing_reminder_log")
          .insert({
            settlement_id: settlement.id,
            reminder_stage: stage,
            status: "pending",
            attempts: 1,
          })
          .select("id")
          .single();
        if (logError || !inserted) {
          if (logError?.code === "23505") {
            remindersSkipped++;
            continue;
          }
          throw new Error(logError?.message ?? "Unable to create reminder log");
        }
        logId = inserted.id;
      }

      if (!to || !logId) {
        await supabase.from("billing_reminder_log").update({
          status: "failed",
          last_error: "No vendor contact email or owner email is configured",
          updated_at: new Date().toISOString(),
        }).eq("id", logId);
        remindersFailed++;
        continue;
      }

      const delivered = await sendSettlementReminderEmail({
        to,
        vendorName: vendor?.name ?? "Vendor",
        monthLabel: monthLabel(settlement.month),
        platformFee: Number(settlement.platform_fee) + Number(settlement.adjustment_total ?? 0),
        amountPaid: Number(settlement.amount_paid ?? 0),
        dueDate: settlement.due_date,
        stage,
      });
      await supabase.from("billing_reminder_log").update({
        status: delivered ? "sent" : "failed",
        last_error: delivered ? null : "Email provider did not confirm delivery",
        sent_at: delivered ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", logId);

      if (delivered) remindersSent++;
      else remindersFailed++;
    }

    const result = {
      ...(billingResult ?? {}),
      reminders_sent: remindersSent,
      reminders_failed: remindersFailed,
      reminders_skipped_already_sent: remindersSkipped,
      reminder_stages: ["7 days before due", "due date", "3 days overdue", "7 days overdue", "10 days overdue"],
    };
    await supabase.from("billing_job_runs").update({
      status: "succeeded",
      completed_at: new Date().toISOString(),
      result,
    }).eq("id", run.id);

    return NextResponse.json({ ok: true, run_id: run.id, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown billing job failure";
    console.error("Vendor billing cron failed:", message);
    await supabase.from("billing_job_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: message.slice(0, 1000),
    }).eq("id", run.id);
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("support_email")
      .eq("id", true)
      .maybeSingle();
    if (settings?.support_email) {
      await sendBillingJobFailureEmail({
        to: settings.support_email,
        runId: run.id,
        errorMessage: message,
      });
    }
    return NextResponse.json({ error: "Billing job failed", run_id: run.id }, { status: 500 });
  }
}
