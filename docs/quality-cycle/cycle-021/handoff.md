# OpenCore Cycle-021 Handoff

Date: 2026-06-13
Repository: `Gan-Xing/OpenCore`
Branch: `main`

## Goal

Continue cycle-021 capability-map productization. Compare RuoYi/Yudao
capabilities to OpenCore's TS/NestJS boundaries, then ship one deployable,
verifiable, reversible foundation loop per round. A minimal loop is not a
minimal product; a product can span multiple rounds until it reaches the
admitted waterline.

## Fixed Loop

- Read this file before the next round.
- Sort by lowest dependency and foundation value.
- Code changes: test, commit, push, deploy through `pnpm deploy:opencore`,
  then verify public API/Admin URLs.
- Fixed ports: API `39172`, Admin `39174`, local smoke `39173`.
- Repeated failures must become tests, smokes or deploy guards:
  deserialization drift, duplicate `/api/api`, stale Admin bundles and revoked
  session/token behavior, seed drift.
- Feature code, tests, deploy guards and docs should land in one commit.
- Docs-only cleanup gets format/check, commit and push; no redeploy when
  runtime artifacts are unchanged.

## Compatibility

OpenCore is still in fast productization. There is no legacy compatibility
burden. Replace or delete stale DTOs, SDK shapes, routes, seeds, menus,
permissions, smoke paths and compatibility layers when the current waterline
is better.

## Admission

Auto-admitted foundation work: System, Security, Monitor, Tools/OpenForge
foundation, IP/location, OAuth token management, JWT blacklist, notice
templates/delivery/provider reliability, KMS/secret vault, operation-log
maintenance, scheduler/monitor depth and config runtime governance.

Requires explicit user admission: CRM/ERP/MES/WMS/mall/member, real
payment/refund/reconciliation, production multi-tenancy, BPMN/full workflow,
full report designer, big-data async export, RAG/Agent/AI workflow, industry
packages and OpenForge direct Prisma/migration/business-code writing.

## Current State

Cycle-021 has completed 82 deployable stages.

- System/RBAC: notice, dept, post, menu, role, permission, user, dict, config
  and file loops are live.
- Security/session: login policy, logout, force logout, online-user kick-out
  and real revocation are live.
- Logs: login-log type/result, lockout, cleanup, actor/reason and
  deterministic location; operation-log list/detail/export/delete/clean.
- Config: runtime keys, login policy, feature flags, rollout, audience rules,
  environment overrides and secret vault.
- Notice: management, inbox/read state, read-user analytics, templates,
  delivery records, local provider, Integration outbox bridge, state sync,
  queued processing, signed callback intake, bounded retry scheduling and a
  bounded SMS HTTP adapter plus SMTP mail adapter with outbox subject
  persistence, provider diagnostics, SMS HTTP secret injection, SMTP
  attachments, explicit SMTP TLS policy and authenticated inbox realtime
  events.
- Monitor jobs: API/SDK routes, registry policy, seed job, Admin live list,
  enable/disable, manual trigger, registered handler execution, retry/timeout
  diagnostics and failed run-log detail are smoke-guarded.

Latest runtime stage: Round 82 `core.config` environment overrides. It adds a
first-class `SystemConfigEnvironmentOverride` table, public-config override
CRUD, environment-aware runtime config and feature-flag evaluation, SDK/Admin
OpenAPI exposure and smoke/deploy guards for override guards, runtime fallback
and environment rollout behavior.

## Next Queue

1. Config governance: external KMS binding, key rotation and secret versions.
2. Operation-log enrichment: retention scheduling, duration/location fields
   and governance policy.
3. OpenForge Admin safe plan/diff/check/apply UI.
4. Integration health/config audit.
5. Scheduler/monitor worker parity: external BullMQ worker execution, cron
   dispatch and queue metrics beyond the current registered manual executor.

## Docs Rule

Keep aggregate docs short. Do not append command output or one report per
round. Use `round-history.md` for clusters, `ledger.md` for state transitions
and git log for commit hashes.
