import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_NOTIFICATIONS = "Nashemann <notifications@nashemann.store>";
const FROM_MARKETING = "Nashemann <marketing@nashemann.store>";
const FROM_SUPPORT = "Nashemann Support <support@nashemann.store>";
const FROM_STAFF = "Nashemann Staff <staff@nashemann.store>";
const FROM_SECURITY = "Nashemann Security <security@nashemann.store>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nashemann.store";

export type InternalEmailCategory = "notifications" | "marketing" | "support" | "security" | "staff";
type EmailStatus = "sent" | "failed" | "skipped";
type EmailPolicy = {
  categoryEnabled: Record<InternalEmailCategory, boolean>;
  senderFrom: Record<InternalEmailCategory, string>;
};

const CATEGORIES: InternalEmailCategory[] = ["notifications", "marketing", "support", "security", "staff"];
const DEFAULT_ENABLED: Record<InternalEmailCategory, boolean> = {
  notifications: true, marketing: true, support: true, security: true, staff: true,
};
const DEFAULT_SENDERS: Record<InternalEmailCategory, string> = {
  notifications: "", marketing: "", support: "", security: "", staff: "",
};
const CATEGORY_LABELS: Record<InternalEmailCategory, string> = {
  notifications: "Notifications", marketing: "Marketing", support: "Support", security: "Security", staff: "Staff",
};
const DEFAULT_FROM: Record<InternalEmailCategory, string> = {
  notifications: FROM_NOTIFICATIONS, marketing: FROM_MARKETING, support: FROM_SUPPORT, security: FROM_SECURITY, staff: FROM_STAFF,
};

async function loadEmailPolicy(): Promise<EmailPolicy> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("platform_email_settings")
      .select("category_enabled,sender_from").eq("id", true).maybeSingle();
    if (error) throw error;
    return {
      categoryEnabled: { ...DEFAULT_ENABLED, ...(data?.category_enabled ?? {}) },
      senderFrom: { ...DEFAULT_SENDERS, ...(data?.sender_from ?? {}) },
    };
  } catch (error) {
    console.error("[email] Could not load email policy; using safe defaults:", error);
    return { categoryEnabled: { notifications: false, marketing: false, support: false, security: false, staff: false }, senderFrom: { ...DEFAULT_SENDERS } };
  }
}

async function recordEmailEvent(params: {
  category: InternalEmailCategory; source: string; to: string; subject: string;
  status: EmailStatus; providerId?: string | null; errorMessage?: string | null;
}) {
  try {
    const admin = createAdminClient();
    const recipientDomain = params.to.split("@").pop()?.toLowerCase().slice(0, 253) ?? null;
    const { error } = await admin.from("platform_email_log").insert({
      category: params.category, source: params.source.slice(0, 80), recipient_domain: recipientDomain,
      subject: params.subject.slice(0, 240), status: params.status, provider_id: params.providerId ?? null,
      error_message: params.errorMessage?.slice(0, 1000) ?? null,
    });
    if (error) console.error("[email] Could not record email event:", error.message);
  } catch (error) {
    console.error("[email] Could not record email event:", error);
  }
}

