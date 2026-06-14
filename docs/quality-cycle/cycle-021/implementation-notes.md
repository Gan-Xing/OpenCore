# cycle-021 Implementation Notes

Date: 2026-06-14

This is the compact implementation record. Keep only current guard facts,
active debt and decisions that change future execution.

## Execution Contract

- Deploy path: `pnpm deploy:opencore`.
- Ports: API `39172`, Admin `39174`, local smoke `39173`.
- P0/P1 foundation work is limited to the pre-authorized Capstone scope,
  including Collaboration center foundations; large business domains,
  production multi-tenancy, real payments, BPMN/full workflow, full report
  designer, RAG/Agent/AI workflow and OpenForge direct schema/business writes
  need explicit user admission.
- No legacy compatibility burden: replace stale DTOs, SDK shapes, routes,
  seeds and Admin flows directly.
- Do not paste standard test/build/deploy command lists into docs.

## Runtime State

Cycle-021 has recorded deployable stages through Round 118 across
System/Security/Monitor/Integration/Tools foundations. Round 91 added
token/session blacklist maintenance with registered-token allowlist
enforcement, expired-session cleanup, API/SDK/Admin/OpenAPI visibility, smoke
and Admin deploy markers. Round 92 added OAuth token inventory, summary,
detail and revoke lifecycle with Prisma model/seed, SDK/Admin/OpenAPI
visibility, dedicated smoke and Admin deploy markers. Round 93 added a
guarded external HTTP JSON GeoIP adapter with host allowlisting, bounded
timeouts, non-public-IP no-send behavior and offline fallback diagnostics.
Round 94 added a managed HTTP JSON KMS adapter with v3 secret-vault envelopes
and remote data-key wrap/unwrap while preserving env as the default provider.
Round 95 replaced the Monitor Cache seed/fixture surface with Redis-backed
namespace/key scans, safe value previews, dry-run prefix clear and confirmed
key/prefix deletion. Round 96 replaced the Monitor Version fixture page with
live runtime/deployment metadata and fixed deploy-script commit/build
injection. Round 97 replaced the Tool OpenAPI fixture page with live drift
snapshot metadata including hash and path/schema/operation counts. Round 98
replaced the Tool Export fixture page with live protocol and preview calls,
including server row-cap verification. Round 99 moved shared current-page
export buttons to the live Tool Export protocol and removed stale Tool Export
SDK fixture helpers. Round 100 moved the Integration Mail Admin page to live
template/outbox list, detail, preview and queued-processing controls. Round
101 moved the Integration SMS Admin page to live template/outbox list, detail,
preview and queued-processing controls. Round 102 moved Collaboration Messages
from fixtures to live summary, list/detail, create, mark-read, archive and
delete operations with seed and smoke coverage. Round 103 moved Collaboration
Notices from fixtures to live list/detail, create, publish and archive
operations with smoke and deploy guards. Round 104 moved Collaboration Todos
from fixtures to live list/detail, create, assign, complete and cancel
operations with smoke and deploy guards. Round 105 moved Collaboration
Approval Lite from fixtures to live list/detail, create, approve and reject
operations with smoke and deploy guards. Round 106 moved Integration
WeChat/WebSocket design Admin pages from fixtures to live API/SDK design reads
with a dedicated smoke and stale frontend deploy guards. Round 107 extended
Monitor Status with live CPU, memory, disk and process resource snapshots and
removed the Admin fixture fallback. Round 108 added guarded BullMQ queue
pause/resume through API/SDK/Admin, replaced Queue Admin fixture fallback with
live-only data and added `monitor:queue:manage` smoke/deploy guards. Round
109 removed Security operation/login log Admin fixture fallbacks, added
operation-log server-side filters and guarded the pages through Admin smoke
and deploy markers. Round 110 added Monitor Jobs terminal run-log retention
cleanup through API/SDK/Admin, rejects queued/running cleanup and keeps the
Jobs Admin page live-only through smoke/deploy guards. Round 111 removed the
OAuth token Admin fixture fallback, loads token detail through the live SDK
API, gates revoke controls with `integration:oauth:manage` and blocks stale
OAuth bundles through Admin smoke and deploy guards. Round 112 removed the
Online Users Admin fixture fallback, makes detail API failures visible and
blocks stale online-user bundles through Admin smoke and deploy guards. Round
113 removed the Integration Providers Admin fixture fallback, loads provider
detail through the live diagnostics API and blocks stale provider bundles
through Admin smoke and deploy guards. Round 114 removed the System Dicts
Admin fixture fallback, keeps dictionary list/detail and item operations
live-only through SDK calls and blocks stale Dicts bundles through Admin smoke
and deploy guards. Round 115 removed the System Departments Admin fixture
fallback, keeps department tree/detail/order operations live-only through SDK
calls and blocks stale Departments bundles through Admin smoke and deploy
guards. Round 116 removed the System Posts Admin fixture fallback, keeps post
list/detail, batch deletion and ordering live-only through SDK calls and
blocks stale Posts bundles through Admin smoke and deploy guards. Round 117
removed the System Permissions Admin registry fixture fallback, keeps
catalog/detail/custom CRUD/export live-only through SDK calls and blocks stale
Permissions bundles through a dedicated permission smoke plus Admin/deploy
guards. Round 118 removed the System Menus Admin registry fixture fallback,
keeps tree/detail CRUD/export and permission options live-only through SDK
calls and blocks stale Menus bundles through Admin/deploy guards. Round 119
removed the System Roles Admin permission/dept fixture fallback, stale detail
fallback and fallback UI, keeps role CRUD, menu/user assignment, status
changes, data-scope dept selection and current-page export live-only through
SDK calls and blocks stale Roles bundles through Admin/deploy guards.

