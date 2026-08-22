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
const formReplacement = `          {temporaryPassword && (\n            <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--accent-violet)]/30 bg-[var(--accent-violet)]/5 p-4">\n              <div className="flex flex-wrap items-center justify-between gap-3">\n                <div>\n                  <p className="text-sm font-semibold text-[var(--text)]">Temporary password generated</p>\n                  <p className="mt-1 text-xs text-[var(--text-faint)]">Give this password directly to the vendor. It immediately replaces their old password and active sessions have been revoked.</p>\n                </div>\n                <button type="button" onClick={() => navigator.clipboard?.writeText(temporaryPassword)} className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]">Copy</button>\n              </div>\n              <code className="mt-3 block rounded-[var(--radius-sm)] bg-[var(--surface-solid)] px-3 py-2 font-mono text-sm font-semibold tracking-wide text-[var(--text)]">{temporaryPassword}</code>\n              <button type="button" onClick={() => setTemporaryPassword(null)} className="mt-2 text-xs text-[var(--text-faint)] hover:text-[var(--text)]">Hide password</button>\n            </div>\n          )}\n\n${formAnchor}`;
if (s.includes(formAnchor) && !s.includes("Temporary password generated")) s = s.replace(formAnchor, formReplacement);

const buttonOld = `                    aria-label="Send password reset"\n                    title="Send password reset email"\n                  >\n                    Reset`;
const buttonNew = `                    aria-label="Generate temporary password"\n                    title="Generate a new temporary password"\n                  >\n                    Temp pass`;
if (s.includes(buttonOld)) s = s.replace(buttonOld, buttonNew);

// Replace the whole resolver by function boundaries so this remains robust
// against harmless formatting/template-literal changes in actions.ts.
const resolverReplacement = `async function resolveVendorAdmin(admin: ReturnType<typeof createAdminClient>, vendorId: string, vendorAdminId: string, fallbackEmail?: string) {
  let row: VendorAdminRow | null = null;
  const { data: byId, error: byIdError } = await admin
    .from("vendor_admins")
    .select("id,name,email,role,added_at")
    .eq("vendor_id", vendorId)
    .eq("id", vendorAdminId)
    .maybeSingle();
  if (byIdError) throw new Error(byIdError.message);
  row = (byId as VendorAdminRow | null) ?? null;
  if (!row && fallbackEmail?.trim()) {
    const { data: byEmail, error: byEmailError } = await admin
      .from("vendor_admins")
      .select("id,name,email,role,added_at")
      .eq("vendor_id", vendorId)
      .ilike("email", fallbackEmail.trim())
      .maybeSingle();
    if (byEmailError) throw new Error(byEmailError.message);
    row = (byEmail as VendorAdminRow | null) ?? null;
  }
  if (!row) throw new Error("Vendor admin record not found.");
  const user = await findAuthUserByEmail(admin, row.email);
  if (!user) throw new Error("No Supabase Auth account exists for " + row.email + ". Use Edit Credentials to recreate/sync this vendor admin.");
  return { row, user };
}`;
actions = actions.replace(
  /async function resolveVendorAdmin\([\s\S]*?\n}\n\n(?=async function syncVendorAdminProfile)/,
  () => resolverReplacement + "\n\n"
);

// Older client state can carry a stale row id; every mutating admin action
// already receives the row email, so use it as a deterministic fallback.
actions = actions.replace(
  /resolveVendorAdmin\(admin, vendorId, adminId\)/g,
  "resolveVendorAdmin(admin, vendorId, adminId, adminEmail)"
);
actions = actions.replace(
  "resolveVendorAdmin(admin, vendorId, adminId, adminEmail)\";\n  const cleanName",
  "resolveVendorAdmin(admin, vendorId, adminId, input.previousEmail);\n  const cleanName"
);

writeFileSync(path, s);
writeFileSync(actionsPath, actions);
