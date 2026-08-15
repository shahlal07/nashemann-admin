import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CouponsClient, type CouponRow, type VendorLite } from "./CouponsClient";

export default async function CouponsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const [{ data: coupons }, { data: vendors }] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.from("vendors").select("id, name").order("name"),
  ]);

  return (
    <CouponsClient
      initialCoupons={(coupons ?? []) as CouponRow[]}
      vendors={(vendors ?? []) as VendorLite[]}
    />
  );
}
