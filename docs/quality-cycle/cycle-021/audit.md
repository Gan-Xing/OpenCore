# cycle-021 Audit

Date: 2026-06-12
Last updated: 2026-06-13

## Scope Note

Historical out-of-scope or "does not admit" wording below applies to the round
where it appears. The active goal now auto-admits P0/P1 foundation capabilities
as independent rounds and reserves explicit admission for large
business/platform domains.

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

## Round 32 Audit: core.user Batch Mutations

After Round 31, the next lower-dependency `core.user` management gap was batch
status and batch delete:

- RuoYi exposes batch user deletion and status changes on the user management
  surface, and Yudao exposes `delete-list` plus `update-status`.
- OpenCore already had single-user status/delete, system-user mutation guards
  and online-session revocation semantics, so batch mutations could reuse the
  same product contract instead of opening a new subsystem.
- Batch status/delete needed repository-level validation so empty arrays,
  duplicate IDs, missing users and system users fail before mutation.
- Prisma batch delete needed a transaction across user-role, user-post and
  user rows so cleanup is not partial.
- Route order mattered: static `users/batch/*` routes had to be registered
  before dynamic `users/:id` routes.
- Admin needed real row selection and disabled system-user checkboxes, not only
  hidden action buttons.
- Fixed-port, deploy and public smoke needed to prove batch session revocation
  and login blocking so this does not regress into another operator-memory
  rule.

This stays inside the current S7 System/RBAC user-management boundary. It does
not introduce Excel import/export file workflows, email/phone profile fields,
social account binding or a dedicated User-page role assignment dialog in this
round.

## Round 33 Audit: core.user Import Template and CSV Import

After Round 32, the next lower-dependency `core.user` management gap was import
template plus import result handling:

- RuoYi exposes `importTemplate` and `importData` directly on the user
  management surface beside export.
- Yudao exposes `get-import-template` and `import`, returning structured
  created, updated and failed username lists.
- OpenCore already had user create/update validation, role/dept/post binding,
  system-user mutation protection and online-session revocation, so import
  could reuse those boundaries instead of inventing a parallel write path.
- Native XLSX/binary Excel parsing and full export formatting are a broader
  file-format slice; this round admits a CSV-compatible template/import loop
  that operators can verify immediately.
- Route order mattered: static `users/import-template` and `users/import`
  routes had to be registered before dynamic `users/:id` routes.
- `updateExisting` needed strict boolean validation so the repeated
  deserialization failures become a smoke-locked contract instead of an
  operator-memory rule.
- Partial row failures needed to be returned in structured `failures` while
  valid rows continue importing, matching the reference product expectation.
- Import updates needed to revoke active online sessions for changed usernames
  so password/status changes do not leave stale tokens alive.
- Admin needed a real template-download and import-modal flow, not only a raw
  API endpoint.
- Fixed-port, deploy and public smoke needed to prove template download,
  strict boolean guard, partial result handling, update-existing session
  revocation, disabled-user simple-list filtering, public Admin bundle markers
  and same-origin proxy access.

This stays inside the current S7 System/RBAC user-management boundary. It does
not introduce native XLSX/binary Excel import/export depth, a dedicated
`core:user:import` permission, server-side full Excel export formatting,
email/phone profile fields, social account binding or a dedicated User-page
role assignment dialog in this round.

## Round 34 Audit: core.user Import Permission

After Round 33, the lowest-dependency `core.user` debt was permission
granularity for import:

- Yudao protects user import with `system:user:import`, proving import is a
  separate grantable management action from user creation.
- OpenCore's Round 33 import loop still reused `core:user:create`, so a role
  allowed to create one user could also bulk import users.
- The repository and import business behavior were already in place, so this
  slice should not introduce native XLSX parsing, export formatting or new user
  schema fields.
- The existing permission contract did not support `import`; adding the action
  needed to start at `@opencore/contracts`, then flow through
  module-registry, seed, API guards, Admin access and smoke.
- Registry scope needed to stay narrow: only `core.user` should gain
  `core:user:import`, not every CRUD module.
- API permission matrix tests needed to prove both import-template and import
  routes require `core:user:import`.
