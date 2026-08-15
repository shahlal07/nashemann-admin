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

  const { data: reports } = await supabase
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false });

  return <BugsClient initialReports={(reports ?? []) as BugReportRow[]} />;
}
