# cycle-021 Productization Waterline Audit

Date: 2026-06-14

## Waterline

A foundation capability meets the current waterline when API, SDK, Admin,
permissions/menu, seed/OpenAPI and smoke coverage are live; the Admin supports
the operator workflow; security effects are real runtime behavior; repeated
failures have guards; and remaining omissions are explicit product boundaries.

## Current Status

| Capability            | Status        | Notes                                                                                                |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `core.permission`     | Meets         | Catalog, registry/custom split and assignments are live.                                             |
| `core.audit-log`      | Meets current | List/detail/export/delete, duration/location, retention cleanup and scheduled retention job.         |
| `core.dept`           | Meets         | Tree CRUD, options, guards, ordering and data-scope.                                                 |
| `core.post`           | Meets         | CRUD, binding, options, batch deletion and ordering.                                                 |
| `core.menu`           | Meets         | Tree metadata, route/menu fields and delete guards.                                                  |
| `core.role`           | Meets         | Menu/user assignment, status effects and revocation.                                                 |
| `core.user`           | Meets         | CRUD, profile, password, avatar, import/export, binds.                                               |
| `core.dict`           | Meets         | Dict/item CRUD and enabled simple-list source.                                                       |
| `core.file`           | Meets         | Authenticated upload/download and content smoke.                                                     |
| `monitor.online-user` | Meets         | Batch kick-out, revocation, registered-token allowlist, cleanup and UA/IP fields.                    |
| `core.login-log`      | Meets current | Schema, lockout, cleanup, actor/reason, location and IP/location lookup with external GeoIP adapter. |
| `core.config`         | Meets current | Runtime keys, feature flags, rollout, audience, overrides, vault versions, env and managed KMS.      |
| `core.notice`         | Enhance       | SMS HTTP, SMTP, mail subject, diagnostics, secrets, attachments, TLS policy and realtime events.     |
| `integration`         | Meets current | Provider audit, OAuth and Mail/SMS Admin template/outbox operations are live.                        |
| `scheduler/monitor`   | Meets current | Job Admin operations, registry, handler diagnostics, cron dispatch, worker claim and queue metrics.  |
| `monitor.cache`       | Meets current | Redis namespace/key scans, safe value preview, dry-run clear and confirmed key/prefix deletion.      |
| `monitor.version`     | Meets current | Live runtime/deployment metadata uses API/SDK/Admin, deploy injection and smoke/deploy guards.       |
| `tool.openapi`        | Meets current | Live drift snapshot metadata uses API/SDK/Admin, OpenAPI contract fields and tool/deploy guards.     |
| `tool.export`         | Meets current | Admin protocol/preview and shared current-page export buttons use the live protocol with row caps.   |
| `OpenForge Admin`     | Meets current | Safe workbench, dry-run confirmation, write-intent rejection and manifest preview/detail.            |
| `collaboration`       | Meets current | Messages, Notices, Todos and Approval Lite live operations are API/SDK/Admin/smoke guarded.          |

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
- Round 91 added token/session blacklist maintenance with registered-token
  allowlist enforcement, expired cleanup, Admin visibility and smoke/deploy
  guards.
- Round 92 added OAuth token inventory, summary, detail and revoke lifecycle
  with Prisma model/seed, SDK/Admin/OpenAPI visibility, smoke and deploy
  guards.
- Round 93 added a guarded external HTTP JSON GeoIP adapter with host
  allowlisting, bounded timeout, non-public-IP no-send behavior, fallback
  diagnostics, API/SDK/Admin visibility and deploy guards.
- Round 94 added a guarded HTTP JSON managed KMS adapter with v3 secret-vault
  envelopes, remote data-key wrap/unwrap, API/SDK/Admin visibility and deploy
  guards.
- Round 95 replaced Monitor Cache seed/Admin fixtures with Redis-backed
  namespace/key listing, safe value preview redaction, dry-run prefix clear,
  confirmed key/prefix deletion and smoke/deploy guards.
- Round 96 replaced the Monitor Version Admin fixture page with live runtime
  metadata, deployment commit/build injection and API/Admin smoke/deploy
  guards.
- Round 97 replaced the Tool OpenAPI Admin fixture page with live drift
  snapshot metadata, API/OpenAPI/SDK fields and tool/Admin/deploy guards.
- Round 98 replaced the Tool Export Admin fixture page with live protocol and
  preview calls, including row-cap smoke and Admin/deploy guards.
- Round 99 moved shared current-page export buttons to the live Tool Export
  protocol and removed stale Tool Export SDK fixture helpers.
- Round 100 replaced the Integration Mail Admin fixture page with live
  template/outbox list, detail, preview and queued-processing controls.
- Round 101 replaced the Integration SMS Admin fixture page with live
  template/outbox list, detail, preview and queued-processing controls.
