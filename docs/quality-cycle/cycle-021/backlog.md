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

## Round 15: core.file Content Loop Productization

Why this slice: the post-Round 13 waterline audit correctly flagged Round 10
as thin because it only managed file metadata. A file center must prove that a
logged-in operator can upload real content, retrieve metadata, download the
stored object and clean it up through the same authenticated product surface.

- [x] Add authenticated file upload API that decodes base64 content, writes it
      through `FileStorageService` and creates matching metadata.
- [x] Add authenticated file download API that reads the stored object by
      metadata `storageKey` and streams bytes with MIME and content-disposition
      headers.
- [x] Delete stored objects when deleting file metadata.
- [x] Preserve `storageKey` during metadata edits so renames do not detach
      metadata from stored object content.
- [x] Add binary-response pass-through guard to the core response interceptor.
- [x] Extend `@opencore/sdk` with upload contracts and a download path helper.
- [x] Replace Admin metadata-only creation with browser file selection,
      base64 upload and row-level download.
- [x] Extend core-file smoke to upload real text content, download it and
      assert exact content equality.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 16: core.menu Tree Metadata Productization

Why this slice: the post-Round 13 waterline audit correctly flagged Round 4 as
thin because it only managed a flat `key/title/path/permission/order/hidden`
shape. A real backend menu control plane needs tree parentage, menu type,
route component metadata, icon, status and cache fields, plus Admin operations
that preserve the route/menu registry boundary.

- [x] Extend the menu contract with `parentKey`, `type`, `icon`, `component`,
      `status`, `cache` and `hidden` metadata.
- [x] Add registry-derived directory nodes and deterministic leaf metadata so
      seed, SDK fallback and Admin all read the same tree shape.
- [x] Add a Prisma migration for menu parent relations and route metadata.
- [x] Update seed data to insert parent directory rows before leaf menus.
- [x] Add repository validation for parent existence, self-parent rejection,
      cycle prevention and delete guards for menus with children.
- [x] Preserve proper nullable semantics: omitted `parentKey` means preserve,
      `parentKey: null` means clear, and string means reparent.
- [x] Extend API/OpenAPI/SDK DTOs for the tree metadata.
- [x] Replace the Admin Menus flat table with a tree table, parent
      `TreeSelect`, add-child action and status/cache/hidden controls.
- [x] Extend static Admin smoke and fixed-port API smoke to guard the tree
      workflow.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 17: core.role Menu Assignment Productization

Why this slice: the post-Round 13 waterline audit correctly left `core.role`
in the enhancement queue. Role CRUD and permission-code assignment were live,
but the operator could not assign menu trees in the RuoYi/Yudao RBAC shape, and
role-permission mutation did not invalidate affected sessions.

- [x] Add role menu assignment DTOs, service methods and seed/Prisma repository
      support.
- [x] Add `GET /api/core/roles/:code/menus` and
      `PATCH /api/core/roles/:code/menus`.
- [x] Map selected menu keys to menu-bound permission codes while preserving
      non-menu permission codes.
- [x] Revoke active online-user sessions for users holding the changed role
      after role menu assignment.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add Admin Roles row-level Menu Assignment tree dialog.
- [x] Extend fixed-port and deploy smoke to prove menu assignment, preserved
      non-menu permissions, revoked old token 401 and relogin permission
      refresh.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 18: core.role User Assignment Productization

Why this slice: after role menu assignment, the next `core.role`/`core.user`
RBAC gap was assigning users to roles. RuoYi exposes assigned/unassigned user
flows for roles, and Yudao exposes equivalent user-role assignment APIs. The
OpenCore loop needed to persist role-user changes, protect system users and
invalidate affected user sessions.

- [x] Add role-user assignment DTOs, service methods and seed/Prisma repository
      support.
- [x] Add `GET /api/core/roles/:code/users` and
      `PATCH /api/core/roles/:code/users`.
- [x] Reject malformed assignment payloads, duplicate user IDs and system-user
      mutation through this role assignment entrypoint.
- [x] Revoke active online-user sessions only for users whose role assignment
      changed.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add Admin Roles row-level User Assignment `Transfer` dialog.
- [x] Extend fixed-port and deploy smoke to prove assign, unassign, revoked
      old token 401 and relogin role/permission refresh.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 19: core.user Security Mutation Productization

Why this slice: after role-side user assignment, the next lowest-dependency
`core.user` gap was direct user security mutation. RuoYi and Yudao both expose
status change and password reset as first-order user management actions, and
OpenCore needed these mutations to invalidate active sessions instead of only
updating database rows.

- [x] Add strict DTO/runtime validation for user status and password-reset
      payloads, including boolean-only `enabled` handling.
- [x] Add `PATCH /api/core/users/:id/status` and
      `POST /api/core/users/:id/reset-password`, guarded by
      `core:user:update`.
- [x] Return `revokedSessionCount` from user update/status/reset/delete
      mutations.
- [x] Revoke active online-user sessions after user status changes, password
      resets, direct user updates and deletes.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Update Admin Users with status toggle, reset-password dialog and revoked
      session feedback.
- [x] Add fixed-port/deploy `core.user` smoke proving disable blocks login,
      reset rejects the old password, and update/delete revoke old tokens.
