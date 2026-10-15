# Local Development Environment

Last updated: 2026-10-15

## Quick Start

From the GitHub folder, run:
```batch
dev-all.bat
```

This starts all 4 applications in separate windows.

## Application Ports

| Application | Port | Local URL | Purpose |
|-------------|------|-----------|---------|
| nashemann-web | 3000 | http://localhost:3000 | Customer marketplace |
| nashemann-admin | 3001 | http://localhost:3001 | Platform administration |
| vendor-storefronts | 3002 | http://localhost:3002 | Vendor storefronts |
| vendor-admins | 3003 | http://localhost:3003 | Vendor operations portal |

## Individual App Startup

```batch
cd nashemann-web && npm run dev -- -p 3000
cd nashemann-admin && npm run dev -- -p 3001
cd vendor-storefronts && npm run dev -- -p 3002
cd vendor-admins && npm run dev -- -p 3003
```

## Stop All Applications

```batch
dev-stop.bat
```

Or close individual command windows.

## Health Check

```batch
dev-check.bat
```

## Supabase Configuration

All 4 applications share the same Supabase project:
- **Project Name:** new nashemann
- **Project Ref:** eznxsosvsgkhexbjoolh
- **Region:** Southeast Asia (Singapore)

### Required Environment Variables

Each application needs these in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://eznxsosvsgkhexbjoolh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key - server only>
```

Additional variables per app:
- `NEXT_PUBLIC_SITE_URL` - The base URL for the current app
- `NEXT_PUBLIC_APP_URL` - Used by nashemann-admin
- `NEXT_PUBLIC_ADMIN_URL` - Used by vendor-storefronts

## Authentication

### Supabase Auth Callback URLs

Add these URLs to your Supabase project's allowed redirect URLs:

**Production URLs (already configured):**
- https://nashemann.vercel.app
- https://nashemann-admin.vercel.app
- https://theaamghar.vercel.app
- https://theaamghar-admin.vercel.app

**Local Development URLs (add these):**
- http://localhost:3000/auth/callback
- http://localhost:3001/auth/callback
- http://localhost:3002/auth/callback
- http://localhost:3003/auth/callback

To add localhost URLs in Supabase Dashboard:
1. Go to Authentication > URL Configuration
2. Add each localhost URL to "Redirect URLs"
3. Set Site URL to your primary local app (usually http://localhost:3000)

### Login Types by Application

| Application | Who Logs In | Auth Flow |
|-------------|-------------|-----------|
| nashemann-web | Customers | Public signup/login |
| nashemann-admin | Platform staff | Staff profiles required |
| vendor-storefronts | Customers (per vendor) | Public per storefront |
| vendor-admins | Vendor operators | Vendor account required |

## Tech Stack

All applications use:
- **Framework:** Next.js 16.x (Turbopack)
- **React:** 19.x
- **Package Manager:** npm
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with @supabase/ssr
- **Styling:** Tailwind CSS 4.x
- **Language:** TypeScript 5.x

## File Structure

```
C:\Users\pc\OneDrive\Documents\GitHub\
├── nashemann-web/        # Customer marketplace
├── nashemann-admin/      # Platform admin (project brain)
├── vendor-storefronts/   # Vendor storefronts
├── vendor-admins/        # Vendor operations
├── dev-all.bat          # Start all apps
├── dev-stop.bat         # Stop all apps
└── dev-check.bat        # Health check
```

## Troubleshooting

### Port Already in Use
```batch
netstat -ano | findstr ":3000"
taskkill /PID <pid> /F
```

### Dependencies Issues
```batch
npm ci
```

### Environment Variables Not Loading
1. Ensure `.env.local` exists in each repo
2. Restart the dev server
3. Check variable names match exactly (case-sensitive)

### Authentication Not Working
1. Verify Supabase URL and anon key are correct
2. Add localhost to Supabase redirect URLs
3. Clear browser cookies for localhost
4. Check middleware.ts for route protection

### Build Errors
```batch
npm run build
```
Check for TypeScript or ESLint errors.

## Known Limitations

1. **Email Delivery:** Uses production Resend/email provider; test emails may go to real addresses
2. **OAuth Providers:** May require separate localhost app registration
3. **Webhooks:** Stripe/payment webhooks point to production URLs
4. **Cron Jobs:** Defined in vercel.json but only run on Vercel

## Production vs Local

| Feature | Production | Local |
|---------|------------|-------|
| Database | Production Supabase | Production Supabase |
| Auth | Production Supabase | Production Supabase |
| Emails | Real delivery | Real delivery |
| Payments | Live Stripe | Live Stripe |
| Deployment | Vercel | localhost |

**Warning:** Local development connects to the production database. Be cautious with write operations.
