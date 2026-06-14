# cycle-021 Audit

Date: 2026-06-14

## Conclusion

Progress is real, but two self-caused under-scoping defects had to be
corrected:

- Round 13 stopped online-user at list/detail/kick-out; Round 14 added real
  token/session revocation.
- Round 66 treated queued external outbox handoff as provider `sent`; Round 67
  fixed the state model.

Recent guard work moved the next notice reliability steps into code: Round 69
added queued provider processing, Round 70 added signed callbacks, Round 71
added bounded retry scheduling, Round 72 added a bounded SMS HTTP adapter and
Round 73 added SMTP mail delivery. Round 74 moved Monitor Jobs Admin off
fixtures and caught a missing `ReportDefinition` migration/seed drift through
runtime smoke. Round 75 added Monitor Jobs registry visibility, registered
handler execution and failed retry diagnostics. Round 76 replaced the old
payload subject fallback with first-class mail outbox subject persistence.
Round 77 added provider diagnostics for readiness, config-vault hints, outbox
backlog, last failure and operator actions.
Round 78 added SMS HTTP config-vault secret injection into headers, query
parameters and JSON body fields.
Round 79 added first-class SMTP attachments with bounded validation,
persistence and MIME smoke coverage.
Round 80 added explicit SMTP `tlsMode` policy and deprecated TLS-field guards
with STARTTLS-required smoke coverage.
Round 81 added authenticated SSE notice inbox realtime events with snapshot and
read-event smoke coverage.
Round 82 added public config environment overrides with runtime/evaluate
resolution, secret/default-environment guards and delete fallback smoke
coverage.
Round 83 added config secret version history and explicit rotation with seeded
version, non-secret/blank guard and plaintext-leakage smoke coverage.
Round 84 added env-bound KMS keyring status, v2 key-ID envelopes, legacy
unversioned vault-envelope deserialization guards and current/versioned secret
rewrap through vault key rotation.
Round 85 added operation-log duration/location enrichment, retentionDays
cleanup and scheduled retention job registration.
Round 86 moved OpenForge Admin from static text to a live safe workbench and
added repo-root-safe generator-core readers so API/runtime tests no longer
depend on caller cwd.
Round 87 moved Integration provider health from per-provider diagnostics to a
global health/config audit with readiness totals, config-vault debt, outbox
backlog, failure history and live Admin visibility.
Round 88 added Scheduler/monitor cron dispatch, queued schedule runs, worker
claim execution and scheduler queue metrics with Admin controls and smoke
coverage.
Round 89 added OpenForge dry-run confirmation, API write-intent rejection and
manifest preview/detail through SDK/Admin with smoke coverage.
Round 90 added structured IP/location provider status and lookup with shared
common semantics, API/SDK/Admin visibility, OpenAPI tag registration and
login-log smoke/deploy guards.
Round 91 added token/session blacklist maintenance: registered-token allowlist
enforcement, expired-session cleanup, Admin summary visibility and smoke/deploy
guards.
Round 92 added OAuth token management: Prisma-backed token inventory, summary,
detail and revoke lifecycle across API/SDK/Admin with dedicated smoke and
deploy guards.
Round 93 added a guarded external HTTP JSON GeoIP adapter with host
allowlisting, bounded timeout, non-public-IP no-send behavior, API/SDK/Admin
visibility and offline fallback diagnostics.
Round 94 added a managed HTTP JSON KMS adapter: v3 secret-vault envelopes
encrypt values with random data keys, remote KMS receives only data-key
wrap/unwrap requests, and provider status is visible through API/SDK/Admin.
Round 95 replaced Monitor Cache seed arrays and Admin fixtures with a real
Redis-backed operator surface covering namespace/key scans, safe value preview
redaction, dry-run prefix clear and confirmed key/prefix deletion.
Round 96 replaced the Monitor Version fixture page with live runtime and
deployment metadata, including deploy-script commit/build injection and
API/Admin smoke guards.
Round 97 replaced the Tool OpenAPI fixture page with live contract snapshot
metadata and tool/Admin/deploy guards.
Round 98 replaced the Tool Export fixture page with live protocol and preview
calls plus row-cap smoke and Admin/deploy guards.
Round 99 moved shared current-page export buttons to the live Tool Export
protocol and removed stale Tool Export SDK fixture helpers.
Round 100 moved Integration Mail Admin from SDK fixtures to live
template/outbox list, detail, preview and queued-processing controls.
Round 101 moved Integration SMS Admin from SDK fixtures to live template/outbox
list, detail, preview and queued-processing controls.
Round 102 moved Collaboration Messages Admin from fixtures to live
summary/list/detail, create, mark-read, archive and delete operations with
Prisma migration, seed and smoke coverage.
Round 103 moved Collaboration Notices Admin from fixtures to live list/detail,
create, publish and archive operations with smoke and deploy guards.
Round 104 moved Collaboration Todos Admin from fixtures to live list/detail,
create, assign, complete and cancel operations with smoke and deploy guards.
Round 105 moved Collaboration Approval Lite Admin from fixtures to live
list/detail, create, approve and reject operations with smoke and deploy
guards.
Round 106 moved Integration WeChat/WebSocket design Admin pages from fixtures
to live API/SDK design reads with dedicated smoke and stale frontend deploy
guards.
Round 107 extended Monitor Status from dependency-only status into live CPU,
memory, disk and process resource monitoring and removed the Admin fixture
fallback.
Round 108 added Monitor Queue pause/resume controls through API/SDK/Admin,
removed the Queue Admin fixture fallback and guarded the flow with
pause/resume smoke plus deploy bundle markers.
Round 109 removed Security operation/login log Admin fixture fallbacks, added
operation-log server-side filters and guarded both pages with Admin smoke plus
deploy checks.
Round 110 added Monitor Jobs terminal run-log retention cleanup through
API/SDK/Admin, rejected queued/running cleanup and guarded the Jobs Admin page
against fixture fallback.
Round 111 removed the OAuth token Admin fixture fallback, made token detail
load through the live SDK API, gated revoke controls with
`integration:oauth:manage` and guarded stale OAuth bundles in Admin smoke and
deployment.
Round 112 removed the Online Users Admin fixture fallback, made session detail
API failures visible and guarded stale online-user bundles in Admin smoke and
deployment.
Round 113 removed the Integration Providers Admin fixture fallback, made
provider detail load through the live diagnostics API and guarded stale
provider bundles in Admin smoke and deployment.
Round 114 removed the System Dicts Admin fixture fallback, kept dictionary
list/detail and item operations live-only through SDK calls and guarded stale
Dicts bundles in Admin smoke and deployment.
Round 115 removed the System Departments Admin fixture fallback, kept
department tree/detail and order operations live-only through SDK calls and
guarded stale Departments bundles in Admin smoke and deployment.
Round 116 removed the System Posts Admin fixture fallback, kept post
list/detail, batch deletion and order operations live-only through SDK calls
and guarded stale Posts bundles in Admin smoke and deployment.
Round 117 removed the System Permissions Admin registry fixture fallback, kept
permission catalog/detail/custom CRUD/export operations live-only through SDK
calls and guarded stale Permissions bundles with dedicated permission smoke,
Admin smoke and deployment checks.
Round 118 removed the System Menus Admin registry fixture fallback, kept menu
tree/detail CRUD/export operations and permission options live-only through
SDK calls and guarded stale Menus bundles in Admin smoke and deployment.
Rounds 119-127 closed the finite System Admin fallback queue for Roles, Users,
Config, Notices, Files, public Permissions/Posts acceptance, the unified
seven-page guard and final docs reconciliation.
Round 68 also exposed the Admin generated-types race, so Admin `typecheck` and
`lint` must run sequentially.

