# cycle-021 Capability Map Productization Backlog

Started: 2026-06-12

## State Alignment

- [x] Re-read cycle-020 backlog, completion report, ledger and quality-cycle
      state.
- [x] Align `.opencore/quality-cycle/state.json` from documented cycle-020
      completion to active cycle-021 state.
- [x] Record cycle-021 as capability-map productization, not a continuation of
      the BE20 backend self-loop prompt.

## Round 1: core.notice Productization

Why this slice: RuoYi and Yudao both expose system notice management as a
first-class System capability. OpenCore already has the backend package/API
runtime, but SDK/Admin route/access/menu/smoke coverage is incomplete. This is
the lowest-dependency product gap before department/post hardening.

- [x] Add missing detail API contract for system notices.
- [x] Extend `@opencore/sdk` with typed system notice client methods, query
      filters and fixtures.
- [x] Promote `core.notice` to an Admin route/access/menu-checked module.
- [x] Add a live Admin System Notices page with list/detail/current-page export
      plus create/update/publish/archive/delete actions.
- [x] Extend Admin smoke checks to lock the notice route, access binding and SDK
      usage.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 2: core.dept Productization

Why this slice: RuoYi and Yudao both treat department management as a
foundation System capability for user organization and data-scope policy.
OpenCore already has package-owned department runtime and API routes, but the
login-protected Admin loop was missing SDK/Admin route/access/menu/smoke
coverage and a detail read contract.

- [x] Add missing detail API contract for system departments.
- [x] Extend `@opencore/sdk` with typed department tree/detail/export/create/
      update/delete methods and fixtures.
- [x] Promote `core.dept` to an Admin route/access/menu-checked module.
- [x] Add a live Admin Departments page with tree list/detail/current-page
      export plus create/update/delete actions.
- [x] Extend Admin smoke checks to lock department route, access binding, shell
      registry, SDK lifecycle usage and tree page behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused and live HTTP smoke gates.
- [x] Run full gates, commit and push this independently accepted product
      slice.

## Round 3: core.post Productization

Why this slice: RuoYi and Yudao both keep post/position management beside
department management under System. OpenCore already has package-owned post
runtime and list/export/create/update/delete API routes, but the logged-in
Admin loop was missing a detail read contract, SDK/Admin route/access/menu,
live page and smoke coverage.

- [x] Add missing detail API contract for system posts.
- [x] Extend `@opencore/sdk` with typed post list/detail/export/create/update/
      delete methods and fixtures.
- [x] Promote `core.post` to an Admin route/access/menu-checked module.
- [x] Add a live Admin Posts page with list/detail/current-page export plus
      create/update/delete actions.
- [x] Extend Admin smoke checks to lock post route, access binding, shell
      registry, SDK lifecycle usage and page behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused and live HTTP smoke gates.
- [x] Run full gates, commit and push this independently accepted product
      slice.

## Round 4: core.menu Productization

Why this slice: RuoYi and Yudao both make menu management the control plane for
System navigation and button permissions. OpenCore already had package-owned
menu list/export/create/update/delete runtime and `core.menu` Admin shell
metadata, but the logged-in Admin loop was still a read-only registry fixture
and the API/SDK lacked a detail read contract.

- [x] Add missing detail API contract for system menus.
- [x] Extend `@opencore/system` menu repository/service contracts with
      `getMenu` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed menu detail support and nullable
      permission clearing.
- [x] Replace the read-only Admin Menus fixture with a live SDK-backed page for
      list/detail/current-page export plus create/update/delete actions.
- [x] Extend Admin smoke checks to lock menu route, access binding, shell
      registry, SDK lifecycle usage and page behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 5: core.role Productization

Why this slice: RuoYi and Yudao both place role management at the RBAC bridge
between users, permissions, menus and data scope. OpenCore already had
package-owned role list/export/create/update/delete runtime and Admin shell
metadata, but lacked a role detail API/SDK contract, SDK data-scope fields and
a live Admin role management page.

- [x] Add missing detail API contract for system roles.
- [x] Extend `@opencore/system` role repository/service contracts with
      `getRole` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed role detail support and role
      data-scope fields.
- [x] Replace the read-only Admin Roles fixture with a live SDK-backed page for
      list/detail/current-page export plus create/update/delete actions.
- [x] Add custom data-scope department selection using the admitted department
      tree runtime.
