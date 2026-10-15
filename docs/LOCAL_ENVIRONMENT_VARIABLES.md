# Local Environment Variables

Last updated: 2026-10-15

**WARNING:** Never commit actual secret values. This file documents variable names only.

## Shared Variables (All Apps)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Service role key (server-side only) |
| `GROQ_API_KEY` | Some | AI/automation features |

## nashemann-web

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## nashemann-admin

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
RESEND_API_KEY=
VENDOR_PROVISION_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## vendor-storefronts

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3002
NEXT_PUBLIC_ADMIN_URL=http://localhost:3003
```

## vendor-admins

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
NASHEMANN_PROVISIONING_SECRET=
VENDOR_PROVISION_SECRET=
NEXT_PUBLIC_SITE_URL=http://localhost:3003
```

## Getting Credentials

### Supabase Keys

1. Go to https://supabase.com/dashboard
2. Select project: "new nashemann"
3. Settings > API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### From Vercel

```batch
cd nashemann-admin
vercel env pull .env.local --environment production
```

This downloads all production environment variables.

## Security Notes

1. **Never** commit `.env.local` files
2. **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in browser code
3. **Never** share secrets in chat, documentation, or screenshots
4. Use `.env.example` for documentation with placeholder values
