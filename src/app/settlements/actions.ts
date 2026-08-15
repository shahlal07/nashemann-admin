"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceStaff as requireStaff } from "@/lib/authz";

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
