# Nashemann Project Brain

**Every owner must read this before starting work.** This repository is both the platform-admin codebase and the shared source of truth for project documentation, decisions, cross-repository tasks, and progress.

## Start every session here

1. Read [Current Status](docs/CURRENT_STATUS.md), [Master Tasks](docs/MASTER_TASKS.md), and [Changelog](docs/CHANGELOG.md).
2. Read the relevant [Repository Map](docs/REPOSITORY_MAP.md) and [Architecture](docs/ARCHITECTURE.md).
3. Inspect the target repo's code, instructions, open issues, branches and PRs. Never assume a feature is missing or another owner isn't working on it.
4. Claim/update a master task before coding: accountable role, repo(s), scope, dependencies, acceptance criteria, branch and PR.
5. Work in the repository that owns the application code. Coordinate cross-repo changes; do not overwrite another owner's work.
6. Run relevant checks and record actual commands/results. Update status, task tracker, changelog and handoff notes before finishing.

## The four active repositories

| Repository | Intended responsibility |
|---|---|
| [nashemann-web](https://github.com/shahlal07/nashemann-web) | Customer-facing marketplace |
| [nashemann-admin](https://github.com/shahlal07/nashemann-admin) | Platform administration + shared project brain |
| [vendor-storefronts](https://github.com/shahlal07/vendor-storefronts) | Vendor storefronts |
| [vendor-admins](https://github.com/shahlal07/vendor-admins) | Vendor operations portal |

The separate [nashemann](https://github.com/shahlal07/nashemann) repository is reference-only unless the founder explicitly changes scope. These responsibilities are intended boundaries; inspect code before claiming features exist.

## Brain documents

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Repository Map](docs/REPOSITORY_MAP.md)
- [Current Status](docs/CURRENT_STATUS.md)
- [Master Tasks](docs/MASTER_TASKS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [Finance & Policies](docs/FINANCE_AND_POLICIES.md)
- [Testing & Releases](docs/TESTING_AND_RELEASES.md)
- [Changelog](docs/CHANGELOG.md)
- [Owner Workflow](docs/OWNER_WORKFLOW.md)

## Non-negotiable rules

- Unknown means **not yet verified**, not broken and not complete.
- Link code work to issues/PRs and to a master task. Record evidence, not assumptions.
- Never commit secrets, tokens, credentials, or private customer/payment data.
- Preserve the approved commercial baseline unless founders explicitly approve a change: Rs. 20 per eligible order, Rs. 5,999 monthly vendor subscription, initial 50% reinvestment target, and equal founder distributions only after obligations, agreed reserves and distributable profit are established.
- Do not invent the definition of an eligible order. Do not run live charges, refunds, payouts, or billing experiments without explicit authorization.
- Same GitHub account does not equal shared accountability: identify the responsible role in task and PR records.

## Existing work to verify

Previously reported task links (verify live status before relying on them):
- [nashemann-web #5](https://github.com/shahlal07/nashemann-web/issues/5)
- [vendor-admins #6](https://github.com/shahlal07/vendor-admins/issues/6)
- [nashemann-admin #11](https://github.com/shahlal07/nashemann-admin/issues/11)
- [vendor-storefronts #6](https://github.com/shahlal07/vendor-storefronts/issues/6)

## Current truth

This brain is a coordination/documentation foundation, not proof that the applications, integrations, security controls, or deployments have been fully audited. See [Current Status](docs/CURRENT_STATUS.md).