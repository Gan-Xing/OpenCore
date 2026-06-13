# cycle-021 Audit

Date: 2026-06-12

## Current OpenCore Evidence

- BE20 has completed package-owned backend runtime boundaries for system,
  security, audit, online-user, scheduler, monitor and OpenForge.
- `@opencore/system` already owns `system-notice` DTOs, repository contract,
  seed repository, Prisma repository, service, module and seed records.
- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposes `/api/core/notices` list/export/create/update/publish/archive/delete.
- `packages/module-registry` declares `core.notice` permissions and a
  `system.notices` menu, but does not yet provide an Admin route declaration.
- `apps/admin/config/routes.ts`, `apps/admin/src/access.ts` and
  `apps/admin/src/core/shellRegistry.ts` do not include `/system/notices`.
- `@opencore/sdk` does not expose typed system notice methods.
- Admin System pages still use fixture-backed tables except the earlier live
  Users page.

## Lowest Dependency Gap

`core.notice` is the first practical cycle-021 productization slice:

- Backend runtime exists and is already package-owned.
- Prisma schema and seed data exist.
- Permission codes exist.
- OpenAPI tag exists.
- Missing pieces are SDK/Admin/route/access/smoke and a detail read contract.

## State Drift

`docs/quality-cycle/ledger.md` and cycle-020 completion report record BE20 as
complete, while `.opencore/quality-cycle/state.json` still reported
`completedCycles=19` and `activeCycle=20`. This round aligns state to
`completedCycles=20`, `activeCycle=21` and `maxCycles=21`, treating cycle-020
as documented complete and cycle-021 as the active productization recursion.

## Round 2 Audit: core.dept

After Round 1, the next lowest dependency productization gap is `core.dept`:

- `@opencore/system` already owns `system-dept` DTOs, seed records, repository
  contract, seed repository, Prisma repository, service, module, tree builder,
  cycle guards and export preview helper.
- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposes `/api/core/depts` list/export/create/update/delete, but lacked
  `GET /api/core/depts/:id`.
- `packages/module-registry` declares `core.dept` permissions and
  `system.depts` menu, but did not provide Admin route metadata.
- `@opencore/sdk` did not expose typed department tree/client methods.
- `apps/admin/config/routes.ts`, `apps/admin/src/access.ts` and
  `apps/admin/src/core/shellRegistry.ts` did not include `/system/depts`.
- No Admin page or smoke check proved a logged-in operator could manage the
  package-owned department tree.

This remains inside S7 System scope and does not introduce user binding,
data-scope assignment, multi-tenant hierarchy, batch delete or drag-sort
persistence.

## Round 3 Audit: core.post

After Round 2, the next lowest dependency productization gap is `core.post`:

- `@opencore/system` already owns `system-post` DTOs, seed records, repository
  contract, seed repository, Prisma repository, service, module, pagination,
  filters and export preview helper.
- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposes `/api/core/posts` list/export/create/update/delete, but lacked
  `GET /api/core/posts/:code`.
- `packages/module-registry` declares `core.post` permissions and the
  `system.posts` menu, but did not provide Admin route metadata.
- `@opencore/sdk` did not expose typed post client methods or fixtures.
- `apps/admin/config/routes.ts`, `apps/admin/src/access.ts` and
  `apps/admin/src/core/shellRegistry.ts` did not include `/system/posts`.
- No Admin page or smoke check proved a logged-in operator could manage
  package-owned posts.

This remains inside S7 System scope and does not introduce user-post binding,
profile post selection, simple-list option endpoints or batch delete.

## Round 4 Audit: core.menu

After Round 3, the next lowest dependency productization gap is `core.menu`:

- `@opencore/system` already owns `system-menu` DTOs, seed records, repository
  contract, seed repository, Prisma repository, service, module, normalization
  rules and export preview helper.
- `apps/api/src/modules/core/rbac/rbac.controller.ts` exposed `/api/core/menus`
  list/export/create/update/delete, but lacked `GET /api/core/menus/:key`.
- `packages/module-registry` already declares `core.menu` permissions,
  `system.menus` menu and Admin route metadata for `/system/menus`.
- `@opencore/sdk` exposed list/export/create/update/delete menu methods, but
  lacked typed detail support and nullable permission clearing.
- `apps/admin/src/pages/System/Menus.tsx` was still a read-only
  registry-backed RBAC table and did not prove a logged-in operator could
  manage persisted menus.
- Admin smoke locked the route/access/shell entry, but not live SDK menu CRUD
  page behavior.

