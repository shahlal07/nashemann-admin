"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceStaff as requireStaff } from "@/lib/authz";
import { sendSettlementPaidEmail } from "@/lib/email";

// Settlement rows were never actually generated from real order data -- no
// trigger or app code ever called an RPC to populate them, so every row on
// this page until now was manually seeded. generate_monthly_settlements()
// (SECURITY DEFINER, finance-staff-gated) sums real orders.total /
// orders.platform_fee_amount for the month and upserts -- safe to re-run,
// it never touches a settlement that's left "pending".
export async function generateSettlementsAction(month: string) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("generate_monthly_settlements", { p_month: month });
  if (error) throw new Error(error.message);
  revalidatePath("/settlements");
  revalidatePath("/platform-fees");
  revalidatePath("/");
}

function monthLabel(month: string) {
  return new Date(month).toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

export async function recordPaymentAction(input: {
  settlementId: string;
  vendorName: string;
  month: string;
  amount: number;
  method: "bank_transfer" | "cash" | "cheque" | "other";
  reference: string;
  notes: string;
}) {
  const { supabase, user, staffProfile } = await requireStaff();

  if (!(input.amount > 0)) throw new Error("Amount must be greater than zero");

  const { error } = await supabase.from("settlement_payments").insert({
    settlement_id: input.settlementId,
    amount: input.amount,
    method: input.method,
    reference: input.reference.trim(),
    notes: input.notes.trim(),
    paid_by: staffProfile?.id ?? user.id,
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "settlement_payment_recorded",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: `${input.vendorName} · ${monthLabel(input.month)}`,
    detail: `Recorded ${input.method} payment of Rs ${Math.round(input.amount).toLocaleString("en-PK")}${
      input.reference ? ` (ref: ${input.reference})` : ""
    }`,
  });

  // The RI trigger that syncs settlements.status/amount_paid off
  // settlement_payments already ran as part of the insert above (same
  // statement/transaction) -- re-reading the settlement here sees the
  // post-trigger state, so this only fires once the balance actually hits zero.
  const { data: settlement } = await supabase
    .from("settlements")
    .select("status, vendor_id, gross_revenue, platform_fee, amount_paid")
    .eq("id", input.settlementId)
    .maybeSingle();

  if (settlement?.status === "paid" && settlement.vendor_id) {
    const [{ data: vendor }, { data: owner }] = await Promise.all([
      supabase.from("vendors").select("contact_email").eq("id", settlement.vendor_id).maybeSingle(),
      supabase.from("vendor_admins").select("email").eq("vendor_id", settlement.vendor_id).eq("role", "owner").limit(1).maybeSingle(),
    ]);
    const to = vendor?.contact_email || owner?.email;
    if (to) {
      await sendSettlementPaidEmail({
        to,
        vendorName: input.vendorName,
        monthLabel: monthLabel(input.month),
        amountPaid: settlement.amount_paid,
        grossRevenue: settlement.gross_revenue,
        platformFee: settlement.platform_fee,
      });
    }
  }

  revalidatePath("/settlements");
  revalidatePath("/platform-fees");
  revalidatePath("/audit-log");
  revalidatePath("/");
}

export async function waiveSettlementAction(settlementId: string, vendorName: string, month: string, reason: string) {
  const { supabase, user, staffProfile } = await requireStaff();

  const { error } = await supabase
    .from("settlements")
    .update({ status: "waived", waived_reason: reason.trim() })
    .eq("id", settlementId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "settlement_waived",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: `${vendorName} · ${monthLabel(month)}`,
    detail: reason.trim() || "Waived via Settlements page",
  });

  revalidatePath("/settlements");
  revalidatePath("/platform-fees");
  revalidatePath("/audit-log");
  revalidatePath("/");
}

export async function reverseSettlementAction(settlementId: string, vendorName: string, month: string, reason: string) {
  const { supabase, user, staffProfile } = await requireStaff();

  const { error } = await supabase
    .from("settlements")
    .update({ status: "reversed", reversed_reason: reason.trim() })
    .eq("id", settlementId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "settlement_reversed",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: `${vendorName} · ${monthLabel(month)}`,
    detail: reason.trim() || "Reversed via Settlements page",
  });

  revalidatePath("/settlements");
  revalidatePath("/platform-fees");
  revalidatePath("/audit-log");
  revalidatePath("/");
}
