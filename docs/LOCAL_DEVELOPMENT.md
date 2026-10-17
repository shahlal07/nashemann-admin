# Local Development Environment

Last updated: 2026-10-15 — all four apps verified running locally.

## Quick Start

From `C:\Users\pc\OneDrive\Documents\GitHub`, run `dev-all.bat`. It opens one minimized console per app. `dev-check.bat` health-checks all ports; `dev-stop.bat` stops them.

## Local URLs and ports

| Application | Port | Local URL | Repository | Vercel project | Production URL |
|---|---|---|---|---|---|
| Customer marketplace | 3000 | http://localhost:3000 | shahlal07/nashemann-web | nashemann-web | https://nashemann-web.vercel.app |
| Platform admin (project brain) | 3001 | http://localhost:3001 | shahlal07/nashemann-admin | nashemann-admin | https://nashemann-admin.vercel.app |
| Vendor storefronts | 3002 | http://localhost:3002 | shahlal07/vendor-storefronts | vendor-storefronts | https://minacafe.nashemann.store |
| Vendor operations | 3003 | http://localhost:3003 | shahlal07/vendor-admins | vendor-admins | https://admin.nashemann.store |

All four Vercel projects live under team `kashif11`. The GitHub homepages for the vendor repos still point at `theaamghar-web.vercel.app` / `theaamghar-admin.vercel.app` (older aliases); the real projects are `vendor-storefronts` / `vendor-admins`.

Start a single app:

```batch
cd nashemann-web && npm run dev -- -p 3000
```

## Supabase

All four apps share one Supabase project (confirmed by code and env):

- **Project:** new nashemann — ref `eznxsosvsgkhexbjoolh`, region Southeast Asia (Singapore).
- Each repo has a `supabase/` folder (untracked) from `supabase link`, so CLI commands work from any repo root.

### How `.env.local` was populated (2026-10-15)

1. `vercel env pull --environment production` for each project.
2. **Limitation found:** vars stored as Vercel `sensitive` type are never returned by the API; the pull writes literal `[SENSITIVE]`. Affected names varied per project (Supabase URL/keys, GROQ, RESEND, CRON, provisioning secrets, APP_URL).
3. Real values were recovered from:
   - Supabase CLI (`supabase projects api-keys`) for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (same project for all apps).
   - The previous local clone at `E:\Claude\…\.env.local` for `GROQ_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET` (vendor-storefronts), `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
4. Local-only synthetic values were set in `.env.local` files (names only here): `VENDOR_PROVISION_SECRET` (same value in nashemann-admin + vendor-admins so the local provisioning handshake matches), `VENDOR_PROVISION_URL=http://localhost:3003`, `CRON_SECRET` (nashemann-admin). These deliberately do **not** match production values; they only affect localhost.
5. Duplicate `.env.local` keys left by `vercel env pull` merging were de-duplicated (first/local value kept).

All `.env*` files are gitignored in all four repos (verified). Never commit or print these values.

## Authentication

- Login pages verified loading locally: nashemann-admin `/login` → 200 with a working Supabase client (the earlier 500 `Invalid supabaseUrl` was caused by the `[SENSITIVE]` placeholder env, now fixed).
- Middleware: nashemann-admin redirects unauthenticated `/` → `/login` (307), correct behaviour. nashemann-web and vendor-storefronts only refresh sessions.
- Real credentials work locally — password sign-in does not depend on redirect URLs.

**Required one-time user action (not yet verified):** in Supabase Dashboard → Authentication → URL Configuration, ensure these are in the Redirect URLs list (do not remove production URLs):

- `http://localhost:3000/auth/callback`
- `http://localhost:3001/auth/callback`
- `http://localhost:3002/auth/callback`
- `http://localhost:3003/auth/callback`

Until confirmed, OAuth / email-confirmation / password-reset links may redirect to the production Site URL instead of localhost. Password login and logout are unaffected.

Login types per app: nashemann-web (customers, public signup), nashemann-admin (staff via `staff_profiles` only), vendor-storefronts (per-storefront customers), vendor-admins (vendor operators).

## Verified test results (2026-10-15)

| Check | nashemann-web | nashemann-admin | vendor-storefronts | vendor-admins |
|---|---|---|---|---|
| Dev server HTTP | 200 | 200 (via /login 200, `/` 307→/login) | 200 | 200 |
| `npm run build` | PASS | PASS | PASS | PASS |
| `npm run lint` | 1 error, 5 warnings (pre-existing) | 16 errors, 3 warnings (pre-existing) | 0 errors, 8 warnings | 4 errors, 1 warning (pre-existing) |
| Tests | none configured | none configured | PASS 47/47 (vitest) | PASS 35/35 (vitest) |
| Typecheck | n/a (no script) | n/a (no script) | PASS (`next typegen && tsc --noEmit`) | n/a (tests excluded from tsconfig) |

Lint errors are pre-existing code issues (e.g. `no-explicit-any`, `<img>` usage, `<a>` instead of `<Link>`) — no source was changed by this setup work.

## Integration limitations on localhost

| Integration | Local status | Notes |
|---|---|---|
| Supabase Auth (password login) | Works | Real users, real project |
| Supabase Auth (OAuth / email links / reset) | Needs localhost in redirect URLs | See one-time action above |
| Email (Resend / Gmail) | Key present, delivery NOT verified | Do not test against real customers |
| GROQ AI features | Key present, not tested | |
| Cron endpoints | Testable manually with local `CRON_SECRET` | Real Vercel crons do not run locally |
| Admin↔vendor provisioning | Handshake configured with local-only secrets | Production secrets live in Vercel `sensitive` vars |
| Payments / webhooks | Production-only | Never test live charges locally |

## Environment indicator

Everything local connects to the **production Supabase project**. Treat all writes as production writes: no fake orders, no inventory changes, no customer emails while testing.

## Troubleshooting

- **Port busy:** `netstat -ano | findstr :3000` then `taskkill /PID <pid> /T /F`.
- **Nothing listening / stale browser page:** apps must be started with `dev-all.bat` (processes started from inside an agent shell die with it). If a browser shows an old unrelated page, hard-refresh (Ctrl+Shift+R) — it is cached content, not a running server.
- **`Invalid supabaseUrl` 500:** `.env.local` has a `[SENSITIVE]` placeholder for `NEXT_PUBLIC_SUPABASE_URL` — restore real values (Supabase CLI `supabase projects api-keys`).
- **Restart a single app:** close its console window and rerun the start command for that port.

## Production vs local

| Feature | Production | Local |
|---|---|---|
| Database & Auth | Production Supabase | Production Supabase (read/write carefully) |
| Emails, payments, cron | Live | Not exercised |
| Deploy | Vercel only, on explicit approval | Never deploys — local code only |