- [x] Stabilize online-user deploy smoke so it checks the current admin token
      session instead of depending on seeded admin pagination.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 20: core.role Status Security Productization

Why this slice: after role menu assignment, role-user assignment and user
security mutation, the remaining basic `core.role` gap was role status. RuoYi
and Yudao both expose role status as a first-order RBAC control, and OpenCore
needed disabling a role to affect active and future authorization instead of
only changing a table cell.

- [x] Add `enabled` to persisted roles, seed roles and role DTOs.
- [x] Add strict status DTO/runtime validation so `enabled` must be a boolean.
- [x] Add `PATCH /api/core/roles/:code/status`, guarded by
      `core:role:update`.
- [x] Prevent system roles from being disabled.
- [x] Filter disabled roles out of login `roleCodes`, permission aggregation
      and data-scope role calculations.
- [x] Return `revokedSessionCount` from role update/status/delete mutations.
- [x] Revoke affected active online-user sessions after role status changes,
      direct role updates and role deletes.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Update Admin Roles with status filter, status column, enable/disable
      controls and revoked-session feedback.
- [x] Extend fixed-port/deploy `core.role` smoke to prove disable/enable,
      disabled-role filtering and update/delete session revocation.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 21: core.dict Item Data Simple-list Productization

Why this slice: after role status reached the current RBAC waterline, the next
P1 foundation gap was `core.dict`. RuoYi and Yudao both split dictionary types
from dictionary data and expose option/simple-list consumers. OpenCore already
had type CRUD plus embedded items, so this round admits an equivalent item
management API and public consumer endpoint without introducing a second Admin
page.

- [x] Add `DictDataOption` and dict item create/update DTOs with strict
      boolean and integer normalization.
- [x] Add public `GET /api/core/dict-data/simple-list` with optional
      `dictCode` filtering.
- [x] Add management item endpoints under `/api/core/dicts/:code/items` for
      list/detail/create/update/delete.
- [x] Implement item CRUD and simple-list filtering in seed and Prisma
      repositories.
- [x] Reject malformed item payloads such as string booleans before mutation.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add Admin Dicts row-level `Dictionary Items` modal with item
      create/update/delete and public simple-list visibility feedback.
- [x] Add `tools/scripts/smoke-core-dict.mjs` and wire it into fixed-port local
      and deploy smoke.
- [x] Extend fixed-port/deploy/public smoke to prove item CRUD, malformed
      boolean rejection, public simple-list consumption, disabled item
      filtering and disabled dict type filtering.
- [x] Run focused, full, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 22: core.user Post Binding Productization

Why this slice: after dictionary item-data reached the current foundation
waterline, the next lowest-dependency P1 user-management gap was user-post
binding. RuoYi and Yudao both let operators assign posts/positions from the
user form. OpenCore already had live `core.post` management and user CRUD, but
users did not persist or expose post assignments.

- [x] Add `UserPost` Prisma relation between users and system posts.
- [x] Seed the bootstrap admin with the `admin` post and make seed sync
      user-post assignments.
- [x] Extend system user DTOs, seed repository and Prisma repository with
      `postCodes` in list/detail/create/update/export flows.
- [x] Reject malformed post-code payloads, duplicate post codes and unknown
      post codes before mutation.
- [x] Extend OpenAPI, SDK types and SDK request tests.
- [x] Update Admin Users with post column, detail tags, create/edit
      multi-select and current-page export column, loading options from live
      `core.post`.
- [x] Extend static Admin smoke to lock the post-binding UI markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove unknown-post
      rejection, create-time post binding and update-time post clearing while
      preserving the session-revocation checks from Round 19.
- [x] Run focused, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 23: core.user Department Tree Filter Productization

Why this slice: after user-post binding, the next lowest-dependency P1
user-management gap was the left department tree filter. RuoYi and Yudao both
let operators click a department node to list users in that department subtree.
OpenCore already had live departments and user `deptId`, but user list/export
did not accept a department filter and Admin Users had no department scope
panel.

- [x] Add `deptId` list/export query DTO for system users.
- [x] Implement selected-department plus descendant filtering in seed and
      Prisma user repositories.
- [x] Reject unknown department IDs before returning a filtered user list.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Update Admin Users with a live department tree side panel, all-departments
      reset and fallback filtering when the API is unavailable.
- [x] Extend static Admin smoke to lock the department-filter UI markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove unknown-dept
      rejection, direct department filtering, parent subtree filtering and
      unrelated department exclusion while preserving existing user security
      checks.
- [x] Run focused, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 24: core.config Value Cache Refresh Productization

Why this slice: after user department filtering, the next foundation gap with
lower dependency than user profile/import workflows was `core.config`.
RuoYi exposes config-key value lookup plus refreshCache, and Yudao exposes
get-value-by-key while rejecting invisible values. OpenCore had CRUD/detail and
secret redaction, but no runtime consumer endpoint or cache refresh semantics.

- [x] Add public `GET /api/core/config/get-value-by-key?key=...` for
      `visibility=public` config values.
- [x] Block private and secret config values from the public value consumer.
- [x] Add service-level public value cache with create/update/delete
      invalidation.
