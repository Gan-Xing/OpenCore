# cycle-021 Productization Waterline Audit

Date: 2026-06-13

## Waterline

A foundation capability meets the current waterline when API, SDK, Admin,
permissions/menu, seed/OpenAPI and smoke coverage are live; the Admin supports
the operator workflow; security effects are real runtime behavior; repeated
failures have guards; and remaining omissions are explicit product boundaries.

## Current Status

| Capability            | Status        | Notes                                                                   |
| --------------------- | ------------- | ----------------------------------------------------------------------- |
| `core.permission`     | Meets         | Catalog, registry/custom split and assignments are live.                |
| `core.audit-log`      | Meets current | List/detail/export/delete/clean are live.                               |
| `core.dept`           | Meets         | Tree CRUD, options, guards, ordering and data-scope.                    |
| `core.post`           | Meets         | CRUD, binding, options, batch deletion and ordering.                    |
| `core.menu`           | Meets         | Tree metadata, route/menu fields and delete guards.                     |
| `core.role`           | Meets         | Menu/user assignment, status effects and revocation.                    |
| `core.user`           | Meets         | CRUD, profile, password, avatar, import/export, binds.                  |
| `core.dict`           | Meets         | Dict/item CRUD and enabled simple-list source.                          |
| `core.file`           | Meets         | Authenticated upload/download and content smoke.                        |
| `monitor.online-user` | Meets         | Batch kick-out, revocation and UA/IP fields.                            |
| `core.login-log`      | Meets current | Schema, lockout, cleanup, actor/reason and location.                    |
| `core.config`         | Meets current | Runtime keys, feature flags, rollout, audience, vault.                  |
| `core.notice`         | Enhance       | SMS HTTP and SMTP adapters live; realtime/deeper provider depth remain. |
| `scheduler/monitor`   | Enhance       | Job Admin operations live; real queue execution depth remains.          |
| `OpenForge Admin`     | P2            | CLI/core exists; Admin UX remains.                                      |

## Closed Remediation

- Round 14 closed online-user real revocation.
- Round 15 closed file content upload/download.
- Round 16 closed menu tree metadata.
- Round 54 enforced user/dept data-scope queries.
- Round 62 closed encrypted secret vault storage.
- Round 67 corrected queued-versus-sent outbox semantics.
- Round 68 closed operation-log cleanup maintenance.
- Round 69 added queued outbox processing and delivery sent sync.
- Round 70 added signed outbox callback intake and delivery sync.
- Round 71 added bounded outbox retry scheduling and delivery sync.
- Round 72 added a bounded SMS HTTP adapter and failed delivery sync.
- Round 73 added SMTP mail adapter and config-vault password resolution.
- Round 74 added live Monitor Jobs Admin operations and fixed
  `ReportDefinition` migration/seed drift.

## Active Debt

1. Notice: realtime push, broader provider-secret injection, STARTTLS,
   attachments/template subject persistence and diagnostics.
2. Config: multi-environment governance, KMS binding, key rotation and secret
   versions.
3. Scheduler/monitor: real queue handler execution, run-log diagnosis,
   retries/timeouts and whitelist visibility.
4. Operation log: retention scheduling, duration/location fields and policy.
5. OpenForge Admin: safe plan/diff/check/apply/manifest/rollback UI.
6. Integration: provider readiness, failure history and config diagnostics.

## Guard Matrix

- Deployment: fixed script and fixed ports.
- Admin: stale bundle marker checks.
- API prefix: duplicate `/api/api` login guard.
- Auth: revoked token/session returns 401.
- Notice outbox: pending, retry, process-to-sent, signed callback, scheduled
  retry caps, SMS HTTP host allowlist, SMTP config-vault auth, non-2xx/SMTP
  failedCount and post-sent mutation guards.
- Operation log: delete/clean guards and deleted-detail 404.
- Monitor jobs: Admin bundle markers and smoke cover summary, whitelisted job
  upsert, unsafe policy guards, enable/disable, disabled-trigger rejection,
  manual trigger and run-log detail.
- Config: runtime shape and secret-vault plaintext protection.
