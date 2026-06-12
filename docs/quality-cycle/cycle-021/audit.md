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
