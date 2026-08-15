import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountClient } from "./AccountClient";

export default async function MyAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) redirect("/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AccountClient
      userId={user.id}
      initialName={profile?.name ?? ""}
      initialEmail={profile?.email ?? user.email ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? null}
    />
  );
}
