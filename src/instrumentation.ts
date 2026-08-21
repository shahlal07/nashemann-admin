import { createHash } from "node:crypto";

export async function register() {
  if (!process.env.VENDOR_PROVISION_URL) {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    if (host) process.env.VENDOR_PROVISION_URL = host.startsWith("http") ? host : `https://${host}`;
  }

  if (!process.env.VENDOR_PROVISION_SECRET) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (serviceRoleKey) {
      process.env.VENDOR_PROVISION_SECRET = createHash("sha256").update(serviceRoleKey).digest("hex");
    }
  }
}
