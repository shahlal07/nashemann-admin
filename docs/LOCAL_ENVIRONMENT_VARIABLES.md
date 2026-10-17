# Local Environment Variables

Last updated: 2026-10-15

**Rule:** this file documents variable **names** and where to obtain them — never secret values.

## Where local values come from

1. **Supabase trio** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`): `supabase projects api-keys --project-ref eznxsosvsgkhexbjoolh`.
2. **Other Vercel vars:** `vercel env pull .env.local --environment production` per repo. Vars of type `sensitive` come back as the literal placeholder `[SENSITIVE]` and must be filled another way (previous local clone `E:\Claude\…\.env.local`, the Vercel dashboard, or a teammate).
3. **Local-only synthetic values** (set during local setup, intentionally different from production):
   - `VENDOR_PROVISION_SECRET` — same value in nashemann-admin and vendor-admins so the local handshake matches.
   - `VENDOR_PROVISION_URL` — `http://localhost:3003` (nashemann-admin).
   - `CRON_SECRET` (nashemann-admin) — local value for manual cron-endpoint tests.
4. Real legacy credentials recovered from the old local clone: `GROQ_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET` (vendor-storefronts), `GMAIL_USER`, `GMAIL_APP_PASSWORD`.

`.env*` is gitignored in all four repos (verified 2026-10-15).

## Variables by application

### nashemann-web (port 3000)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `NEXT_PUBLIC_APP_URL` (= `http://localhost:3000`).

### nashemann-admin (port 3001)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `VENDOR_PROVISION_SECRET`, `VENDOR_PROVISION_URL`, `NEXT_PUBLIC_APP_URL` (= `http://localhost:3001`), optional `INTERNAL_PLATFORM_SECRET`, `CRON_SECRET`.

### vendor-storefronts (port 3002)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (code also accepts `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NASHEMANN_MAILER_URL`, `ADMIN_ALERT_EMAIL`, `NEXT_PUBLIC_SITE_URL` (= `http://localhost:3002`), `NEXT_PUBLIC_ADMIN_URL` (= `http://localhost:3003`).

### vendor-admins (port 3003)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NASHEMANN_MAILER_URL`, `NASHEMANN_PROVISIONING_SECRET` (or `VENDOR_PROVISION_SECRET`), `ADMIN_IP_ALLOWLIST`, `NEXT_PUBLIC_SITE_URL` (= `http://localhost:3003`).

## Cross-app contracts

- nashemann-admin → vendor-admins provisioning: header `x-nashemann-provisioning-secret` must equal `VENDOR_PROVISION_SECRET` on the sender and `NASHEMANN_PROVISIONING_SECRET ?? VENDOR_PROVISION_SECRET` on the receiver; target base URL from `VENDOR_PROVISION_URL`.
- Cron endpoints require `Authorization: Bearer <CRON_SECRET>`.

## Security notes

- Never put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*`, client code, Git, or logs.
- Never disable RLS or bypass role checks to make local flows work.
- Production values of Vercel `sensitive` vars are only available in the Vercel dashboard to authorized owners.