This remains inside S6 RBAC scope and admits OpenCore's current flat
`Menu.key` model only. It does not introduce RuoYi/Yudao-style menu parent
trees, menu type/icon/component/status/cache fields, dynamic router generation,
role menu tree assignment, menu cache refresh, save-sort or drag-sort
persistence.

## Round 5 Audit: core.role

After Round 4, the next lowest dependency productization gap is `core.role`:

- `@opencore/system` already owns `system-role` DTOs, seed records, repository
  contract, seed repository, Prisma repository, service, module, permission
  assignment validation, data-scope normalization and export preview helper.
- `apps/api/src/modules/core/rbac/rbac.controller.ts` exposed `/api/core/roles`
  list/export/create/update/delete, but lacked `GET /api/core/roles/:code`.
- `packages/module-registry` already declares `core.role` permissions,
  `system.roles` menu and Admin route metadata for `/system/roles`.
- `@opencore/sdk` exposed list/export/create/update/delete role methods, but
  lacked typed detail support and did not include `dataScope` or
  `dataScopeDeptIds` in the role type despite the API DTO exposing them.
- `apps/admin/src/pages/System/Roles.tsx` was still a read-only fixture-backed
  RBAC table and did not prove a logged-in operator could manage persisted
  roles.
- Admin smoke locked route/access/shell presence, but not live SDK role CRUD
  page behavior.

This remains inside S6 RBAC scope and admits the existing OpenCore
`Role.code`, permission-code assignment and data-scope model. It does not
introduce role-user assignment pages, menu-tree assignment, simple-list option
endpoints, batch delete, standalone data-scope endpoints or status toggles.
Round 17 later closes the menu-tree assignment and role-permission session
revocation portion of this gap. Round 18 later closes role-user assignment and
changed user-role session revocation. Round 20 later closes role status,
disabled-role auth filtering and role update/status/delete session revocation.

## Round 6 Audit: core.permission

After Round 5, the next lowest dependency productization gap is
`core.permission`:

- `apps/api/src/modules/core/rbac/rbac.controller.ts` exposed
  `/api/core/permissions` list/export/create/update/delete, but lacked
  `GET /api/core/permissions/:code`.
- `apps/api/src/modules/core/rbac/*repository.ts` persisted permissions and
  could mutate them, but the API did not distinguish registry-seeded system
  permissions from custom permissions.
- `packages/module-registry` already declares `core.permission` permissions,
  the `system.permissions` menu and Admin route metadata.
- `@opencore/sdk` exposed list/export/create/update/delete permission methods,
  but lacked typed detail support and did not expose whether a permission is
  registry-managed.
- `apps/admin/src/pages/System/Permissions.tsx` was still a read-only
  registry-backed RBAC table and did not prove a logged-in operator could manage
  custom persisted permissions.
- `apps/admin/src/pages/System/Roles.tsx` used registry permission fixtures for
  role assignment options, so newly created custom permissions could not appear
  in the live role form.
- Admin smoke locked route/access/shell presence, but not live SDK permission
  lifecycle page behavior.

This remains inside S6 RBAC scope and admits OpenCore's persisted
`Permission.code` catalog. It treats module-registry permissions as immutable
system entries, while allowing custom permissions to be created, edited,
exported and deleted. It does not introduce registry definition editing,
dynamic permission discovery, menu-tree role assignment, user-role assignment or
token permission refresh semantics.
Round 17 later closes the menu-tree role assignment and role-permission session
revocation portion of this gap.

## Round 7 Audit: core.user

After Round 6, the next lowest dependency productization gap is `core.user`:

- `apps/api/src/modules/core/rbac/rbac.controller.ts` exposed
  `/api/core/users` list/export/create/update/delete, but lacked
  `GET /api/core/users/:id`.
- `@opencore/system` could create, update and delete users, but the runtime did
  not expose `system` metadata and did not protect the seeded administrator from
  update/delete through the user management API.
- `@opencore/sdk` exposed user list/export/create/update/delete methods, but
  lacked typed detail support and did not include `deptId` or `system` in user
  types.
- `apps/admin/src/pages/System/Users.tsx` was still a read-only list/detail
  fixture with only `listOpenCoreUsers`, so it did not prove a logged-in
  operator could manage persisted users.
- Admin smoke locked route/access/shell presence, but not live SDK user CRUD
  page behavior.

