"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Records an audit entry for security-sensitive self-service account changes
 * (password/email change, 2FA enable/disable). The underlying mutation itself
 * runs client-side via supabase.auth.* / supabase.auth.mfa.* (Supabase Auth
 * has no server-side equivalent reachable from a Next.js server action without
 * re-implementing session handling), so this is called right after those
 * calls succeed, from the same authenticated session.
 */
export async function logAccountSecurityEventAction(action: string, detail: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // best-effort; never block the UI flow that already succeeded

  const { data: staffProfile } = await supabase.from("staff_profiles").select("name").eq("id", user.id).maybeSingle();

  await supabase.from("audit_log").insert({
    action,
    actor: staffProfile?.name ?? user.email ?? "Unknown",
    entity: staffProfile?.name ?? user.email ?? "Unknown",
    detail,
  });
}
