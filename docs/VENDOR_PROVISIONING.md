# Cross-project vendor provisioning

Nashemann is the control plane. The shared vendor storefront/admin deployment is the commerce plane.

When a Super Admin creates a store, `nashemann-admin` creates the control-plane vendor in `provisioning` state, then POSTs the same vendor UUID and owner credentials to `VENDOR_PROVISION_URL`. The shared vendor-admin service verifies `NASHEMANN_PROVISIONING_SECRET`, upserts the tenant using that UUID, creates the owner profile, seeds vendor settings/content, and marks the tenant active. Only after that succeeds does Nashemann mark the vendor `active`.

Set these server-only environment variables on `nashemann-admin`:

- `VENDOR_PROVISION_URL` — the shared vendor-admin endpoint, for example `https://admin.<vendor-host>/api/platform/provision` cannot be used as a generic URL because the endpoint is vendor-host gated; use the shared vendor-admin deployment hostname that is intentionally allowed for the provisioning route.
- `VENDOR_PROVISION_SECRET` — a long random secret.

Set this server-only variable on the shared vendor-admin deployment:

- `NASHEMANN_PROVISIONING_SECRET` — exactly the same secret.

Never expose either value with a `NEXT_PUBLIC_` prefix.


## Vendor admin control
Nashemann Admin controls the same vendor admin accounts used by the shared vendor-admin deployment. It reads and mutates the vendor database through `/api/platform/admins` using `NASHEMANN_PROVISIONING_SECRET`; it does not maintain a shadow admin list in the Nashemann database.

`vendor_admins` in the Nashemann database is retained only as a contact cache for legacy notification/settlement email workflows. Vendor authentication is authoritative in the shared vendor database (`profiles` + Supabase Auth).
