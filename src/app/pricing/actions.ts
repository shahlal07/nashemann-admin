"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceStaff } from "@/lib/authz";

export async function savePricingAction(input: {
  perOrderFee: number;
  monthlyFee: number;
  customDomainFee: number;
  feeType: "percent" | "fixed";
  feePercent: number;
  feeFixedAmount: number;
}) {
  const { supabase, user, staffProfile } = await requireFinanceStaff();
  if (!Number.isFinite(input.perOrderFee) || input.perOrderFee <= 0) throw new Error("Per-order fee must be greater than zero.");
  if (!Number.isFinite(input.monthlyFee) || input.monthlyFee < 0) throw new Error("Monthly fee cannot be negative.");
  if (!Number.isFinite(input.customDomainFee) || input.customDomainFee < 0) throw new Error("Custom domain fee cannot be negative.");
  if (input.feeType === "percent" && (!Number.isFinite(input.feePercent) || input.feePercent < 0 || input.feePercent > 100)) throw new Error("Checkout fee must be between 0 and 100 percent.");
  if (input.feeType === "fixed" && (!Number.isFinite(input.feeFixedAmount) || input.feeFixedAmount < 0)) throw new Error("Fixed checkout fee cannot be negative.");

  const breakEven = Math.ceil(input.monthlyFee / input.perOrderFee);
  const { error: pricingError } = await supabase.from("platform_pricing").update({ per_order_fee: input.perOrderFee, monthly_fee: input.monthlyFee, custom_domain_fee: input.customDomainFee, monthly_break_even_orders: breakEven }).eq("id", true);
  if (pricingError) throw new Error(pricingError.message);

  const { error: settingsError } = await supabase.from("platform_settings").update({ platform_fee_type: input.feeType, platform_fee_percent: input.feeType === "percent" ? input.feePercent : null, platform_fee_fixed_amount: input.feeType === "fixed" ? input.feeFixedAmount : 0, updated_at: new Date().toISOString() }).eq("id", true);
  if (settingsError) throw new Error(settingsError.message);

  await supabase.from("audit_log").insert({ action: "platform_fee_updated", actor: staffProfile?.name ?? user.email ?? "Unknown", entity: "Platform Settings", detail: `Per-order Rs ${input.perOrderFee}, monthly Rs ${input.monthlyFee}, custom domain Rs ${input.customDomainFee}, checkout fee: ${input.feeType === "percent" ? `${input.feePercent}%` : `Rs ${input.feeFixedAmount}/order`}` });
  revalidatePath("/pricing"); revalidatePath("/audit-log");
}