function inferCategory(from?: string): InternalEmailCategory {
  if (from === FROM_MARKETING || /marketing@/i.test(from ?? "")) return "marketing";
  if (from === FROM_SUPPORT || /support@/i.test(from ?? "")) return "support";
  if (from === FROM_SECURITY || /security@/i.test(from ?? "")) return "security";
  if (from === FROM_STAFF || /staff@/i.test(from ?? "")) return "staff";
  return "notifications";
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(lt|gt|quot|#39);/g, (m) => ({ "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[m] ?? m))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendMail(params: {
  to: string; subject: string; html: string; from?: string;
  category?: InternalEmailCategory; source?: string;
}): Promise<boolean> {
  const category = params.category ?? inferCategory(params.from);
  const source = params.source ?? "nashemann-admin";
  const policy = await loadEmailPolicy();
  if (policy.categoryEnabled[category] === false) {
    await recordEmailEvent({ category, source, to: params.to, subject: params.subject, status: "skipped", errorMessage: "Email category disabled by Super Admin." });
    console.info(`[email] Skipped "${params.subject}" because category "${category}" is disabled.`);
    return false;
  }

  if (!RESEND_API_KEY) {
    await recordEmailEvent({ category, source, to: params.to, subject: params.subject, status: "failed", errorMessage: "RESEND_API_KEY is not configured." });
    console.warn(`[email] Skipped "${params.subject}" -- RESEND_API_KEY not set.`);
    return false;
  }

  const configuredSender = policy.senderFrom[category];
  const from = configuredSender && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredSender)
    ? `Nashemann ${CATEGORY_LABELS[category]} <${configuredSender}>`
    : params.from ?? DEFAULT_FROM[category];

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html, text: htmlToText(params.html) }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend rejected "${params.subject}": ${res.status} ${body}`);
      await recordEmailEvent({ category, source, to: params.to, subject: params.subject, status: "failed", errorMessage: `Resend HTTP ${res.status}: ${body}` });
      return false;
    }
    const payload = await res.json().catch(() => ({}));
    await recordEmailEvent({ category, source, to: params.to, subject: params.subject, status: "sent", providerId: typeof payload?.id === "string" ? payload.id : null });
    return true;
  } catch (err) {
    console.error(`[email] Failed to send "${params.subject}":`, err);
    await recordEmailEvent({ category, source, to: params.to, subject: params.subject, status: "failed", errorMessage: err instanceof Error ? err.message : "Network error" });
    return false;
  }
}

export async function sendInternalTransactionalEmail(params: {
  to: string; subject: string; html: string; category?: InternalEmailCategory; source?: string;
}): Promise<boolean> {
  return sendMail({
    to: params.to, subject: params.subject, html: params.html,
    category: params.category ?? "notifications", source: params.source ?? "external",
  });
}

function wrapEmail(bodyHtml: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#111827;padding:22px 24px;border-radius:14px 14px 0 0;">
        <span style="color:#fff;font-size:19px;font-weight:700;letter-spacing:-0.01em;">Nashemann</span>
      </div>
      <div style="background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 14px 14px;padding:26px;color:#1f2937;">
        ${bodyHtml}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
        Nashemann · multi-vendor storefronts, one platform · <a href="${SITE_URL}" style="color:#9ca3af;">nashemann.store</a>
      </p>
    </div>
  `;
}

function button(href: string, label: string, color = "#111827"): string {
  return `<a href="${href}" style="display:inline-block;margin-top:18px;background:${color};color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:14px;">${label}</a>`;
}

export async function sendApplicationStatusEmail(params: {
  to: string;
  ownerName: string;
  businessName: string;
  referenceId: string;
  status: "approved" | "rejected";
  subdomain?: string;
}): Promise<void> {
  const isApproved = params.status === "approved";
  const storeUrl = params.subdomain ? `https://${params.subdomain}.nashemann.store` : undefined;
  const html = wrapEmail(
    isApproved
      ? `
        <h2 style="margin-top:0;">You're in, ${params.ownerName.split(" ")[0]} 🎉</h2>
        <p><strong>${params.businessName}</strong> has been approved and your storefront is live on Nashemann.</p>
        ${storeUrl ? `<p style="margin:18px 0;">Your store:</p><p style="font-weight:700;">${storeUrl}</p>` : ""}
        <p style="margin-top:18px;">Sign in to your vendor dashboard to add products, connect a payment method, and start taking orders.</p>
        ${button(`${SITE_URL}/signup?returnTo=/vendor/dashboard`, "Go to your dashboard")}
      `
      : `
        <h2 style="margin-top:0;">About your application, ${params.ownerName.split(" ")[0]}</h2>
        <p>We've reviewed <strong>${params.businessName}</strong>'s application (ref. ${params.referenceId}) and aren't able to move forward with it at this time.</p>
        <p style="margin-top:14px;">If you think this was a mistake or want more detail, reply to this email and we'll get back to you.</p>
      `
  );
  await sendMail({
    to: params.to,
    subject: isApproved ? `You're approved — welcome to Nashemann, ${params.businessName}` : `Update on your Nashemann application — ${params.referenceId}`,
    html,
  });
}

