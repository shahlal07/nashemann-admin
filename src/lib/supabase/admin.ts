/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema types are not generated in this repository yet; query boundaries are guarded by server authorization and database RLS. */
import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient<any>> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for privileged vendor administration.");
  }

  adminClient = createClient<any>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return adminClient;
}