- [x] Extend Admin smoke checks to lock role SDK lifecycle usage and page
      behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 6: core.permission Productization

Why this slice: after role management became live, the next lowest dependency
RBAC gap is the permission catalog itself. Yudao/RuoYi use permission
identifiers through menu, role and user assignment flows rather than as a
separate editable directory, while OpenCore already has a persisted
`Permission.code` table and API writes. The gap was that OpenCore still lacked
permission detail, system/custom metadata, registry permission mutation
protection and a live Admin page.

- [x] Add missing detail API contract for RBAC permissions.
- [x] Mark registry-seeded permissions as `system=true` and custom permissions
      as `system=false` across API, SDK fixtures and OpenAPI.
- [x] Protect registry permissions from update/delete while preserving custom
      permission create/update/delete.
- [x] Replace the read-only Admin Permissions fixture with a live SDK-backed
      page for list/detail/current-page export plus custom create/update/delete
      actions.
- [x] Let the live Roles page load permission options from the permission API so
      custom permissions can be assigned after creation.
- [x] Extend Admin smoke checks to lock permission SDK lifecycle usage and page
      behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 7: core.user Productization

Why this slice: once permissions, menus and roles are live, the next RBAC
operation gap is user management. RuoYi and Yudao expose user list/detail and
mutation flows beside role and department assignment. OpenCore already had user
list/export/create/update/delete runtime, but lacked a detail read contract,
SDK detail/dept/system typing, seeded-admin mutation protection and a live
Admin page.

- [x] Add missing detail API contract for system users.
- [x] Extend system user repository/service contracts with `getUser`,
      `system` metadata and seeded-admin update/delete protection.
- [x] Extend `@opencore/sdk` user types/client with detail support plus
      `deptId` and `system` fields.
- [x] Replace the read-only Admin Users fixture with a live SDK-backed page for
      list/detail/current-page export plus create/update/delete actions.
- [x] Add role-code and department selection from the admitted role and
      department runtimes.
- [x] Extend Admin smoke checks to lock user SDK lifecycle usage and page
      behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 8: core.dict Productization

Why this slice: RuoYi and Yudao both treat dictionary management as a System
foundation for status/type option data. OpenCore already had package-owned
dictionary runtime and list/export/create/update/delete API routes, but lacked
a detail read contract, SDK detail support and a live Admin page. This round
admits OpenCore's current `DictType` plus embedded `items` model only.

- [x] Add missing dict detail API contract.
- [x] Extend `@opencore/system` dict repository/service contracts with
      `getDict` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed dictionary detail support.
- [x] Replace the read-only Admin Dictionaries fixture with a live SDK-backed
      page for list/detail/current-page export plus create/update/delete
      actions.
- [x] Add embedded dict-item editing for the current OpenCore dictionary model.
- [x] Extend Admin smoke checks to lock dictionary SDK lifecycle usage and page
      behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 9: core.config Productization And Deploy Path

Why this slice: RuoYi and Yudao both expose system configuration management as
a first-class System/Infra operation surface. OpenCore already had
package-owned config runtime and list/export/create/update/delete API routes,
but lacked a detail read contract, SDK detail support, a live Admin page and a
repeatable fixed-port deploy/smoke path after code changes.

- [x] Add missing config detail API contract.
- [x] Extend `@opencore/system` config repository/service contracts with
      `getConfig` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed config detail support.
- [x] Replace the read-only Admin Config fixture with a live SDK-backed page
      for list/detail/current-page export plus create/update/delete actions.
- [x] Preserve OpenCore secret redaction semantics in list/detail/edit flows.
- [x] Add fixed-port local smoke and deploy scripts so the deployment path is
      scripted rather than hand-picked per run.
- [x] Force stable webpack Admin production builds for OpenCore deploys to
      avoid the repeated utoopack CSS loader deserialization failure.
- [x] Extend Admin smoke checks to lock config SDK lifecycle usage, current
      page filtering/export and secret-preserving edit behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, full, build, fixed-port smoke and deploy gates.
- [x] Commit and push this independently accepted product slice.

## Round 10: core.file Productization And Public Admin Deploy

Why this slice: RuoYi and Yudao both expose file metadata as an operational
surface around uploads, previews and storage configuration. OpenCore already
had package-owned file metadata runtime plus list/export/create/update/delete
API routes, but lacked a detail read contract, SDK detail support, a live Admin
page and a deployed Admin URL reachable outside the server.

