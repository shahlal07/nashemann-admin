import "server-only";

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
}

export function getPlatformAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serviceRoleKey();
  if (!url || !key) {
    throw new Error("Supabase service-role credentials are not configured for platform administration.");
  }

  adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}

export function platformInternalSecret(): string {
  const configured = process.env.VENDOR_PROVISION_SECRET ?? process.env.INTERNAL_PLATFORM_SECRET;
  if (configured) return configured;

  const key = serviceRoleKey();
  if (!key) throw new Error("Platform internal secret is not configured.");
  return createHash("sha256").update(key).digest("hex");
}

export function assertPlatformInternalRequest(request: Request) {
  const supplied = request.headers.get("x-nashemann-provisioning-secret");
  if (!supplied || supplied !== platformInternalSecret()) {
    throw new Response(JSON.stringify({ error: "Unauthorized platform request." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
}

export function platformBaseUrl(): string {
  const configured = process.env.VENDOR_PROVISION_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) return productionUrl.startsWith("http") ? productionUrl : `https://${productionUrl}`;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");

  throw new Error("Platform base URL is not configured.");
}

export function platformUrl(path: string): string {
  const url = new URL(platformBaseUrl());
  url.pathname = path;
  url.search = "";
  return url.toString();
}

export type EnvDiagnostic = {
  ok: boolean;
  missing: string[];
  supabaseUrl: string | null;
  hasServiceKey: boolean;
  hasProvisionSecret: boolean;
};

export function diagnosePlatformEnv(): EnvDiagnostic {
  const missing: string[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");

  const hasServiceKey = Boolean(serviceRoleKey());
  if (!hasServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)");

  const hasProvisionSecret = Boolean(
    process.env.VENDOR_PROVISION_SECRET ?? process.env.INTERNAL_PLATFORM_SECRET
  );
  if (!hasProvisionSecret) missing.push("VENDOR_PROVISION_SECRET (or INTERNAL_PLATFORM_SECRET)");

  return {
    ok: missing.length === 0,
    missing,
    supabaseUrl,
    hasServiceKey,
    hasProvisionSecret,
  };
}
