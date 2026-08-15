import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { SettlementsTable, type SettlementRow } from "./SettlementsTable";

export default async function SettlementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data } = await supabase
    .from("settlements")
    .select("vendor_id, month, orders_count, gross_revenue, platform_fee, status, vendors(name)")
    .order("month", { ascending: false });

  const settlements: SettlementRow[] = (data ?? []).map((s) => ({
    vendorId: s.vendor_id,
    vendorName: (s.vendors as unknown as { name: string } | null)?.name ?? "Unknown vendor",
    month: s.month,
    ordersCount: s.orders_count,
    grossRevenue: Number(s.gross_revenue),
    platformFee: Number(s.platform_fee),
    status: s.status,
  }));

  return (
    <div>
      <PageHeader
        title="Settlements"
        description="Monthly platform-fee reconciliation per vendor, across both pricing plans."
      />
      <SettlementsTable initialSettlements={settlements} />
    </div>
  );
}
