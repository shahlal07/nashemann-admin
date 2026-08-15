import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "platform_staff";
};

export async function getStaffUser(): Promise<StaffUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff) redirect("/login");

  return staff as StaffUser;
}
