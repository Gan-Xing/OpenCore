# cycle-021 Productization Waterline Audit

Date: 2026-06-14

## Waterline

A foundation capability meets the current waterline only when API, SDK, Admin,
permissions/menu, seed/OpenAPI, smoke coverage and deployment guards are live.
The Admin must support the operator workflow, security effects must be real
runtime behavior, repeated failures must have guards, and remaining omissions
must be explicit product boundaries.

Strict Capstone rules:

- Any capability with Admin fixture fallback must not be marked `Meets`.
- Any capability without public API smoke and public Admin smoke must not be
  marked full `Meets`; use `Meets local only` when local smoke is present but
  public smoke is missing.
- Bundle marker smoke checks built Admin chunks for required/forbidden marker
  strings. It is not a substitute for public API/Admin smoke.
- Deploy guard means the fixed deployment script blocks stale or fixture-backed
  artifacts. It is separate from local smoke and public smoke.
- Printing or linking a public URL does not count as public verification. Only
  successful real requests to the public API/Admin URLs count as public smoke.

## Current Status

| Capability                             | Status        | Notes                                                                                                                                                                                                           |
| -------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System Users (`core.user`)             | Meets         | User CRUD, role assignment, status/batch mutations, reset password, department filtering, post/dept selectors, import/export and current-page export are live-only with public smoke and Admin/deploy guards.   |
| System Roles (`core.role`)             | Meets         | Role CRUD, menu/user assignment, status changes, data-scope dept selection and current-page export are live-only with public smoke and Admin/deploy guards.                                                     |
| System Permissions (`core.permission`) | Meets         | Catalog/detail/custom CRUD/export are live-only with public smoke and Admin/deploy guards.                                                                                                                      |
| System Posts (`core.post`)             | Meets         | List/detail/batch/order operations are live-only with public smoke and Admin/deploy guards.                                                                                                                     |
| System Files (`core.file`)             | Meets         | List/detail, upload/download, metadata update, delete and current-page export are live-only with public smoke and Admin/deploy guards.                                                                          |
| System Config (`core.config`)          | Meets         | Config CRUD, value reads, cache refresh, batch deletion, environment overrides, feature rollout/audience controls, secret/vault operations and exports are live-only with public smoke and Admin/deploy guards. |
| System Notices (`core.notice`)         | Meets         | Notice management, inbox, templates, read-user analytics, delivery records, outbox provider actions and exports are live-only with public smoke and Admin/deploy guards.                                        |
| Scheduler/Monitor                      | Meets current | Jobs, queues, status, cache and version surfaces are live-only with smoke/deploy guards.                                                                                                                        |
| Integration                            | Meets current | Providers, OAuth, Mail/SMS and design surfaces are live-only for admitted scope; payment/billing remains out of scope.                                                                                          |
| Online Users (`monitor.online-user`)   | Meets         | Live list/detail/kick-out/cleanup, token revocation and deployment guards are present.                                                                                                                          |
| OAuth (`integration.oauth-token`)      | Meets current | Token inventory/detail/revoke lifecycle is live-only; full SSO provider flows remain explicit out of scope.                                                                                                     |
| Security Logs                          | Meets current | Login/operation log Admin pages are live-only with server filters and guard coverage.                                                                                                                           |
| Departments (`core.dept`)              | Meets         | Tree/detail/order operations are live-only with smoke and deploy guards.                                                                                                                                        |
| Dicts (`core.dict`)                    | Meets         | Dict/item operations are live-only with smoke and deploy guards.                                                                                                                                                |
| System Menus (`core.menu`)             | Meets         | Tree/detail CRUD/export and permission options are live-only with smoke and deploy guards.                                                                                                                      |
| Tooling/OpenForge                      | Meets current | OpenAPI, Export and OpenForge Admin are live for safe/read/dry-run scope; direct writes remain out of scope.                                                                                                    |
| Collaboration                          | Meets current | Messages, Notices, Todos and Approval Lite are live-only for admitted lightweight collaboration scope.                                                                                                          |

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
- Round 106 replaced the Integration WeChat/WebSocket design Admin fixture
  pages with live API/SDK design reads and smoke/deploy guards.
- Round 107 added live Monitor Status runtime CPU, memory, disk and process
  resources and removed the Admin fixture fallback.
- Round 108 added guarded Monitor Queue pause/resume controls with
  `monitor:queue:manage`, live-only Admin data and smoke/deploy guards.
- Round 109 removed Security operation/login log Admin fixture fallbacks and
  wired operation-log server-side filters with Admin/deploy guards.
- Round 110 added Monitor Jobs terminal run-log retention cleanup across
  API/SDK/Admin and removed the Jobs Admin fixture fallback path from the
  deployable surface.
- Round 111 removed the OAuth token Admin fixture fallback, made token detail
  load through the live SDK API, gated revoke controls with
  `integration:oauth:manage` and added smoke/deploy stale-bundle guards.
- Round 112 removed the Online Users Admin fixture fallback, made detail
  failure visible and added smoke/deploy guards for live-only session
  list/detail/kick-out/expired-cleanup controls.
- Round 113 removed the Integration Providers Admin fixture fallback, made
  provider detail load through the live diagnostics API and added smoke/deploy
  guards for live-only health audit and diagnostics surfaces.
- Round 114 removed the System Dicts Admin fixture fallback, made list/detail
  and item operations live-only and added smoke/deploy guards for stale Dicts
  bundles.
- Round 115 removed the System Departments Admin fixture fallback, made
  tree/detail/order operations live-only and added smoke/deploy guards for
  stale Departments bundles.