- [x] Add permission-gated `POST /api/core/config/refresh-cache`.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Update Admin Config with `Refresh cache` and public row-level
      `Read public value by key`.
- [x] Extend static Admin smoke to lock the new Admin/SDK markers.
- [x] Extend fixed-port/deploy/public `core.config` smoke to prove
      value-by-key, cache invalidation, refresh-cache and secret-value 403.
- [x] Run focused, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 25: core.post Simple-list Option Productization

Why this slice: after config value/cache, the next lower-dependency foundation
gap was `core.post` as an option source. Yudao exposes
`/system/post/simple-list` and its user form loads post options from that
endpoint; RuoYi also treats post options as a first-class user form input.
OpenCore had live post management and user-post binding, but Admin Users still
loaded the management post page as its option source.

- [x] Add `SystemPostOptionDto` for lightweight `{ code, name, order }`
      consumer options.
- [x] Add `listPostOptions()` to the post repository/service contract.
- [x] Implement enabled-only, order/name sorted options in seed and Prisma
      repositories.
- [x] Add public `GET /api/core/posts/simple-list` before
      `GET /api/core/posts/:code`.
- [x] Extend API permission-matrix tests to keep consumer simple-list routes
      free of management permissions.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add `listOpenCoreSystemPostOptions()` to Admin platform services.
- [x] Update Admin Users to consume post options from simple-list instead of
      the management post page.
- [x] Add static Admin smoke guards for the post option source.
- [x] Add `tools/scripts/smoke-core-post.mjs` and wire it into fixed-port local
      smoke plus deploy smoke.
- [x] Extend fixed-port/deploy/public `core.post` smoke to prove disabled-post
      filtering, enabled option inclusion, lightweight option shape,
      detail/export/delete and cleanup.
- [x] Run focused, build, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 26: core.login-log Device Filter Productization

Why this slice: after post option-source, the next lower-dependency security
gap was `core.login-log`. RuoYi exposes login IP, location, browser, OS and
login-time filters; Yudao exposes `userIp`, raw `userAgent` and `createTime`
filters. OpenCore already had immutable login-log list/detail/export and
failed-login smoke, but the operator workflow still lacked server-side IP/time
filtering and readable device fields.

- [x] Move reusable user-agent parsing into `@opencore/common`.
- [x] Keep `monitor.online-user` on the shared parser instead of a local copy.
- [x] Add computed `browser` and `os` fields to login-log API records.
- [x] Add `ip`, `createdFrom` and `createdTo` query filters to login-log
      list/export contracts, with invalid date and reversed range guards.
- [x] Implement the filters for both seed and Prisma audit repositories.
- [x] Extend OpenAPI, SDK types/fixtures/client path tests and audit tests.
- [x] Update Admin Login Logs with server-side username/IP/result/time filters
      and browser/OS table/detail/export fields.
- [x] Extend static Admin smoke for the new server-filter and device markers.
- [x] Extend fixed-port/deploy/public `core.login-log` smoke to prove device
      parsing, IP/time filtering, future-window exclusion, invalid date 400 and
      export device columns.
- [x] Run focused, full, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 27: core.dept Simple-list Option Productization

Why this slice: after login-log device filters, the next lower-dependency
foundation gap was `core.dept` as an option source. Yudao exposes
`/system/dept/simple-list` and its role data-permission/user forms consume a
lightweight enabled-department list. RuoYi also treats department options as a
basic user/role workflow input. OpenCore had live department management and
user department filtering, but Admin Users still used the full management tree
payload for the create/edit department selector.

- [x] Add `SystemDeptOptionDto` for lightweight
      `{ id, name, parentId, order }` consumer options.
- [x] Add `listDeptOptions()` to the department repository/service contract.
- [x] Implement enabled-only, order/name sorted options in seed and Prisma
      repositories.
- [x] Add public `GET /api/core/depts/simple-list` before
      `GET /api/core/depts/:id`.
- [x] Extend API permission-matrix tests to keep consumer simple-list routes
      free of management permissions.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add `listOpenCoreSystemDeptOptions()` to Admin platform services.
- [x] Update Admin Users to consume department options from simple-list for the
      create/edit department selector while keeping the left management filter
      tree on the full department tree.
- [x] Add static Admin smoke guards for the department option source.
- [x] Add `tools/scripts/smoke-core-dept.mjs` and wire it into fixed-port local
      smoke plus deploy smoke.
- [x] Extend fixed-port/deploy/public `core.dept` smoke to prove
      disabled-department filtering, enabled option inclusion, lightweight
      option shape, detail/export/delete and cleanup.
- [x] Run focused, full, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 28: core.user Self-profile Basic Info Productization

Why this slice: after department option-source, the next lower-dependency user
gap was the current user's own profile. RuoYi exposes `/system/user/profile`
for profile read/update, password update and avatar upload. Yudao exposes
profile get/update/update-password under the user profile surface. OpenCore had
Admin `/auth/me` and management user CRUD, but no self-profile endpoint that
allowed the current user to update basic personal information without going
through the system-user management mutation path.

- [x] Add auth-only RBAC metadata and guard support so authenticated endpoints
      do not require an unrelated management permission.
- [x] Move `/auth/me` to the auth-only guard instead of dashboard permission
      coupling.
