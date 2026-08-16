/**
 * Client-safe staff role constants. Kept separate from `@/lib/authz` (which
 * imports the server-only Supabase client via `next/headers`) so Client
 * Components can use `StaffRole`/`ROLE_LABELS` without pulling a server-only
 * module into the browser bundle.
 */
export type StaffRole = "super_admin" | "admin" | "finance" | "support" | "read_only" | "platform_staff";

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance: "Finance",
  support: "Support",
  read_only: "Read-Only",
  platform_staff: "Admin", // legacy value, migrated on sight in the DB; kept here only so old rows still render.
};
