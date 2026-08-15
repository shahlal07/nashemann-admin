# Adding a new vendor to Nashemann

This is a step-by-step account of onboarding a real second-category vendor
("Nashemann Cafe Test", category **Beverages**, Islamabad) through the actual
admin UI, written immediately after doing it (Phase 2 "Vendor Engine Proof").
Following it end-to-end takes under 30 minutes, most of which is the category
schema step below (only needed the first time a truly new category shows up).

## 0. Check whether the category already exists

Nashemann's product-type system is fully data-driven: `public.category_product_schemas`
is the single source of truth for what fields/model a category uses, and both
`/vendors/new` (this admin app) and the vendor's own product forms read it at
request time. **No code changes are needed to onboard a vendor in an existing
category.**

```sql
select category, model, fields, variant_example, note
from category_product_schemas
order by display_order;
```

At the time of writing this had: Grocery, Bakery, Fruits, Vegetables, Dairy,
Meat, Organic, Clothing, Artisan, General Store, Other. There was **no
Beverages, Food, or Desserts category** — despite the platform roadmap
assuming Beverages/Food/Desserts exist as distinct categories. If your new
vendor's category is missing, add it (see step 1); if it already exists, skip
straight to step 2.

## 1. (Only if missing) Add the category schema

Use `apply_migration`, not `execute_sql` — this is DDL/seed data, not a
runtime query. Pick a `model`:

- `simple` — fixed-price items (Grocery, General Store)
- `weight_based` — sold by weight/box/bundle (Fruits, Vegetables, Dairy, Meat)
- `variant_based` — fixed size/color/attribute variants, not weight
  (Clothing, Artisan)

For Beverages (a cafe selling drinks in fixed cup sizes), `variant_based` was
the right fit — closer to Clothing's model than to Fruits':

```sql
insert into category_product_schemas (category, model, fields, variant_example, note, display_order)
values (
  'Beverages',
  'variant_based',
  array['Drink type', 'Size', 'Caffeine content', 'Dietary tags'],
  'Small / Medium / Large',
  'Fixed-size drink variants (cup sizes), not sold by weight -- closer to Clothing''s variant model than to Fruits.',
  4
);
```

That's the entire "code" footprint of supporting a brand-new category. No
`.tsx`/`.ts` file was touched to make `/vendors/new` show it, apply its field
list in the sidebar preview, or make it selectable — the category dropdown on
`/vendors/new` (`src/app/vendors/new/page.tsx`) queries
`category_product_schemas` on mount and renders whatever rows exist. This was
verified live: the new "Beverages" option and its field chips appeared in the
Create Store form immediately after the migration, with the dev server still
running and no rebuild/deploy.

## 2. Create the vendor via the admin UI

1. Sign in at `/login` with a `staff_profiles` account (role `super_admin` or
   `platform_staff`).
2. Go to **Vendors → New store** (`/vendors/new`).
3. Fill in:
   - **Business name** — e.g. "Nashemann Cafe Test"
   - **Category** — pick from the dropdown (now includes your new category if
     you added one)
   - **City** — pick something distinct from your other seeded vendors so the
     platform overview / vendor list stays easy to eyeball (used Islamabad;
     existing vendors were Lahore and Karachi)
   - **Subdomain** — lowercase, `[a-z0-9-]` only; the field auto-sanitizes as
     you type
4. **Owner account** — name, email, and a temporary password (min 8 chars).
   Relay the password to the vendor out of band; it is not stored anywhere
   after this screen.

   ⚠️ **Known gap, not something to quietly work around**: the UI copy here
   says *"A real login is created immediately — no email invite flow."* This
   is currently **not true**. The submit handler only inserts a row into
   `vendor_admins` (name/email/vendor_id/role) — it never calls
   `supabase.auth.admin.createUser()` or any equivalent, so **no
   `auth.users` row is created** and the temporary password you just typed is
   never actually set anywhere as a real credential. The vendor cannot log in
   with it. A real, working login only starts existing once the vendor
   independently visits nashemann-web's `/signup`, signs up as "Vendor" with
   the **same email** you entered here, and Supabase Auth's real `signUp()`
   flow creates both `auth.users` and `platform_accounts`. Only then does the
   `vendor_admins_select_self` RLS policy (which joins on
   `platform_accounts.email = vendor_admins.email`) start resolving, and the
   settlements/vendor-dashboard views start working for them. Until then this
   step effectively just reserves the owner's name/email against the vendor,
   nothing more. Fixing this (wiring a real `auth.admin.createUser` call, most
   likely from a small server route since the admin app has no `/api` routes
   today) is out of scope for this doc but is worth flagging to whoever owns
   `/vendors/new` next.
5. **Pricing plan** — Pay Per Order or Monthly.
6. **Starter theme** — pick an accent gradient distinct from your other
   vendors (used a coffee brown → tan gradient, `#6f4e37` → `#d2a679`, versus
   Bloom & Batter's pink/amber and Sabz Basket's greens) and optionally a logo
   image. The vendor can change these later from their own panel.
7. Submit. This performs exactly two writes, both visible in the network tab
   and confirmable by SQL immediately after:
   - `insert into vendors (...)  returning id`
   - `insert into vendor_admins (vendor_id, name, email, role) values (..., 'owner')`

   No storage bucket, auth account, or product rows are created automatically
   — the vendor starts with zero products and (per the gap above) zero real
   login.

