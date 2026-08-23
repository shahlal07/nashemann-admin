import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { data, error } = await supabase
    .from("vendor_applications")
    .select("reference_id, business_name, business_type, owner_name, owner_email, owner_phone, city, requested_plan, status, submitted_at, reviewed_at")
    .order("submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv(
    ["Reference", "Business name", "Business type", "Owner name", "Owner email", "Owner phone", "City", "Requested plan", "Status", "Submitted at", "Reviewed at"],
    (data ?? []).map((a) => [
      a.reference_id,
      a.business_name,
      a.business_type,
      a.owner_name,
      a.owner_email,
      a.owner_phone,
      a.city,
      a.requested_plan,
      a.status,
      a.submitted_at ?? "",
      a.reviewed_at ?? "",
    ])
  );

  return csvResponse(`nashemann-applications-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
