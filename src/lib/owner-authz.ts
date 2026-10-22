import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
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
type OwnerLookup =
  | {
      status: "authenticated";
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: User;
      membership: OwnerMembership;
    }
  | { status: "unauthenticated" }
  | { status: "not-a-member" }
  | { status: "missing-capability" };

async function resolveOwner(capability?: string): Promise<OwnerLookup> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "unauthenticated" };

  const { data: rawMembership } = await supabase
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities")
    .eq("user_id", user.id)
    .maybeSingle();
  const membership = rawMembership as OwnerMembership | null;

  if (!membership || membership.status !== "active") return { status: "not-a-member" };
  if (capability && !membership.capabilities.includes(capability)) {
    return { status: "missing-capability" };
  }

  return { status: "authenticated", supabase, user, membership };
}

/** Non-redirecting variant for API routes: `null` whenever access is denied. */
export async function getOwner(capability?: string) {
  const result = await resolveOwner(capability);
  if (result.status !== "authenticated") return null;
  return { supabase: result.supabase, user: result.user, membership: result.membership };
}

/**
 * Page-level guard. Anonymous and non-entrant visitors are redirected rather
 * than shown a 403, because the owner area is a private surface.
 */
export async function requireOwner(capability?: string) {
  const result = await resolveOwner(capability);

  if (result.status === "unauthenticated") redirect("/owner-login");
  if (result.status === "not-a-member") redirect("/owner-login?error=not-authorized");
  if (result.status === "missing-capability") {
    redirect("/owners?error=insufficient-permission");
  }

  return { supabase: result.supabase, user: result.user, membership: result.membership };
}
