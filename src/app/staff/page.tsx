import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaffClient, type StaffRow } from "./StaffClient";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: currentStaff } = await supabase
    .from("staff_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data } = await supabase.from("staff_profiles").select("*").order("added_at", { ascending: true });

  const staff: StaffRow[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    addedAt: s.added_at,
    lastActiveAt: s.last_active_at,
  }));

  return <StaffClient staff={staff} isSuperAdmin={currentStaff?.role === "super_admin"} />;
}
