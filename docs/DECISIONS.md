# Decision Register

Add newest decisions first. Include date, approver, context, options, decision, impact and linked tasks/PRs. Draft proposals are not approved decisions.

## D-004 — Add a Co-Founder / Owner Platform; preserve Super Admin
- **Date:** 2026-10-15
- **Status:** Product direction approved by founder; detailed permission matrix and implementation design pending.
- **Context:** Founder requested a dedicated platform for co-founders, integrated into Nashemann according to their responsibilities.
- **Decision:** Add a dedicated authenticated Co-Founder / Owner workspace. The existing Super Admin role and behavior remain unchanged. Founder ownership must not automatically confer unrestricted administrative access. Access must be explicitly authorized and enforced server-side and by the database where applicable.
- **Initial placement:** `nashemann-admin` is the proposed home because it owns platform administration and finance-related workflows. Confirm this against deployment and route boundaries before implementation.
- **Cross-repository impact:** Keep customer marketplace and vendor portals separate; preserve customer privacy and vendor tenant isolation. Integrate only through verified contracts where cross-app data is required.
- **Open items:** Founder identities/responsibilities, capabilities, approval quorum/thresholds, self-approval rules, shared vs restricted data, and authoritative sources for cash/expenses/reserves/distributable profit.
- **Implementation guardrail:** Do not alter production schema, role assignments, Super Admin behavior, or financial operations before review and acceptance tests. See issue #15 and `docs/COFOUNDER_PLATFORM_INTEGRATION.md`.

## D-001 — Four active repos, one shared brain
- **Date:** 2026-10-15
- **Status:** Project working agreement
- **Decision:** Active implementation repos are nashemann-web, nashemann-admin, vendor-storefronts and vendor-admins. nashemann-admin hosts shared project knowledge and coordination. nashemann remains reference-only unless scope is explicitly changed.
- **Rationale:** Coordinate without merging distinct applications into one codebase.
- **Impact:** Every owner reads the brain before work and updates it after meaningful progress.

## D-002 — Shared owner workflow
- **Date:** 2026-10-15
- **Status:** Project working agreement
- **Decision:** Inspect the brain, target repo, issues, branches and PRs before starting. Claim the task; after work record evidence, tests, PRs, blockers and handoff.
- **Impact:** Same GitHub username does not replace explicit role/task accountability.

## D-003 — Preserve commercial baseline
- **Date:** 2026-10-15
- **Status:** Existing project policy carried forward; link formal founder approval if available
- **Decision:** Rs.20 per eligible order; Rs.5,999 monthly vendor subscription; initial 50% reinvestment target; equal founder distributions only after obligations, agreed reserves and distributable profit are established.
- **Guardrail:** Do not invent order eligibility. Do not run live charges, refunds or payouts during tests without explicit authorization.