## Guard Register

- API prefix: deploy/Admin smoke reject duplicate `/api/api` login.
- Admin bundle: deploy script checks built chunks and current page markers.
- Session revocation: auth, online-user and login-log smokes require revoked
  tokens to return 401; online-user unit tests also reject unknown and expired
  token sessions.
- Notice outbox: smoke covers pending handoff, idempotent execute, blank
  failure rejection, failed-to-retry, process-to-sent sync, signed callback
  sync, scheduled retry caps, SMS HTTP host allowlist, SMTP config-vault auth,
  SMTP TLS policy, SMS HTTP secret injection, mail outbox subject persistence,
  SMTP attachments, authenticated inbox realtime events, provider diagnostics,
  provider failures and sent-state mutation guards.
- Operation log: smoke covers batch-delete guards, deleted-detail 404,
  duration/location filters, retentionDays cleanup and the retention scheduler
  job registry while preserving the clean request audit row. Admin smoke and
  deploy guards require live-only Security log pages and operation-log
  server-side filters instead of fixture fallback.
- IP/location: login-log smoke covers provider status, OpenAPI paths,
  documentation-network lookup, invalid lookup and missing-IP guards; common
  tests cover the external HTTP JSON provider, host allowlist, non-public-IP
  no-send behavior and fallback diagnostics; Admin deploy checks external
  GeoIP adapter and lookup markers.
  Enable with `OPENCORE_IP_LOCATION_PROVIDER=opencore.http-json`,
  `OPENCORE_IP_LOCATION_ENDPOINT_URL` and
  `OPENCORE_IP_LOCATION_ALLOWED_HOSTS`; optional auth uses
  `OPENCORE_IP_LOCATION_AUTH_HEADER_NAME/VALUE`.
- Online users: smoke covers summary, expired cleanup, force-logout audit,
  revoked-token rejection, list/detail, batch kick-out, single kick-out,
  repeat-kick guard and preserved admin session behavior. Admin smoke and
  deploy guards reject fixture-backed Online Users pages and require live
  session markers.
- System dicts: smoke covers dict type/item CRUD, enabled simple-list
  consumers and guard failures. Admin/deploy guards reject `createDictFixtures`
  and fallback copy on the Dicts page and require live dictionary management
  markers in the built bundle.
- System departments: smoke covers department tree CRUD, ordering,
  simple-list consumers and delete guards. Admin/deploy guards reject
  `createSystemDeptFixtures` and fallback copy on the Departments page and
  require live tree/order management markers in the built bundle.
- System posts: smoke covers post CRUD, batch deletion, ordering, simple-list
  consumers and delete guards. Admin/deploy guards reject
  `createSystemPostFixtures` and fallback copy on the Posts page and require
  live batch/order management markers in the built bundle.
- System permissions: smoke covers permission list/detail, custom
  create/update/export/delete and system mutation guards. Admin/deploy guards
  reject `createPermissionSummariesFromRegistry` and fallback copy on the
  Permissions page and require live permission management markers in the built
  bundle.
- System menus: smoke covers menu tree metadata, create/update/export, parent
  delete guards and delete cleanup. Admin/deploy guards reject
  `createMenuSummariesFromRegistry`, `createPermissionSummariesFromRegistry`
  and fallback copy on the Menus page and require live menu management markers
  in the built bundle.
- System roles: smoke covers role menu assignment, user assignment, status
  changes, update/delete session revocation and relogin refresh. Admin/deploy
  guards reject `createPermissionSummariesFromRegistry`,
  `createSystemDeptFixtures`, `fallbackRows`, fallback copy and stale detail
  fallback on the Roles page, and require live role management markers in the
  built bundle.
- Config/secret: smoke covers feature flags, audience rules, environment
  overrides, legacy vault envelope deserialization, secret version history,
  explicit secret rotation, vault key rotation, managed KMS provider status,
  v3 managed envelopes and no plaintext secret-vault leakage.
  Enable managed KMS with `OPENCORE_CONFIG_KMS_PROVIDER=opencore.http-json`,
  `OPENCORE_CONFIG_KMS_WRAP_URL`, `OPENCORE_CONFIG_KMS_UNWRAP_URL` and
  `OPENCORE_CONFIG_KMS_ALLOWED_HOSTS`; optional auth uses
  `OPENCORE_CONFIG_KMS_AUTH_HEADER_NAME/VALUE`.
