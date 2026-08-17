import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PricingForm } from "./PricingForm";

export default async function PricingPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isFinanceStaff } = await supabase.rpc("is_finance_staff");
  if (!isFinanceStaff) redirect("/");

  const { data: pricing } = await supabase
    .from("platform_pricing")
    .select("per_order_fee, monthly_fee, custom_domain_fee")
    .eq("id", true)
    .maybeSingle();

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("platform_fee_type, platform_fee_percent, platform_fee_fixed_amount")
    .maybeSingle();

  return (
    <PricingForm
      initialPricing={{
        perOrderFee: Number(pricing?.per_order_fee ?? 15),
        monthlyFee: Number(pricing?.monthly_fee ?? 7000),
        customDomainFee: Number(pricing?.custom_domain_fee ?? 4600),
      }}
      initialFeeMode={{
        feeType: (settings?.platform_fee_type ?? "percent") as "percent" | "fixed",
        feePercent: Number(settings?.platform_fee_percent ?? 2),
        feeFixedAmount: Number(settings?.platform_fee_fixed_amount ?? 0),
      }}
    />
  );
}
