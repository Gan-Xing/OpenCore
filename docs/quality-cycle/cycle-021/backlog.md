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

## Round 12: core.audit-log Productization And Admin API Origin Guard

Why this slice: RuoYi and Yudao both expose operation logs as an immutable
security/monitoring trail for operator actions. OpenCore already recorded write
operations through `@opencore/audit` and exposed list/export routes, but lacked
a detail API/SDK contract, a live Admin page and a smoke gate proving a real
write operation is recorded and readable. The deployed Admin path also needed a
hard guard against the `/api/api/auth/login` regression caused by configuring
`ADMIN_API_BASE_URL` with a trailing `/api` while the SDK already prefixes
requests with `/api`.

- [x] Add missing operation-log detail API contract.
- [x] Extend `@opencore/audit` operation-log repository/service contracts with
      `getOperationLog` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed audit-log query/detail support.
- [x] Replace the fixture-only Admin Operation Logs page with a live read-only
      audit trail for list/detail/current-page export.
- [x] Add authenticated operation-log smoke that creates a temporary config,
      waits for the write-operation audit row, reads detail, exports and cleans
      up the config.
- [x] Wire operation-log smoke into both fixed-port local smoke and deploy
      scripts.
- [x] Harden `pnpm deploy:opencore` so `ADMIN_API_BASE_URL` is the API origin
      without `/api`, and fail deployment if an `/api`-suffixed value would
      produce `/api/api` browser requests.
- [x] Keep this round scoped to immutable read-only operation logs; do not add
      delete, clean, batch delete, async indexing or schema expansion.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, full, build, fixed-port smoke and deployment gates.
- [x] Commit and push this independently accepted product slice.

## Round 13: monitor.online-user Productization And Stale Admin Login Guard

Why this slice: RuoYi exposes online users under Monitor with list/detail-like
row inspection and force logout; Yudao exposes comparable token/session
termination through OAuth2 token management. OpenCore already had
`@opencore/online-user` runtime plus list/detail/kick-out API and registry
metadata, but Admin was still fixture-only and smoke did not prove a logged-in
operator could inspect or revoke an online session. The deployed Admin path
also needed a runtime guard for browsers still executing an old bundle that
posts to `/api/api/auth/login`.

- [x] Preserve two active seed online sessions so smoke can kick
      `session_operator` while keeping `session_admin` usable.
- [x] Extend `@opencore/sdk` fixtures for the admitted online-user session
      shape.
- [x] Wire online-user SDK calls into the Admin platform service.
- [x] Add `canManageOnlineUsers` access binding for
      `monitor:online-user:manage`.
- [x] Replace the fixture-only Admin Online Users page with a live page for
      list/detail/current-page export plus permission-gated kick-out.
- [x] Add authenticated online-user smoke covering list, detail, kick-out,
      repeat-kick rejection and admin-session preservation.
- [x] Wire online-user smoke into both fixed-port local smoke and deploy
      scripts.
- [x] Harden the Admin static server with a retired `/service-worker.js`, no
      cache for runtime manifests/scripts and duplicate `/api/api` proxy
      normalization for stale login bundles.
- [x] Harden deploy so public Admin HTML/bundle/service-worker endpoints are
      checked after startup and the build is rejected if the public bundle
      would still emit duplicated API prefixes.
- [x] Keep this round scoped to online-session observability and kick-out; do
      not add OAuth client/token management, JWT blacklist enforcement,
      browser/OS parsing, IP geolocation, batch kick-out or export endpoint
      expansion.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, full, build, fixed-port smoke and deployment gates.
- [x] Commit and push this independently accepted product slice.

## Round 14: monitor.online-user Revocation Productization

Why this slice: the post-Round 13 waterline audit correctly flagged online
users as thin. Listing and writing `revokedAt` was not enough because bearer
token validation still ignored online-session revocation. RuoYi force logout
and Yudao token deletion both require the selected session/token to stop
working, so this round closes that security effect.

- [x] Add bearer token IDs and expose token expiry from the security auth
      boundary.
- [x] Register successful logins as online-user sessions with token ID, IP,
      user agent, last-seen and expiry metadata.
- [x] Make authenticated bearer requests consult the online-user session store
      and reject revoked or expired sessions.
- [x] Add batch online-user kick-out API guarded by
      `monitor:online-user:manage`.
