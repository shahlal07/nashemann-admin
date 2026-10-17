# Shared Project Changelog

Record meaningful changes newest first: date, task, repos, summary, PR/commit, tests/evidence, risks and next action.

## 2026-10-17 — Co-Founder workspace production release (BRAIN-011)
- **Repository:** `shahlal07/nashemann-admin`; PR [#20](https://github.com/shahlal07/nashemann-admin/pull/20), merged to `master`.
- **Production commit:** `7fdb17d8ab36ad447ffb2974972fb7dd91d11feb`; Vercel deployment `dpl_9F2zRYxKio9ownym8pWHePBt8iSU` is READY and aliases `https://superadmin.nashemann.store`.
- **Change:** Added the separate owner sign-in, protected owner overview/shell, Super Admin-only founder access panel, duplicate-email handling for explicitly confirmed existing founder identities, existing owner credential edits, and actual login-email display from Supabase Auth. Existing staff/admin and vendor-linked identities are blocked by the provisioning flow.
- **Build evidence:** Vercel reports compiled successfully, TypeScript finished, static generation completed 31/31, and route listing includes `/owner-login`, `/owner-management`, `/owners`.
- **Runtime finding addressed:** Historical production error on `/owner-management`: “A user with this email address has already been registered.” The updated action now recognizes duplicate email, resolves it through the Auth Admin API after explicit confirmation, and handles existing founder membership instead of blindly returning the raw duplicate error.
- **Remaining verification:** Authenticated end-to-end owner login/provisioning/password-change/RLS/unauthorized-user tests have not been run through a real signed-in browser session. Live schema discovery reported zero owner memberships before provisioning; no founder account was created by this release. Confirm founder identities/responsibilities and test the flow before relying on it for all owners.
- **Remaining app scope:** BRAIN-001 through BRAIN-010 (whole marketplace, tenant isolation, fulfillment and finance integrity) remain to be audited; this release does not certify the whole platform production-ready.

## 2026-10-15 — Co-Founder Platform live schema discovery
- **Task:** BRAIN-011; issue #15; draft PR #16.
- **Repository / service:** `nashemann-admin` documentation branch and connected Supabase project `eznxsosvsgkhexbjoolh`.
- **Change:** Updated `docs/COFOUNDER_PLATFORM_INTEGRATION.md` with evidence from read-only database inspection.
- **Evidence:** A targeted `information_schema.tables` query across `public` and `private` found no base tables matching founder, owner, decision, approval, governance, company_task, or action_item. Catalog inspection confirmed existing `is_staff()`, `is_finance_staff()`, and `is_mutating_staff()` functions are SECURITY DEFINER. The existing `staff_profiles` policies and finance/settlement policies were reviewed for context.
- **Verification:** Read-only SQL only. No rows, roles, policies, schema, or production settings changed. No application tests run.
- **Risk:** This targeted search does not prove no suitable table exists under a different name. Full schema/RLS/grant review and migration-history comparison remain necessary before designing a migration.
- **Next:** Complete the authorization/schema inventory, confirm founder permission matrix, then integrate Kimi's actual code against the real app structure.

## 2026-10-15 — Co-Founder Platform integration plan
- **Task:** BRAIN-011.
- **Repositories:** Cross-repository planning; initial implementation target proposed as shahlal07/nashemann-admin.
- **Change:** Added `docs/COFOUNDER_PLATFORM_INTEGRATION.md` on branch `product/cofounder-platform-alignment`; documented repository boundaries, current authz clues, proposed owner authorization boundary, rollout, acceptance criteria, and open founder decisions. Opened [nashemann-admin #15](https://github.com/shahlal07/nashemann-admin/issues/15).
- **Evidence:** Inspected package manifests, `nashemann-admin/src/app/layout.tsx`, `src/components/AppChrome.tsx`, `src/lib/authz.ts`, `src/lib/roles.ts`, current architecture/task docs, and customer web layout. Repository directory checks confirmed the vendor apps have their own structure and should not be assumed to share identical paths.
- **Verification:** Documentation-only changes. No application code, schema, roles, RLS policies, or production settings changed. Lint/build/tests were not run because no application code was changed in this planning step.
- **Risks/open items:** Owner identity/responsibility matrix, approval rules, source-of-truth financial data, and exact database/deployment relationships remain to be verified.
- **Next:** Review Kimi's UI output against the actual admin code; audit schema/RLS and confirm founder permission matrix before implementation.

## 2026-10-15 — Project brain initialized
- **Repository:** shahlal07/nashemann-admin.
- **Change:** Added shared entry point, repository map, status ledger, master task backlog, architecture discovery, decisions, finance guardrails, release checklist and owner workflow.
- **Verification:** Documentation commits acknowledged by GitHub. Application code, integrations and deployment settings were not audited as part of creating this brain.
- **Next:** Audit all four active repositories and replace unknown status with evidence-backed findings.

## 2026-10-15 — Local development environment (all four repos)
- **Task:** Local production-parity setup.
- **Repos:** nashemann-web, nashemann-admin, vendor-storefronts, vendor-admins.
- **Summary:** All four apps verified running on localhost:3000–3003 against the production Supabase project `eznxsosvsgkhexbjoolh`; env files repaired (Vercel `sensitive` vars return `[SENSITIVE]` on pull — real values sourced from Supabase CLI and the previous local clone); local-only provisioning/cron secrets set; launcher scripts added; `docs/LOCAL_DEVELOPMENT.md` + `docs/LOCAL_ENVIRONMENT_VARIABLES.md` written; empty mistakenly-created Vercel projects `theaamghar-web`/`theaamghar-admin` removed.
- **Tests/evidence:** HTTP 200 ×4 locally; `npm run build` ×4 PASS; vitest 47/47 + 35/35 PASS; `tsc --noEmit` PASS (vendor-storefronts); lint ×4 (pre-existing issues only). No source code changed.
- **Risks:** Supabase localhost redirect URLs unconfirmed; email sending unverified; production values of sensitive Vercel vars still unknown to local setup (by design).
- **Next:** Owner confirms Supabase auth redirect URLs and performs a local sign-in.
