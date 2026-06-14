# OpenCore Cycle-021 Handoff

Date: 2026-06-14
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

Cycle-021 has completed 86 deployable stages.

- System/RBAC: notice, dept, post, menu, role, permission, user, dict, config
  and file loops are live.
- Security/session: login policy, logout, force logout, online-user kick-out
  and real revocation are live.
- Logs: login-log type/result, lockout, cleanup, actor/reason and
  deterministic location; operation-log list/detail/export/delete, duration
  and location fields, retention policy cleanup and scheduled retention job.
- Config: runtime keys, login policy, feature flags, rollout, audience rules,
  environment overrides, secret vault, secret version history, explicit secret
  rotation, env-bound KMS keyring status and vault key rotation.
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
- OpenForge: CLI/core safety remains no-write by default; Admin now has a live
  safe workbench for status, doctor, plan, diff, check, manifest list and
  apply/rollback dry-run.

Latest runtime stage: Round 86 `tool.openforge` Admin workbench. It exposes
existing OpenForge core through guarded API/SDK/Admin routes for status,
doctor, plan, diff, check, manifest list and dry-run apply/rollback. It also
adds repo-root-safe generator-core readers, OpenAPI exposure, Admin bundle
guards and `smoke-tool-openforge`.

## Next Queue

1. Integration health/config audit.
2. Scheduler/monitor worker parity: external BullMQ worker execution, cron
   dispatch and queue metrics beyond the current registered manual executor.
3. OpenForge write/apply/rollback confirmation UX and manifest detail can be a
   later explicit stage; direct Prisma/migration/business-code writes still
   require user admission.
4. Optional managed-KMS provider adapter if deployment needs a cloud KMS API
   instead of the current env-bound keyring.
5. Optional operation-log external GeoIP enrichment if deployment needs real
   IP attribution beyond deterministic network categories.

## Docs Rule

Keep aggregate docs short. Do not append command output or one report per
round. Use `round-history.md` for clusters, `ledger.md` for state transitions
and git log for commit hashes.
