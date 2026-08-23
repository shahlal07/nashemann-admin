import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function PlatformSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("platform_name, support_email, tagline, application_sla_hours, default_applicant_plan, applications_paused")
    .maybeSingle();

  return (
    <SettingsForm
      initialSettings={{
        platformName: settings?.platform_name ?? "Nashemann",
        supportEmail: settings?.support_email ?? "hello@nashemann.store",
        tagline: settings?.tagline ?? "The infrastructure behind independent online stores.",
        applicationSlaHours: Number(settings?.application_sla_hours ?? 24),
        defaultApplicantPlan: (settings?.default_applicant_plan ?? "per_order") as "per_order" | "monthly",
        applicationsPaused: Boolean(settings?.applications_paused ?? false),
      }}
    />
  );
}
