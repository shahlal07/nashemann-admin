# Repository Map

This is the starting map. Replace intended descriptions with code-verified findings and dated evidence as each repo is audited.

| Repository | Intended responsibility | Accountable role | Collaborates with |
|---|---|---|---|
| shahlal07/nashemann-web | Customer marketplace and shopping journey | Product & Technology | Operations, Finance |
| shahlal07/vendor-storefronts | Vendor storefronts, catalog, routing and checkout handoff | Product & Technology | Operations |
| shahlal07/vendor-admins | Vendor onboarding, store/product/inventory and order workflows | Marketplace & Operations | Technology, Finance |
| shahlal07/nashemann-admin | Platform admin, governance, financial oversight and project brain | Finance, Strategy & Governance | Technology, Operations |

## Audit each repo
Record default branch, framework/runtime, package manager, build/test/lint commands, entry points/routes, API/server actions, authentication/authorization, tenant isolation, database policies/migrations, external integrations, environment-variable **names only**, deployment project/domain, CI status, existing tests, open issues/PRs, known bugs, dependencies, audit date and evidence links.

Never put secret values in this file.

## Cross-repository changes
Use one master task linked to each affected repo issue/PR. State the authoritative owner for shared contracts and document rollout order. Keep interfaces compatible where practical.

## Scope
shahlal07/nashemann is reference-only unless the founder explicitly approves a scope change.