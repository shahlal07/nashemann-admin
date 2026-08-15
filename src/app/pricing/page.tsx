import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PricingForm } from "./PricingForm";

export default async function PricingPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: pricing } = await supabase
    .from("platform_pricing")
    .select("per_order_fee, monthly_fee, custom_domain_fee")
    .eq("id", true)
    .maybeSingle();

  return (
    <PricingForm
      initialPricing={{
        perOrderFee: Number(pricing?.per_order_fee ?? 15),
        monthlyFee: Number(pricing?.monthly_fee ?? 7000),
        customDomainFee: Number(pricing?.custom_domain_fee ?? 4600),
      }}
    />
  );
}
