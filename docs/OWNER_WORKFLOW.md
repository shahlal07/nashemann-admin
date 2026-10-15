# Mandatory Owner Workflow

Every owner follows this workflow regardless of which repository they edit.

## Before starting
1. Read root README, CURRENT_STATUS, MASTER_TASKS and latest CHANGELOG.
2. Read relevant repository map and architecture notes.
3. Inspect target repo's latest default branch, instructions, implementation, open issues/PRs and active branches.
4. Search for related work across all four repos.
5. Update/claim the task with role, repo(s), scope, dependencies, acceptance criteria and branch. Coordinate if work overlaps.

## While working
- Make the smallest safe, testable change.
- Keep app code in its owning repo.
- Link all affected tasks/PRs for cross-repo changes and state rollout order.
- Do not overwrite another owner's active work.
- Never commit secrets/private data or make unapproved commercial changes.
- Share findings affecting other owners promptly.

## Before handoff
1. Run relevant checks and record exact commands/results.
2. Review diff and list known failures/untested paths.
3. Open/update PR and link master task.
4. Update CURRENT_STATUS, MASTER_TASKS and CHANGELOG; update architecture/decision/policy docs if needed.
5. Record what changed, evidence, risks, remaining work and next action.
6. Mark Done only when acceptance criteria and evidence are satisfied.

## Shared-account conventions
- Branch format: role/task-id-short-description, e.g. tech/BRAIN-002-tenant-tests, ops/BRAIN-004-vendor-audit, finance/BRAIN-007-fee-audit.
- Reference task IDs in commits where practical.
- PRs must identify responsible role, affected repos, tests, risks and follow-up.
- A shared GitHub username does not prove which role owns or approved work; state role explicitly.

## Stop and escalate
Immediately document exposed secrets, cross-tenant access, unauthorized financial actions, data-loss risk, live-money effects in tests, or production-impacting changes. Do not attempt risky fixes without a safe recovery plan.