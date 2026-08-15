"use server";

import { revalidatePath } from "next/cache";
import { requireMutatingStaff } from "@/lib/authz";
import type { CouponRow, DiscountType, CouponScope } from "./CouponsClient";

function discountLabel(discountType: DiscountType, discountValue: number) {
  if (discountType === "percent") return `${discountValue}% off`;
  if (discountType === "fixed") return `Rs ${discountValue} off`;
  return "Free shipping";
}

export async function createCouponAction(input: {
  code: string;
  scope: CouponScope;
  vendorId: string | null;
  vendorName: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
}): Promise<CouponRow> {
  const { supabase, actor } = await requireMutatingStaff();

  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: input.code.toUpperCase().trim(),
      scope: input.scope,
      vendor_id: input.scope === "universal" ? null : input.vendorId,
      discount_type: input.discountType,
      discount_value: input.discountType === "free_shipping" ? 0 : input.discountValue,
      min_order_amount: input.minOrderAmount,
      max_uses: input.maxUses,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't create the coupon.");

  await supabase.from("audit_log").insert({
    action: "coupon_created",
    actor,
    entity: data.code,
    detail: `${input.scope === "universal" ? "Universal" : `Vendor: ${input.vendorName ?? "Unknown"}`} · ${discountLabel(
      input.discountType,
      input.discountValue
    )}`,
  });

  revalidatePath("/coupons");
  revalidatePath("/audit-log");
  return data as CouponRow;
}

export async function toggleCouponActiveAction(couponId: string, code: string, nextActive: boolean) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("coupons").update({ active: nextActive }).eq("id", couponId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: nextActive ? "coupon_activated" : "coupon_deactivated",
    actor,
    entity: code,
    detail: nextActive ? "Reactivated" : "Deactivated",
  });

  revalidatePath("/coupons");
  revalidatePath("/audit-log");
}

export async function deleteCouponAction(couponId: string, code: string) {
  const { supabase, actor } = await requireMutatingStaff();

  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) throw new Error(error.message);

  await supabase.from("audit_log").insert({
    action: "coupon_deleted",
    actor,
    entity: code,
    detail: "Deleted permanently",
  });

  revalidatePath("/coupons");
  revalidatePath("/audit-log");
}
