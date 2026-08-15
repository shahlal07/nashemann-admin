import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const [{ count: vendorCount }, { count: applicationCount }, { count: settlementCount }] = await Promise.all([
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase.from("vendor_applications").select("id", { count: "exact", head: true }),
    supabase.from("settlements").select("id", { count: "exact", head: true }),
  ]);

  return (
    <ReportsClient
      vendorCount={vendorCount ?? 0}
      applicationCount={applicationCount ?? 0}
      settlementCount={settlementCount ?? 0}
    />
  );
}
