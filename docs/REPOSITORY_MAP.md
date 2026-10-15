# Repository Map

This is the starting map. Replace intended descriptions with code-verified findings and dated evidence as each repo is audited.

| Repository | Intended responsibility | Accountable role | Collaborates with |
|---|---|---|---|
| shahlal07/nashemann-web | Customer marketplace and shopping journey | Product & Technology | Operations, Finance |
| shahlal07/vendor-storefronts | Vendor storefronts, catalog, routing and checkout handoff | Product & Technology | Operations |
| shahlal07/vendor-admins | Vendor onboarding, store/product/inventory and order workflows | Marketplace & Operations | Technology, Finance |
| shahlal07/nashemann-admin | Platform admin, governance, financial oversight and project brain | Finance, Strategy & Governance | Technology, Operations |

## Initial code evidence — 2026-10-15\n- `nashemann-web/src/proxy.ts` describes that app as the platform/public website only and returns 404 when a vendor hostname lands there. Its `src/app/page.tsx` renders marketing sections (vendor showcase, pricing, FAQ and calls to action), not the shopping catalogue/cart. This is evidence from inspected source, not a complete route audit.\n- `vendor-storefronts/src/app/checkout/page.tsx` and `src/app/checkout/actions.ts` contain a storefront checkout and order-creation path. Product queries resolve the request vendor and filter published products by `vendor_id`. The checkout action needed additional server-side validation to ensure submitted product units match the request-host vendor; tracked in [PR #7](https://github.com/shahlal07/vendor-storefronts/pull/7).\n- Therefore, the original responsibility labels remain intended boundaries; actual customer shopping and order-history ownership must be documented from the remaining route and integration audit.\n\n## Audit each repo
Record default branch, framework/runtime, package manager, build/test/lint commands, entry points/routes, API/server actions, authentication/authorization, tenant isolation, database policies/migrations, external integrations, environment-variable **names only**, deployment project/domain, CI status, existing tests, open issues/PRs, known bugs, dependencies, audit date and evidence links.

Never put secret values in this file.

## Cross-repository changes
Use one master task linked to each affected repo issue/PR. State the authoritative owner for shared contracts and document rollout order. Keep interfaces compatible where practical.

## Scope
shahlal07/nashemann is reference-only unless the founder explicitly approves a scope change.