- Round 116 removed the System Posts Admin fixture fallback, made
  list/detail/batch/order operations live-only and added smoke/deploy guards
  for stale Posts bundles.
- Round 117 removed the System Permissions Admin registry fixture fallback,
  made catalog/detail/custom CRUD/export operations live-only and added a
  dedicated permission smoke plus deploy guards for stale Permissions bundles.
- Round 118 removed the System Menus Admin registry fixture fallback, made
  tree/detail CRUD/export and permission options live-only and added deploy
  guards for stale Menus bundles.
- Round 119 removed the System Roles Admin permission/dept fixture fallback,
  stale detail fallback and fallback UI, made role CRUD, menu/user assignment,
  status changes and current-page export live-only and added Admin/deploy
  guards for stale Roles bundles.
- Round 120 removed the System Users Admin user/role/dept/post fixture
  fallback, stale detail fallback and fallback UI, made user CRUD, role
  assignment, status/batch mutations, reset password, department filtering,
  post/dept selectors, import/export and current-page export live-only and
  added Admin/deploy guards for stale Users bundles.
- Round 121 removed the System Config Admin fixture fallback, stale detail
  fallback and fallback UI, made config CRUD, value reads, cache refresh,
  batch deletion, environment overrides, feature flag rollout/audience
  controls, secret version rotation, vault key rotation, backend Excel export
  and current-page export live-only and added Admin/deploy guards for stale
  Config bundles.
- Round 122 removed the System Notices Admin fixture fallback, stale
  management/template/inbox detail fallback and fallback UI, made notice
  management CRUD, publish/archive/delete, inbox read actions, template
  CRUD/render/create-draft, read-user analytics, delivery records, outbox
  provider actions and current-page export live-only and added Admin/deploy
  guards for stale System Notices bundles.
- Round 123 removed the System Files Admin fixture fallback, stale detail
  fallback and fallback UI, made file list/detail, upload/download, metadata
  update, delete and current-page export live-only and added Admin/deploy
  guards for stale Files bundles.
- Round 124 confirmed closure-flow public API/Admin smoke for System
  Permissions without runtime changes.
- Round 125 confirmed closure-flow public API/Admin smoke for System Posts
  without runtime changes.
- Round 126 added the seven-page unified no-fixture-fallback guard and wired
  it into Admin smoke and the fixed deploy script.

## Active Debt

1. Final progress, handoff, ledger and completion-report reconciliation remains
   open.
2. Payment/BillingDesign remains explicit-admission because real payment,
   refund and reconciliation are out of scope.
3. Optional Reports/ExportJobs remain explicit-admission because full report
   designer and big-data async export are out of scope.
4. OpenForge direct schema/migration/business-code writes still require user
   admission.
5. Public smoke must be split into public API smoke and public Admin smoke;
   printed URLs or bundle markers do not count as public verification.

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
  retentionDays cleanup, scheduled retention job registry, Admin server-side
  filters and live-only Security log page guards.
- IP/location: login-log smoke covers provider status, documentation-network
  lookup, invalid lookup, missing-IP guard and OpenAPI paths; common tests
  cover the external HTTP JSON adapter, host allowlist, non-public-IP no-send
  behavior and fallback diagnostics; deploy checks Admin GeoIP bundle markers.
- Online users: smoke covers summary, expired cleanup, revoked-token
  rejection, list/detail, batch kick-out, single kick-out and preserved admin
  session behavior; Admin/deploy guards reject fixture fallback and require
  live session markers.
- Monitor jobs: Admin bundle markers and smoke cover summary, registry,
  whitelisted job upsert, unsafe policy guards, enable/disable,
  disabled-trigger rejection, manual trigger, handler execution, retry failure
  and run-log detail, cron dispatch, worker claim, scheduler queue metrics and
  queue pause/resume with recovery, plus terminal run-log cleanup and a
  queued/running cleanup rejection guard.
- Monitor status: smoke covers `/monitor/status` dependency checks, CPU,
  memory, disk and process runtime resources, OpenAPI schemas and no-secret
  leakage; Admin/deploy guards reject fixture fallback and require runtime
  resource markers.
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
  secret-leak guards; Admin/deploy guards reject Providers fixture fallback and
  require live health-audit/diagnostics markers. OAuth token smoke covers
  summary, list/detail, revoke, idempotent revoke and secret-leak guards,
  while Admin/deploy guards reject OAuth fixture fallback and require live
  list/detail/revoke markers; design smoke covers WeChat and WebSocket design
  endpoints plus summary topics; Admin/deploy guards reject stale Mail/SMS and
  WeChat/WebSocket fixture pages and require live markers.
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
- System dicts: core dict smoke covers type/item CRUD and simple-list
  consumers; Admin/deploy guards reject fixture fallback and require live
  dictionary list/detail/item management markers.
- System departments: core dept smoke covers tree CRUD, ordering, simple-list
  consumers and delete guards; Admin/deploy guards reject fixture fallback and
  require live tree/order management markers.
- System posts: core post smoke covers CRUD, batch deletion, ordering,
  simple-list consumers and delete guards; Admin/deploy guards reject fixture
  fallback and require live batch/order management markers.
- System permissions: core permission smoke covers list/detail, custom
  create/update/export/delete and system mutation guards; Admin/deploy guards
  reject registry fixture fallback and require live permission management
  markers.
- System menus: core menu smoke covers tree metadata, create/update/export,
  parent delete guards and delete cleanup; Admin/deploy guards reject registry
  fixture fallback and require live menu tree management markers.