export async function sendSupportReplyEmail(params: {
  to: string;
  customerName: string;
  message: string;
}): Promise<void> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;">You have a reply from Nashemann Support</h2>
    <p>Hello ${escapeHtml(params.customerName || "there")},</p>
    <p>Our support team replied to your conversation:</p>
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #6d5dfc;background:#f9fafb;white-space:pre-wrap;">${escapeHtml(params.message)}</blockquote>
    <p>Sign in to your Nashemann account if you need to continue the conversation.</p>
    ${button("https://nashemann.store/account", "Open your account")}
  `);
  await sendMail({ to: params.to, subject: "New reply from Nashemann Support", html, category: "support" });
}

export async function sendSettlementPaidEmail(params: {
  to: string;
  vendorName: string;
  monthLabel: string;
  amountPaid: number;
  grossRevenue: number;
  platformFee: number;
}): Promise<void> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;">Settlement paid — ${params.monthLabel}</h2>
    <p>Your platform fee settlement for <strong>${params.monthLabel}</strong> has been marked as paid.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Gross revenue</td><td style="padding:6px 0;text-align:right;">Rs ${Math.round(params.grossRevenue).toLocaleString("en-PK")}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Platform fee</td><td style="padding:6px 0;text-align:right;">Rs ${Math.round(params.platformFee).toLocaleString("en-PK")}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Amount paid</td><td style="padding:6px 0;text-align:right;font-weight:700;">Rs ${Math.round(params.amountPaid).toLocaleString("en-PK")}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:13px;">Thanks for keeping your account current, ${params.vendorName}.</p>
  `);
  await sendMail({ to: params.to, subject: `Settlement paid — ${params.monthLabel}`, html });
}

export async function sendAnnouncementEmail(params: {
  to: string;
  categoryLabel: string;
  title: string;
  message: string;
}): Promise<void> {
  const html = wrapEmail(`
    <p style="display:inline-block;background:#f3f4f6;color:#374151;font-size:11px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;padding:4px 10px;border-radius:999px;">${params.categoryLabel}</p>
    <h2 style="margin-top:12px;">${params.title}</h2>
    <p style="white-space:pre-wrap;">${params.message}</p>
  `);
  await sendMail({ to: params.to, subject: params.title, html, category: "marketing" });
}

