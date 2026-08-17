"use server";

import { revalidatePath } from "next/cache";
import { requireFinanceStaff } from "@/lib/authz";

function vendorPlatformUrl(path: string): string {
  const configured = process.env.VENDOR_PROVISION_URL;
  if (!configured) throw new Error("Vendor provisioning is not configured. Set VENDOR_PROVISION_URL on nashemann-admin.");
  const url = new URL(configured);
  url.pathname = path;
  url.search = "";
  return url.toString();
}
function vendorPlatformSecret(): string {
  const secret = process.env.VENDOR_PROVISION_SECRET;
  if (!secret) throw new Error("Vendor provisioning is not configured. Set VENDOR_PROVISION_SECRET on nashemann-admin.");
  return secret;
}

export async function savePricingAction(input: {
  perOrderFee: number;
  monthlyFee: number;
  customDomainFee: number;
  feeType: "percent" | "fixed";
  feePercent: number;
  feeFixedAmount: number;
}) {
  const { supabase, user, staffProfile } = await requireFinanceStaff();

  const breakEven = Math.ceil(input.monthlyFee / input.perOrderFee);

  const { error } = await supabase
    .from("platform_pricing")
    .update({
      per_order_fee: input.perOrderFee,
      monthly_fee: input.monthlyFee,
      custom_domain_fee: input.customDomainFee,
      monthly_break_even_orders: breakEven,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);

  // Sync fee mode to the storefront database
  const feePayload: Record<string, unknown> = {
    feeType: input.feeType,
  };
  if (input.feeType === "percent") {
    feePayload.feePercent = input.feePercent;
  } else {
    feePayload.feeFixedAmount = input.feeFixedAmount;
  }
  await fetch(vendorPlatformUrl("/api/platform/fees"), {
    method: "POST",
    headers: { "content-type": "application/json", "x-nashemann-provisioning-secret": vendorPlatformSecret() },
    body: JSON.stringify(feePayload),
    cache: "no-store",
  }).then(async (r) => {
    if (!r.ok) {
      const body = await r.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Couldn't sync fee settings to storefront.");
    }
  });

  await supabase.from("audit_log").insert({
    action: "platform_fee_updated",
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: "Platform Settings",
    detail: `Per-order Rs ${input.perOrderFee}, monthly Rs ${input.monthlyFee}, custom domain Rs ${input.customDomainFee}, checkout fee: ${input.feeType === "percent" ? `${input.feePercent}%` : `Rs ${input.feeFixedAmount}/order`}`,
  });

  revalidatePath("/pricing");
  revalidatePath("/audit-log");
}
