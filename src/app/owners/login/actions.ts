"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Username is an owner-facing alias only. Supabase Auth remains the credential
 * authority; this server action resolves the alias privately, then verifies the
 * supplied password with Supabase Auth. No password is stored in Postgres.
 */
export async function ownerLoginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!/^[a-z][a-z0-9._-]{2,29}$/.test(username) || !password) {
    redirect("/owners/login?error=invalid");
  }

  let authEmail: string | null = null;
  let membershipStatus: string | null = null;

  try {
    const admin = createAdminClient();
    const { data: membership, error: membershipError } = await admin
      .from("owner_memberships")
      .select("user_id, status")
      .eq("username", username)
      .maybeSingle();

    if (membershipError || !membership) redirect("/owners/login?error=invalid");

    membershipStatus = membership.status;
    const { data: authRecord, error: authRecordError } =
      await admin.auth.admin.getUserById(membership.user_id);

    if (authRecordError || !authRecord.user?.email) {
      redirect("/owners/login?error=invalid");
    }
    authEmail = authRecord.user.email;
  } catch (error) {
    // Next.js redirect throws a special control-flow error. Re-throw it rather
    // than converting a redirect into a generic error response.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect("/owners/login?error=unavailable");
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authEmail!,
    password,
  });

  if (signInError) redirect("/owners/login?error=invalid");
  if (membershipStatus !== "active") redirect("/owners/access");
  redirect("/owners");
}