- Admin needed an operator-visible disabled state for import actions when the
  permission is missing.
- Fixed-port, deploy and public smoke needed a real create-only user token to
  prove `core:user:create` no longer authorizes import.

This stays inside the current S7 System/RBAC user-management boundary. It does
not introduce native XLSX/binary Excel import/export depth, server-side full
Excel export formatting, email/phone profile fields, social account binding or
a dedicated User-page role assignment dialog in this round.

## Round 36 Audit: core.user Native XLSX Import

After Round 35, the remaining low-dependency `core.user` Excel gap was native
XLSX import parsing:

- RuoYi and Yudao both position user import as an Excel file workflow paired
  with user export, not as a permanently CSV-only side path.
- OpenCore already had import permission, partial result semantics, strict
  `updateExisting` validation, role/dept/post validation and session revocation
  on import updates, so this slice should reuse those semantics rather than
  create a parallel importer.
- The import template should move to a real `.xlsx` payload now that export
  already uses XLSX, while CSV upload remains backwards compatible for any
  existing scripts/operators.
- XLSX parsing needs to support the workbook forms OpenCore itself generates
  and common Excel shared-string workbooks: inline strings, shared strings,
  boolean cells and basic value cells are enough for this stage.
- Fixed-port/deploy/public smoke needs a dynamically generated XLSX row so the
  parser is exercised without importing and then deleting fixed sample
  usernames on the public deployment.
- Admin needed to stop presenting the upload as CSV-only; static and public
  checks now lock the CSV/XLSX marker.

This stays inside the current S7 System/RBAC user-management boundary. It does
not introduce a dedicated User-page role assignment dialog, email/phone/social
account expansion or richer Excel style/error-highlighting in this round.

## Round 37 Audit: core.config Metadata Enrichment

After Round 36, the next lower-dependency P1 foundation gap was `core.config`
operator metadata:

- Yudao's config save/response DTOs expose `category`, `name` and `remark`
  beside key/value/visibility, so operators can classify and understand config
  rows.
- RuoYi's config management similarly treats the display name and grouping/type
  dimension as part of the basic config table, not as optional decoration.
- OpenCore already had config CRUD/detail/export, secret redaction, public
  value-by-key and cache refresh, so metadata could be added without changing
  the runtime consumption contract.
- Existing OpenCore config rows only had `key` as their human label; the
  migration needed to backfill `name=key` before enforcing required names.
- Repository normalization needed to keep category/name strict enough to avoid
  another loose deserialization surface, while still defaulting missing
  category to `system` and missing name to the config key for backwards
  compatibility.
- Admin Config needed metadata in list/detail/create/edit/export, not only in
  API payloads.
- Fixed-port, deploy and public smoke needed to prove metadata survives
  create/detail/update/export, while secret values remain redacted and the
  Round 24 cache/value-by-key behavior still works.

This stays inside the current S7 System configuration boundary. It does not
introduce batch config deletion, Excel file export, secret vault/KMS
integration or broad runtime feature-flag propagation in this round.

## Round 38 Audit: core.config Native XLSX Export

After Round 37, the next lower-dependency `core.config` gap was native file
export:

- Yudao exposes `GET /infra/config/export-excel`, protects it with
  `infra:config:export`, and downloads the file from the Admin config toolbar.
- RuoYi's config management also treats spreadsheet export as a basic operator
  action rather than a preview-only capability.
- OpenCore already had `core:config:export`, config metadata, secret redaction,
  public value-by-key and cache refresh, so this slice did not need schema or
  new permission work.
- The current OpenCore export only returned current-page metadata; operators
  could not download a backend-generated config workbook.
- The workbook needed to include config `value` to be useful, but secret values
  had to stay redacted through the existing repository boundary.
- User XLSX export already introduced a tested workbook-generation path, so
  this round should extract a shared system helper rather than copy another
  implementation.
- Admin needed a backend `Download Excel` action guarded by
  `core:config:export`, while keeping the existing frontend current-page
  export button.
- Fixed-port, deploy and public smoke needed to prove filename, MIME, base64,
  `PK` zip header, value column and Admin same-origin proxy export.

