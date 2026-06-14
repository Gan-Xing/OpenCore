# OpenCore Cycle-021 Handoff

Date: 2026-06-14
Repository: `Gan-Xing/OpenCore`
Branch: `main`

## Goal

Close only the finite Cycle-021 System Admin fallback debt queue. This handoff
is the source of truth for the seven fixed System Admin pages below. Do not
restore the old capability-map productization recursion goal or select new
P0/P1 work outside this list.

Fixed pages:

1. System Roles Admin live-only
2. System Users Admin live-only
3. System Config Admin live-only
4. System Notices Admin live-only
5. System Files Admin live-only
6. System Permissions Admin live-only
7. System Posts Admin live-only

## Fixed Acceptance Execution

- Read this file and `acceptance-matrix.md` before selecting a capstone task.
- Pick only from the seven-page finite backlog queue.
- If the acceptance matrix is missing or does not list the seven fixed pages,
  the round is docs-only planning: update `acceptance-matrix.md`, rewrite
  `backlog.md` as a finite seven-page closure queue, update this handoff, do
  not edit runtime/source code, do not deploy, run docs checks, commit and
  push.
- If the acceptance matrix is present, each code round closes exactly one Open
  page in this order:
  1. System Roles
  2. System Users
  3. System Config
  4. System Notices
  5. System Files
  6. System Permissions
  7. System Posts
  8. Seven-page unified Admin smoke/deploy guard coverage
  9. Documentation reconciliation
- Code changes: test, commit, push, deploy through `pnpm deploy:opencore`,
  then run public API smoke and public Admin smoke. Printing a public URL does
  not count as verification.
- Fixed ports: API `39172`, Admin `39174`, local smoke `39173`.
- Repeated failures must become tests, smokes or deploy guards:
  deserialization drift, duplicate `/api/api`, stale Admin bundles and revoked
  session/token behavior, seed drift.
- Feature code, tests, deploy guards and docs should land in one commit.
- Docs-only cleanup gets format/check, commit and push; no redeploy when
  runtime artifacts are unchanged.

## Page Closure Requirements

For the selected page:

- Remove `create*Fixtures` or registry fixture fallback imports/usages.
- Remove `fallbackRows` and related fallback data constants.
- Remove `Using fallback...`, `fallback snapshot` and equivalent UI copy.
- Remove API failure paths that call `setRows(fallbackRows)` or equivalent.
- Remove detail failure paths that call `setSelected(record)` or
  `setSelectedDetail(record)`.
- API/list/detail/form option load failures must show explicit error or empty
  error state. They must not show fake data.
- Add or update Admin smoke/static guard and deploy guard so fallback cannot
  reappear silently.
- Update only the docs whose state actually changed.

## Checks

Docs-only planning round:

- `pnpm exec prettier --check <changed docs>`
- `pnpm quality-docs:check`
- `git diff --check`
- commit and push

Code round:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- relevant focused smoke
- Admin smoke/static guard
- `pnpm deploy:opencore`
- local fixed-port verification: API `39172`, Admin `39174`
- public URL verification:
  - `http://144.217.243.161:39172/health/live`
  - `http://144.217.243.161:39172/health/ready`
  - `http://144.217.243.161:39174/`

Only successful real requests count as public smoke.

## Compatibility

OpenCore is still in fast productization. There is no legacy compatibility
burden. Replace or delete stale DTOs, SDK shapes, routes, seeds, menus,
permissions, smoke paths and compatibility layers when the current waterline
is better.

## Admission

Pre-authorized Capstone foundation scope: System, Security, Monitor,
Tools/OpenForge foundation, Collaboration center foundations, IP/location,
OAuth token management, JWT blacklist, notice templates/delivery/provider
reliability, KMS/secret vault, operation-log maintenance, scheduler/monitor
depth and config runtime governance.

Requires explicit user admission: CRM/ERP/MES/WMS/mall/member, real
payment/refund/reconciliation, production multi-tenancy, BPMN/full workflow,
full report designer, big-data async export, RAG/Agent/AI workflow, industry
packages and OpenForge direct Prisma/migration/business-code writing.

## Current State

Cycle-021 has recorded deployable/runtime and guard stages through Round 126,
plus Round 127 docs-only reconciliation. The finite System Admin Fallback
Closure is complete: all seven strict matrix rows are accepted, unified
no-fixture-fallback guard coverage is present, public API/Admin smoke is
recorded and aggregate docs are reconciled.

- System/RBAC: notice, dept, post, menu, role, permission, user, dict, config
  and file API/SDK surfaces are live. Dicts Admin is live-only for
  list/detail/item CRUD and Departments/Posts Admin are live-only for
  tree/detail/order and list/detail/batch/order CRUD; Permissions Admin is
  live-only for catalog/detail/custom CRUD/export; Menus Admin is live-only
  for tree CRUD, detail/export and live permission options. Roles Admin is
  live-only for list/detail CRUD, menu assignment, user assignment, status
  changes, data-scope dept selection and current-page export. Users Admin is
  live-only for list/detail CRUD, role assignment, status/batch mutations,
  reset password, department filtering, post/dept selectors, import/export and
  current-page export. Config Admin is live-only for list/detail CRUD, value
  reads, cache refresh, batch deletion, environment overrides, feature flag
  rollout/audience controls, secret version rotation, vault key rotation,
  backend Excel export and current-page export. System Notices Admin is
  live-only for management list/detail CRUD, publish/archive/delete, inbox
  read actions, template CRUD/render/create-draft, read-user analytics,
  delivery records and outbox provider actions. Files Admin is live-only for
  list/detail, upload/download, metadata update, delete and current-page
  export without fixture fallback.