- [x] Add `GET /api/core/users/profile` for the current authenticated user.
- [x] Add `PATCH /api/core/users/profile` for self `displayName` updates only.
- [x] Preserve system-user management protection: seeded/system users still
      cannot be modified through `PATCH /api/core/users/:id`.
- [x] Extend seed and Prisma system user repositories with
      `updateUserProfile()`.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add Admin `/personal/profile` and Avatar menu entry for the current user.
- [x] Add static Admin smoke guards for the profile route, menu entry, service
      methods and page markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove profile
      read/update, `/auth/me` display-name refresh, invalid display-name 400
      and system-user management update protection.
- [x] Run focused, full, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 29: core.user Self-password Productization

Why this slice: after self-profile basic info, the next lower-dependency user
profile gap was self-service password change. RuoYi exposes
`/system/user/profile/updatePwd` with old-password verification and same
password rejection. Yudao exposes `/system/user/profile/update-password` with
`oldPassword/newPassword`. OpenCore had admin reset-password, but no current
user endpoint that requires the old password and invalidates sessions after a
successful self change.

- [x] Add `UpdateUserPasswordDto` for `oldPassword/newPassword`.
- [x] Add `updateUserPassword()` to system user repository/service contracts.
- [x] Implement old-password verification, same-password rejection and password
      hash update for seed and Prisma repositories.
- [x] Add authenticated `PATCH /api/core/users/profile/password` before
      `users/:id`.
- [x] Revoke the current user's active online-user sessions after successful
      self password change.
- [x] Extend API permission-matrix tests to keep self-password auth-only and
      free of management permissions.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add Admin `/personal/profile` `Change password` form that clears the
      local bearer token and returns to login after success.
- [x] Add static Admin smoke guards for the password form, service method,
      logout behavior and route markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove wrong old
      password 401, same password 400, successful password update, stale token
      401, old password blocked and new password login.
- [x] Run focused, full, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 30: core.user Simple-list Option Source Productization

Why this slice: after self-password, the next lower-dependency user foundation
gap was a reusable user option source. Yudao exposes
`/system/user/simple-list` and `/system/user/list-all-simple` for enabled-user
dropdowns, including an optional department filter. RuoYi exposes assigned and
unassigned user selection flows under role authorization. OpenCore already had
user CRUD, role-user assignment, department filtering and post binding, but no
lightweight user selector contract; consumers still had to depend on full
management user summaries.

- [x] Add `UserOptionDto` with only `id`, `username`, `displayName`, `deptId`
      and `postCodes`.
- [x] Add `listUserOptions()` to system user repository/service contracts for
      seed and Prisma implementations.
- [x] Filter user options to enabled users only while reusing the existing
      department-subtree filter semantics.
- [x] Add authenticated `GET /api/core/users/simple-list` before `users/:id`,
      guarded by bearer auth but not `core:user:read`.
- [x] Extend API permission-matrix tests to keep user simple-list auth-only and
      free of management permissions.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add Admin platform `listOpenCoreUserOptions()` and consume it in the
      Roles User Assignment transfer dialog as the lightweight label source.
- [x] Add static Admin smoke guards for the platform method and Roles page
      consumer markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove unauthenticated
      401, unknown-department 404, department filtering, enabled-only filtering
      and option shape without `roleCodes`/`enabled`/`system`.
- [x] Run focused, full, fixed-port smoke, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 31: core.user Profile Avatar Productization

Why this slice: after the authenticated user option source, the next
lower-dependency user-profile gap was avatar upload and preview. RuoYi exposes
`/system/user/profile/avatar` as a dedicated current-user avatar upload path,
while Yudao carries `avatar` on the current-user profile update shape. OpenCore
already had a productized file storage boundary from Round 15, so avatar could
be admitted without opening Excel import/export or broader batch user
workflows.

- [x] Add persisted user avatar metadata:
      `avatarUrl/avatarStorageKey/avatarMimeType/avatarSizeBytes/avatarUpdatedAt`.
- [x] Add Prisma migration for user avatar metadata.
- [x] Extend system user seed/Prisma repositories with internal avatar
      read/set/clear contracts while keeping storage keys out of public user
      summaries.
- [x] Expose `avatarUrl` through auth user records so login and `/auth/me`
      refresh the top-bar avatar without changing token payload semantics.
- [x] Add authenticated `POST /api/core/users/profile/avatar` before
      `users/:id`, backed by `FileStorageService`.
- [x] Validate avatar original name, base64, size, MIME type and image magic
      bytes; reject SVG and arbitrary text.
- [x] Add authenticated `DELETE /api/core/users/profile/avatar` for cleanup
      and replacement-safe state reset.
- [x] Add public read-only `GET /api/core/users/:id/avatar` for browser image
      preview, returning stored bytes with image content type.
- [x] Extend API permission-matrix tests so upload/delete remain auth-only and
      preview remains intentionally public.
- [x] Extend OpenAPI, SDK types/client methods and SDK path tests.
- [x] Add Admin Profile avatar upload/remove controls and map `avatarUrl` to
      Ant Design Pro's `avatar` field.
