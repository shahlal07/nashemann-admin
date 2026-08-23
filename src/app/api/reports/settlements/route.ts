import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

type SettlementRow = {
  month: string;
  orders_count: number | null;
  gross_revenue: number | null;
  platform_fee: number | null;
  status: string | null;
  amount_paid: number | null;
  due_date: string | null;
  vendors: { name: string } | { name: string }[] | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: isFinanceStaff } = await supabase.rpc("is_finance_staff");
  if (!isFinanceStaff) return NextResponse.json({ error: "Finance access required." }, { status: 403 });

  const { data, error } = await supabase
    .from("settlements")
    .select("month, orders_count, gross_revenue, platform_fee, status, amount_paid, due_date, vendors(name)")
    .order("month", { ascending: false })
    .returns<SettlementRow[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv(
    ["Vendor", "Month", "Orders", "Gross revenue (PKR)", "Platform fee (PKR)", "Status", "Amount paid (PKR)", "Due date"],
    (data ?? []).map((s) => [
      Array.isArray(s.vendors) ? (s.vendors[0]?.name ?? "") : (s.vendors?.name ?? ""),
      s.month,
      s.orders_count ?? 0,
      s.gross_revenue ?? 0,
      s.platform_fee ?? 0,
      s.status ?? "",
      s.amount_paid ?? 0,
      s.due_date ?? "",
    ])
  );

  return csvResponse(`nashemann-settlements-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
