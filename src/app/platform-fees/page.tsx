import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { PlatformFeesClient, type PlatformFeeRow } from "./PlatformFeesClient";

export default async function PlatformFeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data } = await supabase
    .from("settlements")
    .select("id, vendor_id, month, platform_fee, amount_paid, status, due_date, vendors(name)")
    .order("month", { ascending: false });

  const rows: PlatformFeeRow[] = (data ?? []).map((s) => ({
    id: s.id,
    vendorId: s.vendor_id,
    vendorName: (s.vendors as unknown as { name: string } | null)?.name ?? "Unknown vendor",
    month: s.month,
    platformFee: Number(s.platform_fee),
    amountPaid: Number(s.amount_paid ?? 0),
    status: s.status,
    dueDate: s.due_date,
  }));

  const vendorOptions = Array.from(new Map(rows.map((r) => [r.vendorId, r.vendorName])).entries()).map(
    ([id, name]) => ({ id, name })
  );

  return (
    <div>
      <PageHeader
        title="Platform Fees"
        description="A filterable, exportable ledger of what every vendor owes Nashemann — sourced from monthly settlements."
      />
      <PlatformFeesClient rows={rows} vendorOptions={vendorOptions} />
    </div>
  );
}