- [x] Extend static Admin smoke guards for avatar service methods, page
      markers and current-user avatar mapping.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove auth guard,
      MIME/base64 guards, upload, public byte download, `/auth/me` avatar
      refresh, delete and post-delete 404.
- [x] Verify public Admin same-origin `/api` avatar upload and preview bytes.
- [x] Run focused, typecheck, build, fixed-port smoke, deployment and public
      URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 32: core.user Batch Mutation Productization

Why this slice: after profile avatar, the next lower-dependency user-management
gap was batch status and batch delete. RuoYi exposes batch user delete through
`DELETE /system/user/{userIds}` and status change through `changeStatus`; Yudao
exposes `delete-list` and `update-status`. OpenCore already had single-user
status/delete and session revocation semantics, so this round could close the
batch workflow without opening Excel import/export parsing.

- [x] Add batch user DTOs for status and delete requests plus a shared batch
      mutation result.
- [x] Add batch user ID normalization that rejects empty arrays, duplicate IDs
      and non-string IDs.
- [x] Extend seed and Prisma user repositories with batch status and batch
      delete contracts.
- [x] Protect system users and missing IDs before mutation.
- [x] Use a Prisma transaction for batch delete cleanup across
      `userRole/userPost/user`.
- [x] Add `PATCH /api/core/users/batch/status` guarded by `core:user:update`
      before dynamic `users/:id` routes.
- [x] Add `DELETE /api/core/users/batch` guarded by `core:user:delete` before
      dynamic `users/:id` routes.
- [x] Revoke active online sessions for all affected usernames after batch
      status and batch delete.
- [x] Extend API permission-matrix tests, OpenAPI, SDK types/client methods and
      SDK path tests.
- [x] Add Admin Users row selection, system-user disabled checkboxes, and
      `Enable selected` / `Disable selected` / `Delete selected` toolbar
      actions.
- [x] Extend Admin static smoke guards for batch service methods and page
      markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove empty,
      duplicate, system-user and missing-user guards, batch disable with
      session revocation and login block, batch re-enable, and batch delete
      with session revocation and login block.
- [x] Verify public Admin chunk markers, public main-bundle batch API paths,
      Admin same-origin proxy login, stale `/api/api` login compatibility and
      Admin same-origin batch guard.
- [x] Run focused, typecheck, build, fixed-port smoke, deployment and public
      URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 33: core.user Import Template and CSV Import Productization

Why this slice: after batch user mutation, the next lower-dependency
user-management gap was import template plus import result handling. RuoYi and
Yudao both expose user import templates and user import endpoints on the user
management surface, with structured success/failure feedback. OpenCore already
had user create/update validation, role/dept/post binding and session
revocation, so this round could admit a CSV-compatible import loop without
claiming native XLSX/binary Excel import/export completion.

- [x] Recompare RuoYi `importTemplate`/`importData` and Yudao
      `get-import-template`/`import` result shapes.
- [x] Add user import template, import request and structured import result
      DTOs.
- [x] Add a strict base64 CSV parser with fixed header validation for
      `username`, `displayName`, `password`, `roleCodes`, `deptId`,
      `postCodes` and `enabled`.
- [x] Treat blank department/post cells as no binding and semicolon-delimit
      role/post code lists.
- [x] Return file/header/base64 errors as 400 while collecting row-level
      business failures into `failures`.
- [x] Require `updateExisting` to be a real boolean and reject string boolean
      deserialization drift with 400.
- [x] Create new users through existing repository validation and update
      existing normal users only when `updateExisting: true`.
- [x] Keep system-user mutation protection at the repository boundary.
- [x] Revoke active online sessions for usernames changed by import updates.
- [x] Add `GET /api/core/users/import-template` and
      `POST /api/core/users/import` before dynamic `users/:id` routes, guarded
      by `core:user:create`.
- [x] Extend API permission-matrix tests, OpenAPI, SDK types/client methods and
      SDK path tests.
- [x] Add Admin Users template download, import modal, update-existing checkbox
      and import result/failure display.
- [x] Extend Admin static smoke guards for import UI/service markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to prove template
      download, strict boolean guard, partial import result, update-existing
      session revocation and enabled-user filtering.
- [x] Verify public Admin Users chunk markers, public main-bundle import API
      paths, Admin same-origin proxy login, stale `/api/api` login
      compatibility, Admin same-origin template and import boolean guard.
- [x] Run focused, typecheck, build, fixed-port smoke, deployment and public
      URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 34: core.user Import Permission Productization

Why this slice: after the import loop existed, the lowest-dependency remaining
user-management debt was permission granularity. Yudao guards user import with
`system:user:import`, and user import is operationally distinct from creating a
single user. OpenCore still reused `core:user:create` for import template and
import submission, so operators could not grant create without also granting
bulk import.

- [x] Recompare Yudao `system:user:import` and RuoYi user import as an
      independent management action.
- [x] Extend `PermissionAction` with `import`.
- [x] Register `core:user:import` only on the `core.user` module, without
      widening every CRUD module to import.
- [x] Let Prisma seed upsert the new registry permission and include it in the
      seeded admin role.
- [x] Move `GET /api/core/users/import-template` from `core:user:create` to
      `core:user:import`.
- [x] Move `POST /api/core/users/import` from `core:user:create` to
      `core:user:import`.
