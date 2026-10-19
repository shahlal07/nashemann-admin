import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type OwnerMembership = {
  user_id: string;
  username: string;
  display_name: string;
  status: string;
  responsibilities: string[];
  capabilities: string[];
};

export async function requireFounder(capability: string, responsibility: string) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) redirect("/login");

  const { data, error } = await supabase
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (error || !data || data.status !== "active") redirect("/");

  const membership = data as OwnerMembership;
  if (!membership.capabilities?.includes(capability) ||
      !membership.responsibilities?.includes(responsibility)) {
    redirect("/");
  }

  return { supabase, membership };
}
