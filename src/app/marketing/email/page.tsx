import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmailCenterClient } from "./EmailCenterClient";

export const dynamic = "force-dynamic";

export default async function EmailControlCenterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase.from("staff_profiles").select("role").eq("id", user.id).maybeSingle();
  if (staff?.role !== "super_admin") redirect("/");

  return <EmailCenterClient />;
}
