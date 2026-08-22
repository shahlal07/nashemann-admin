import { readFileSync, writeFileSync } from "node:fs";

const path = "src/app/vendors/[id]/VendorDetailClient.tsx";
const actionsPath = "src/app/vendors/[id]/actions.ts";
let s = readFileSync(path, "utf8");
let actions = readFileSync(actionsPath, "utf8");

const resetOld = `  async function sendAdminReset(admin: VendorAdminRow) {
    setBusy(true);
    setError(null);
    try {
      await sendVendorAdminResetLinkAction(vendor.id, vendor.name, admin.id, admin.email, admin.name, vendor.subdomain);
      setError(null);
      window.alert("Password reset email sent successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send password reset email");
    } finally {
      setBusy(false);
    }
  }`;
const resetNew = `  async function sendAdminReset(admin: VendorAdminRow) {
    setBusy(true);
    setError(null);
    try {
      const result = await sendVendorAdminResetLinkAction(vendor.id, vendor.name, admin.id, admin.email, admin.name, vendor.subdomain);
      setTemporaryPassword(result.temporaryPassword ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate a temporary password");
    } finally {
      setBusy(false);
    }
  }`;
if (s.includes(resetOld)) s = s.replace(resetOld, resetNew);

const formAnchor = `          {addingAdmin && (\n            <form onSubmit={addAdmin} className="mb-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3">`;
const formReplacement = `          {temporaryPassword && (\n            <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--accent-violet)]/30 bg-[var(--accent-violet)]/5 p-4">\n              <div className="flex flex-wrap items-center justify-between gap-3">\n                <div>\n                  <p className="text-sm font-semibold text-[var(--text)]">Temporary password generated</p>\n                  <p className="mt-1 text-xs text-[var(--text-faint)]">Give this password directly to the vendor. It immediately replaces their old password.</p>\n                </div>\n                <button type="button" onClick={() => navigator.clipboard?.writeText(temporaryPassword)} className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]">Copy</button>\n              </div>\n              <code className="mt-3 block rounded-[var(--radius-sm)] bg-[var(--surface-solid)] px-3 py-2 font-mono text-sm font-semibold tracking-wide text-[var(--text)]">{temporaryPassword}</code>\n              <button type="button" onClick={() => setTemporaryPassword(null)} className="mt-2 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">Hide password</button>\n            </div>\n          )}\n\n${formAnchor}`;
if (s.includes(formAnchor) && !s.includes("Temporary password generated")) s = s.replace(formAnchor, formReplacement);

const buttonOld = `                    aria-label="Send password reset"\n                    title="Send password reset email"\n                  >\n                    Reset`;
const buttonNew = `                    aria-label="Generate temporary password"\n                    title="Generate a new temporary password"\n                  >\n                    Temp pass`;
if (s.includes(buttonOld)) s = s.replace(buttonOld, buttonNew);

// The production build must not depend on a stale vendor_admins UUID retained by
// an older client bundle. Replace the resolver deterministically and verify that
// the replacement happened before writing the file.
const resolverReplacement = `async function resolveVendorAdmin(admin: ReturnType<typeof createAdminClient>, vendorId: string, vendorAdminId: string, fallbackEmail?: string) {
  const byId = await admin
    .from("vendor_admins")
    .select("id,name,email,role,added_at")
    .eq("vendor_id", vendorId)
    .eq("id", vendorAdminId)
    .maybeSingle();
  if (byId.error) throw new Error(byId.error.message);
  let row = byId.data as VendorAdminRow | null;
  if (!row && fallbackEmail?.trim()) {
    const byEmail = await admin
      .from("vendor_admins")
      .select("id,name,email,role,added_at")
      .eq("vendor_id", vendorId)
      .ilike("email", fallbackEmail.trim())
      .maybeSingle();
    if (byEmail.error) throw new Error(byEmail.error.message);
    row = byEmail.data as VendorAdminRow | null;
  }
  if (!row) throw new Error("Vendor admin record not found.");
  const user = await findAuthUserByEmail(admin, row.email);
  if (!user) throw new Error("No Supabase Auth account exists for " + row.email + ". Use Edit Credentials to recreate/sync this vendor admin.");
  return { row, user };
}`;
const resolverPattern = /async function resolveVendorAdmin\([\s\S]*?\n}\n\n(?=async function syncVendorAdminProfile)/;
if (!resolverPattern.test(actions)) throw new Error("patch-vendor-admin-ui: vendor admin resolver was not found");
actions = actions.replace(resolverPattern, resolverReplacement + "\n\n");

const updateCall = "const { row: currentRow, user: target } = await resolveVendorAdmin(admin, vendorId, adminId);";
if (actions.includes(updateCall)) actions = actions.replace(updateCall, "const { row: currentRow, user: target } = await resolveVendorAdmin(admin, vendorId, adminId, input.previousEmail);");
const resetCall = "const { row, user } = await resolveVendorAdmin(admin, vendorId, adminId);";
if (actions.includes(resetCall)) actions = actions.replace(resetCall, "const { row, user } = await resolveVendorAdmin(admin, vendorId, adminId, adminEmail);");
const sessionCall = "const { user } = await resolveVendorAdmin(admin, vendorId, adminId);";
if (actions.includes(sessionCall)) actions = actions.replace(sessionCall, "const { user } = await resolveVendorAdmin(admin, vendorId, adminId, adminEmail);");
const removeCall = "const { row, user } = await resolveVendorAdmin(admin, vendorId, adminId);";
if (actions.includes(removeCall)) actions = actions.replace(removeCall, "const { row, user } = await resolveVendorAdmin(admin, vendorId, adminId, adminEmail);");

writeFileSync(path, s);
writeFileSync(actionsPath, actions);