- [x] Extend contracts, module-registry, API permission-matrix and SDK
      registry fixture tests.
- [x] Add `canImportUsers` in Admin access and guard the Users page import
      template/import buttons with it.
- [x] Add Admin static smoke markers for `core:user:import`, `canImportUsers`
      and the missing-permission UI marker.
- [x] Extend fixed-port/deploy/public `core.user` smoke to create a temporary
      create-only role/user, prove the token has `core:user:create` but not
      `core:user:import`, and prove both import endpoints return 403.
- [x] Verify public Admin bundle, Users chunk, same-origin permission catalog,
      import-template proxy, login and stale `/api/api` compatibility.
- [x] Run focused, typecheck, build, fixed-port smoke, deployment and public
      URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 35: core.user Native XLSX Export

Why this slice: RuoYi and Yudao both treat user Excel export as a basic user
management action protected by `system:user:export`. OpenCore still returned a
JSON export preview, so this round moves one small but real Excel step without
opening the larger XLSX import parser yet.

- [x] Recompare RuoYi `SysUserController` `/export` with `ExcelUtil` and Yudao
      `UserController` `/export-excel` with `ExcelUtils.write`.
- [x] Extend user export response with `contentType` and `contentBase64` while
      preserving the existing JSON API boundary.
- [x] Generate `opencore-system-users.xlsx` with a valid XLSX zip container and
      user columns `username/displayName/roleCodes/deptId/postCodes/enabled/system`.
- [x] Keep `core:user:export` as the API permission guard.
- [x] Extend SDK/OpenAPI types for optional file payload fields.
- [x] Add `canExportUsers` in Admin access and a Users page `Download Excel`
      button that downloads the backend XLSX payload.
- [x] Extend Admin static smoke for the export service, permission helper and
      Excel UI markers.
- [x] Extend fixed-port/deploy/public `core.user` smoke to verify filename,
      MIME, columns, base64 payload, XLSX zip header and byte length.
- [x] Add `tools/scripts/sync-prisma-client-instances.mjs` and run it from
      `pnpm prisma:generate` so pnpm workspace `@prisma/client` peer instances
      do not keep stale generated schemas after install.
- [x] Run focused, typecheck, OpenAPI/SDK, format, build, fixed-port smoke,
      deployment and public URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 36: core.user Native XLSX Import

Why this slice: RuoYi and Yudao both treat user import as an Excel file
workflow paired with export. Round 33 admitted a CSV-compatible loop and Round
35 admitted native XLSX export, so this round closes the remaining file-format
gap without expanding into role-assignment workflow or extra user schema fields.

- [x] Recompare RuoYi user import-template/import and Yudao
      `get-import-template`/`import` Excel workflows.
- [x] Change `GET /api/core/users/import-template` to return
      `opencore-system-users-import-template.xlsx` with the standard XLSX MIME
      type and a valid zip payload.
- [x] Add XLSX parsing for `POST /api/core/users/import`, including inline
      strings, shared strings, boolean cells, basic value cells, fixed header
      validation and non-empty-row validation.
- [x] Keep CSV import backwards compatible through the same endpoint.
- [x] Preserve existing `core:user:import` permission, partial failure result,
      strict `updateExisting` boolean validation and import-update session
      revocation behavior.
- [x] Update Admin Users upload affordance from CSV-only to CSV/XLSX.
- [x] Update OpenAPI description from CSV-only to CSV/XLSX.
- [x] Extend system tests to verify XLSX template zip payload and import the
      XLSX template through the service.
- [x] Extend fixed-port/deploy/public `core.user` smoke with
      `core.user.import.xlsx` using dynamically generated XLSX rows so public
      smoke does not mutate fixed sample usernames.
- [x] Extend Admin static/public verification for the CSV/XLSX upload marker
      and same-origin XLSX import template.
- [x] Run focused, typecheck, OpenAPI/SDK, format, build, fixed-port smoke,
      deployment and public URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 37: core.config Metadata Enrichment

Why this slice: after the user XLSX import/export file-format gap, the next
lower-dependency P1 foundation gap was `core.config` operator metadata.
RuoYi/Yudao both let operators distinguish configuration name, category/group
and remarks instead of only a raw key/value row. OpenCore already had config
CRUD, secret redaction, public value-by-key and cache refresh, so this round
could add metadata without opening batch deletion, Excel file export or broad
runtime feature-flag propagation.

- [x] Recompare RuoYi/Yudao config management metadata shape against OpenCore.
- [x] Add `category`, required `name` and optional `remark` to
      `SystemConfig`.
- [x] Add Prisma migration with safe backfill from existing `key` values.
- [x] Update seed/runtime config records with meaningful category/name/remark.
- [x] Extend config DTOs, repository contracts, Prisma repository and seed
      repository normalization.
- [x] Preserve secret value redaction while keeping metadata visible.
- [x] Extend SDK config types, registry fixtures and OpenAPI output.
- [x] Extend Admin Config list/detail/create/edit/filter/export surfaces for
      category/name/remark.
- [x] Extend Admin static smoke and `core.config` API smoke for metadata
      create/detail/update/export guards.