This remains inside S6/S7 System + RBAC scope and admits OpenCore's current
user model: role-code assignment, optional department binding, enabled flag,
password on create or explicit update and seeded-admin protection. It does not
introduce import, reset-password/status-toggle endpoints, profile/avatar/social
capabilities, post binding, batch delete, side-tree filtering or token/session
refresh semantics.
Round 19 later closes the reset-password/status-toggle endpoint gap and direct
user mutation token/session refresh semantics.

## Round 8 Audit: core.dict

After Round 7, the next lowest dependency productization gap is `core.dict`:

- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposed `/api/core/dicts` list/export/create/update/delete, but lacked
  `GET /api/core/dicts/:code`.
- `@opencore/system` already owned package-local dictionary DTOs, seed records,
  seed repository, Prisma repository, service, module, pagination, filters and
  export preview helper for `DictType` records with embedded `items`.
- `@opencore/sdk` exposed dictionary list/export/create/update/delete methods,
  but lacked typed detail support.
- `apps/admin/src/pages/System/Dicts.tsx` was still a read-only fixture-backed
  table and did not prove a logged-in operator could manage package-owned
  dictionaries.
- Admin smoke kept dictionaries in the legacy read-only current-page-filter
  bucket, so it did not lock live SDK dictionary lifecycle usage.

This remains inside S7 System scope and admits the existing OpenCore
`DictType.code` plus embedded `items` model. It does not introduce a separate
dict-data module/page/endpoints, simple-list/cache endpoints, batch delete,
Excel import/export file workflows, color/css/remark fields, app public
dictionary endpoints or cache refresh semantics.
Round 21 later closes the item-level management and public simple-list portion
of this gap while leaving batch delete, file import/export, color/css/remark
metadata and broader cache refresh as optional future depth.

## Round 9 Audit: core.config

After Round 8, the next lowest dependency productization gap is `core.config`:

- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposed `/api/core/config` list/export/create/update/delete, but lacked
  `GET /api/core/config/:key`.
- `@opencore/system` already owned package-local system config DTOs, seed
  records, seed repository, Prisma repository, service, module, pagination,
  filters, export preview helper, secret-key validation and redaction.
- `@opencore/sdk` exposed config list/export/create/update/delete methods, but
  lacked typed detail support.
- `apps/admin/src/pages/System/Config.tsx` was still a read-only
  fixture-backed table and did not prove a logged-in operator could manage
  package-owned runtime configuration.
- Admin smoke kept config in the legacy read-only current-page-filter bucket,
  so it did not lock live SDK config lifecycle usage or secret redaction
  preservation.
- Local verification and deployment still required per-run port decisions,
  which repeatedly wasted time around unrelated listeners.
- Admin production builds repeatedly hit utoopack CSS loader deserialization
  failures on `global.less.css`, then webpack needed the Umi esbuild helper
  IIFE setting to build reliably.

This remains inside S7 System scope and admits the existing OpenCore
`SystemConfig.key`, `valueType`, `visibility` and secret-redaction model. It
does not introduce RuoYi/Yudao-style cache refresh, public get-value-by-key
endpoints, batch delete, Excel file export, category/name/remark schema
expansion, secret vault/KMS integration or runtime feature-flag propagation.

## Round 10 Audit: core.file

After Round 9, the next lowest dependency productization gap is `core.file`:

- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposed `/api/core/files` list/export/create/update/delete, but lacked
  `GET /api/core/files/:id`.
- `@opencore/file` and the system-management repositories already admitted file
  asset metadata records, but no repository detail contract existed for a
  single file asset.
- `@opencore/sdk` exposed file list/export/create/update/delete methods, but
  lacked typed detail support.
- `apps/admin/src/pages/System/Files.tsx` was still a read-only fixture-backed
  table and did not prove a logged-in operator could manage package-owned file
  metadata.
- Admin smoke kept files in the legacy read-only current-page-filter bucket,
  so it did not lock live SDK file lifecycle usage.
- The deploy script served Admin on `127.0.0.1` and built the browser bundle
  with a loopback API base URL, so the deployed frontend was not reachable or
  usable from outside the server.

This remains inside S7 System scope and admits OpenCore's current `FileAsset`
metadata model: original name, MIME type, size, storage key, checksum, uploader
and created time. It does not introduce binary upload, presigned URLs, public
download/preview endpoints, storage-provider configuration, copy-link
workflows, batch delete or object-browser expansion.

## Round 11 Audit: core.login-log

After Round 10, the next lowest dependency productization gap is
`core.login-log`:

- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposed `/api/core/login-logs` list/export, but lacked
  `GET /api/core/login-logs/:id`.
- `@opencore/audit` already recorded login attempts and exposed seed/Prisma
  login-log repositories, but the repository/service contracts had no single
  record lookup.
- `@opencore/sdk` exposed login-log list/export methods, but lacked typed
  detail support and a reusable query request type.
- `apps/admin/src/pages/Security/LoginLogs.tsx` was still a fixture-backed
  `SystemManagementTable`, so it did not prove a logged-in operator could read
  real failed-login audit rows or open details.
- Fixed-port smoke covered config and file metadata, but did not assert that a
  failed login was recorded and readable through the API.
- The deployed Admin bundle compiled `process.env.ADMIN_API_BASE_URL` to an
  empty relative base, so browser login POSTs hit
  `http://144.217.243.161:39174/api/auth/login`; the Admin static server only
  accepted GET/HEAD and returned 405.

This remains inside S7/S8 Security audit scope and admits OpenCore's current
immutable login-log model: ID, username, IP, success flag, request ID, failure
reason and creation time. It does not introduce login-log deletion/cleanup,
user unlock, lockout-policy changes, active session termination, location/
device enrichment, server-side date-range filters or logType/result schema
expansion.

## Round 12 Audit: core.audit-log

After Round 11, the next lowest dependency productization gap is
`core.audit-log`:

- `apps/api/src/modules/core/system-management/system-management.controller.ts`
  exposed `/api/core/audit-logs` list/export, but lacked
  `GET /api/core/audit-logs/:id`.
- `@opencore/audit` already recorded operation logs through the global write
  operation interceptor and exposed seed/Prisma operation-log repositories, but
  the repository/service contracts had no single record lookup.
- `@opencore/sdk` exposed audit-log list/export methods, but lacked typed query
  request reuse and detail support.
- `apps/admin/src/pages/Security/OperationLogs.tsx` was still a fixture-backed
  `SystemManagementTable`, so it did not prove a logged-in operator could read
  real write-operation audit rows or open details.
- Fixed-port smoke covered config, file metadata and login logs, but did not
  assert that a successful write operation is recorded by the audit interceptor
  and readable through list/detail/export.
- The deployed Admin API base fix from Round 11 still allowed operators to set
  `OPENCORE_DEPLOY_ADMIN_API_BASE_URL` with a trailing `/api`; because the SDK
  request helper prefixes `/api` itself, that configuration produced browser
  requests like `/api/api/auth/login`.

This remains inside S7/S8 Security audit scope and admits OpenCore's current
immutable operation-log model: ID, actor username, action, resource,
resourceId, request method/path/status, IP, user agent, request ID, metadata
and creation time. It does not introduce operation-log deletion/cleanup, batch
delete, duration/location schema expansion, operation-type enums, async queue
indexing or business-domain audit timeline views.

## Round 13 Audit: monitor.online-user

After Round 12, the next lowest dependency productization gap is
`monitor.online-user`:

- `@opencore/online-user` already owned seed/Prisma online session runtime,
  summary listing, detail lookup and kick-out mutation.
- `apps/api/src/modules/monitor/operations/operations.controller.ts` already
  exposed `/api/monitor/online-users`, `/api/monitor/online-users/:id` and
  `/api/monitor/online-users/:id/kick-out` guarded by
  `monitor:online-user:read` and `monitor:online-user:manage`.
- `@opencore/sdk` already exposed the online-user API methods, but fixtures
  only modeled one active session, which made a kick-out smoke risk revoking
  the seeded admin session itself.
- `apps/admin/src/pages/Monitor/OnlineUsers.tsx` was still fixture-backed and
  did not prove a logged-in operator could read live online sessions, inspect
  sensitive token/revocation fields or perform a permission-gated kick-out.
- Admin access lacked an explicit `canManageOnlineUsers` binding for the
  manage permission.
- Fixed-port smoke covered config, file metadata and audit logs, but did not
  prove online-user list/detail/kick-out behavior or that the admin session
  remains usable after a forced logout of another session.
- The deployed Admin bundle had already been corrected, but browsers with an
  old tab or old Workbox cache could still execute stale JavaScript that posts
  to `/api/api/auth/login`.

This remains inside S8 Monitor/Security scope and admits OpenCore's current
online session model: ID, username, token ID, IP, user agent, last seen time,
expiry and revocation metadata. It does not introduce OAuth client/token
administration, true JWT blacklist enforcement, browser/OS parsing, IP
geolocation, batch kick-out, export endpoints or session-refresh semantics.