## Productization Acceptance Audit

The audit now records acceptance state in addition to feature parity. Full
`Meets` requires live API, live Admin, no fixture fallback and real public API
and public Admin smoke. Bundle marker checks and printed public URLs are not
public smoke.

| Capability         | RuoYi/Yudao counterpart                        | OpenCore API status | OpenCore Admin status        | Live-only | Public API smoke | Public Admin smoke | Fixture fallback | Still needed                                    |
| ------------------ | ---------------------------------------------- | ------------------- | ---------------------------- | --------- | ---------------- | ------------------ | ---------------- | ----------------------------------------------- |
| System Users       | System user management                         | live                | live-only                    | yes       | yes              | yes                | no               | Keep guard and public smoke current.            |
| System Roles       | System role management                         | live                | live-only                    | yes       | yes              | yes                | no               | Keep guard and public smoke current.            |
| System Permissions | System permission catalog                      | live                | live-only                    | yes       | yes              | yes                | no               | Keep guard and public smoke current.            |
| System Posts       | System post management                         | live                | live-only                    | yes       | yes              | yes                | no               | Keep guard and public smoke current.            |
| System Files       | Infra file service                             | live                | live-only                    | yes       | yes              | yes                | no               | Keep guard and public smoke current.            |
| System Config      | System/config management                       | live                | live-only                    | yes       | yes              | yes                | no               | Keep guard and public smoke current.            |
| System Notices     | System notices                                 | live                | live-only                    | yes       | yes              | yes                | no               | Keep guard and public smoke current.            |
| Scheduler/Monitor  | Job, queue, status, cache, version             | live                | live-only                    | yes       | yes              | yes                | no               | Keep admitted scope guarded.                    |
| Integration        | Provider health, OAuth, Mail/SMS, design pages | live                | live-only for admitted scope | yes       | yes              | yes                | no               | Payment/BillingDesign remains out of scope.     |
| Online Users       | Online sessions                                | live                | live-only                    | yes       | yes              | yes                | no               | None.                                           |
| OAuth              | OAuth token inventory                          | live                | live-only                    | yes       | yes              | yes                | no               | Full SSO provider flow remains out of scope.    |
| Security Logs      | Login and operation logs                       | live                | live-only                    | yes       | yes              | yes                | no               | Historical GeoIP backfill remains out of scope. |
| Departments        | Organization/dept management                   | live                | live-only                    | yes       | yes              | yes                | no               | None.                                           |
| Dicts              | Dictionary management                          | live                | live-only                    | yes       | yes              | yes                | no               | None.                                           |

