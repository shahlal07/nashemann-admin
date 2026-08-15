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
    .select(
      "id, vendor_id, month, orders_count, gross_revenue, platform_fee, status, amount_paid, due_date, waived_reason, reversed_reason, vendors(name), settlement_payments(id, amount, method, reference, notes, paid_at, staff_profiles(name))"
    )
    .order("month", { ascending: false });

  const settlements: SettlementRow[] = (data ?? []).map((s) => ({
    id: s.id,
    vendorId: s.vendor_id,
    vendorName: (s.vendors as unknown as { name: string } | null)?.name ?? "Unknown vendor",
    month: s.month,
    ordersCount: s.orders_count,
    grossRevenue: Number(s.gross_revenue),
    platformFee: Number(s.platform_fee),
    status: s.status,
    amountPaid: Number(s.amount_paid ?? 0),
    dueDate: s.due_date,
    waivedReason: s.waived_reason,
    reversedReason: s.reversed_reason,
    payments: ((s.settlement_payments as unknown as Array<{
      id: string;
      amount: number;
      method: string;
      reference: string;
      notes: string;
      paid_at: string;
      staff_profiles: { name: string } | null;
    }>) ?? [])
      .map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        paidAt: p.paid_at,
        paidByName: p.staff_profiles?.name ?? null,
      }))
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()),
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