This stays inside the current S7 System configuration boundary. It does not
introduce batch config deletion, secret vault/KMS integration or broad runtime
feature-flag propagation in this round.

## Round 39 Audit: core.config Batch Deletion

After Round 38, the next lower-dependency `core.config` gap was batch deletion:

- Yudao exposes `DELETE /infra/config/delete-list`, protects it with
  `infra:config:delete`, and the Vue3 Admin config API calls
  `deleteConfigList(ids)` with comma-joined ids.
- RuoYi-style config management also treats multi-row delete as a basic table
  operation beside single-row delete and export.
- OpenCore already had single config delete, `core:config:delete`, metadata,
  secret redaction, XLSX export and value-cache invalidation.
- The batch route needed to be registered before `config/:key` so the static
  batch path cannot be swallowed by dynamic key routing.
- The batch input needed strict guards for empty arrays, non-string/empty keys,
  duplicate keys and missing configs, because repeated deserialization and
  route-shape regressions must become smoke/test coverage.
- Successful batch delete needed to invalidate every deleted key from the
  public value cache, not just delete rows.
- Admin needed selected-row deletion on the real Config page, not another
  fixture-only control.
- Fixed-port, deploy and public smoke needed to prove both the API guard path
  and the deployed Admin same-origin `/api/core/config/batch` path.

This stays inside the current S7 System configuration boundary. It does not
introduce a built-in-config type/policy field, secret vault/KMS integration or
broad runtime feature-flag propagation in this round.

## Round 48 Audit: core.login-log Cleanup Maintenance Actions

After Round 47, the next lower-dependency `core.login-log` gap was login-log
maintenance:

- RuoYi exposes selected-row delete and clean-all actions through
  `SysLogininforController.remove` and `clean`, beside list/export and unlock.
- Yudao's current login-log controller remains closer to read/page/export, so
  OpenCore uses RuoYi as the maintenance reference while preserving Yudao-style
  structured `logType/result` values from earlier rounds.
- OpenCore already had list/detail/export, device and time/IP filters,
  structured results, account lockout and username unlock, so this slice did
  not need another auth-model or schema-expansion round.
- The batch route needed to be registered before `login-logs/:id` so
  `batch`/`clean` cannot be parsed as dynamic IDs.
- The input guard needed to reject empty arrays, duplicate IDs and missing IDs,
  and a mixed existing/missing request must not partially delete the existing
  row.
- Admin needed selected-row deletion and clean-all actions on the real Login
  Logs page, guarded by `core:login-log:delete`, not another fixture-only
  control.
- Fixed-port, deploy and public smoke needed to prove guards, successful
  deletion, detail 404 after deletion, clean-all, empty list after clean,
  post-clean logging and the deployed Admin same-origin proxy route.

This stays inside the current S7 Security/System login-log boundary. It does
not introduce IP location enrichment, configurable failed-attempt threshold,
logout/mobile/SMS/social logging or session termination from the login-log
page in this round.

## Round 49 Audit: core.config/security-auth Configurable Attempt Limit

After Round 48, the next lower-dependency login-security gap was the failed
attempt threshold itself:

- RuoYi reads `user.password.maxRetryCount` and `user.password.lockTime` from
  runtime configuration in its password retry service, so both retry count and
  lock duration are operator-configurable policy values.
- OpenCore Round 46 made `auth.login.lockoutMinutes` runtime-readable and
  Round 47 consumed it in security-auth, but the retry count remained a
  hardcoded five-attempt baseline in the API policy provider.
- Yudao's login-log result modeling continues to justify keeping the
  lockout-result smoke in the login-log path, while the policy source belongs
  in `core.config`.
- The lowest dependency fix was not another login-log schema change; it was a
  runtime config key, DTO/OpenAPI/SDK/Admin propagation and a provider change
  in API composition.
- The runtime key needed strict guards for value type, public visibility and
  numeric range to avoid repeating loose deserialization failures.
- Fixed-port, deploy and public smoke needed to mutate the threshold and
  restore it, proving the product behavior rather than only checking a config
  row.
- Because stale frontend bundles have repeatedly broken login, the deploy
  script also needed a guard that rejects an Admin bundle missing the new login
  policy field or text.

