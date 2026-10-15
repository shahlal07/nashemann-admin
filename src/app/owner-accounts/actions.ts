"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";
import { FOUNDER_CAPABILITIES, FOUNDER_RESPONSIBILITIES, type FounderCapability, type FounderResponsibility } from "@/lib/founders/capabilities";
import { createAdminClient } from "@/lib/supabase/admin";

const USERNAME_RE = /^[a-z][a-z0-9._-]{2,29}$/;
const PASSWORD_MIN_LENGTH = 12;

type OwnerInput = {
  username: string;
  displayName: string;
  email: string;
  password?: string;
  status: "active" | "pending" | "suspended";
  responsibilities: FounderResponsibility[];
  capabilities: FounderCapability[];
};

function normalizeOwnerInput(input: OwnerInput): OwnerInput {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const email = input.email.trim().toLowerCase();
  const responsibilities = [...new Set(input.responsibilities)];
  const capabilities = [...new Set(input.capabilities)];

  if (!USERNAME_RE.test(username)) throw new Error("Username must be 3–30 characters, start with a letter, and use only letters, numbers, dots, underscores, or hyphens.");
  if (displayName.length < 2 || displayName.length > 100) throw new Error("Enter a display name between 2 and 100 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid recovery/contact email.");
  if (!responsibilities.length || responsibilities.some((v) => !FOUNDER_RESPONSIBILITIES.includes(v))) throw new Error("Select at least one valid owner domain.");
  if (capabilities.some((v) => !FOUNDER_CAPABILITIES.includes(v))) throw new Error("One or more selected capabilities are invalid.");
  if (!["active", "pending", "suspended"].includes(input.status)) throw new Error("Invalid membership status.");
  if (input.password && input.password.length < PASSWORD_MIN_LENGTH) throw new Error(`Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`);

  return { ...input, username, displayName, email, responsibilities, capabilities };
}

async function writeOwnerAudit(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  actor: string,
  action: string,
  username: string,
  detail: string,
) {
  const { error } = await supabase.from("audit_log").insert({
    action,
    actor,
    entity: username,
    detail,
  });
  if (error) throw new Error(`Owner access was changed, but the platform audit log write failed: ${error.message}`);
}

export async function createOwnerAction(input: OwnerInput) {
  const { supabase, user, actor } = await requireSuperAdmin();
  const clean = normalizeOwnerInput(input);
  if (!clean.password || clean.password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Set an initial password of at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("owner_memberships")
    .select("user_id", { count: "exact", head: true });
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) >= 3) throw new Error("Nashemann is configured for three owner accounts. Update an existing owner instead of creating a fourth.");

  const { data: duplicate, error: duplicateError } = await admin
    .from("owner_memberships")
    .select("user_id")
    .ilike("username", clean.username)
    .maybeSingle();
  if (duplicateError) throw new Error(duplicateError.message);
  if (duplicate) throw new Error("That owner username is already in use.");

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: clean.email,
    password: clean.password,
    email_confirm: true,
    user_metadata: { name: clean.displayName },
  });
  if (authError || !authData.user) throw new Error(authError?.message ?? "Could not create the owner authentication account.");

  const { error: membershipError } = await admin.from("owner_memberships").insert({
    user_id: authData.user.id,
    username: clean.username,
    display_name: clean.displayName,
    status: clean.status,
    responsibilities: clean.responsibilities,
    capabilities: clean.capabilities,
    created_by: user.id,
  });

  if (membershipError) {
    await admin.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
    throw new Error(membershipError.message);
  }

  await writeOwnerAudit(supabase, actor, "owner_account_created", clean.username, `Created owner account; status=${clean.status}; domains=${clean.responsibilities.join(", ")}`);
  revalidatePath("/owner-accounts");
  revalidatePath("/owners");
  return { ok: true };
}

export async function updateOwnerAction(userId: string, input: OwnerInput) {
  const { supabase, actor } = await requireSuperAdmin();
  const clean = normalizeOwnerInput(input);
  const admin = createAdminClient();

  const { data: current, error: currentError } = await admin
    .from("owner_memberships")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError || !current) throw new Error(currentError?.message ?? "Owner membership not found.");

  const { data: duplicate, error: duplicateError } = await admin
    .from("owner_memberships")
    .select("user_id")
    .ilike("username", clean.username)
    .neq("user_id", userId)
    .maybeSingle();
  if (duplicateError) throw new Error(duplicateError.message);
  if (duplicate) throw new Error("That owner username is already in use.");

  const { data: authCurrent, error: authCurrentError } = await admin.auth.admin.getUserById(userId);
  if (authCurrentError || !authCurrent.user) throw new Error("Owner authentication account not found.");

  const { error: membershipError } = await admin
    .from("owner_memberships")
    .update({
      username: clean.username,
      display_name: clean.displayName,
      status: clean.status,
      responsibilities: clean.responsibilities,
      capabilities: clean.capabilities,
    })
    .eq("user_id", userId);
  if (membershipError) throw new Error(membershipError.message);

  const attributes: { email: string; email_confirm: boolean; user_metadata: Record<string, unknown>; password?: string } = {
    email: clean.email,
    email_confirm: true,
    user_metadata: { ...(authCurrent.user.user_metadata ?? {}), name: clean.displayName },
  };
  if (clean.password) attributes.password = clean.password;

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, attributes);
  if (authUpdateError) {
    await admin.from("owner_memberships").update({
      username: current.username,
      display_name: current.display_name,
      status: current.status,
      responsibilities: current.responsibilities,
      capabilities: current.capabilities,
    }).eq("user_id", userId);
    throw new Error(authUpdateError.message);
  }

  if (clean.status === "suspended") {
    const { error: signOutError } = await admin.auth.admin.signOut(userId, "global");
    if (signOutError) throw new Error(`Membership suspended, but existing sessions could not be revoked: ${signOutError.message}`);
  }

  const changes = [
    current.username !== clean.username ? "username" : null,
    authCurrent.user.email?.toLowerCase() !== clean.email ? "email" : null,
    current.display_name !== clean.displayName ? "display name" : null,
    current.status !== clean.status ? `status (${clean.status})` : null,
    clean.password ? "password reset" : null,
    JSON.stringify(current.responsibilities ?? []) !== JSON.stringify(clean.responsibilities) ? "domains" : null,
    JSON.stringify(current.capabilities ?? []) !== JSON.stringify(clean.capabilities) ? "capabilities" : null,
  ].filter(Boolean);

  await writeOwnerAudit(supabase, actor, "owner_account_updated", clean.username, changes.length ? `Updated: ${changes.join(", ")}` : "Owner account saved with no detected field changes.");
  revalidatePath("/owner-accounts");
  revalidatePath("/owners");
  return { ok: true };
}
