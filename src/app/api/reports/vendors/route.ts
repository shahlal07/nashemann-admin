import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("vendors")
    .select("name, subdomain, custom_domain, status, plan, category, city, orders_last_30d, revenue_last_30d, joined_at")
    .order("joined_at", { ascending: false });
  if (from) query = query.gte("joined_at", from);
  if (to) query = query.lte("joined_at", `${to}T23:59:59`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv(
    ["Name", "Subdomain", "Custom domain", "Status", "Plan", "Category", "City", "Orders (last 30d)", "Revenue (last 30d, PKR)", "Joined at"],
    (data ?? []).map((v) => [
      v.name,
      v.subdomain,
      v.custom_domain ?? "",
      v.status ?? "",
      v.plan ?? "",
      v.category ?? "",
      v.city ?? "",
      v.orders_last_30d ?? 0,
      v.revenue_last_30d ?? 0,
      v.joined_at ?? "",
    ])
  );

  return csvResponse(`nashemann-vendors-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