This stays inside the current S7 System/Security login-policy boundary. It
does not introduce captcha verification, IP location enrichment,
logout/mobile/SMS/social login logging, session termination from the login-log
page, secret vault/KMS integration or broad feature-flag propagation.

## Round 55 Audit: core.notice Inbox Read-State

After Round 54, P0 was clear and the remaining P1 queue was config,
login-log and notice. The lowest-dependency visible product gap was
`core.notice`: management CRUD existed, but the product still lacked the
logged-in user's notification inbox and read/unread state.

- RuoYi-style notice usage includes header notification access, read status
  operations and read-user records around system notices.
- Yudao exposes the consumer side explicitly through notify message my-page,
  unread-list, unread-count, update-read and update-all-read APIs.
- OpenCore already had notice CRUD, publish/archive lifecycle, audience and
  validity-window fields, so this round did not need a new management surface.
- The missing foundation was persisted `(noticeId, userId)` read state plus
  consumer APIs that use the authenticated user rather than management
  permissions.
- The API routes needed to be registered before `notices/:id` so static inbox
  paths cannot be swallowed by dynamic notice detail routes.
- The input guards needed to reject malformed `readStatus`, empty arrays,
  duplicate ids, hidden drafts and missing notices before mutation, because
  repeated deserialization and route-shape regressions must become tests and
  smoke checks.
- Admin needed both the System Notices Inbox tab and a header unread badge, not
  another fixture-only page.
- Fixed-port, deploy and public smoke needed to prove the read/unread behavior
  from login through published notice, mark-read, idempotent repeat read and
  mark-all-read.

This stays inside the current S7 System notice boundary. It does not introduce
notification templates, delivery adapter configuration, WebSocket/mail/SMS
fan-out, tenant notices, BPM approval or full read-user analytics in this
round.

## Round 56 Audit: core.notice Read-User Analytics

After Round 55, `core.notice` had persisted read receipts and authenticated
inbox behavior, but managers still could not inspect which users had read a
notice.

- RuoYi-style notice management includes read-user records as a basic
  announcement verification surface.
- Yudao's notify-message APIs keep read state explicit, so exposing the same
  receipt data to managers is aligned with the reference shape without copying
  implementation.
- OpenCore already had `SystemNoticeReadReceipt`, inbox mark-read behavior,
  notice management CRUD and `core:notice:read`.
- The lowest-dependency loop was a management read-users API, SDK/Admin modal,
  OpenAPI update and smoke guard, not delivery templates or fan-out.
- The route needed to be registered before `notices/:id` so
  `:id/read-users` is not swallowed by the dynamic detail path.
- Seed and Prisma repository implementations both needed to use actual read
  receipts, not fixture-only rows.
- Fixed-port, deploy and public smoke needed to prove a missing notice returns
  404 and that a real authenticated mark-read creates a visible read-user row.

This stays inside the current S7 System notice boundary. It does not introduce
notification templates, delivery adapter configuration, WebSocket/mail/SMS
fan-out, tenant notices or BPM approval in this round.

## Round 57 Audit: core.login-log Structured Logout Actor/Reason

After Round 51, OpenCore had real online-user force logout logging, but it
carried successful logout operator context in `failureReason`. That was a
temporary schema workaround and conflicted with the clarified rule that old
wrong paths should be replaced directly instead of preserved for compatibility.

- RuoYi online-user force logout and Yudao token deletion both model successful
  token termination as an operator/security event, not as a failed login.
- OpenCore already had `logout.self`, `logout.force`, online-user session
  revocation, Login Logs Admin and export coverage.
- The lowest-dependency fix was a schema/API/Admin/SDK/smoke replacement:
  dedicated `actorUsername` and `reason` fields on login logs.
- `failureReason` remains reserved for failed login outcomes such as
  bad credentials, disabled users and account lockout.
- Monitor Online Users force-kick logging now writes actor/reason to the new
  fields and explicitly leaves `failureReason` undefined.
- Self logout writes the current username and `self logout` reason so all
  logout rows share the same structured shape.
- Admin needed actor server filtering and Actor/Reason list/detail/export
  visibility, not only backend fields.