- [x] Run Prisma generate/migrate, focused tests, SDK/OpenAPI checks,
      typecheck, format, fixed-port smoke, build, deployment and public URL
      verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 38: core.config Native XLSX Export

Why this slice: after config metadata reached the operator surface, the next
lowest-dependency config debt was file export depth. Yudao exposes
`/infra/config/export-excel` guarded by `infra:config:export`, and RuoYi has
the same basic config export product shape. OpenCore already had
`core:config:export`, metadata, secret redaction and value/cache smoke, so this
round could move config export from preview metadata to a real XLSX file
without opening batch deletion or broader runtime feature-flag propagation.

- [x] Recompare Yudao/RuoYi config export shape against OpenCore.
- [x] Extend `GET /api/core/config/export` with
      `contentType/contentBase64` for `opencore-system-config.xlsx`.
- [x] Include category, name, key, value, valueType, visibility, public,
      description and remark columns in the XLSX export.
- [x] Preserve secret value redaction in the exported workbook payload.
- [x] Extract a shared system XLSX workbook helper and reuse it from user and
      config exports.
- [x] Extend OpenAPI/SDK export preview types with optional file payload
      fields.
- [x] Add Admin Config `Download Excel` action guarded by
      `core:config:export`.
- [x] Extract shared Admin base64 file download helper and reuse it from Users
      and Config.
- [x] Extend Admin static smoke for `canExportSystemConfig`, Excel download UI
      and missing-permission marker.
- [x] Extend fixed-port/deploy/public `core.config` smoke to verify filename,
      MIME, base64 payload, XLSX zip header and value column.
- [x] Run focused tests, OpenAPI/SDK, typecheck, format, fixed-port smoke,
      build, deployment and public URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 39: core.config Batch Deletion

Why this slice: after config metadata and native XLSX export, the next
lowest-dependency config debt was batch deletion. Yudao exposes
`/infra/config/delete-list` guarded by `infra:config:delete`, and its Admin
config API has `deleteConfigList(ids)`. OpenCore already had single config
delete, metadata, cache invalidation and export, so this round could add the
selected-row batch delete loop without opening secret vault/KMS, built-in
config type policy or broader runtime propagation.

- [x] Recompare Yudao/RuoYi config delete-list shape against OpenCore.
- [x] Add `BatchDeleteSystemConfigsDto` and
      `SystemConfigBatchMutationResultDto`.
- [x] Add `deleteConfigs` repository/service contract for seed and Prisma
      implementations.
- [x] Validate batch keys for array shape, non-empty values, duplicates and
      missing configs before mutation.
- [x] Invalidate public value cache for every deleted key after a successful
      batch delete.
- [x] Add `DELETE /api/core/config/batch`, guarded by `core:config:delete`,
      before the dynamic `config/:key` route.
- [x] Extend permission-matrix, OpenAPI and SDK with config batch deletion.
- [x] Add Admin Config row selection and `Delete selected` action.
- [x] Extend Admin static smoke for batch deletion UI/service markers.
- [x] Extend fixed-port/deploy/public `core.config` smoke with empty,
      duplicate, missing-key, success and cache-invalidation guards.
- [x] Run focused tests, OpenAPI/SDK, typecheck, format, fixed-port smoke,
      build, deployment and public URL verification gates.
- [x] Commit and push this independently accepted product slice.

## Round 40: core.config System Deletion Policy

Why this slice: after batch deletion was live, the next lowest-dependency
config debt was the built-in/system config deletion policy. Yudao marks configs
as `SYSTEM` or `CUSTOM`, creates operator-added configs as custom, and rejects
deleting system configs in both single and batch delete flows. OpenCore already
had metadata, export, batch deletion, cache invalidation and Admin selected-row
deletion, so this round could add system/custom protection without opening
secret vault/KMS or broader runtime feature-flag propagation.

- [x] Recompare Yudao/RuoYi built-in config deletion policy against OpenCore.
- [x] Add persisted `SystemConfig.system` with migration backfill for seeded
      built-in configs.
- [x] Mark seeded system configs and SDK fixtures as `system=true`; create new
      configs as `system=false`.
- [x] Reject single deletion of `system=true` configs in seed and Prisma
      repositories.
- [x] Reject mixed batch deletion containing any `system=true` config before
      mutation so custom rows are not partially deleted.
- [x] Expose `system` through DTO/OpenAPI/SDK and config XLSX export columns.
- [x] Add Admin Config System column/filter/detail/export surface.
- [x] Disable Admin row deletion and row-selection checkboxes for system
      configs; batch delete only sends selected custom keys.
- [x] Extend Admin static smoke for system deletion UI/service markers.
- [x] Extend fixed-port/deploy/public `core.config` smoke with seeded system
      flag, single-delete guard, mixed-batch guard and cleanup checks.
- [x] Run Prisma generate/migrate, focused tests, OpenAPI/SDK, typecheck,
      format, build, fixed-port smoke, deployment and public URL verification
      gates.
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
- [x] Round 4/16 `core.menu`: tree menu metadata, Admin tree operations,
      parent/child guards, nullable parent clearing and route/component smoke.
- [x] Round 5/17/18/20 `core.role`: CRUD, data scope, menu assignment, user
      assignment, status toggle, disabled-role auth filtering and
      status/update/delete session revocation.
