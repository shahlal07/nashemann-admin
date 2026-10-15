import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OwnerMembership = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  status: string;
  responsibilities: string[];
  capabilities: string[];
};

/**
 * Founder access is deliberately separate from staff authorization.
 * Membership is resolved from the authenticated Supabase user on the server;
 * client-supplied roles/capabilities are never trusted.
 */
export async function requireOwner(capability?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/owner-login");

  const { data: membership, error } = await supabase
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities")
    .eq("user_id", user.id)
    .maybeSingle<OwnerMembership>();

  if (error || !membership || membership.status !== "active") {
    redirect("/owner-login?error=not-authorized");
  }

  if (capability && !membership.capabilities.includes(capability)) {
    redirect("/owners?error=insufficient-permission");
  }

  return { supabase, user, membership };
}