## Guarded Failures

- Duplicate `/api/api` login is blocked by deploy/Admin smoke.
- Stale Admin deployment is blocked by built bundle markers.
- Revoked, expired or unknown sessions/tokens must return 401.
- Notice outbox smoke covers pending handoff, retry, process-to-sent, signed
  callback sync, scheduled retry caps, SMS HTTP host allowlist, SMTP
  config-vault auth, SMTP TLS policy, SMS HTTP secret injection, mail subject
  persistence, SMTP attachments, authenticated inbox realtime events, provider
  diagnostics, provider failedCount and sent mutation guards. Admin/deploy
  guards reject System Notices fixture fallback and require live management,
  inbox, template, delivery and outbox operation markers.
- Operation-log smoke covers guard failures, deleted-detail 404,
  duration/location filters, retentionDays cleanup and scheduled retention job
  registry; Admin/deploy guards reject Security log fixture fallbacks and
  require operation-log server-side filter markers.
- IP/location smoke covers provider status, OpenAPI paths, documentation
  network lookup, invalid lookup and missing-IP guards; common tests cover the
  external HTTP JSON adapter, host allowlist, non-public-IP no-send behavior
  and fallback diagnostics; deploy checks Admin GeoIP bundle markers.
- Online-user smoke covers summary, expired cleanup, force-logout audit,
  revoked-token rejection, list/detail, batch kick-out, single kick-out,
  repeat-kick guard and preserved admin session behavior; Admin/deploy guards
  reject Online Users fixture fallback and require live session markers.
- System Dicts smoke covers dictionary type/item CRUD and simple-list
  consumers; Admin/deploy guards reject Dicts fixture fallback and require
  live dictionary management markers.
- System Departments smoke covers department tree CRUD, ordering, simple-list
  consumers and delete guards; Admin/deploy guards reject Departments fixture
  fallback and require live tree/order management markers.
- System Posts smoke covers post CRUD, batch deletion, ordering, simple-list
  consumers and delete guards; Admin/deploy guards reject Posts fixture
  fallback and require live batch/order management markers.
- System Permissions smoke covers permission list/detail, custom
  create/update/export/delete and system mutation guards; Admin/deploy guards
  reject Permissions registry fixture fallback and require live permission
  management markers.
