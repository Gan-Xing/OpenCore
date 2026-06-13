# cycle-021 Productization Waterline Audit

Date: 2026-06-13

This audit is intentionally compact. Older versions repeated long per-round
summaries; current history belongs in `round-history.md` and the ledger.

## Waterline

A capability reaches the current OpenCore foundation waterline when these are
true:

- API, SDK, Admin, permission/menu, seed, OpenAPI and smoke coverage are live.
- The Admin page supports the operator workflow, not only a registry fixture.
- Security effects are real runtime behavior.
- Repeated failures are guarded by tests, smoke or deploy scripts.
- The remaining omissions are explicit product boundaries, not accidental
  gaps.

## Current Status

| Capability            | Status        | Notes                                                                                                                                                                                                            |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core.permission`     | Meets         | Permission catalog, registry/custom split and Admin assignment flows are live.                                                                                                                                   |
| `core.audit-log`      | Meets current | List/detail/export plus permission-gated batch delete and clean-all are live. Retention scheduling and richer enrichment remain optional next work.                                                              |
| `core.dept`           | Meets         | Tree CRUD, option source, delete guards, ordering and user data-scope integration are live.                                                                                                                      |
| `core.post`           | Meets         | CRUD, user binding, option source, batch deletion and ordering are live.                                                                                                                                         |
| `core.menu`           | Meets         | Tree metadata, route/menu fields, delete guards and Admin tree operations are live.                                                                                                                              |
| `core.role`           | Meets         | Menu/user assignment, status effects and session revocation are live.                                                                                                                                            |
| `core.user`           | Meets         | CRUD, profile, password, avatar, import/export, post/role/dept binding and batch mutations are live.                                                                                                             |
| `core.dict`           | Meets         | Dict/item CRUD and enabled simple-list source are live.                                                                                                                                                          |
| `core.file`           | Meets         | Authenticated upload/download and content smoke are live.                                                                                                                                                        |
| `monitor.online-user` | Meets         | Batch kick-out, real token/session revocation and UA/IP fields are live.                                                                                                                                         |
| `core.login-log`      | Meets current | Type/result, lockout, cleanup, logout actor/reason and deterministic location are live. External GeoIP depth is optional next work.                                                                              |
| `core.config`         | Meets current | Runtime keys, login policy, feature flags, rollout, audience rules and secret vault are live. Multi-env governance/KMS rotation remain.                                                                          |
| `core.notice`         | Enhance       | Management, inbox, templates, delivery records, local provider, Integration outbox bridge, status sync, queued outbox processing and signed callbacks are live. Real SMTP/SMS adapters and realtime push remain. |
| `scheduler/monitor`   | P2            | Runtime packages exist; deeper operator actions and diagnostics remain.                                                                                                                                          |
| `OpenForge Admin`     | P2            | CLI/core exists; Admin plan/diff/check/apply UX remains.                                                                                                                                                         |

## Completed Remediation

- Round 14 closed the Round 13 online-user thin loop with real revocation.
- Round 15 closed file content upload/download.
- Round 16 closed menu tree metadata.
- Round 54 applied admitted user/dept data-scope query enforcement.
- Round 62 closed secret config storage through encrypted vault fields.
- Round 67 closed the Round 66 queued-versus-sent outbox defect.
- Round 68 closed operation-log cleanup maintenance with API/SDK/Admin/smoke
  coverage.
- Round 69 added provider-gated queued outbox processing and notice delivery
  sent-state synchronization.
- Round 70 added signed Integration outbox callback intake with delivery
  state synchronization.

## Active Debt Queue

P1/P2 foundation work still worth doing before larger business domains:

1. Notice provider reliability: real SMTP/SMS adapters, retry scheduling and
   realtime push.
2. Config governance: multi-environment rollout controls, KMS binding, key
   rotation and secret version history.
3. Operation-log enrichment: retention scheduling, structured
   duration/location fields and governance.
4. Scheduler/monitor depth: job enable/disable/run-now, run-log diagnosis,
   retries, timeouts and whitelist visibility.
5. OpenForge Admin: safe UI over plan/diff/check/apply/manifest/rollback.
6. Integration health/config audit: provider readiness, failure history and
   operator diagnostics.

## Admission Boundary

Auto-admitted: P0/P1 foundation capabilities including System, Security,
Monitor, Tools/OpenForge foundation, IP/location, OAuth token management, JWT
blacklist, notice templates/delivery, KMS/secret vault, operation-log
maintenance, scheduler/monitor depth and config runtime feature flags.

Needs explicit user admission: CRM/ERP/MES/WMS/mall/member, real payment,
production multi-tenancy, BPMN/full workflow, full report designer, big-data
async export execution, RAG/Agent/AI workflow, industry packages and OpenForge
direct schema/business-code writing.

## Guard Matrix

- Deployment: fixed ports and `pnpm deploy:opencore`.
- Admin stale bundle: route/chunk marker checks for each changed page.
- API prefix: duplicate `/api/api` login guard.
- Auth: revoked token/session returns 401.
- Notice outbox: pending handoff, failed/retry/process-to-sent sync, signed
  callback sync and post-sent mutation guards.
- Operation log: batch-delete guard failures, deleted-detail 404 and clean-all
  target removal.
- Config: runtime flags, rollout/audience shape and secret-vault plaintext
  protection.