- Monitor jobs: smoke covers operations summary, whitelisted job upsert,
  registry, unsafe policy guards, enable/disable, disabled-trigger rejection,
  run-now, handler execution, failed retry, run-log detail, cron dispatch,
  worker claim, scheduler queue metrics and queue pause/resume with a resume
  recovery guard, plus terminal run-log cleanup and queued/running cleanup
  rejection; dispatch smoke uses a per-run far-future non-zero-minute
  cron tick so repeated deploys cannot collide with persisted `scheduledAt`
  de-dup metadata or seeded hourly jobs. Deploy also checks the Jobs run-log
  retention markers and Queues Admin bundle markers.
- Monitor status: smoke covers live dependency checks plus CPU, memory, disk
  and process runtime resources from `/monitor/status`, OpenAPI runtime
  schemas and no-secret leakage. Admin/deploy guards reject
  `createSystemStatusFixture()` fallback and require runtime resource markers.
- Monitor cache: smoke writes temporary Redis keys and verifies namespace/key
  listing, safe JSON field redaction, secret-key redaction, dry-run clear,
  confirmed key deletion and confirmed prefix clear. Admin smoke rejects
  `createOperationsFixtures()` on the Cache page and deploy checks live Redis
  cache bundle markers.
- Monitor version: smoke verifies live runtime fields and no secret leakage
  from `/monitor/version`; Admin smoke rejects `createVersionInfoFixture()` on
  the Version page, and deploy checks runtime metadata bundle markers plus
  injected commit/build/deployment env vars.
- Tool OpenAPI: tool smoke verifies live `/tools/openapi/drift` snapshot
  metadata and OpenAPI path; Admin smoke rejects `createOpenApiDriftFixture()`
  on the OpenAPI page, and deploy checks live drift bundle markers.
- Tool Export: tool smoke verifies live `/tools/export/protocol`,
  `/tools/export/preview` and row-cap behavior; Admin smoke rejects
  `createCurrentPageExportProtocolFixture()` and `createExportPlanFixture()`
  on the Export Tools page and shared export button, and deploy checks live
  export bundle markers plus shared button protocol markers.
- OpenForge: smoke covers status, doctor, plan, diff, check, apply dry-run,
  manifest list, manifest preview, rollback dry-run, dry-run confirmation
  guards, write-intent rejection and unsafe schema/config/manifest guards.
  Deploy checks Admin workbench, confirmation and manifest markers.
- Integration: smoke covers provider-wide health audit, diagnostics parity,
  config-vault debt, outbox backlog, failure history and secret-leak guards;
  Admin/deploy guards reject Providers fixture fallback and require live
  health-audit/diagnostics markers. OAuth token smoke covers summary,
  list/detail, revoke, idempotent revoke and secret-leak guards. Admin/deploy
  guards reject OAuth fixture fallback and require live list/detail/revoke
  markers. Design smoke covers WeChat/WebSocket design reads and summary
  topics. Admin/deploy guards reject fixture-backed Mail/SMS and
  WeChat/WebSocket pages and require live markers.
- Collaboration: message smoke covers seed-backed list/detail, create,
  idempotent mark-read, archive, delete and post-delete hiding.
  Notice smoke covers seed-backed list/detail, create, publish,
  repeat-publish guard, archive and repeat-archive guard. Todo smoke covers
  seed-backed list/detail, create, assign, complete, terminal-action guards,
  cancel and canceled-list filtering. Approval smoke covers seed-backed
  list/detail, create, approve, terminal-action guards, approved-list
  filtering, reject and rejected-list filtering. Admin/deploy guards reject
  fixture-backed Messages/Notices/Todos/Approval Lite source and require live
  operation markers.
- Prisma schema/seed drift: migrations and seed must include every Prisma
  model used by smoke-covered runtime endpoints.
- Admin generated types: run Admin `typecheck` and `lint` sequentially because
  both can call `max setup`.
- Seed drift: Prisma integration tests must create and clean the records they
  require.
- Shared Prisma DB: package-level integration specs run with one worker where
  they touch common fixtures.
- Documentation noise: `quality-docs:check` blocks command-log accumulation.

## Remaining Foundation Debt

- Notice: optional multi-instance realtime fanout if deployment topology moves
  beyond the current single-node process, plus any admitted
  tenant/member/mobile channels.
- Login/operation log: automatic historical log backfill with external GeoIP
  precision is not part of the current request-time lookup surface.
- OpenForge: direct schema/migration/business writes still require user
  admission.
- Integration: Payment/BillingDesign remains explicit-admission because real
  payment, refund and reconciliation are outside the admitted surface.
- Optional Reports/ExportJobs remain explicit-admission because full report
  designer and big-data async export are outside the admitted surface.
- Collaboration: current live-operations Admin waterline is met for Messages,
  Notices, Todos and Approval Lite. BPMN/full workflow remains explicit
  admission.
