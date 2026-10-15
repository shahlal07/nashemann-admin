import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendInternalTransactionalEmail, type InternalEmailCategory } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_CATEGORIES: InternalEmailCategory[] = ["notifications", "marketing", "support", "security", "staff"];
const ALLOWED_SOURCES = ["nashemann-admin", "nashemann-web", "vendor-admins", "vendor-storefronts", "external"];
const MAX_HTML_LENGTH = 120_000;

function matchesSecret(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Internal mail relay for Nashemann's server applications. The service-role
 * key is only used server-to-server and is never accepted from query/body data.
 * Senders are restricted to verified Nashemann addresses by category.
 */
export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") ?? "";
  if (!serviceRoleKey || !matchesSecret(authorization, `Bearer ${serviceRoleKey}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_HTML_LENGTH + 16_000) {
    return NextResponse.json({ error: "Email payload too large" }, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as
    | { to?: unknown; subject?: unknown; html?: unknown; category?: unknown; source?: unknown }
    | null;
  if (!body || typeof body.subject !== "string" || !body.subject.trim() || body.subject.length > 240) {
    return NextResponse.json({ error: "Invalid email subject" }, { status: 400 });
  }
  if (typeof body.html !== "string" || !body.html.trim() || body.html.length > MAX_HTML_LENGTH) {
    return NextResponse.json({ error: "Invalid email content" }, { status: 400 });
  }

  const recipients = Array.isArray(body.to) ? body.to : [body.to];
  if (
    recipients.length < 1 ||
    recipients.length > 5 ||
    recipients.some((to) => typeof to !== "string" || !EMAIL_PATTERN.test(to.trim()) || to.length > 320)
  ) {
    return NextResponse.json({ error: "Invalid recipients" }, { status: 400 });
  }

  const category = typeof body.category === "string" && ALLOWED_CATEGORIES.includes(body.category as InternalEmailCategory)
    ? body.category as InternalEmailCategory
    : "notifications";
  const source = typeof body.source === "string" && ALLOWED_SOURCES.includes(body.source) ? body.source : "external";
  const admin = createAdminClient();
  const { data: emailSettings, error: settingsError } = await admin
    .from("platform_email_settings")
    .select("category_enabled")
    .eq("id", true)
    .maybeSingle();
  if (settingsError) {
    return NextResponse.json({ error: "Email policy could not be checked; message was not sent." }, { status: 503 });
  }

  if (emailSettings?.category_enabled?.[category] === false) {
    await Promise.all((recipients as string[]).map((to) =>
      admin.from("platform_email_log").insert({
        category,
        source,
        recipient_domain: to.trim().split("@").pop()?.toLowerCase() ?? null,
        subject: (body.subject as string).slice(0, 240),
        status: "skipped",
        error_message: "Email category disabled by Super Admin.",
      })
    ));
    return NextResponse.json({ success: true, sent: 0, skipped: recipients.length, reason: "category_disabled" });
  }

  const results = await Promise.all(
    (recipients as string[]).map((to) =>
      sendInternalTransactionalEmail({
        to: to.trim(),
        subject: body.subject as string,
        html: body.html as string,
        category,
        source,
      })
    )
  );

  if (results.some((sent) => !sent)) {
    return NextResponse.json({ error: "Email provider did not accept every message" }, { status: 502 });
  }
  return NextResponse.json({ success: true, sent: results.length });
}
