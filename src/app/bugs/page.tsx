import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BugsClient, type BugReportRow } from "./BugsClient";

export default async function BugsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  // bug_reports is shared with vendor-storefronts/vendor-admins (same
  // Supabase project) -- no source filter here on purpose. This page is
  // the one place ALL bug reports converge for the super admin: nashemann's
  // own (source='nashemann'), storefront customers' (source='storefront',
  // vendor-scoped by RLS to what a non-super-admin vendor caller can see),
  // and vendor-admin staff reporting issues with their own panel
  // (source='vendor_admin').
  const { data: reports } = await supabase
    .from("bug_reports")
    .select(
      "id, title, description, status, admin_note, reward_granted, reporter_name, reporter_email, profile_id, screenshot_path, created_at, reviewed_at, source, vendor_id, vendors(name)"
    )
    .order("created_at", { ascending: false });

  return <BugsClient initialReports={(reports ?? []) as unknown as BugReportRow[]} />;
}
