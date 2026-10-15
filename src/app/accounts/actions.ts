"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/authz";

type UpdateCredentialsInput = {
  accountId: string;
  name: string;
  email: string;
  password?: string;
};

export async function updatePlatformAccountCredentialsAction(input: UpdateCredentialsInput): Promise<{ ok: true } | { error: string }> {
  const { supabase, actor } = await requireSuperAdmin();
  const accountId = input.accountId.trim();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password ?? "";

  if (!accountId || !name || name.length < 2) return { error: "Enter a valid account name." };
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: account, error: accountLookupError } = await admin
    .from("platform_accounts")
    .select("id,name,email,provider")
    .eq("id", accountId)
    .maybeSingle();

  if (accountLookupError) return { error: accountLookupError.message };
  if (!account) return { error: "Platform account not found. Refresh and try again." };

  const { data: authResult, error: authLookupError } = await admin.auth.admin.getUserById(accountId);
  if (authLookupError || !authResult.user) {
    return { error: "No matching authentication account was found. Credentials were not changed." };
  }

  const existingEmail = (authResult.user.email ?? "").toLowerCase();
  if (email !== existingEmail) {
    const { data: duplicate, error: duplicateError } = await admin
      .from("platform_accounts")
      .select("id")
      .ilike("email", email)
      .neq("id", accountId)
      .limit(1)
      .maybeSingle();
    if (duplicateError) return { error: duplicateError.message };
    if (duplicate) return { error: "That email is already assigned to another platform account." };
  }

  const authUpdate: { email?: string; email_confirm?: boolean; password?: string; user_metadata?: Record<string, unknown> } = {
    user_metadata: { ...(authResult.user.user_metadata ?? {}), name },
  };
  if (email !== existingEmail) {
    authUpdate.email = email;
    authUpdate.email_confirm = true;
  }
  if (password) authUpdate.password = password;

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(accountId, authUpdate);
  if (authUpdateError) return { error: authUpdateError.message };

  const { error: profileUpdateError } = await admin
    .from("platform_accounts")
    .update({ name, email })
    .eq("id", accountId);
  if (profileUpdateError) {
    console.error("[platform-accounts] auth credentials changed but platform_accounts sync failed:", profileUpdateError.message);
    return { error: "Authentication was updated, but the platform account record did not sync. Please retry or contact engineering." };
  }

  await supabase.from("audit_log").insert({
    action: "platform_account_credentials_updated",
    actor,
    entity: name,
    detail: `Updated platform account credentials for ${email}${password ? " and set a new password" : ""}`,
  });

  revalidatePath("/accounts");
  return { ok: true };
}
