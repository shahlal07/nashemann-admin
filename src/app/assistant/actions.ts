"use server";

import { createClient } from "@/lib/supabase/server";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) throw new Error("Not authorized");
  return supabase;
}

function formatPKRLike(n: number) {
  return "Rs " + Math.round(n).toLocaleString("en-PK");
}

export async function getAssistantReply(question: string): Promise<string> {
  const supabase = await requireStaff();
  const q = question.toLowerCase();

  if (/revenue|earn|fee/.test(q)) {
    const { data: latestMonthRow } = await supabase
      .from("settlements")
      .select("month")
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latestMonthRow) return "There's no settlement data recorded yet, so I can't summarize platform revenue.";
    const { data: monthRows } = await supabase
      .from("settlements")
      .select("platform_fee, vendors(name)")
      .eq("month", latestMonthRow.month);
    const rows = monthRows ?? [];
    const total = rows.reduce((sum, r) => sum + Number(r.platform_fee), 0);
    const top = [...rows]
      .sort((a, b) => Number(b.platform_fee) - Number(a.platform_fee))
      .slice(0, 2)
      .map((r) => (r.vendors as unknown as { name: string } | null)?.name)
      .filter(Boolean);
    return top.length > 0
      ? `Platform fees collected this month: ${formatPKRLike(total)}. ${top.join(" and ")} ${top.length === 1 ? "is" : "are"} your top contributor(s).`
      : `Platform fees collected this month: ${formatPKRLike(total)}.`;
  }

  if (/attention|health|fail/.test(q)) {
    const { data } = await supabase
      .from("tenant_health")
      .select("failure_rate, vendors!inner(name, status)")
      .eq("vendors.status", "active")
      .order("failure_rate", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return "All active vendors look healthy right now.";
    const vendorName = (data.vendors as unknown as { name: string })?.name ?? "A vendor";
    return `${vendorName} has the highest order failure rate right now at ${Number(data.failure_rate)}% — worth checking in on.`;
  }

  if (/break-even|break even|monthly plan/.test(q)) {
    const { data: pricing } = await supabase
      .from("platform_pricing")
      .select("monthly_break_even_orders")
      .maybeSingle();
    const threshold = Math.round((pricing?.monthly_break_even_orders ?? 467) * 0.6);
    const { data: vendors } = await supabase
      .from("vendors")
      .select("name, orders_last_30d")
      .eq("plan", "per_order")
      .gt("orders_last_30d", threshold);
    const close = vendors ?? [];
    return close.length > 0
      ? `${close.map((v) => v.name).join(", ")} ${close.length === 1 ? "is" : "are"} getting close to where the Monthly plan would cost less than Pay Per Order.`
      : "No vendor is close to the Monthly break-even point yet.";
  }

  if (/pending|application/.test(q)) {
    const { count } = await supabase
      .from("vendor_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return `${count ?? 0} vendor application(s) are waiting for review right now.`;
  }

  return "I can only answer questions here, not change anything — try asking about revenue, vendor health, or pending applications.";
}
