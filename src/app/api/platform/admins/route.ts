import { NextResponse } from "next/server";
import { assertPlatformInternalRequest, getPlatformAdminClient } from "@/lib/platform-internal";

export const dynamic = "force-dynamic";

export type VendorAdminRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  added_at: string;
};

async function authUserForEmail(email: string) {
  const admin = getPlatformAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function GET(request: Request) {
  try {
    assertPlatformInternalRequest(request);
    const vendorId = new URL(request.url).searchParams.get("vendorId")?.trim();
    if (!vendorId) return NextResponse.json({ error: "vendorId is required." }, { status: 400 });

    const admin = getPlatformAdminClient();
    const { data: rows, error } = await admin
      .from("vendor_admins")
      .select("id, name, email, role, added_at")
      .eq("vendor_id", vendorId)
      .order("added_at", { ascending: true });
    if (error) throw new Error(error.message);

    const admins = await Promise.all((rows ?? []).map(async (row) => {
      const authUser = await authUserForEmail(row.email);
      return {
        id: authUser?.id ?? row.id,
        name: row.name,
        email: row.email,
        role: row.role === "owner" ? "admin" : "staff",
        added_at: row.added_at,
      } satisfies VendorAdminRow;
    }));

    return NextResponse.json({ admins });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't load vendor admins." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    assertPlatformInternalRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const vendorId = String(body.vendorId ?? "").trim();
    if (!vendorId) return NextResponse.json({ error: "vendorId is required." }, { status: 400 });

    const admin = getPlatformAdminClient();

    if (action === "add") {
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const role = body.role === "admin" ? "admin" : "staff";
      if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });

      const { data: existing } = await admin.from("vendor_admins").select("id").eq("vendor_id", vendorId).eq("email", email).maybeSingle();
      if (existing) return NextResponse.json({ error: "That email is already a vendor admin for this store." }, { status: 409 });

      const temporaryPassword = `Ns-${crypto.randomUUID()}-Aa1!`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { name, role: role === "admin" ? "vendor_admin" : "vendor_staff", vendor_id: vendorId },
      });
      if (createError || !created.user) throw new Error(createError?.message ?? "Couldn't create vendor admin account.");

      const { data: row, error: rowError } = await admin
        .from("vendor_admins")
        .insert({ vendor_id: vendorId, name, email, role: role === "admin" ? "owner" : "staff" })
        .select("id, name, email, role, added_at")
        .single();
      if (rowError || !row) {
        await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        throw new Error(rowError?.message ?? "Couldn't save vendor admin.");
      }

      return NextResponse.json({
        admin: { id: created.user.id, name: row.name, email: row.email, role, added_at: row.added_at } satisfies VendorAdminRow,
        temporaryPassword,
      });
    }

    if (action === "update") {
      const userId = String(body.userId ?? "").trim();
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const previousEmail = String(body.previousEmail ?? "").trim().toLowerCase();
      const password = String(body.password ?? "").trim();
      if (!userId || !name || !email) return NextResponse.json({ error: "User id, name and email are required." }, { status: 400 });

      const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
      if (currentError || !current.user) return NextResponse.json({ error: "Vendor admin account not found." }, { status: 404 });

      const lookupEmail = previousEmail || current.user.email?.toLowerCase() || "";
      const { data: row, error: rowError } = await admin
        .from("vendor_admins")
        .select("id, name, email, role, added_at")
        .eq("vendor_id", vendorId)
        .eq("email", lookupEmail)
        .maybeSingle();
      if (rowError || !row) return NextResponse.json({ error: "Vendor admin is not assigned to this store." }, { status: 404 });

      if (email !== lookupEmail) {
        const { data: duplicate } = await admin.from("vendor_admins").select("id").eq("vendor_id", vendorId).eq("email", email).neq("id", row.id).maybeSingle();
        if (duplicate) return NextResponse.json({ error: "That email is already used by another admin for this store." }, { status: 409 });
      }

      const metadata = { ...(current.user.user_metadata ?? {}), name, vendor_id: vendorId };
      const attributes: { email: string; email_confirm: boolean; user_metadata: Record<string, unknown>; password?: string } = {
        email,
        email_confirm: true,
        user_metadata: metadata,
      };
      if (password) attributes.password = password;

      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(userId, attributes);
      if (updateError || !updated.user) throw new Error(updateError?.message ?? "Couldn't update vendor admin account.");

      const { data: updatedRow, error: updateRowError } = await admin
        .from("vendor_admins")
        .update({ name, email })
        .eq("id", row.id)
        .select("id, name, email, role, added_at")
        .single();
      if (updateRowError || !updatedRow) throw new Error(updateRowError?.message ?? "Couldn't update vendor admin contact.");

      return NextResponse.json({
        admin: { id: updated.user.id, name: updatedRow.name, email: updatedRow.email, role: updatedRow.role === "owner" ? "admin" : "staff", added_at: updatedRow.added_at } satisfies VendorAdminRow,
        passwordChanged: Boolean(password),
      });
    }

    if (action === "send_reset") {
      const userId = String(body.userId ?? "").trim();
      const redirectTo = String(body.redirectTo ?? "").trim();
      if (!userId || !redirectTo) return NextResponse.json({ error: "User id and reset redirect are required." }, { status: 400 });
      const { data: current, error: currentError } = await admin.auth.admin.getUserById(userId);
      if (currentError || !current.user?.email) return NextResponse.json({ error: "Vendor admin account not found." }, { status: 404 });

      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: current.user.email,
        options: { redirectTo },
      });
      if (linkError || !link.properties?.action_link) throw new Error(linkError?.message ?? "Couldn't generate the reset link.");

      return NextResponse.json({ resetUrl: link.properties.action_link, admin: { email: current.user.email, name: String(current.user.user_metadata?.name ?? "") } });
    }

    if (action === "revoke_sessions") {
      const userId = String(body.userId ?? "").trim();
      if (!userId) return NextResponse.json({ error: "User id is required." }, { status: 400 });
      const { error: signOutError } = await admin.auth.admin.signOut(userId, "global");
      if (signOutError) throw new Error(signOutError.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "remove") {
      const userId = String(body.userId ?? "").trim();
      if (!userId) return NextResponse.json({ error: "User id is required." }, { status: 400 });
      const { data: current } = await admin.auth.admin.getUserById(userId);
      const email = current.user?.email?.toLowerCase();
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error(deleteError.message);
      if (email) await admin.from("vendor_admins").delete().eq("vendor_id", vendorId).eq("email", email);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported vendor admin action." }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vendor admin operation failed." }, { status: 500 });
  }
}
