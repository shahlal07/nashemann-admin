import "server-only";

// Resend, called directly over fetch rather than through the `resend` SDK --
// avoids adding a dependency for what is a single POST endpoint. Deliberately
// best-effort throughout: a failed send here must never fail the real admin
// action (application decision, settlement payment, staff invite, ...) it's
// reporting on, since that side effect already succeeded server-side.
// Errors are logged, not thrown.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const FROM_NOTIFICATIONS = "Nashemann <notifications@nashemann.store>";
const FROM_STAFF = "Nashemann Staff <staff@nashemann.store>";
const FROM_SECURITY = "Nashemann Security <security@nashemann.store>";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nashemann.store";

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

async function sendMail(params: { to: string; subject: string; html: string; from?: string }): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(`[email] Skipped "${params.subject}" to ${params.to} -- RESEND_API_KEY not set.`);
    return;
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from ?? FROM_NOTIFICATIONS,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: htmlToText(params.html),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend rejected "${params.subject}" to ${params.to}: ${res.status} ${body}`);
    }
  } catch (err) {
    console.error(`[email] Failed to send "${params.subject}" to ${params.to}:`, err);
  }
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
  await sendMail({ to: params.to, subject: params.title, html });
}

export async function sendStaffInviteEmail(params: { to: string; name: string; roleLabel: string; setPasswordUrl: string }): Promise<void> {
  const html = wrapEmail(`
    <h2 style="margin-top:0;">You've been invited to Nashemann Admin</h2>
    <p>${params.name}, you've been added as <strong>${params.roleLabel}</strong> on the Nashemann admin panel.</p>
    <p style="margin-top:14px;">Set your password to finish signing in:</p>
    ${button(params.setPasswordUrl, "Set your password")}
    <p style="margin-top:18px;color:#6b7280;font-size:13px;">This link expires soon -- if it's stopped working, ask a super admin to resend your invite.</p>
  `);
  await sendMail({ to: params.to, subject: "You've been invited to Nashemann Admin", html, from: FROM_STAFF });
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
  await sendMail({ to: params.to, subject: `${params.storeName} admin credentials updated`, html, from: FROM_SECURITY });
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