- [x] Parse and surface browser/OS fields from user-agent data.
- [x] Extend `@opencore/sdk` and Admin platform service with batch kick-out
      contracts.
- [x] Extend the Admin Online Users page with browser/OS columns, filters,
      detail fields, current-page export fields and selected-row batch kick-out.
- [x] Extend local/deploy smoke so it logs in twice, revokes the second real
      token and proves that token receives 401 on `/api/auth/me`.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Productization Waterline Re-Audit

User clarification: one round should remain a minimal deployable, verifiable and
reversible loop, but one product capability may require multiple rounds. Do not
treat "minimal loop" as "minimal final product".

- [x] Recheck current RuoYi/Yudao HEADs and OpenCore round evidence.
- [x] Classify rounds 1-13 into productization waterline buckets in
      `productization-waterline-audit.md`.
- [x] Record repeated login `/api/api` failure as API code plus deploy smoke,
      not as operator memory.

### Meets Current Waterline

- [x] Round 6 `core.permission`: persisted permission catalog, system/custom
      separation, registry mutation protection and live role option integration.
- [x] Round 12 `core.audit-log`: immutable operation audit trail, real write
      smoke, live list/detail/export.

### First Loop, Needs Enhancement

- [ ] Round 1 `core.notice`: read/unread state, inbox/header badge and delivery
      adapter design.
- [ ] Round 2 `core.dept`: user binding paths, data-scope workflow integration
      and ordered tree operations.
- [ ] Round 3 `core.post`: user-post binding, simple-list option endpoints and
      batch operations.
- [ ] Round 5 `core.role`: role-user assignment, menu-tree assignment or
      equivalent bundle UX, status flow and token permission refresh semantics.
- [ ] Round 7 `core.user`: reset password, status toggle, side-tree filtering,
      post binding, profile/avatar and token/session refresh semantics.
- [ ] Round 8 `core.dict`: separate dict data workflow or equivalent item API,
      simple-list/cache endpoints and consumer smoke.
- [ ] Round 9 `core.config`: get-by-key, cache refresh/invalidation and runtime
      propagation boundaries.
- [ ] Round 11 `core.login-log`: browser/OS parsing, IP/location enrichment
      where feasible, server-side time filters and cleanup/unlock policy
      integration.

### Thin, Must Rework Before More Broad Surfaces

- [x] P0-R14-ONLINE-USER-REVOCATION：问题：Round 13 kick-out 只写
      `revokedAt`，bearer token validation 仍忽略 online-session revoke；
      参考来源：RuoYi online user force logout、Yudao OAuth2 token delete；
      实施要求：真实 token/session revoke enforcement，batch kick-out，
      browser/OS parsing，IP fields，Admin 展示；测试要求：smoke 证明被踢
      token 再访问受保护接口返回 401；完成标准：Round 14 已完成，kick-out
      会让真实 bearer session 失效。
- [ ] P0-R15-FILE-CONTENT-LOOP：问题：Round 10 只有文件 metadata CRUD，不是
      文件中心；参考来源：Yudao file upload/download/preview shape；
      实施要求：基于现有 file storage boundary 做 authenticated upload plus
      download/preview/copy-link 的最小闭环；测试要求：smoke 上传、读取 metadata、
      下载或预览并校验内容；完成标准：Admin 文件中心能处理真实文件内容。
- [ ] P0-R16-MENU-TREE-REWORK：问题：Round 4 菜单模型过薄，只有 flat
      `key/title/path/permission/order/hidden`；参考来源：RuoYi/Yudao menu
      tree/type/icon/component/status/cache shape；实施要求：tree menu model
      和 Admin tree operations，保持 registry 不被绕过；测试要求：route/menu
      drift、角色/菜单关联或等价权限 bundle smoke；完成标准：菜单管理能支撑真实
      后台导航和按钮权限组织。

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
- Operation-log deletion/cleanup, batch delete, duration/location/user-agent
  schema expansion, operation type enum expansion, async queue/indexing and
  business-domain audit timeline views.
- OAuth client/token administration, standalone JWT blacklist independent of
  the online-session store, IP geolocation, server-side date filters and
  online-user export endpoint expansion.
- CRM/ERP/MES/WMS/mall/member/pay/AI modules.
