# cycle-021 Productization Waterline Audit

Date: 2026-06-14

## Waterline

A foundation capability meets the current waterline when API, SDK, Admin,
permissions/menu, seed/OpenAPI and smoke coverage are live; the Admin supports
the operator workflow; security effects are real runtime behavior; repeated
failures have guards; and remaining omissions are explicit product boundaries.

## Current Status

| Capability            | Status        | Notes                                                                                                    |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| `core.permission`     | Meets         | Catalog, registry/custom split and assignments are live.                                                 |
| `core.audit-log`      | Meets current | List/detail/export/delete, duration/location, retention cleanup and scheduled retention job.             |
| `core.dept`           | Meets         | Tree CRUD, options, guards, ordering and data-scope.                                                     |
| `core.post`           | Meets         | CRUD, binding, options, batch deletion and ordering.                                                     |
| `core.menu`           | Meets         | Tree metadata, route/menu fields and delete guards.                                                      |
| `core.role`           | Meets         | Menu/user assignment, status effects and revocation.                                                     |
| `core.user`           | Meets         | CRUD, profile, password, avatar, import/export, binds.                                                   |
| `core.dict`           | Meets         | Dict/item CRUD and enabled simple-list source.                                                           |
| `core.file`           | Meets         | Authenticated upload/download and content smoke.                                                         |
| `monitor.online-user` | Meets         | Batch kick-out, revocation and UA/IP fields.                                                             |
| `core.login-log`      | Meets current | Schema, lockout, cleanup, actor/reason, location and IP/location provider lookup.                        |
| `core.config`         | Meets current | Runtime keys, feature flags, rollout, audience, environment overrides, vault, versions and key rotation. |
| `core.notice`         | Enhance       | SMS HTTP, SMTP, mail subject, diagnostics, secrets, attachments, TLS policy and realtime events.         |
| `integration`         | Meets current | Provider health/config audit, readiness totals, config-vault debt, outbox backlog and failure history.   |
| `scheduler/monitor`   | Meets current | Job Admin operations, registry, handler diagnostics, cron dispatch, worker claim and queue metrics.      |
| `OpenForge Admin`     | Meets current | Safe workbench, dry-run confirmation, write-intent rejection and manifest preview/detail.                |

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
- Round 75 added Monitor Jobs registry visibility, registered handler
  execution, retry/timeout diagnostics and failed run-log detail.
- Round 76 added first-class mail outbox subject persistence and SMTP subject
  delivery guards.
- Round 77 added provider diagnostics for readiness checks, outbox backlog,
  last failure and operator actions.
- Round 78 added SMS HTTP config-vault secret injection into auth headers,
  query parameters and JSON body fields.
- Round 79 added first-class SMTP attachments with bounded validation,
  persistence, Admin/SDK/OpenAPI visibility and MIME smoke coverage.
- Round 80 added explicit SMTP `tlsMode` policy, deprecated TLS field guards,
  Admin/SDK/OpenAPI visibility and STARTTLS-required smoke coverage.
- Round 81 added authenticated notice inbox SSE snapshots/read events with
  SDK/Admin/OpenAPI visibility and public smoke coverage.
- Round 82 added public config environment overrides with environment-aware
  runtime/evaluate APIs, SDK/Admin/OpenAPI visibility and smoke/deploy guards.
- Round 83 added config secret version history and explicit rotation with
  SDK/Admin/OpenAPI visibility and plaintext-leakage smoke guards.
- Round 84 added env-bound KMS keyring status, v2 key-ID envelopes, legacy
  unversioned envelope deserialization, current/versioned secret rewrap and
  vault-key rotation smoke guards.
- Round 85 added operation-log duration/location fields, enriched filters,
  retentionDays cleanup and the scheduled `audit-log.retention-clean` job.
- Round 86 added the OpenForge Admin/API/SDK workbench for guarded status,
  doctor, plan, diff, check, manifest list and dry-run apply/rollback.
- Round 87 added Integration provider health/config audit with API/SDK/Admin,
  OpenAPI and smoke/deploy coverage.
- Round 88 added Scheduler/monitor cron dispatch, queued schedule runs,
  worker claim execution, queue metrics and Admin controls with smoke/deploy
  coverage.
- Round 89 added OpenForge dry-run confirmation, write-intent rejection and
  manifest preview/detail with API/SDK/Admin, OpenAPI and smoke/deploy
  coverage.
- Round 90 added structured IP/location provider status and lookup through
  common/API/SDK/Admin, registered OpenAPI tags and smoke/deploy guards.

## Active Debt

1. Optional managed-KMS provider adapter if deployment requires cloud KMS APIs.
2. Optional external GeoIP provider adapter if deployment needs precise
   country/region/city attribution beyond built-in offline categories.
3. OpenForge direct schema/migration/business-code writes still require user
   admission.

## Guard Matrix

- Deployment: fixed script and fixed ports.
- Admin: stale bundle marker checks.
- API prefix: duplicate `/api/api` login guard.
- Auth: revoked token/session returns 401.
- Notice outbox: pending, retry, process-to-sent, signed callback, scheduled
  retry caps, SMS HTTP host allowlist and secret injection, SMTP config-vault
  auth, SMTP TLS policy, mail outbox subject persistence, SMTP attachments,
  authenticated inbox realtime events, provider diagnostics, non-2xx/SMTP
  failedCount and post-sent mutation guards.
- Operation log: delete guards, deleted-detail 404, duration/location filters,
  retentionDays cleanup and scheduled retention job registry.
- IP/location: login-log smoke covers provider status, documentation-network
  lookup, invalid lookup, missing-IP guard and OpenAPI paths; deploy checks
  Admin GeoIP bundle markers.
- Monitor jobs: Admin bundle markers and smoke cover summary, registry,
  whitelisted job upsert, unsafe policy guards, enable/disable,
  disabled-trigger rejection, manual trigger, handler execution, retry failure
  and run-log detail, cron dispatch, worker claim and scheduler queue metrics.
- OpenForge: smoke covers status, doctor, plan, diff, check, apply dry-run,
  manifest list, manifest preview, rollback dry-run, confirmation guards,
  write-intent rejection and unsafe schema/config/manifest guards; deploy
  checks Admin workbench and manifest markers.
- Integration: health audit smoke covers provider-wide readiness totals,
  config-vault debt, outbox backlog, diagnostics parity, failure history and
  secret-leak guards; deploy checks Admin health/config audit markers.
- Config: runtime shape, environment override governance, secret-vault
  plaintext protection, legacy envelope deserialization, secret version
  history, secret rotation and vault key rotation guards.
