"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_CAPABILITIES = new Set([
  "governance.read", "governance.manage", "approvals.read", "approvals.request",
  "approvals.review", "finance.read", "technology.read", "technology.manage",
  "strategy.read", "strategy.manage", "audit.read",
]);
const ALLOWED_RESPONSIBILITIES = new Set([
  "finance_governance", "product_technology", "business_strategy", "shared_governance",
]);

type OwnerAccountInput = {
  username: string;
  email: string;
  displayName: string;
  password: string;
  responsibilities: string[];
  capabilities: string[];
  updateExistingAccount?: boolean;
};

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("The existing account could not be resolved safely. No owner access was changed.");
    const found = data.users.find((candidate) => (candidate.email ?? "").trim().toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  throw new Error("The account directory is too large to resolve this email safely. No owner access was changed.");
}

export async function createOwnerAccountAction(input: OwnerAccountInput) {
  const { supabase, user } = await requireSuperAdmin();

  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const password = input.password;

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (displayName.length < 2 || displayName.length > 80) throw new Error("Enter a display name between 2 and 80 characters.");
  if (password.length < 12 || password.length > 128) throw new Error("Use a password between 12 and 128 characters.");
  if (!input.responsibilities.length || input.responsibilities.some((value) => !ALLOWED_RESPONSIBILITIES.has(value))) throw new Error("Choose at least one valid responsibility.");
  if (!input.capabilities.length || input.capabilities.some((value) => !ALLOWED_CAPABILITIES.has(value))) throw new Error("Choose at least one valid capability.");

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName, owner_username: username },
  });

  let userId: string;
  let isNewAuthUser = false;
  let existingAuthUser = false;
  let existingUserMetadata: Record<string, unknown> = {};

  if (createError || !created.user) {
    const duplicateEmail = createError?.code === "email_exists" ||
      /already been registered|already registered|email.*already exists/i.test(createError?.message ?? "");
    if (!duplicateEmail) throw new Error(createError?.message ?? "Could not create the owner authentication account.");
    if (!input.updateExistingAccount) {
      throw new Error("This email is already registered in Supabase. Confirm that it belongs to the intended founder by selecting the existing-account option before linking it or replacing its password.");
    }

    const match = await findAuthUserByEmail(admin, email);
    if (!match) throw new Error("Supabase reported a duplicate email, but the matching account could not be found. No owner access was changed.");
    userId = match.id;
    existingAuthUser = true;
    existingUserMetadata = (match.user_metadata ?? {}) as Record<string, unknown>;
  } else {
    userId = created.user.id;
    isNewAuthUser = true;
  }

  const { data: sameUsername, error: usernameError } = await supabase
    .from("owner_memberships").select("user_id").eq("username", username).maybeSingle();
  if (usernameError) {
    if (isNewAuthUser) await admin.auth.admin.deleteUser(userId);
    throw new Error("Could not verify username uniqueness. No owner access was changed.");
  }
  if (sameUsername && sameUsername.user_id !== userId) {
    if (isNewAuthUser) {
      const cleanup = await admin.auth.admin.deleteUser(userId);
      if (cleanup.error) throw new Error("That username is already used and cleanup failed. Inspect Auth before retrying.");
    }
    throw new Error("That owner username is already in use.");
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from("owner_memberships")
    .select("user_id, username, display_name, status, responsibilities, capabilities, created_by")
    .eq("user_id", userId).maybeSingle();
  if (membershipLookupError) {
    if (isNewAuthUser) await admin.auth.admin.deleteUser(userId);
    throw new Error("Could not verify existing founder access. No owner access was changed.");
  }

  if (existingAuthUser) {
    const [{ data: staffRecord, error: staffError }, { data: profile, error: profileError }] = await Promise.all([
      admin.from("staff_profiles").select("id, role").eq("id", userId).maybeSingle(),
      admin.from("profiles").select("role, vendor_id").eq("id", userId).maybeSingle(),
    ]);
    if (staffError || profileError) throw new Error("Could not verify the existing account's current role. No owner access was changed.");
    if (staffRecord || ["super_admin", "admin", "staff"].includes(profile?.role ?? "") || profile?.vendor_id) {
      throw new Error("This email belongs to a staff/admin or vendor-linked identity. Use a dedicated founder login email; its credentials were not changed.");
    }
    const markedAsFounder = typeof existingUserMetadata.owner_username === "string" || Boolean(existingMembership);
    if (!markedAsFounder && !input.updateExistingAccount) {
      throw new Error("This account is not marked as a founder. Confirm the existing-account option before linking it.");
    }
  }

  const membershipPayload = {
    username,
    display_name: displayName,
    status: "active",
    responsibilities: input.responsibilities,
    capabilities: input.capabilities,
  };

  if (existingMembership) {
    const { error } = await supabase.from("owner_memberships").update(membershipPayload).eq("user_id", userId);
    if (error) throw new Error("Could not save founder access settings: " + error.message);
  } else {
    const { error } = await supabase.from("owner_memberships").insert({
      user_id: userId, ...membershipPayload, created_by: user.id,
    });
    if (error) {
      if (isNewAuthUser) {
        const cleanup = await admin.auth.admin.deleteUser(userId);
        if (cleanup.error) throw new Error("Owner membership could not be saved and automatic Auth cleanup failed. Inspect Auth and owner_memberships before retrying.");
      }
      throw new Error("Could not save founder access: " + error.message);
    }
  }

  if (existingAuthUser) {
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { ...existingUserMetadata, name: displayName, owner_username: username },
    });
    if (authUpdateError) {
      const rollback = existingMembership
        ? await admin.from("owner_memberships").update({
            username: existingMembership.username,
            display_name: existingMembership.display_name,
            status: existingMembership.status,
            responsibilities: existingMembership.responsibilities,
            capabilities: existingMembership.capabilities,
          }).eq("user_id", userId)
        : await admin.from("owner_memberships").delete().eq("user_id", userId);
      if (rollback.error) throw new Error("Password update failed and membership rollback also failed. Contact engineering before retrying.");
      throw new Error("The existing account password was not changed: " + authUpdateError.message);
    }
  }

  revalidatePath("/owner-management");
  revalidatePath("/owners");
  revalidatePath("/audit-log");
  return {
    userId,
    username,
    email,
    displayName,
    mode: isNewAuthUser ? "created" : existingMembership ? "updated" : "linked",
  } as const;
}
