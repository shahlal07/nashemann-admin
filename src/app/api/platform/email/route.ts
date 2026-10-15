import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RESEND_API = "https://api.resend.com";
const CATEGORIES = ["notifications", "marketing", "support", "security", "staff"] as const;
const SOURCES = ["nashemann-admin", "nashemann-web", "vendor-admins", "vendor-storefronts", "external"] as const;
type EmailCategory = (typeof CATEGORIES)[number];
type JsonObject = Record<string, unknown>;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function authorize() {
  try {
    return await requireSuperAdmin();
  } catch {
    return null;
  }
}

async function resendRequest(path: string, init?: RequestInit) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured on the Super Admin deployment.");
  const response = await fetch(`${RESEND_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload?.message === "string" ? payload.message : `Resend returned HTTP ${response.status}.`;
    throw new Error(detail);
  }
  return payload;
}

async function loadUsage() {
  try {
    return await resendRequest("/usage");
  } catch {
    return null;
  }
}

/**
 * The log table records mail sent through the internal relay, but operators
 * can also send messages directly through Resend. Reconcile the latest
 * provider-accepted messages so the dashboard does not misleadingly remain
 * at zero when those sends are absent from the local log. Full recipient
 * addresses are intentionally not persisted; the log stores only domains.
 */
async function syncRecentProviderEmails(admin: ReturnType<typeof createAdminClient>) {
  try {
    const payload = await resendRequest("/emails?limit=100");
    const emails = Array.isArray(payload?.data) ? payload.data : [];
    const providerIds = emails
      .map((email: any) => typeof email?.id === "string" ? email.id : null)
      .filter((id: string | null): id is string => Boolean(id));
    if (!providerIds.length) return;

    const { data: existing, error: existingError } = await admin
      .from("platform_email_log")
      .select("provider_id")
      .in("provider_id", providerIds);
    if (existingError) {
      console.error("[email-center] Could not check provider email sync:", existingError.message);
      return;
    }
    const knownIds = new Set((existing ?? []).map((row: { provider_id: string | null }) => row.provider_id).filter(Boolean));

    const rows = emails.flatMap((email: any) => {
      const id = typeof email?.id === "string" ? email.id : null;
      if (!id || knownIds.has(id)) return [];
      const to = Array.isArray(email?.to) ? email.to[0] : email?.to;
      const recipientDomain = typeof to === "string" && to.includes("@")
        ? to.split("@").pop()?.toLowerCase().slice(0, 253) ?? null
        : null;
      const from = typeof email?.from === "string" ? email.from : "";
      const category: EmailCategory = /marketing@/i.test(from) ? "marketing"
        : /support@/i.test(from) ? "support"
        : /security@/i.test(from) ? "security"
        : /staff@/i.test(from) ? "staff"
        : "notifications";
      return [{
        category,
        source: "external",
        recipient_domain: recipientDomain,
        subject: typeof email?.subject === "string" ? email.subject.slice(0, 240) : "",
        status: "sent",
        provider_id: id,
        created_at: typeof email?.created_at === "string" ? email.created_at : new Date().toISOString(),
      }];
    });
    if (rows.length) {
      const { error } = await admin.from("platform_email_log").insert(rows);
      if (error) console.error("[email-center] Could not import provider-accepted emails:", error.message);
    }
  } catch (error) {
    // The local mail log remains usable if Resend history is temporarily unavailable.
    console.error("[email-center] Provider email reconciliation failed:", error);
  }
}

async function loadDomains() {
  const payload = await resendRequest("/domains?limit=100");
  const domains = Array.isArray(payload?.data) ? payload.data : [];
  return Promise.all(domains.map(async (domain: any) => {
    if (Array.isArray(domain.records) && domain.records.length) return domain;
    try {
      const detail = await resendRequest("/domains/" + encodeURIComponent(String(domain.id)));
      return detail?.data ?? detail;
    } catch {
      return domain;
    }
  }));
}

async function recordAudit(actor: string, action: string, detail: string) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    action,
    actor,
    entity: "Email Control Center",
    detail,
  });
}

export async function GET() {
  const auth = await authorize();
  if (!auth) return jsonError("Only Super Admin can access email controls.", 403);

  try {
    const admin = createAdminClient();
    await syncRecentProviderEmails(admin);
    const [settingsResult, domains, usagePayload, sentTotal, sentToday, sentMonth, failedMonth, skippedMonth, recentResult, ...categoryCounts] =
      await Promise.all([
        admin.from("platform_email_settings").select("category_enabled,sender_from,updated_at").eq("id", true).maybeSingle(),
        loadDomains(),
        loadUsage(),
        admin.from("platform_email_log").select("id", { count: "exact", head: true }).eq("status", "sent"),
        admin.from("platform_email_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()),
        admin.from("platform_email_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()),
        admin.from("platform_email_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        admin.from("platform_email_log").select("id", { count: "exact", head: true }).eq("status", "skipped").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        admin.from("platform_email_log").select("id,created_at,category,source,recipient_domain,subject,status,provider_id,error_message").order("created_at", { ascending: false }).limit(50),
        ...CATEGORIES.map((category) =>
          admin.from("platform_email_log").select("id", { count: "exact", head: true }).eq("status", "sent").eq("category", category)
        ),
      ]);

    if (settingsResult.error) throw new Error(settingsResult.error.message);
    if (recentResult.error) throw new Error(recentResult.error.message);
    const usage = usagePayload?.data ?? usagePayload;
    const quota = {
      emailsUsed: typeof usage?.emails?.monthly?.used === "number" ? usage.emails.monthly.used : null,
      emailsLimit: typeof usage?.emails?.monthly?.limit === "number" ? usage.emails.monthly.limit : null,
      emailsResetsAt: typeof usage?.emails?.monthly?.resets_at === "string" ? usage.emails.monthly.resets_at : null,
      emailsDailyUsed: typeof usage?.emails?.daily?.used === "number" ? usage.emails.daily.used : null,
      emailsDailyLimit: typeof usage?.emails?.daily?.limit === "number" ? usage.emails.daily.limit : null,
      emailsDailyResetsAt: typeof usage?.emails?.daily?.resets_at === "string" ? usage.emails.daily.resets_at : null,
      domainsUsed: typeof usage?.domains?.used === "number" ? usage.domains.used : null,
      domainsLimit: typeof usage?.domains?.limit === "number" ? usage.domains.limit : null,
    };
    const sourceCounts = await Promise.all(SOURCES.map((source) =>
      admin.from("platform_email_log").select("id", { count: "exact", head: true }).eq("status", "sent").eq("source", source)
    ));
    const enabledDefaults = { notifications: true, marketing: true, support: true, security: true, staff: true };
    const senderDefaults = { notifications: "", marketing: "", support: "", security: "", staff: "" };

    return NextResponse.json({
      settings: {
        categoryEnabled: { ...enabledDefaults, ...(settingsResult.data?.category_enabled ?? {}) },
        senderFrom: { ...senderDefaults, ...(settingsResult.data?.sender_from ?? {}) },
        updatedAt: settingsResult.data?.updated_at ?? null,
      },
      domains,
      quota,
      metrics: {
        sentTotal: sentTotal.count ?? 0,
        sentToday: sentToday.count ?? 0,
        sentMonth: sentMonth.count ?? 0,
        failedMonth: failedMonth.count ?? 0,
        skippedMonth: skippedMonth.count ?? 0,
        byCategory: Object.fromEntries(CATEGORIES.map((category, index) => [category, categoryCounts[index]?.count ?? 0])),
        bySource: Object.fromEntries(SOURCES.map((source, index) => [source, sourceCounts[index]?.count ?? 0])),
      },
      recent: recentResult.data ?? [],
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not load email controls.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await authorize();
  if (!auth) return jsonError("Only Super Admin can change email controls.", 403);

  const body = (await request.json().catch(() => null)) as (JsonObject & { action?: unknown }) | null;
  if (!body || typeof body.action !== "string") return jsonError("Invalid request.");

  try {
    const admin = createAdminClient();

    if (body.action === "save-settings") {
      const categoryEnabled = body.categoryEnabled as JsonObject | undefined;
      const senderFrom = body.senderFrom as JsonObject | undefined;
      if (!categoryEnabled || !senderFrom) return jsonError("Email settings are incomplete.");
      for (const category of CATEGORIES) {
        if (typeof categoryEnabled[category] !== "boolean") return jsonError(`Invalid enabled state for ${category}.`);
        if (typeof senderFrom[category] !== "string") return jsonError(`Invalid sender for ${category}.`);
      }

      const domains = await loadDomains();
      const verifiedDomains = new Set(
        domains.filter((domain: any) => domain.status === "verified").map((domain: any) => String(domain.name).toLowerCase())
      );
      const normalizedSenders: Record<EmailCategory, string> = { notifications: "", marketing: "", support: "", security: "", staff: "" };
      for (const category of CATEGORIES) {
        const email = String(senderFrom[category]).trim().toLowerCase();
        if (!email) continue;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(`Enter a valid sender email for ${category}.`);
        const domain = email.split("@").pop() ?? "";
        if (!verifiedDomains.has(domain)) {
          return jsonError(`The sender domain for ${category} is not verified in Resend. Verify the domain first.`);
        }
        normalizedSenders[category] = email;
      }

      const { error } = await admin.from("platform_email_settings").upsert({
        id: true,
        category_enabled: Object.fromEntries(CATEGORIES.map((category) => [category, categoryEnabled[category]])),
        sender_from: normalizedSenders,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      });
      if (error) throw new Error(error.message);
      await recordAudit(auth.staffProfile?.name ?? auth.user.email ?? auth.user.id, "email_settings_updated", "Updated email category switches and sender addresses.");
      return NextResponse.json({ success: true });
    }

    if (body.action === "add-domain") {
      const name = typeof body.name === "string" ? body.name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
      if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(name)) {
        return jsonError("Enter a valid domain name, without a URL or path.");
      }
      const payload = await resendRequest("/domains", {
        method: "POST",
        body: JSON.stringify({ name, region: "us-east-1" }),
      });
      await recordAudit(auth.staffProfile?.name ?? auth.user.email ?? auth.user.id, "email_domain_added", `Added sending domain ${name}; DNS verification is pending.`);
      return NextResponse.json({ success: true, domain: payload });
    }

    if (body.action === "verify-domain") {
      const domainId = typeof body.domainId === "string" ? body.domainId : "";
      if (!/^[0-9a-f-]{20,}$/i.test(domainId)) return jsonError("Invalid domain ID.");
      const payload = await resendRequest(`/domains/${encodeURIComponent(domainId)}/verify`, { method: "POST", body: "{}" });
      await recordAudit(auth.staffProfile?.name ?? auth.user.email ?? auth.user.id, "email_domain_verification_requested", `Requested verification for domain ID ${domainId}.`);
      return NextResponse.json({ success: true, domain: payload });
    }

    if (body.action === "remove-domain") {
      const domainId = typeof body.domainId === "string" ? body.domainId : "";
      if (!/^[0-9a-f-]{20,}$/i.test(domainId)) return jsonError("Invalid domain ID.");
      const domains = await loadDomains();
      const target = domains.find((domain: any) => domain.id === domainId);
      if (!target) return jsonError("Domain was not found.", 404);
      const { data: settings } = await admin.from("platform_email_settings").select("sender_from").eq("id", true).maybeSingle();
      const senderFrom = (settings?.sender_from ?? {}) as Record<string, string>;
      if (Object.values(senderFrom).some((email) => typeof email === "string" && email.toLowerCase().endsWith(`@${String(target.name).toLowerCase()}`))) {
        return jsonError("This domain is assigned to a sender category. Choose another sender before removing it.");
      }
      await resendRequest(`/domains/${encodeURIComponent(domainId)}`, { method: "DELETE" });
      await recordAudit(auth.staffProfile?.name ?? auth.user.email ?? auth.user.id, "email_domain_removed", `Removed sending domain ${String(target.name)}.`);
      return NextResponse.json({ success: true });
    }

    return jsonError("Unsupported email-control action.");
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Email control action failed.", 500);
  }
}