## 3. Verify the vendor row

```sql
select id, name, subdomain, category, city, status, plan,
       theme_accent_from, theme_accent_to, theme_logo_emoji
from vendors
where subdomain = '<your-subdomain>';
```

`status` is set to `'active'` directly by the create-store flow (unlike the
`vendor_applications` → approve path, which presumably flips a `provisioning`
row to `active` on approval — this flow skips provisioning entirely since a
staff member is creating it directly).

## 4. Give the owner a real login (to actually test/use the dashboard)

Because of the gap in step 2, if you need the vendor's admin/dashboard login
to actually work (e.g. for testing), the owner — or you, standing in for them
— has to sign up separately:

1. Go to nashemann-web's `/signup`.
2. Choose **Vendor**, use the exact same email you entered in step 2.4.
3. Complete signup. If Supabase email confirmation is on, confirm the email
   before logging in; if it's off, a session starts immediately and a
   `platform_accounts` row is created there and then.
4. Log in at `/login` (default role is "Vendor") with that email/password.
   `platform_accounts.email` now matches the `vendor_admins.email` row from
   step 2, so `/vendor/dashboard` resolves `vendor_id` via
   `vendor_admins_select_self` and renders that vendor's real name, emoji,
   and settlement figures.

If Supabase's built-in auth email sending is rate-limited (it is, on the free
tier — expect `over_email_send_rate_limit` after a handful of signups in a
short window) and you're doing this for internal testing rather than a real
vendor, you can create the `auth.users` row directly with a proper bcrypt
hash instead of going through the rate-limited signup endpoint:

```sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  '<owner-email>', crypt('<password>', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{"name":"<owner name>"}',
  now(), now(), '', '', '', ''
);

insert into public.platform_accounts (id, name, email, provider)
select id, raw_user_meta_data->>'name', email, 'email'
from auth.users where email = '<owner-email>';
```

This produces a functionally real, working Supabase Auth account (it's what
`pgcrypto`'s `crypt()`/`gen_salt('bf')` plus the standard `auth.users` shape
gives you) — it just skips the outbound confirmation email. Don't use this
shortcut for actual vendor onboarding; it's a testing-only workaround for the
free-tier email rate limit.

## 5. Confirm tenant isolation before considering the vendor "live"

This platform intentionally makes `vendors` itself publicly readable (`status
= 'active' or is_staff()`) — that's correct, it's how the public storefront
directory and vendor showcase work, and it only exposes name/city/category/
theme, not financials. The tables that actually need to be tenant-isolated
are `vendor_admins`, `settlements`, and `settlement_payments`. Don't just read
the RLS policy text — prove it, using a real authenticated Postgres role, not
the `postgres`/service-role connection (which has `BYPASSRLS` and will look
"fine" no matter what):

```sql
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub":"<owner auth.users.id>","role":"authenticated"}';

-- should return exactly one row: this vendor's own admin row
select va.vendor_id, v.name, va.email
from vendor_admins va join vendors v on v.id = va.vendor_id;

-- should return only this vendor's settlements, never another vendor's
select v.name, s.month, s.gross_revenue
from settlements s join vendors v on v.id = s.vendor_id;

commit;
```

Repeat with a different vendor's owner `sub` and confirm the results flip —
each owner sees only their own vendor's rows, never the other's. Also run it
with `set local role anon;` and no JWT claim at all, and confirm `vendor_admins`
returns zero rows for an anonymous session.

This is exactly what was done for Nashemann Cafe Test against the existing
Sabz Basket vendor as a control: each owner's authenticated session saw only
their own `vendor_admins` row and their own `settlements` rows (Sabz Basket's
owner never saw the cafe's Rs 612,000 settlement or vice versa), and an
anonymous session saw none of either table.

## 6. Spot-check the public site

- Homepage (`nashemann-web`, `/`) — the "Real stores, already selling"
  section (`VendorShowcase`, `src/lib/mock-data.ts`'s `getShowcaseVendors()`)
  queries `vendors` live, ordered by `joined_at desc`, limit 3. A freshly
  created vendor with `status = 'active'` shows up there immediately with no
  extra step — this was confirmed live for Nashemann Cafe Test (it appeared
  as the newest of the three seeded vendors, with its real category/city/
  order-count).
- `/vendor/dashboard` — gated on a real `supabase.auth.getUser()` call; renders
  "You need to be signed in as a vendor admin" until the owner has a working
  login per step 4, then resolves vendor → settlements the same way the SQL
  in step 5 does.

## Summary: what actually required code vs. what didn't

| Change | Needed code? |
|---|---|
| New vendor in an existing category | No — pure `vendors`/`vendor_admins` inserts via the UI |
| New category (e.g. Beverages) | No — one `category_product_schemas` insert; every page that lists/uses categories reads the table live |
| Vendor showing up on the public showcase | No — already vendor-agnostic, queries `vendors` live |
| Vendor's owner actually being able to log in | **Yes, eventually** — `/vendors/new`'s "real login is created immediately" claim is not backed by any `auth.admin.createUser()` call today; a real fix needs a server-side route (the admin app currently has none) using the service role key |