## Round 20 Audit: core.role Status Security

After Round 19, the remaining basic `core.role` gap was role status and its
authorization effect:

- Role CRUD, data scope, role menu assignment and role user assignment were
  live, but roles did not yet persist an operator-visible enabled/disabled
  state.
- Direct role update/delete and status changes needed a consistent mutation
  result with affected-session revocation, matching the session semantics added
  for role menu/user assignment and direct user security mutation.
- Auth/RBAC needed to ignore disabled roles during login role-code projection,
  permission aggregation and data-scope role calculation while keeping the
  management assignment rows visible for operators.
- Runtime tests needed to prove status deserialization rejects bad booleans,
  while deploy/local smoke needed to prove disabled roles do not keep
  authorizing stale or newly logged-in sessions.

This stays inside the current S6 RBAC boundary. It does not introduce batch
role operations, separate data-scope endpoints, role simple-list endpoints or a
separate user-page role assignment workflow.

## Round 21 Audit: core.dict Item Data Simple-list

After Round 20, the next P1 foundation gap was `core.dict`:

- Round 8 already made dictionary type CRUD and embedded items live, but it did
  not expose an item-level API for operators that mirrors RuoYi/Yudao
  dictionary data operations.
- Other product surfaces still lacked a public/simple consumer endpoint for
  dictionary options, forcing them either to load management rows or hard-code
  options.
- Runtime normalization needed to reject malformed item booleans and sort
  values because deserialization regressions had repeated across earlier
  rounds.
- Admin Dicts needed row-level item management instead of relying only on
  whole-dictionary embedded edit forms.
- Fixed-port and deploy smoke needed to prove disabled items and disabled dict
  types are filtered from consumer results.

This stays inside the current S7 System boundary. It does not introduce a
separate dictionary-data Admin page, batch dictionary operations, Excel file
import/export, color/css/remark metadata or app-wide cache TTL/refresh
semantics.

## Round 22 Audit: core.user Post Binding

After Round 21, the next lowest-dependency P1 foundation gap was `core.user`
post binding:

- RuoYi and Yudao both expose post/position assignment in the user create/edit
  workflow, alongside role and department selection.
- OpenCore already had live post management, user CRUD, role selection,
  department selection, status mutation, reset password and session-revocation
  semantics, but users did not persist or expose assigned posts.
- User summaries needed to carry `postCodes` through API, SDK, OpenAPI,
  Admin, seed data and export previews so the assignment is not UI-only.
- Runtime normalization needed to reject malformed, duplicate and unknown post
  codes before mutation.
- Fixed-port and deploy smoke needed to prove create-time binding and
  update-time clearing while preserving the existing user security-mutation
  session invalidation behavior.

This stays inside the current S7 System/RBAC boundary. It does not introduce
department side-tree filtering, profile/avatar/social endpoints, Excel
import/export workflows, batch user delete, standalone user option endpoints or
a separate User-page role-assignment workflow in this round.

## Round 23 Audit: core.user Department Tree Filter

After Round 22, the next lowest-dependency P1 foundation gap was `core.user`
department tree filtering:

- RuoYi and Yudao both render a department tree beside the user table and
  reload users when an operator clicks a department node.
- Their backend behavior filters by the selected department and its child
  departments, not only the exact department row.
- OpenCore already had live department tree management and user `deptId`, so
  this gap did not require new schema or a broader user-profile workflow.
- User list/export needed a typed `deptId` query contract across API, SDK and
  OpenAPI.
- Runtime behavior needed to reject unknown department IDs instead of silently
  returning an ambiguous empty list.
- Fixed-port and deploy smoke needed to prove direct department filtering,
  parent subtree filtering and unrelated department exclusion.

This stays inside the current S7 System/RBAC boundary. It does not introduce
profile/avatar/social endpoints, Excel import/export workflows, batch user
delete, standalone user option endpoints or a separate User-page role
assignment dialog in this round.

## Round 24 Audit: core.config Value Cache Refresh

After Round 23, the next lower-dependency P1 foundation gap was `core.config`
runtime consumption and cache control:

- RuoYi exposes a config-key value lookup endpoint and keeps config values in a
  cache that can be reset through refreshCache.
- Yudao exposes `get-value-by-key` and explicitly rejects invisible config
  values from being returned to the frontend.
- OpenCore already had config CRUD/detail/export plus secret redaction, but no
  consumer endpoint for other frontend/runtime surfaces to read public config
  values.
