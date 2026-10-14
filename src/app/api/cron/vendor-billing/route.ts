import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Vendor billing cron is missing Supabase server environment variables.");
    return NextResponse.json({ error: "Billing job is not configured" }, { status: 500 });
  }

  // Re-run the previous month's settlement generation safely every day.
  // The database function is idempotent and only refreshes pending settlements.
  const now = new Date();
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 10);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("process_vendor_billing", {
    p_month: previousMonth,
  });

  if (error) {
    console.error("Vendor billing cron failed:", error.message);
    return NextResponse.json({ error: "Billing job failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...data });
}