- System Menus smoke covers tree metadata, create/update/export, parent delete
  guards and delete cleanup; Admin/deploy guards reject Menus registry fixture
  fallback and require live menu management markers.
- Config smoke covers runtime shape, environment override governance, legacy
  vault envelope deserialization, secret version history, secret rotation,
  vault key rotation, managed KMS provider status and no plaintext secret
  storage; unit tests cover v3 managed KMS data-key wrap/unwrap and host
  allowlist rejection. Admin/deploy guards reject Config fixture fallback and
  require live config, environment override, secret/vault and export markers.
- Monitor Jobs smoke covers operations summary, registry, job policy guards,
  enable/disable, disabled-trigger rejection, manual trigger, handler
  execution, failed retry, run-log detail, cron dispatch, worker claim and
  scheduler queue metrics plus queue pause/resume with recovery, terminal
  run-log cleanup and queued/running cleanup rejection.
- Monitor Status smoke covers live dependencies, CPU, memory, disk and process
  runtime resources, OpenAPI runtime schemas and no-secret leakage;
  Admin/deploy guards reject fixture fallback and require live resource
  markers.
- Monitor Cache smoke covers Redis-backed namespace/key listing, safe JSON
  field redaction, secret-key redaction, dry-run prefix clear, confirmed key
  deletion and confirmed prefix clear; Admin smoke rejects fixture-backed
  cache pages.
- Monitor Version smoke covers live runtime fields and no secret leakage;
  Admin/deploy guards reject fixture-backed or stale version pages and require
  commit/build/deployment metadata injection.
- Tool OpenAPI smoke covers live drift snapshot metadata and OpenAPI path;
  Admin/deploy guards reject fixture-backed or stale OpenAPI pages.
- Tool Export smoke covers live protocol, preview creation and row caps;
  Admin/deploy guards reject fixture-backed or stale Export Tools pages and
  shared export buttons.
- OpenForge smoke covers status, doctor, plan, diff, check, apply dry-run,
  manifest list, manifest preview, rollback dry-run, dry-run confirmation,
  write-intent rejection and unsafe schema/config/manifest guards.
- Integration health smoke covers provider-wide readiness totals,
  config-vault debt, outbox backlog, diagnostics parity, failure history and
  secret-leak guards; Admin/deploy guards reject Providers fixture fallback
  and require live health-audit/diagnostics markers. OAuth token smoke covers
  summary, list/detail, revoke, idempotent revoke and secret-leak guards;
  Admin/deploy guards reject OAuth fixture fallback and require live
  list/detail/revoke markers; design smoke covers WeChat/WebSocket endpoints
  and summary topics; Admin/deploy guards require live Mail/SMS
  template/outbox operations and live WeChat/WebSocket design markers.
- Collaboration Messages smoke covers seed-backed list/detail, create,
  idempotent mark-read, archive, delete and post-delete hiding;
  Collaboration Notices smoke covers seed-backed list/detail, create, publish,
  guarded repeat-publish, archive and guarded repeat-archive; Collaboration
  Todos smoke covers seed-backed list/detail, create, assign, complete,
  terminal-action guards, cancel and canceled-list filtering; Collaboration
  Approval Lite smoke covers seed-backed list/detail, create, approve,
  terminal-action guards, approved-list filtering, reject and rejected-list
  filtering; Admin/deploy guards reject fixture-backed Messages, Notices,
  Todos and Approval Lite pages.

## Documentation Finding

The low-signal docs were per-round reports, copied gate text and repeated
reference disclaimers. Keep only current state, guard matrix, active queue and
real incident decisions. Do not create per-round reports by default.

## Residual Risk

- Notice realtime is single-node process-local; multi-instance fanout remains a
  deployment-topology upgrade if needed.
- Automatic backfill of historical login/operation logs with external GeoIP
  precision remains outside the current request-time lookup surface.
- OpenForge direct generated schema/migration/business writes remain outside
  the admitted surface.
- Payment/BillingDesign and Optional Reports/ExportJobs remain outside the
  admitted surface until real payments, full report designer or big-data async
  export are explicitly admitted.

## Trigger Next Audit

Audit again when a repeated failure returns, docs grow faster than code, a new
explicitly admitted finite foundation domain starts, or public smoke fails
after local tests pass.