export async function sendStaffInviteEmail(params: { to: string; name: string; roleLabel: string; setPasswordUrl: string }): Promise<void> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;">You've been invited to Nashemann Admin</h2>
    <p>${params.name}, you've been added as <strong>${params.roleLabel}</strong> on the Nashemann admin panel.</p>
    <p style="margin-top:14px;">Set your password to finish signing in:</p>
    ${button(params.setPasswordUrl, "Set your password")}
    <p style="margin-top:18px;color:#6b7280;font-size:13px;">This link expires soon -- if it's stopped working, ask a super admin to resend your invite.</p>
  `);
  await sendMail({ to: params.to, subject: "You've been invited to Nashemann Admin", html, from: FROM_STAFF, category: "staff" });
}

export async function sendAccountEmailChangedNotice(params: { to: string; newEmail: string; isOldAddress: boolean }): Promise<void> {
  const html = wrapEmail(
    params.isOldAddress
      ? `
        <h2 style="margin-top:0;">Your account's sign-in email was changed</h2>
        <p>Your Nashemann vendor account's sign-in email was just changed to <strong>${params.newEmail}</strong> by platform staff.</p>
        <p style="margin-top:14px;">If you didn't request this, contact Nashemann support immediately.</p>
      `
      : `
        <h2 style="margin-top:0;">This is your account's new sign-in email</h2>
        <p>Your Nashemann vendor account's sign-in email was just changed to this address (<strong>${params.newEmail}</strong>) by platform staff.</p>
        <p style="margin-top:14px;">If you didn't request this, contact Nashemann support immediately.</p>
      `
  );
  await sendMail({
    to: params.to,
    subject: "Your Nashemann account email was changed",
    html,
    from: FROM_SECURITY,
    category: "security",
  });
}

export async function sendVendorAdminCredentialsChangedEmail(params: {
  to: string;
  name: string;
  storeName: string;
  storeUrl: string;
  adminUrl: string;
  passwordChanged: boolean;
  temporaryPassword?: string;
}): Promise<void> {
  const passwordBlock = params.temporaryPassword
    ? `<div style="margin:18px 0;padding:14px 16px;background:#f3f4f6;border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;"><strong>Temporary password:</strong><br/>${params.temporaryPassword}</div>`
    : "";
  const html = wrapEmail(`
    <h2 style="margin-top:0;">Your ${params.storeName} admin access was updated</h2>
    <p>Hi ${params.name.split(" ")[0]}, a Nashemann super admin updated the credentials for your vendor admin account.</p>
    <p><strong>Store:</strong> ${params.storeUrl}<br/><strong>Admin panel:</strong> ${params.adminUrl}</p>
    ${passwordBlock}
    ${params.passwordChanged && !params.temporaryPassword ? "<p>Your password was changed. Use the new password provided to you by the platform administrator.</p>" : ""}
    ${button(params.adminUrl, "Open vendor admin")}
    <p style="margin-top:18px;color:#6b7280;font-size:13px;">If you did not expect this change, contact the Nashemann platform team.</p>
  `);
  await sendMail({ to: params.to, subject: `${params.storeName} admin credentials updated`, html, from: FROM_SECURITY, category: "security" });
}

export async function sendVendorAdminPasswordResetEmail(params: {
  to: string;
  name: string;
  storeName: string;
  resetUrl: string;
  adminUrl: string;
}): Promise<void> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;">Reset your ${params.storeName} admin password</h2>
    <p>Hi ${params.name.split(" ")[0]},</p>
    <p>The Nashemann Super Admin requested a password reset for your vendor admin account.</p>
    ${button(params.resetUrl, "Reset password", "#111827")}
    <p style="margin-top:18px;"><strong>Admin panel:</strong> ${params.adminUrl}</p>
    <p style="margin-top:18px;color:#6b7280;font-size:13px;">This link is single-use and expires according to your Supabase Auth recovery settings. If you did not request this, contact the Nashemann platform team.</p>
  `);
  await sendMail({ to: params.to, subject: `${params.storeName} admin password reset`, html, from: FROM_SECURITY });
}

