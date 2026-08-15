import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AuditLogClient, type AuditLogEntry } from "./AuditLogClient";

export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data } = await supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(200);
  const entries: AuditLogEntry[] = data ?? [];

  return (
    <div>
      <PageHeader title="Audit log" description="Every platform-level action, who did it, and when." />
      <AuditLogClient entries={entries} />
    </div>
  );
}
