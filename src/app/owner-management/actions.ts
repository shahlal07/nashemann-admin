"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_CAPABILITIES = new Set([
  "governance.read",
  "governance.manage",
  "approvals.read",
  "approvals.request",
  "approvals.review",
  "finance.read",
  "technology.read",
  "technology.manage",
  "strategy.read",
  "strategy.manage",
  "audit.read",
]);
const ALLOWED_RESPONSIBILITIES = new Set([
  "finance_governance",
  "product_technology",
  "business_strategy",
  "shared_governance",
]);

export async function createOwnerAccountAction(input: {
  username: string;
  email: string;
  displayName: string;
  password: string;
  responsibilities: string[];
  capabilities: string[];
}) {
  const { supabase, user } = await requireSuperAdmin();

  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (displayName.length < 2 || displayName.length > 80) throw new Error("Enter a display name between 2 and 80 characters.");
  if (input.password.length < 12 || input.password.length > 128) throw new Error("Use a password between 12 and 128 characters.");
  if (!input.responsibilities.length || input.responsibilities.some((value) => !ALLOWED_RESPONSIBILITIES.has(value))) {
    throw new Error("Choose at least one valid responsibility.");
  }
  if (!input.capabilities.length || input.capabilities.some((value) => !ALLOWED_CAPABILITIES.has(value))) {
    throw new Error("Choose at least one valid capability.");
  }

  const { data: existing } = await supabase
    .from("owner_memberships")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();
  if (existing) throw new Error("That owner username is already in use.");

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: displayName, owner_username: username },
  });
  if (createError || !created.user) {
    throw new Error(createError?.message ?? "Could not create the owner authentication account.");
  }

  const { error: membershipError } = await supabase.from("owner_memberships").insert({
    user_id: created.user.id,
    username,
    display_name: displayName,
    status: "active",
    responsibilities: input.responsibilities,
    capabilities: input.capabilities,
    created_by: user.id,
  });

  if (membershipError) {
    // Compensate for a partial account creation so no orphaned login is left behind.
    const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
    if (rollbackError) {
      throw new Error("Owner membership could not be saved and automatic cleanup failed. Do not retry blindly; inspect Auth and owner_memberships first.");
    }
    throw new Error(membershipError.message);
  }

  revalidatePath("/owner-management");
  revalidatePath("/owners");
  revalidatePath("/audit-log");
  return { username, email, displayName };
}