- Round 102 replaced the Collaboration Messages Admin fixture page with live
  summary/list/detail, create, mark-read, archive and delete controls, plus
  Prisma migration, seed and smoke coverage.
- Round 103 replaced the Collaboration Notices Admin fixture page with live
  list/detail, create, publish and archive controls.
- Round 104 replaced the Collaboration Todos Admin fixture page with live
  list/detail, create, assign, complete and cancel controls.
- Round 105 replaced the Collaboration Approval Lite Admin fixture page with
  live list/detail, create, approve and reject controls.

## Active Debt

1. OpenForge direct schema/migration/business-code writes still require user
   admission.
2. The next admitted P0/P1 foundation gap should be selected by a fresh
   remaining Admin/productization debt audit.

## Guard Matrix

- Deployment: fixed script and fixed ports.
- Admin: stale bundle marker checks.
- API prefix: duplicate `/api/api` login guard.
- Auth: revoked, expired or unknown token/session returns 401.
- Notice outbox: pending, retry, process-to-sent, signed callback, scheduled
  retry caps, SMS HTTP host allowlist and secret injection, SMTP config-vault
  auth, SMTP TLS policy, mail outbox subject persistence, SMTP attachments,
  authenticated inbox realtime events, provider diagnostics, non-2xx/SMTP
  failedCount and post-sent mutation guards.
- Operation log: delete guards, deleted-detail 404, duration/location filters,
  retentionDays cleanup and scheduled retention job registry.
- IP/location: login-log smoke covers provider status, documentation-network
  lookup, invalid lookup, missing-IP guard and OpenAPI paths; common tests
  cover the external HTTP JSON adapter, host allowlist, non-public-IP no-send
  behavior and fallback diagnostics; deploy checks Admin GeoIP bundle markers.
- Online users: smoke covers summary, expired cleanup, revoked-token rejection
  and Admin blacklist-maintenance bundle markers.
- Monitor jobs: Admin bundle markers and smoke cover summary, registry,
  whitelisted job upsert, unsafe policy guards, enable/disable,
  disabled-trigger rejection, manual trigger, handler execution, retry failure
  and run-log detail, cron dispatch, worker claim and scheduler queue metrics.
- Monitor cache: smoke writes temporary Redis keys and covers namespace/key
  listing, safe JSON redaction, secret-key redaction, dry-run clear, confirmed
  key deletion and confirmed prefix clear; deploy checks live Redis cache Admin
  bundle markers and Admin smoke rejects fixture-backed cache pages.
- Monitor version: smoke covers live `/monitor/version` runtime fields and
  no-secret leakage; deploy injects commit/build/deployment metadata and checks
  Admin Version bundle markers while Admin smoke rejects fixture-backed pages.
- Tool OpenAPI: smoke covers live `/tools/openapi/drift` snapshot metadata and
  OpenAPI path; Admin/deploy guards reject fixture-backed or stale OpenAPI
  pages.
- Tool Export: smoke covers live `/tools/export/protocol`, preview creation and
  server row caps; Admin/deploy guards reject fixture-backed or stale Export
  Tools pages and shared current-page export buttons.
- OpenForge: smoke covers status, doctor, plan, diff, check, apply dry-run,
  manifest list, manifest preview, rollback dry-run, confirmation guards,
  write-intent rejection and unsafe schema/config/manifest guards; deploy
  checks Admin workbench and manifest markers.
- Integration: health audit smoke covers provider-wide readiness totals,
  config-vault debt, outbox backlog, diagnostics parity, failure history and
  secret-leak guards; OAuth token smoke covers summary, list/detail, revoke,
  idempotent revoke and secret-leak guards; Admin/deploy guards reject stale
  Mail/SMS fixture pages and require live Mail/SMS template/outbox markers.
- Collaboration: message smoke covers seeded list/detail, create, idempotent
  mark-read, archive, delete and post-delete hiding; Admin/deploy guards
  reject fixture-backed Messages source and require live message operation
  markers. Notice smoke covers seeded list/detail, create, publish,
  repeat-publish guard, archive and repeat-archive guard; Admin/deploy guards
  reject fixture-backed Notices source and require live notice operation
  markers. Todo smoke covers seeded list/detail, create, assign, complete,
  terminal-action guards, cancel and canceled-list filtering; Admin/deploy
  guards reject fixture-backed Todos source and require live todo operation
  markers. Approval smoke covers seeded list/detail, create, approve,
  terminal-action guards, approved-list filtering, reject and rejected-list
  filtering; Admin/deploy guards reject fixture-backed Approval Lite source
  and require live approval operation markers.
- Config: runtime shape, environment override governance, secret-vault
  plaintext protection, legacy envelope deserialization, secret version
  history, secret rotation, vault key rotation, managed KMS host allowlist and
  v3 envelope guards.
