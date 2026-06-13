# OpenCore Cycle-021 Handoff

Date: 2026-06-13
Repository: `Gan-Xing/OpenCore`
Default branch: `main`

## Goal

Continue cycle-021 capability-map productization. Recompare RuoYi/Yudao and
OpenCore in real time, then deliver one deployable, verifiable and reversible
foundation stage per round. A minimal round is not a minimal final product:
the same product can take multiple rounds until it reaches the admitted
waterline.

## Non-Negotiable Loop

- Read this file, then keep `productization-waterline-audit.md`, `backlog.md`,
  `reference-comparison.md`, `implementation-notes.md`, `audit.md`,
  `round-history.md` and the ledger aligned.
- Sort by lowest dependency and product foundation value.
- For code changes: test, commit, push, deploy through `pnpm deploy:opencore`
  and verify public URLs.
- Do not manually choose ports. Fixed ports are API `39172`, Admin `39174` and
  local smoke `39173`.
- Do not leave repeated failures as notes. Encode deserialization drift,
  duplicate `/api/api`, stale frontend bundles and session/token invalidation
  as tests, smoke checks or deploy guards.
- Feature code, tests, deploy guards and docs for a stage should be one
  feature+docs commit. Use docs-only commits only when runtime artifacts are
  unchanged.
- Pure docs cleanup needs format/check, commit and push, but no redeploy when
  runtime artifacts did not change.

## Compatibility Policy

OpenCore is still in fast productization. There is no old compatibility burden.
If a stale API, SDK shape, DTO, Admin route, seed, menu, permission, smoke or
compatibility layer conflicts with the current waterline, replace or delete it
directly and update all references.

## Admission Policy

Auto-admitted foundation work:

- System, Security, Monitor and Tools/OpenForge foundation capabilities.
- IP/location, OAuth token management, JWT blacklist.
- Notice templates, delivery and provider reliability.
- KMS/secret vault.
- Operation-log maintenance.
- Scheduler/monitor operation depth.
- Config runtime feature flags and rollout governance.

Needs explicit user admission:

- CRM/ERP/MES/WMS/mall/member.
- Real payment/refund/reconciliation.
- Production multi-tenancy.
- BPMN/full workflow platform.
- Full report designer.
- Big-data async export execution.
- Knowledge base/RAG/Agent/AI workflow.
- Industry business packages.
- OpenForge directly writing Prisma schema, migrations or business logic.

## Current Foundation State

OpenCore already has package-owned runtime for common, core, database, redis,
file, system, security, audit, online-user, scheduler, monitor and
generator-core. Admin is Umi Max + Ant Design Pro V6 + ProComponents v3 +
antd 6 + React 19. The vulnerable `mockjs` / `@umijs/openapi` path must not be
reintroduced.

Cycle-021 has completed 69 deployable stages. Completed foundation clusters:

- System/RBAC: notice, department, post, menu, role, permission, user, dict,
  config and file.
- Security/session: login policy, logout, force logout, online-user kick-out
  and real token/session revocation.
- Logs: login-log type/result, lockout, cleanup, actor/reason and deterministic
  location. Operation-log list/detail/export/batch delete/clean-all.
- Config: runtime keys, login policy, feature flags, rollout percentage,
  audience rules and secret vault.
- Notice: management, inbox/read state, read-user analytics, templates,
  delivery records, local provider, Integration outbox bridge and Round 67
  outbox status synchronization plus Round 69 queued outbox processing.

## Latest Runtime Stage

Round 69: `core.notice` outbox provider processing.

- Added permission-gated `mail/sms` outbox process APIs that move queued
  provider messages to `sent` only when the provider is enabled and channel
  compatible.
- Synced processed Integration outbox rows back to notice delivery records.
- Added SDK and Admin System Notices process action for queued mail/SMS
  outbox deliveries.
- Added smoke/deploy guards for process routes, queued-to-sent delivery sync
  and stale Admin bundle markers.
- Deployed on API `39172` and Admin `39174`; public verification passed.

Same-commit hashes are not written into this file. Use the ledger and git log
after the commit lands.

## Next Queue

Pick one stage from this queue unless a new audit reveals a higher-priority
foundation defect:

1. Notice provider reliability: signed callback intake, real SMTP/SMS adapters,
   retry scheduling and realtime push.
2. Config governance: multi-environment rollout controls, external KMS binding,
   key rotation and secret version history.
3. Operation-log enrichment: retention scheduling, duration/location fields and
   governance policy.
4. Scheduler/monitor operation depth.
5. OpenForge Admin safe plan/diff/check/apply UI.
6. Integration health/config audit.

## Documentation Rule

Aggregate docs must stay short. Do not append repeated round summaries or
identical command lists. Do not create per-round completion reports by default;
use `round-history.md` plus the ledger for the audit trail.