- [x] Add missing file asset detail API contract.
- [x] Extend system-management repository contracts with `getFile` for seed
      and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed file detail support and tests.
- [x] Replace the read-only Admin File Center fixture with a live SDK-backed
      metadata page for list/detail/current-page export plus create/update/
      delete actions.
- [x] Keep this round scoped to file metadata management; do not add binary
      upload, storage-provider configuration, presigned URLs, public download
      or preview endpoints.
- [x] Extend Admin smoke checks to lock file SDK lifecycle usage, current-page
      filtering and export behavior.
- [x] Add authenticated file metadata smoke to both fixed-port local smoke and
      deploy scripts.
- [x] Make deployed Admin bind to `0.0.0.0`, build against the detected public
      API base URL and print the public frontend URL.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, full, fixed-port smoke and public deploy gates.
- [x] Commit and push this independently accepted product slice.

## Round 11: core.login-log Productization And Admin API Base Deploy Fix

Why this slice: RuoYi and Yudao both expose login logs as a Security/System
audit surface for failed-login diagnosis and operator traceability. OpenCore
already recorded login logs and exposed list/export routes, but lacked a
detail API/SDK contract, a live Admin page and a deploy guard for the exact
frontend 405 regression where browser login POSTs hit the Admin static server.

- [x] Add missing login-log detail API contract.
- [x] Extend `@opencore/audit` login-log repository/service contracts with
      `getLoginLog` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed login-log query/detail support.
- [x] Replace the fixture-only Admin Login Logs page with a live read-only
      audit trail for list/detail/current-page export.
- [x] Add authenticated login-log smoke that verifies successful login,
      failed-login recording, detail and export.
- [x] Wire login-log smoke into both fixed-port local smoke and deploy scripts.
- [x] Expose `ADMIN_API_BASE_URL` into the Admin browser bundle and make deploy
      fail if the built JavaScript does not contain the configured public API
      base URL.
- [x] Add Admin static-server `/api/*` proxy and deploy-time same-origin login
      smoke so API POSTs never fall through to a static-server 405.
- [x] Keep this round scoped to immutable audit records; do not add delete,
      clean, unlock, lockout-policy or session-management actions.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, full, fixed-port smoke and deployment gates.
- [x] Commit and push this independently accepted product slice.

## Explicitly Out Of Scope

- Notice read/unread inbox, header badge and per-user read tracking.
- Message bus push, WebSocket delivery or mail/SMS fan-out.
- BPMN/workflow approval around announcements.
- Tenant-scoped notices.
- Department user binding and data-scope assignment UI.
- Batch department deletion or drag-sort persistence.
- User-post binding and user profile post selection.
- Batch post deletion and simple-list option endpoints.
- Menu parent/type/icon/component/status/cache/router-generation expansion.
- Role menu tree assignment, menu cache refresh, save-sort and drag-sort
  persistence.
- Role-user assignment pages, role simple-list endpoints, batch role deletion,
  standalone data-scope endpoint and role status toggle.
- Registry definition editing, dynamic permission discovery, menu-tree role
  assignment, user-role assignment and token permission refresh after permission
  mutation.
- User Excel import/export file workflows, reset-password endpoint,
  status-toggle endpoint, dedicated user-role assignment dialog,
  profile/avatar/social/simple-list endpoints, post binding, batch user delete,
  department side-tree filtering and token/session refresh after user mutation.
- Separate dict-data module/page/endpoints, simple-list/cache endpoints, batch
  dictionary delete, Excel import/export file workflows, dictionary
  color/css/remark fields, app public dictionary endpoints and dictionary cache
  refresh.
- Config cache refresh, public get-value-by-key endpoints, batch config delete,
  Excel file export, category/name/remark schema expansion, secret vault/KMS
  integration and runtime feature-flag propagation.
- File binary upload, presigned upload/download URLs, storage-provider config,
  public download/preview/copy-link workflows, batch file delete and object
  browser expansion.
- Login-log deletion/cleanup, user unlock, lockout-policy tuning, session
  termination, location/device enrichment, server-side date-range filters and
  logType/result schema expansion.
- CRM/ERP/MES/WMS/mall/member/pay/AI modules.