- [x] Round 8/21 `core.dict`: dict type CRUD, item-level management API/SDK/
      Admin, public simple-list consumer endpoint, disabled type/item filtering
      and deserialization smoke.

### First Loop, Needs Enhancement

- [ ] Round 1 `core.notice`: read/unread state, inbox/header badge and delivery
      adapter design.
- [ ] Round 2/27 `core.dept`: management tree and simple-list option source
      are complete; user binding path hardening, data-scope workflow
      integration and ordered tree operations remain.
- [ ] Round 3/22/25 `core.post`: user-post binding and simple-list option
      source are complete; batch operations and ordered list refinements
      remain.
- [ ] Round 7/19/22/23/28/29/30/31/32/33/34/35/36 `core.user`: status toggle, reset
      password and direct user-mutation session invalidation are complete. Post
      binding, department side-tree filtering, self-profile basic display-name
      read/update, self-password and authenticated simple-list option source
      are complete. Profile avatar upload/public preview/replace/delete is
      complete. Batch enable/disable and batch delete are complete.
      CSV-compatible import template/import results with update-existing
      session revocation are complete. Dedicated `core:user:import` permission
      is complete. Native XLSX export payload and Admin download are complete.
      Native XLSX import template/parsing is complete while CSV import remains
      backwards compatible. Any dedicated User-page role assignment workflow
      still needs enhancement if admitted.
- [ ] Round 9/24/37/38/39/40 `core.config`: public get-value-by-key, cache refresh
      and mutation invalidation are complete. Category/name/remark metadata is
      complete. Native XLSX export payload and Admin download are complete.
      Batch deletion is complete. Persisted system/custom deletion policy is
      complete. Broader runtime propagation boundaries and any admitted secret
      vault/KMS integration remain.
- [ ] Round 11/26 `core.login-log`: browser/OS parsing and IP/time filters are
      complete. IP/location enrichment where feasible, cleanup/unlock policy
      integration and logType/result schema expansion remain.

### Thin, Must Rework Before More Broad Surfaces

- [x] P0-R14-ONLINE-USER-REVOCATION：问题：Round 13 kick-out 只写
      `revokedAt`，bearer token validation 仍忽略 online-session revoke；
      参考来源：RuoYi online user force logout、Yudao OAuth2 token delete；
      实施要求：真实 token/session revoke enforcement，batch kick-out，
      browser/OS parsing，IP fields，Admin 展示；测试要求：smoke 证明被踢
      token 再访问受保护接口返回 401；完成标准：Round 14 已完成，kick-out
      会让真实 bearer session 失效。
- [x] P0-R15-FILE-CONTENT-LOOP：问题：Round 10 只有文件 metadata CRUD，不是
      文件中心；参考来源：Yudao file upload/download/preview shape；
      实施要求：基于现有 file storage boundary 做 authenticated upload plus
      download/preview/copy-link 的最小闭环；测试要求：smoke 上传、读取 metadata、
      下载或预览并校验内容；完成标准：Round 15 已完成，Admin/API/smoke
      均证明真实文件内容可上传并原样下载。
- [x] P0-R16-MENU-TREE-REWORK：问题：Round 4 菜单模型过薄，只有 flat
      `key/title/path/permission/order/hidden`；参考来源：RuoYi/Yudao menu
      tree/type/icon/component/status/cache shape；实施要求：tree menu model
      和 Admin tree operations，保持 registry 不被绕过；测试要求：route/menu
      drift、角色/菜单关联或等价权限 bundle smoke；完成标准：Round 16 已完成，
      菜单管理能支撑真实后台导航元数据和父子组织。

## Explicitly Out Of Scope

- Notice read/unread inbox, header badge and per-user read tracking.
- Message bus push, WebSocket delivery or mail/SMS fan-out.
- BPMN/workflow approval around announcements.
- Tenant-scoped notices.
- Department user binding and data-scope assignment UI.
- Batch department deletion or drag-sort persistence.
- Batch post deletion and ordered list refinements.
- Menu router-generation expansion, menu cache refresh, save-sort and drag-sort
  persistence.
- Role simple-list endpoints, batch role deletion and standalone data-scope
  endpoint.
- Registry definition editing and dynamic permission discovery.
- Dedicated User-page role assignment dialog and social endpoints.
- Batch dictionary delete, Excel import/export file workflows, dictionary
  color/css/remark fields, app-wide dictionary cache TTL/invalidation and
  dictionary cache refresh.
- Secret vault/KMS integration and runtime feature-flag propagation.
- Presigned upload/download URLs, storage-provider config, public
  download/preview/copy-link workflows, batch file delete and object browser
  expansion.
- Login-log deletion/cleanup, user unlock, lockout-policy tuning, session
  termination, IP location enrichment and logType/result schema expansion.
- Operation-log deletion/cleanup, batch delete, duration/location/user-agent
  schema expansion, operation type enum expansion, async queue/indexing and
  business-domain audit timeline views.
- OAuth client/token administration, standalone JWT blacklist independent of
  the online-session store, IP geolocation, server-side date filters and
  online-user export endpoint expansion.
- CRM/ERP/MES/WMS/mall/member/pay/AI modules.
