# Testing & Release Checklist

## Before coding
- Read the brain and linked task.
- Inspect repo instructions, branch, recent commits, open PRs, tests and CI.
- Capture baseline test/build/lint results where feasible.

## Every change
- Add/update regression tests.
- Include authorization/tenant-boundary tests for access-sensitive work.
- For financial/order changes test retries, duplicates, partial failures, idempotency, concurrency and reconciliation using synthetic data.
- Run relevant test, lint, type-check and build commands discovered in the repo; record exact commands/results.
- Never claim a check passed if it was not run. Record failures and environment limits.
- Review diff for secrets, unrelated changes, destructive migrations and compatibility.
- Open/update a PR with scope, rationale, tests, risks, rollout/rollback and linked task.
- Update brain docs after meaningful findings, decisions, code changes and releases.

## Release gates
- [ ] Acceptance criteria met with evidence.
- [ ] Required checks pass or exceptions are approved and documented.
- [ ] Security and tenant-isolation impact reviewed.
- [ ] Migration and recovery plan reviewed where applicable.
- [ ] Secrets configured through secret management; no secret values in repo.
- [ ] Target environment/domain verified in provider dashboard.
- [ ] Smoke tests run against intended environment.
- [ ] Monitoring and rollback owner known.
- [ ] Status and changelog updated.

Distinguish code merged, build passed, deployment created, deployment ready, domain verified, and end-to-end production workflow tested. These are separate claims.