export async function sendVendorAdminStoreNoticeEmail(params: {
  to: string;
  name: string;
  storeName: string;
  subject: string;
  message: string;
  storeUrl: string;
  adminUrl: string;
}): Promise<void> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;">${params.storeName} — platform update</h2>
    <p>Hi ${params.name.split(" ")[0]},</p>
    <p>${params.message}</p>
    <p><strong>Store:</strong> ${params.storeUrl}<br/><strong>Admin panel:</strong> ${params.adminUrl}</p>
    ${button(params.adminUrl, "Open vendor admin")}
  `);
  await sendMail({ to: params.to, subject: params.subject, html, from: FROM_NOTIFICATIONS });
}

export async function sendSettlementReminderEmail(params: {
  to: string;
  vendorName: string;
  monthLabel: string;
  platformFee: number;
  amountPaid: number;
  dueDate: string;
  stage: "before_due_7" | "due_today" | "overdue_3" | "overdue_7" | "suspended_10";
}): Promise<boolean> {
  const balance = Math.max(0, params.platformFee - params.amountPaid);
  const copy = {
    before_due_7: { subject: `Nashemann platform fee due soon — ${params.monthLabel}`, title: "Your platform fee invoice is ready", message: "Your invoice is due within the next 7 days. Please arrange payment before the due date." },
    due_today: { subject: `Nashemann platform fee due today — ${params.monthLabel}`, title: "Your platform fee is due today", message: "Your invoice reaches its due date today. Please arrange payment to avoid service interruption." },
    overdue_3: { subject: "Payment overdue — Nashemann platform fee", title: "Your platform fee is 3 days overdue", message: "Our records show an outstanding balance. Please pay or contact support if you believe this is incorrect." },
    overdue_7: { subject: "Final reminder — overdue Nashemann platform fee", title: "Final reminder before store suspension", message: "Your invoice is 7 days overdue. Stores with unpaid invoices may be suspended after the configured grace period." },
    suspended_10: { subject: "Store suspension due to overdue platform fee", title: "Your store has been suspended", message: "Your store was suspended automatically after the configured grace period. Superadmin must confirm payment before billing suspension can be lifted." },
  }[params.stage];
  const html = wrapEmail(`
    <h2 style="margin-top:0;">${copy.title}</h2>
    <p>Hello ${params.vendorName},</p>
    <p>${copy.message}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Billing period</td><td style="padding:6px 0;text-align:right;">${params.monthLabel}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Invoice total</td><td style="padding:6px 0;text-align:right;">Rs ${Math.round(params.platformFee).toLocaleString("en-PK")}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Payments recorded</td><td style="padding:6px 0;text-align:right;">Rs ${Math.round(params.amountPaid).toLocaleString("en-PK")}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Balance due</td><td style="padding:6px 0;text-align:right;font-weight:700;">Rs ${Math.round(balance).toLocaleString("en-PK")}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Due date</td><td style="padding:6px 0;text-align:right;">${params.dueDate}</td></tr>
    </table>
    <p>Payments are marked as confirmed only after verification by Nashemann Superadmin.</p>
    <p style="color:#6b7280;font-size:13px;">If you have already paid, contact platform support with your payment reference.</p>
  `);
  return sendMail({ to: params.to, subject: copy.subject, html });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function sendVendorPaymentReviewEmail(params: {
  to: string;
  vendorName: string;
  monthLabel: string;
  amount: number;
  balanceDue: number;
  reference: string;
  decision: "confirmed" | "rejected";
  reviewNote?: string | null;
}): Promise<boolean> {
  const confirmed = params.decision === "confirmed";
  const title = confirmed ? "Payment confirmed" : "Payment submission needs attention";
  const subject = confirmed
    ? `Nashemann payment confirmed — ${params.monthLabel}`
    : `Nashemann payment submission rejected — ${params.monthLabel}`;
  const html = wrapEmail(`
    <h2 style="margin-top:0;">${title}</h2>
    <p>Hello ${escapeHtml(params.vendorName)},</p>
    <p>${confirmed
      ? "Nashemann Superadmin verified the payment details you submitted. Your invoice balance has been updated."
      : "Your payment submission was not accepted. Please review the note below and submit corrected details if needed."}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Billing period</td><td style="padding:6px 0;text-align:right;">${escapeHtml(params.monthLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Payment amount</td><td style="padding:6px 0;text-align:right;">Rs ${Math.round(params.amount).toLocaleString("en-PK")}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Reference</td><td style="padding:6px 0;text-align:right;">${escapeHtml(params.reference)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Balance due</td><td style="padding:6px 0;text-align:right;font-weight:700;">Rs ${Math.round(params.balanceDue).toLocaleString("en-PK")}</td></tr>
    </table>
    ${params.reviewNote ? `<p><strong>Superadmin note:</strong> ${escapeHtml(params.reviewNote)}</p>` : ""}
    <p style="color:#6b7280;font-size:13px;">A billing-related suspension is lifted only after Superadmin-confirmed payments clear all overdue balances.</p>
  `);
  return sendMail({ to: params.to, subject, html });
}

export async function sendBillingJobFailureEmail(params: {
  to: string;
  runId: string;
  errorMessage: string;
}): Promise<boolean> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;color:#b91c1c;">Automated billing job failed</h2>
    <p>The daily Nashemann vendor billing job failed and needs attention.</p>
    <p><strong>Run ID:</strong> ${escapeHtml(params.runId)}</p>
    <p><strong>Error:</strong> ${escapeHtml(params.errorMessage.slice(0, 1000))}</p>
    <p>Please inspect the billing job run record and Vercel function logs before retrying manually.</p>
  `);
  return sendMail({ to: params.to, subject: "Action required: Nashemann billing job failed", html, from: FROM_SECURITY });
}
