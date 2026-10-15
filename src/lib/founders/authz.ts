import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FounderCapability, FounderMembership } from "./capabilities";

/**
 * Resolve an active founder from the authenticated Supabase user.
 * This deliberately does not call requireStaff() and does not elevate founders
 * to a staff role. Missing schema, failed reads, inactive memberships, and
 * unknown membership records all fail closed.
 */
export async function requireFounder(requiredCapability?: FounderCapability) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data, error } = await supabase
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data || data.status !== "active") {
    redirect("/owners/access");
  }

  const membership = data as FounderMembership;

  if (
    requiredCapability &&
    !membership.capabilities.includes(requiredCapability)
  ) {
    redirect("/owners/forbidden");
  }

  return { supabase, user, membership };
}
