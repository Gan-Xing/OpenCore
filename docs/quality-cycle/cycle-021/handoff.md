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

Cycle-021 has completed 99 deployable stages.

- System/RBAC: notice, dept, post, menu, role, permission, user, dict, config
  and file loops are live.
- Security/session: login policy, logout, force logout, online-user kick-out,
  registered-token allowlist enforcement and expired session cleanup are live.
- Logs: login-log type/result, lockout, cleanup, actor/reason, deterministic
  location, structured IP/location provider lookup and a guarded external
  HTTP JSON GeoIP adapter; operation-log
  list/detail/export/delete, duration and location fields, retention policy
  cleanup and scheduled retention job.
- Config: runtime keys, login policy, feature flags, rollout, audience rules,
  environment overrides, secret vault, secret version history, explicit secret
  rotation, env-bound keyring, managed HTTP JSON KMS v3 envelopes and vault
  key rotation.
- Notice: management, inbox/read state, read-user analytics, templates,
  delivery records, local provider, Integration outbox bridge, state sync,
  queued processing, signed callback intake, bounded retry scheduling and a
  bounded SMS HTTP adapter plus SMTP mail adapter with outbox subject
  persistence, provider diagnostics, SMS HTTP secret injection, SMTP
  attachments, explicit SMTP TLS policy and authenticated inbox realtime
  events.
- Integration: provider health/config audit is live across API/SDK/Admin,
  with readiness totals, config-vault debt, outbox backlog, last failure and
  operator actions. OAuth token inventory, detail, summary and revoke
  lifecycle are live across API/SDK/Admin/OpenAPI/smoke with secret-ref-only
  storage.
- Monitor jobs: API/SDK routes, registry policy, seed job, Admin live list,
  enable/disable, manual trigger, registered handler execution, retry/timeout
  diagnostics, failed run-log detail, cron dispatch, worker claim and scheduler
  queue metrics are smoke-guarded. Monitor Cache now uses real Redis
  namespace/key scans, safe value previews, dry-run prefix clear and confirmed
  key/prefix deletion instead of Admin fixtures or seed key arrays. Monitor
  Version now uses live runtime/deployment metadata instead of an Admin
  fixture page.
- Tools/OpenForge: Tool OpenAPI drift now reads live contract snapshot metadata
  through API/SDK/Admin instead of a fixture page. Tool Export now exposes live
  protocol and preview APIs in Admin with server-side row caps, and shared
  current-page export buttons use the live protocol instead of SDK fixtures.
  CLI/core safety remains no-write by default; Admin now has a live safe
  workbench for status, doctor, plan, diff, check, manifest list and
  apply/rollback dry-run, dry-run confirmation and manifest preview/detail.

Latest runtime stage: Round 99 Tool Export shared live protocol. It moves the
shared current-page export button to the live Tool Export protocol, removes the
stale Tool Export SDK fixture helpers and guards the Admin bundle against
fixture-backed export buttons.

## Next Queue

1. OpenForge direct Prisma/migration/business-code writes remain out of scope
   until explicitly admitted.

## Docs Rule

Keep aggregate docs short. Do not append command output or one report per
round. Use `round-history.md` for clusters, `ledger.md` for state transitions
and git log for commit hashes.
