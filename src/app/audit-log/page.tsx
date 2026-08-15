import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

const ACTION_DOT: Record<string, string> = {
  vendor_provisioned: "var(--success)",
  application_approved: "var(--success)",
  vendor_suspended: "var(--danger)",
  settlement_marked_settled: "var(--info)",
  platform_fee_updated: "var(--accent-amber)",
  theme_updated: "var(--accent-violet)",
  influencer_application_approved: "var(--success)",
  influencer_application_rejected: "var(--danger)",
  influencer_cut_updated: "var(--accent-amber)",
  influencer_suspended: "var(--danger)",
  influencer_reactivated: "var(--success)",
  influencer_program_settings_updated: "var(--accent-violet)",
  website_content_updated: "var(--accent-violet)",
  staff_invited: "var(--success)",
  staff_role_updated: "var(--accent-amber)",
  staff_removed: "var(--danger)",
};

export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data } = await supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(200);
  const entries = data ?? [];

  return (
    <div>
      <PageHeader title="Audit log" description="Every platform-level action, who did it, and when." />

      <Card>
        <StaggerGroup className="space-y-0">
          {entries.map((entry, i) => (
            <StaggerItem key={entry.id}>
              <div className={`flex items-start gap-3 py-3.5 ${i !== entries.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ACTION_DOT[entry.action] ?? "var(--text-faint)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text)]">
                    <span className="font-medium">{entry.actor}</span>{" "}
                    <span className="text-[var(--text-muted)]">{entry.action.replaceAll("_", " ")}</span>{" "}
                    <span className="font-medium">{entry.entity}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-faint)]">{entry.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-faint)]">{formatDateTime(entry.at)}</span>
              </div>
            </StaggerItem>
          ))}
          {entries.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-faint)]">No activity yet.</p>}
        </StaggerGroup>
      </Card>
    </div>
  );
}