- Security/session: login policy, logout, force logout, online-user kick-out,
  registered-token allowlist enforcement and expired session cleanup are live;
  Online Users Admin is live-only for list/detail/kick-out/cleanup and no
  longer falls back to SDK fixtures.
- Logs: login-log type/result, lockout, cleanup, actor/reason, deterministic
  location, structured IP/location provider lookup and a guarded external
  HTTP JSON GeoIP adapter; operation-log
  list/detail/export/delete, duration and location fields, retention policy
  cleanup, scheduled retention job and Admin server-side filters. Security log
  Admin pages are live-only and fail visibly instead of showing fixture rows.
- Config: runtime keys, login policy, feature flags, rollout, audience rules,
  environment overrides, secret vault, secret version history, explicit secret
  rotation, env-bound keyring, managed HTTP JSON KMS v3 envelopes and vault
  key rotation are live across API/SDK/Admin with no Admin fixture fallback.
- Notice: management, inbox/read state, read-user analytics, templates,
  delivery records, local provider, Integration outbox bridge, state sync,
  queued processing, signed callback intake, bounded retry scheduling and a
  bounded SMS HTTP adapter plus SMTP mail adapter with outbox subject
  persistence, provider diagnostics, SMS HTTP secret injection, SMTP
  attachments, explicit SMTP TLS policy and authenticated inbox realtime
  events are live across API/SDK/Admin with no System Notices Admin fixture
  fallback.
- Integration: provider health/config audit is live across API/SDK/Admin,
  with readiness totals, config-vault debt, outbox backlog, last failure and
  operator actions. The Providers Admin page is live-only for health audit and
  provider diagnostics without fixture fallback. OAuth token inventory, detail,
  summary and revoke lifecycle are live across API/SDK/Admin/OpenAPI/smoke with
  secret-ref-only storage, and the OAuth Admin page is live-only for
  list/detail/revoke without fixture fallback. Mail and SMS templates/outbox
  Admin operations now use live API/SDK calls for list, detail, preview and
  queued processing. WeChat and WebSocket design Admin pages now use live
  design API/SDK endpoints with smoke and deploy guards while remaining
  design-only boundaries.
- Monitor status now exposes live runtime CPU, memory, disk and process
  resources through API/SDK/Admin/OpenAPI/smoke without Admin fixture fallback.
- Monitor jobs: API/SDK routes, registry policy, seed job, Admin live list,
  enable/disable, manual trigger, registered handler execution, retry/timeout
  diagnostics, failed run-log detail, cron dispatch, worker claim and scheduler
  queue metrics, guarded queue pause/resume and terminal run-log retention
  cleanup are smoke-guarded. Monitor
  Cache now uses real Redis
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
- Collaboration: Messages now use live API/SDK/Admin operations for summary,
  list, detail, create, mark-read, archive and delete. Notices now use live
  API/SDK/Admin operations for list, detail, create, publish and archive.
  Todos now use live API/SDK/Admin operations for list, detail, create,
  assign, complete and cancel. Approval Lite now uses live API/SDK/Admin
  operations for list, detail, create, approve and reject. These pages have
  seed coverage, dedicated smoke and Admin/deploy guards.

Latest runtime stage: Round 123 System Files Admin live-only. It removes the
Files Admin fixture fallback, stale detail fallback and fallback UI, keeps file
list/detail, upload/download, metadata update, delete and current-page export
backed by live SDK calls only, and adds Admin/deploy guards for stale
fixture-backed Files bundles.

Latest acceptance confirmation: Round 125 System Posts public API/Admin smoke
confirmation. It keeps the existing live-only list/detail, batch deletion,
ordering, simple-list and export surface and records real public API and Admin
requests for the strict matrix. Round 124 did the same for System
Permissions.

Latest guard stage: Round 126 seven-page unified no-fixture-fallback guard. It
adds `tools/scripts/admin-fallback-closure-guard.mjs`, wires it into Admin
smoke and the fixed deploy script, and checks both source pages and built Admin
bundles for the seven fixed System Admin rows.

Latest documentation reconciliation: Round 127 aligned acceptance matrix,
backlog, handoff, waterline, implementation notes, completion report, ledger
and strategy progress without runtime artifact changes.

## Closure Queue

No remaining in-scope System Admin fallback closure queue item remains.

Out of scope until explicit user admission:

1. Payment/BillingDesign remains explicit-admission because real payment,
   refund and reconciliation are out of scope.
2. Optional Reports/ExportJobs remain explicit-admission because full report
   designer and big-data async export are out of scope.
3. OpenForge direct Prisma/migration/business-code writes remain out of scope
   until explicitly admitted.

## Stop Condition

This closure track stops when all seven matrix rows are accepted, global
no-fixture-fallback guard coverage is present, public API/Admin smoke is
recorded, docs are reconciled and `git status --short` is empty after push.
Round 127 satisfies the document state portion; the final pushed working tree
must remain clean.

## Docs Rule

Keep aggregate docs short. Do not append command output or one report per
round. Use `round-history.md` for clusters, `ledger.md` for state transitions
and git log for commit hashes.