- Fixed-port, deploy and public smoke needed to prove both self logout and
  force logout actor/reason, plus the absence of the old
  `failureReason` overload.
- The Prisma audit integration test no longer depends on a fixed seed failed
  login row, because seed drift has repeatedly created false failures.

This stays inside the current S7 Security/System login-log boundary. It does
not introduce IP geolocation, mobile/SMS/social login logging, session
termination from the Login Logs page or operation-log retention policy.

## Round 58 Audit: core.config Runtime Feature Flags

After Round 57, the remaining P1 foundation queue still included
`core.config`. Runtime title, lockout window and max-attempt policy were
already live, but feature toggles still existed only as an untyped future debt.

- RuoYi/Yudao config centers both justify runtime consumption of system config
  values, while OpenCore's current runtime endpoint already provided the right
  public delivery boundary.
- The lowest-dependency stage was not KMS, rollout percentage or
  experimentation; it was a strict public boolean `feature.*.enabled` map.
- The shape needed repository-level guards so operators cannot accidentally
  make runtime flags private, string-valued or malformed.
- Runtime reads needed to fail fast on bad feature-flag shape rather than
  silently deserializing unsafe values.
- Admin needed a visible Feature Flag column/filter/export field and a toggle
  for public boolean flags, not another hidden config row.
- Fixed-port, deploy and public smoke needed to create a dynamic feature flag,
  reject invalid create/update shapes, toggle it, and prove the runtime
  `featureFlags` map changes.
- The deploy script needed a stale Config bundle guard because stale frontend
  artifacts have repeatedly broken login and runtime-admin behavior.

This stays inside the current S7 System config-runtime boundary. It does not
introduce KMS/secret vault, percentage rollout, audience targeting,
multi-environment rollout governance or a full experimentation platform.

## Round 59 Audit: core.login-log IP Location Enrichment

After Round 57, `core.login-log` had corrected actor/reason semantics for
logout rows, but the reference login-log surface still lacked a visible and
filterable Location field.

- RuoYi login information management exposes login location as a normal
  security table/export field beside IP, browser and OS.
- Yudao persists user IP and user-agent as first-class login-log fields, which
  makes location enrichment a natural foundation layer.
- OpenCore already had IP, browser, OS, time-window filters, result schema,
  cleanup, lockout/unlock and logout actor/reason fields.
- The lowest-dependency loop was a deterministic location field derived from
  IP ranges, not a hidden external GeoIP provider.
- The migration needed to add a non-null `location` with safe backfill so
  existing login-log rows remain readable.
- Seed and Prisma repositories both needed to compute location at write time
  and support location filtering.
- Admin needed a Location column, detail field, export column and server-side
  location filter, not only a backend field.
- Fixed-port, deploy and public smoke needed to prove location detail, location
  filters, export columns and the deployed Login Logs chunk marker.
- The deploy script needed a stale Login Logs bundle guard because stale
  frontend artifacts have repeatedly broken login and security workflows.

This stays inside the current S7 Security/System login-log boundary. It does
not introduce external GeoIP provider integration, country/city databases,
mobile/SMS/social login logging or Login Logs page session termination.

## Round 60 Audit: core.notice Notification Templates

After Round 55/56, `core.notice` had a real inbox and management read-user
analytics, but notification templates were still listed as notice product
debt.

- Yudao's notify-template surface treats reusable notification content,
  extracted params, status and send/preview actions as first-class operator
  workflow.
- OpenCore already had notice CRUD, publish/archive lifecycle, read receipts,
  inbox APIs, read-user analytics and `core:notice:*` permissions.
- The lowest-dependency loop was persisted station-notice templates plus
  strict render/create-draft behavior, not WebSocket/mail/SMS delivery.
- The schema needed a dedicated `SystemNoticeTemplate` model instead of
  overloading notice rows or embedding template JSON in config.
- Parameter extraction needed to be deterministic and strict so missing,
  unexpected or malformed params fail before creating a notice.
- Body boolean inputs such as template `enabled` and create-from-template
  `pinned` needed explicit deserialization guards to avoid repeating runtime
  Prisma errors from loose payloads.
