# CLAUDE.md

## What Nashemann Admin actually is (read this before touching vendor code)

This is Nashemann's **super-admin console** — platform-wide oversight:
reviewing/approving vendor applications, RBAC (5 roles: Super Admin, Admin,
Finance, Support, Read-Only), platform-wide audit trail, settlements,
pricing plans, influencer program, staff management. Its own Supabase
project is `mztayodmvdpzzwzznsvu`. Admin login:
`superadmin@nashemann.com` (password rotated 2026-08-16, ask the platform
owner rather than assuming a value here).

**This app does NOT manage any individual vendor's day-to-day operations**
(their products, their orders, their storefront content) — that's
`vendor-admins`'s job (`E:\Claude\vendor-admins`, Supabase project
`eznxsosvsgkhexbjoolh`), the real, shared, already-multi-tenant vendor-admin
app every Nashemann-onboarded vendor actually uses. A vendor approved
through this app's Applications page gets provisioned with a real login
*there*, not here. See `vendor-admins/CLAUDE.md`'s "This is now the real
multi-vendor engine" section for the full architecture and how Mina Cafe
(vendor #2, onboarded 2026-08-16) was provisioned through it.

### A real architecture correction happened mid-build (2026-08-16)

Earlier the same night, a full storefront-with-checkout system
(`nashemann-web/src/app/store/[slug]`, backed by new tables in *this*
project's database) was mistakenly built as if Nashemann itself should host
vendor storefronts. **That was corrected the same session** — vendor
storefronts belong on `vendor-storefronts`'s already-mature engine, not
duplicated here. See `nashemann-web/CLAUDE.md` for the full note and the
cleanup debt this left behind (the old route/tables aren't deleted yet,
just no longer the intended path).

**Practical implication for this app**: the vendor detail page
(`/vendors/[id]`)'s "Store" section (slug, storefront domain, admin domain,
active/inactive) was built assuming Nashemann's own routes — verify it's
now pointing at the vendor's real `vendor-storefronts`/`vendor-admins`
domains (`{slug}.nashemann.store` / `admin.{slug}.nashemann.store`) rather
than anything under `nashemann-web`'s own `/store/` path before trusting
those links.

### What legitimately belongs in this app (built correctly, keep)

Vendor Applications (real approve/reject → creates real `vendors`/
`vendor_admins` rows that then get provisioned into `vendor-admins`
separately), RBAC + audit trail, Settlements/Platform Fees (this app's own
settlement tracking is genuinely Nashemann's concern — platform fee
reconciliation across vendors — distinct from `vendor-admins`'s
per-vendor order/profit tracking), Pricing Plans, Influencer program, Staff
management, Website Content (Nashemann's own marketing site copy, not any
vendor's storefront content — that's `site_content` on the
`vendor-storefronts` side instead), real Resend email wiring.

### Domain plan

`superadmin.nashemann.store` → this app. Every vendor's real admin
subdomain (`admin.{slug}.nashemann.store`) → `vendor-admins`'s Vercel
project, not this one — assigned per-vendor in the Vercel dashboard (no
domain-management API tool available in this environment; manual one-time
step per vendor).

@AGENTS.md
