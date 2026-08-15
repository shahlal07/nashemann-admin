import { createClient } from "@/lib/supabase/server";

export type StaffRole = "super_admin" | "admin" | "finance" | "support" | "read_only" | "platform_staff";

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance: "Finance",
  support: "Support",
  read_only: "Read-Only",
  platform_staff: "Admin", // legacy value, migrated on sight in the DB; kept here only so old rows still render.
};

/**
 * Any signed-in staff member, for read-only server actions (e.g. the AI
 * assistant). Every role including Read-Only passes this check.
 */
export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) throw new Error("Not authorized");

  const { data: staffProfile } = await supabase
    .from("staff_profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, staffProfile, actor: staffProfile?.name ?? user.email ?? "Unknown" };
}

/**
 * Any staff role EXCEPT Read-Only. Use this to gate general (non-finance)
 * mutating server actions -- coupons, reviews, influencers, website content,
 * support, bug reports, vendor management, etc. Mirrors the DB's
 * is_mutating_staff() RLS gate so a Read-Only session can never mutate
 * anything even if a UI check were somehow bypassed.
 */
export async function requireMutatingStaff() {
  const ctx = await requireStaff();
  const role = ctx.staffProfile?.role as StaffRole | undefined;
  if (!role || role === "read_only") throw new Error("Read-Only staff cannot make changes.");
  return ctx;
}

/**
 * Finance-only surfaces: settlements, settlement payments, platform pricing.
 * Support and Read-Only are fully excluded (not just from mutating --
 * they should never reach these pages at all). Mirrors is_finance_staff()
 * in the DB, which also gates SELECT on those tables.
 */
export async function requireFinanceStaff() {
  const ctx = await requireStaff();
  const role = ctx.staffProfile?.role as StaffRole | undefined;
  if (!role || !["super_admin", "admin", "finance"].includes(role)) {
    throw new Error("Finance access required for this action.");
  }
  return ctx;
}

/** Staff management (inviting/removing staff, changing roles): Super Admin only. */
export async function requireSuperAdmin() {
  const ctx = await requireStaff();
  const role = ctx.staffProfile?.role as StaffRole | undefined;
  if (role !== "super_admin") throw new Error("Only a super admin can manage staff.");
  return ctx;
}