- Admin needed an actual `System Notice Templates` tab with template CRUD,
  render preview and `Create draft from template`, not a backend-only feature.
- Fixed-port, deploy and public smoke needed to prove seed template rendering,
  template CRUD, create-notice, deserialization guards, disabled-template
  blocking and deployed Admin chunk markers.
- The deploy script needed a stale System Notices bundle guard because stale
  frontend artifacts have repeatedly hidden newly deployed UI.

This stays inside the current S7 System notice boundary. It does not introduce
delivery adapter execution, WebSocket/mail/SMS fan-out, tenant notices, BPM
approval or member/mobile notification channels.

## Round 61 Audit: core.notice Delivery Records

After Round 60, `core.notice` had reusable notification templates, inbox read
state and read-user analytics, but it still lacked a durable per-recipient
delivery/message record.

- Yudao's notify-message surface keeps recipient message rows with read status
  and read time, separate from template management.
- OpenCore already had notice CRUD, publish/archive lifecycle, read receipts,
  inbox APIs, read-user analytics, templates and `core:notice:*` permissions.
- The lowest-dependency loop was persisted in-app delivery records plus
  idempotent dispatch and read sync, not WebSocket/mail/SMS provider execution.
- The schema needed a dedicated `SystemNoticeDelivery` model instead of
  overloading read receipts or notice rows.
- Publishing a notice needed to create delivery rows for eligible in-app
  recipients, while explicit dispatch needed to be idempotent for repair/retry
  workflows.
- Inbox mark-read and mark-all-read needed to update delivery `status/readAt`
  so operator-visible delivery records do not drift from user-facing read
  state.
- Seed delivery rows needed to resolve the actual admin user id by username,
  because existing databases may not still use the original seed id.
- Admin needed a real `Delivery records` modal and
  `Dispatch in-app deliveries` action, not a backend-only outbox.
- Fixed-port, deploy and public smoke needed to prove missing-notice guards,
  draft dispatch blocking, delivery `readStatus/channel` deserialization
  guards, unread/read records, idempotent dispatch, read sync and deployed
  Admin chunk markers.
- The deploy script needed a stale System Notices bundle guard for delivery UI
  markers because stale frontend artifacts have repeatedly hidden newly
  deployed workflows.

This stays inside the current S7 System notice boundary. It does not introduce
real WebSocket/mail/SMS provider adapter execution, multi-channel retry/failure
queues, tenant notices, BPM approval or member/mobile notification channels.

## Round 62 Audit: core.config Secret Vault

After Round 58, `core.config` had public runtime feature flags and mature
metadata/export/batch/system-policy behavior, but secret values were still only
protected at the response boundary.

- RuoYi/Yudao-style config management establishes operator-owned config rows;
  provider and integration surfaces imply credential-bearing config will exist
  as OpenCore grows.
- OpenCore already detected secret-like keys, required secret visibility,
  redacted API/Admin/export output and blocked value-by-key access for secret
  configs.
- The lowest-dependency loop was at-rest vault encryption for
  `visibility=secret`, not external KMS provider rotation or a full secret
  management product.
- The storage path needed to reuse the current `SystemConfig.value` boundary
  with a versioned envelope so existing config APIs and exports remain stable.
- Secret rows needed an `encrypted` status so operators can distinguish vault
  encrypted rows from any legacy secret rows while still never seeing the
  secret value.
- `prisma/seed.ts` and the seed repository needed to use the same storage
  helper; otherwise seeded secret references could silently bypass the vault.
- Admin needed a visible `Vault encrypted` state in list/detail/export/filter,
  not a backend-only security property.
- Fixed-port, deploy and public smoke needed to prove seeded secret redaction,
  value-by-key 403, temporary secret redaction, database envelope storage, no
  plaintext persistence, non-string secret guard and deployed Admin chunk
  markers.
- The deploy script needed a stale Config bundle guard for `Vault encrypted`
  because stale frontend artifacts have repeatedly hidden newly deployed
  workflows.

This stays inside the current S7 System config boundary. It does not introduce
external KMS/HSM provider binding, key rotation, secret version history,
secret access audit timelines or advanced feature-flag rollout.