- OpenCore also lacked cache refresh and mutation invalidation semantics, so
  future runtime config consumers would either bypass caching or risk stale
  values.
- Admin Config needed an operator-visible cache refresh action, not just a
  table reload.
- Fixed-port and deploy smoke needed to prove value-by-key, update
  invalidation, explicit refresh-cache and secret-value blocking.

This stays inside the current S7 System boundary. It does not introduce
category/name/remark schema expansion, batch config delete, Excel file export,
secret vault/KMS integration or broad runtime feature-flag propagation in this
round.

## Round 25 Audit: core.post Simple-list Option Source

After Round 24, the next lower-dependency P1 foundation gap was `core.post`
as a reusable option source:

- Yudao exposes a post simple-list endpoint and its user form consumes it for
  post assignment instead of loading the full post management page.
- RuoYi user management also treats post options as first-class form data,
  even though it obtains them through the user init/detail response rather
  than a standalone endpoint.
- OpenCore already had live post CRUD and Round 22 user-post binding, but
  Admin Users still fetched `listOpenCoreSystemPosts({ page, pageSize })` as a
  management list and then derived form options from it.
- A dedicated consumer endpoint needed to filter disabled posts and return a
  lightweight shape so user forms are not coupled to management fields.
- Because route order matters, `posts/simple-list` needed to be added before
  `posts/:code` and locked by SDK/API tests.
- Fixed-port and deploy smoke needed to prove disabled-post filtering and
  option shape so this does not regress into another memory-only rule.

This stays inside the current S7 System boundary. It does not introduce batch
post deletion, drag-sort/order persistence, role/user batch assignment flows or
department simple-list endpoints in this round.

## Round 30 Audit: core.user Simple-list Option Source

After Round 29, the next lower-dependency P1 foundation gap was `core.user` as
a reusable option source:

- Yudao exposes `/system/user/simple-list` and `/system/user/list-all-simple`
  for enabled-user dropdowns, including optional department filtering.
- Yudao Admin uses `getSimpleUserList()` in selector components and many
  workflow/business forms instead of binding every consumer to the user
  management list.
- RuoYi role authorization exposes assigned/unassigned user selection and
  select/cancel workflows, proving the same user-selector product need.
- OpenCore already had user CRUD, role-user assignment, department filtering
  and post binding, so this gap did not require schema work.
- Because user names are people data, OpenCore should not mirror the public
  dept/post simple-list boundary. The endpoint should require authentication
  while staying free of `core:user:read` management permission.
- The option payload needed to avoid `roleCodes`, `enabled` and `system` so
  selection consumers are not coupled to management/security fields.
- Fixed-port, deploy and public smoke needed to prove auth guard, unknown-dept
  handling, enabled-only filtering, department filtering and lightweight
  option shape.

This stays inside the current S7 System/RBAC boundary. It does not introduce
avatar upload, Excel import/export workflows, batch user delete, batch
enable/disable or a separate User-page role assignment dialog in this round.

## Round 31 Audit: core.user Profile Avatar

After Round 30, the next lower-dependency `core.user` profile gap was avatar
upload and preview:

- RuoYi exposes a dedicated current-user avatar upload endpoint and updates the
  cached login user after upload.
- Yudao carries the avatar URL on the current-user profile response/update
  shape, keeping avatar as part of the personal profile surface.
- OpenCore already productized real file upload/download in Round 15, so
  avatar could reuse the existing file storage boundary instead of introducing
  a new storage subsystem.
- The Admin top bar already has an `avatar` slot, but it was never backed by
  live profile data; profile upload had to refresh both `/auth/me` and the
  Admin initial state.
- The public preview URL had to work through the deployed Admin same-origin
  `/api` proxy, not only against the API origin, because browser `<img>` tags
  do not attach bearer tokens.
- Runtime validation needed to reject unsupported MIME types, malformed base64
  and payloads whose bytes do not match the declared image type, so this does
  not become another deserialization/shape issue left to operator memory.
- Fixed-port, deploy and public smoke needed to upload an actual PNG, download
  it byte-for-byte, prove `/auth/me` sees `avatarUrl`, delete it and verify the
  old URL returns 404 while restoring any pre-existing admin avatar state.

This stays inside the current S7 System/RBAC profile boundary. It does not
introduce email/phone profile fields, social account binding, Excel
import/export workflows, batch user delete, batch enable/disable or a separate
User-page role assignment dialog in this round.
