# cycle-021 Implementation Notes

Started: 2026-06-12 12:16:38 UTC

## Round 1 Capability

Capability: `core.notice` productization.

Goal: turn the existing package-owned system notice backend into a real
login-protected Admin operation loop with SDK/OpenAPI/Admin/permission/menu and
smoke coverage.

## Planned Acceptance

- `/api/core/notices/:id` read endpoint exists and is guarded by
  `core:notice:read`.
- SDK exposes list/detail/export/create/update/publish/archive/delete notice
  methods and typed request/response contracts.
- `core.notice` has Admin route metadata in module-registry.
- Admin route `/system/notices` is reachable from System, guarded by
  `canReadSystemNotices`, and uses live SDK calls.
- Admin page supports list/detail/current-page export and
  create/update/publish/archive/delete actions.
- Admin smoke locks the route/access/SDK integration.
- OpenAPI, registry routes and tests are refreshed.

## Initial Reference Points

- RuoYi: System notice list/detail/add/edit/remove plus seeded notice type/status
  dictionaries.
- Yudao: System notice page/detail/create/update/delete/push; push is not
  admitted for OpenCore in this round.

## OpenCore Boundary

No notice read-tracking, header badge, message bus, WebSocket, tenant scoping,
workflow or industry package is introduced in this slice.

## Implemented

- Added `GET /api/core/notices/:id`, guarded by `core:notice:read`, and
  refreshed the OpenAPI snapshot.
- Extended `@opencore/system` notice repository/service contracts with
  `getNotice` for seed and Prisma implementations.
- Extended `@opencore/sdk` with notice list/detail/export/create/update/
  publish/archive/delete methods, typed query/body contracts and registry
  fixtures.
- Added `core.notice` Admin metadata in module-registry and wired Admin route,
  access and shell registry for `/system/notices`.
- Added a live System Notices Admin page using `@opencore/sdk` and platform
  service methods for list/detail/current-page export plus create/update/
  publish/archive/delete actions.
- Extended Admin smoke checks to lock the route, access binding, shell registry
  entry, SDK lifecycle methods and page-level live integration.

## Verification

- `pnpm format:check` pass.
- `pnpm lint` pass. Existing non-failing Biome warnings remain in admin smoke
  template strings and `CurrentPageExportButton` regex style.
- `pnpm typecheck` pass.
- `pnpm test` pass.
- `pnpm build` pass after rerun; the first run hit a flaky Admin CSS loader
  failure, `pnpm build:admin` passed immediately, and the full build rerun
  passed with Nx flagging `admin:build` as flaky.
- `pnpm prisma:validate` pass.
- `pnpm test:api` pass.
- `NX_DAEMON=false pnpm nx test contracts` pass.
- `NX_DAEMON=false pnpm nx test module-registry` pass.
- `NX_DAEMON=false pnpm nx test sdk` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm openapi:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm test:admin` pass.

## Live Smoke

Against `http://127.0.0.1:3010/api` with the local seeded admin:

- `POST /api/auth/login` returned 201.
- `GET /api/core/notices?page=1&pageSize=5` returned 200.
- `POST /api/core/notices` returned 201 with a draft notice.
- `GET /api/core/notices/:id` returned 200 and matched the created id.
- `PATCH /api/core/notices/:id` returned 200 and updated `pinned=true`.
- `PATCH /api/core/notices/:id/publish` returned 200 and status `published`.
- `PATCH /api/core/notices/:id/archive` returned 200 and status `archived`.
- `DELETE /api/core/notices/:id` returned 200 with `deleted=true`.
- Final list returned 200.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Commit Record

- Feature commit:
  `8885103 feat(core-notice): productize system notice management / 产品化系统公告管理闭环`.
- Push: `origin/main` updated from `16a2858` to `8885103`.

## Round 2 Capability

Capability: `core.dept` productization.

Goal: turn the package-owned department backend into a real login-protected
Admin tree operation loop with SDK/OpenAPI/Admin/permission/menu and smoke
coverage.

## Round 2 Implemented

- Added `GET /api/core/depts/:id`, guarded by `core:dept:read`, and refreshed
  the OpenAPI snapshot.
- Extended `@opencore/system` department repository/service contracts with
  `getDept` for seed and Prisma implementations.
- Extended `@opencore/sdk` with department tree/detail/export/create/update/
  delete methods, typed query/body contracts and registry fixtures.
- Added `core.dept` Admin metadata in module-registry and wired Admin route,
  access and shell registry for `/system/depts`.
- Added a live Departments Admin page using `@opencore/sdk` and platform
  service methods for tree list/detail/current-page export plus create/update/
  delete actions.
- Extended Admin smoke checks to lock the route, access binding, shell registry
  entry, SDK lifecycle methods and page-level tree integration.

## Round 2 Verification

- `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=system,sdk,module-registry,api,admin`
  pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=system,sdk,module-registry,api`
  pass.
- `pnpm test:admin` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm openapi:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm sdk:check` pass.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm build && pnpm prisma:validate && pnpm test:api && NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export && pnpm openapi:registry-tags:check && pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check`
  pass.

## Round 2 Live Smoke

Against `http://127.0.0.1:3010/api` with the local seeded admin:

- `POST /api/auth/login` returned 201.
- `GET /api/core/depts` returned 200.
- `GET /api/core/depts/dept_engineering` returned 200.
- `POST /api/core/depts` created a parent department with 201.
- `POST /api/core/depts` created a child department with 201.
- `GET /api/core/depts/:id` returned 200 for the child.
- `PATCH /api/core/depts/:id` returned 200 and updated `enabled=false`.
- `DELETE /api/core/depts/:parentId` returned 400 while the child existed.
- `DELETE /api/core/depts/:childId` returned 200 with `deleted=true`.
- `DELETE /api/core/depts/:parentId` returned 200 with `deleted=true`.
- Final list returned 200.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Round 2 Commit Record

- Feature commit:
  `39d4943 feat(core-dept): productize department tree management / 产品化部门树管理闭环`.
- Push: `origin/main` updated from `b9b67fd` to `39d4943`.

## Round 3 Capability

Capability: `core.post` productization.

Goal: turn the package-owned post/position backend into a real
login-protected Admin operation loop with SDK/OpenAPI/Admin/permission/menu and
smoke coverage.

## Round 3 Implemented

- Added `GET /api/core/posts/:code`, guarded by `core:post:read`, and
  refreshed the OpenAPI snapshot.
- Extended `@opencore/system` post repository/service contracts with `getPost`
  for seed and Prisma implementations.
- Extended `@opencore/sdk` with post list/detail/export/create/update/delete
  methods, typed query/body contracts and registry fixtures.
- Added `core.post` Admin metadata in module-registry and wired Admin route,
  access and shell registry for `/system/posts`.
- Added a live Posts Admin page using `@opencore/sdk` and platform service
  methods for list/detail/current-page export plus create/update/delete
  actions.
- Extended Admin smoke checks to lock the route, access binding, shell registry
  entry, SDK lifecycle methods and page-level live integration.

## Round 3 Verification

- `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=system,sdk,module-registry,api,admin`
  pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=system,sdk,module-registry,api`
  pass.
- `pnpm test:admin` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm openapi:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm sdk:check` pass.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm build && pnpm prisma:validate && pnpm test:api && NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export && pnpm openapi:registry-tags:check && pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check`
  pass.

## Round 3 Live Smoke

Against `http://127.0.0.1:3010/api` with the local seeded admin:

- `POST /api/auth/login` returned 201.
- `GET /api/core/posts?page=1&pageSize=20` returned 200.
- `GET /api/core/posts/engineer` returned 200.
- `POST /api/core/posts` created a smoke post with 201.
- `GET /api/core/posts/:code` returned 200 for the created post.
- `PATCH /api/core/posts/:code` returned 200 and updated `enabled=false`.
- `GET /api/core/posts/export?enabled=false` returned 200.
- `DELETE /api/core/posts/:code` returned 200 with `deleted=true`.
- `GET /api/core/posts/:code` returned 404 after deletion.
- Final list returned 200.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Round 3 Commit Record

- Feature commit:
  `92d358b feat(core-post): productize post management / 产品化岗位管理闭环`.
- Push: `origin/main` updated from `f35cc88` to `92d358b`.

## Round 4 Capability

Capability: `core.menu` productization.

Goal: turn the existing package-owned flat menu runtime into a real
login-protected Admin operation loop with API detail, SDK, OpenAPI, Admin page
and smoke coverage.

## Round 4 Implemented

- Added `GET /api/core/menus/:key`, guarded by `core:menu:read`, and refreshed
  the OpenAPI snapshot.
- Extended `@opencore/system` menu repository/service contracts with `getMenu`
  for seed and Prisma implementations.
- Extended `@opencore/sdk` with menu detail support and nullable
  `permissionCode` updates.
- Replaced the read-only Admin Menus registry fixture with a live page using
  `@opencore/sdk` and platform service methods for list/detail/current-page
  export plus create/update/delete actions.
- Extended Admin smoke checks to lock SDK-backed menu lifecycle methods and
  page-level live integration.

## Round 4 Verification

- `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=system,sdk,api,admin`
  pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=system,sdk,api` pass.
- `pnpm test:admin` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm openapi:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm sdk:check` pass.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm build:admin` pass after the first full `pnpm build` attempt hit the
  known intermittent Umi/Utoopack CSS loader failure on
  `Dashboard/index.less`; Nx marked `admin:build` as flaky.
- `pnpm build && pnpm prisma:validate && pnpm test:api && NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export && pnpm openapi:registry-tags:check && pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check`
  pass on rerun.

## Round 4 Live Smoke

Against `http://127.0.0.1:3010/api` with the local seeded admin:

- `POST /api/auth/login` returned 201.
- `GET /api/core/menus` returned 200.
- `GET /api/core/menus/system.menus` returned 200.
- `POST /api/core/menus` created a smoke menu with 201.
- `GET /api/core/menus/:key` returned 200 for the created menu.
- `PATCH /api/core/menus/:key` returned 200 and cleared `permissionCode` with
  `null`.
- `GET /api/core/menus/export` returned 200.
- `DELETE /api/core/menus/:key` returned 200 with `deleted=true`.
- `GET /api/core/menus/:key` returned 404 after deletion.
- Final list returned 200.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Round 4 Commit Record

- Feature commit:
  `34e35c7 feat(core-menu): productize system menu management / 产品化系统菜单管理闭环`.
- Push: `origin/main` updated from `79c5583` to `34e35c7`.

## Round 5 Capability

Capability: `core.role` productization.

Goal: turn the existing package-owned role runtime into a real login-protected
Admin operation loop with API detail, SDK data-scope alignment, OpenAPI, Admin
page and smoke coverage.

## Round 5 Implemented

- Added `GET /api/core/roles/:code`, guarded by `core:role:read`, and
  refreshed the OpenAPI snapshot.
- Extended `@opencore/system` role repository/service contracts with `getRole`
  for seed and Prisma implementations.
- Extended `@opencore/sdk` with role detail support plus `RoleDataScope`,
  `dataScope` and `dataScopeDeptIds` fields on role types.
- Replaced the read-only Admin Roles fixture with a live page using
  `@opencore/sdk` and platform service methods for list/detail/current-page
  export plus create/update/delete actions.
- Added custom data-scope department selection using the existing department
  tree runtime and guarded system-role deletion in Admin.
- Extended Admin smoke checks to lock SDK-backed role lifecycle methods and
  page-level live integration.

## Round 5 Verification

- `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=system,sdk,api,admin`
  pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=system,sdk,api` pass.
- `pnpm test:admin` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm openapi:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm sdk:check` pass.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm build && pnpm prisma:validate && pnpm test:api && NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export && pnpm openapi:registry-tags:check && pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check`
  pass.

## Round 5 Live Smoke

Against `http://127.0.0.1:3010/api` with the local seeded admin:

- `POST /api/auth/login` returned 201.
- `GET /api/core/roles` returned 200.
- `GET /api/core/roles/admin` returned 200.
- `POST /api/core/roles` created a smoke role with custom data scope and 201.
- `GET /api/core/roles/:code` returned 200 for the created role.
- `PATCH /api/core/roles/:code` returned 200 and updated permissions plus
  `dataScope=self`.
- `GET /api/core/roles/export` returned 200.
- `DELETE /api/core/roles/admin` returned 400, proving system-role delete
  protection.
- `DELETE /api/core/roles/:code` returned 200 with `deleted=true`.
- `GET /api/core/roles/:code` returned 404 after deletion.
- Final list returned 200.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Round 5 Commit Record

- Feature commit:
  `7ca8b2f feat(core-role): productize role management / 产品化角色管理闭环`.
- Push: `origin/main` updated from `4269cb4` to `7ca8b2f`.

## Round 6 Capability

Capability: `core.permission` productization.

Goal: turn the existing persisted RBAC permission catalog into a real
login-protected Admin operation loop with API detail, SDK system/custom
metadata, OpenAPI, Admin page and smoke coverage, while protecting registry
permissions from destructive mutation.

## Round 6 Implemented

- Added `GET /api/core/permissions/:code`, guarded by `core:permission:read`,
  and refreshed the OpenAPI snapshot.
- Added `system` metadata to permission summaries across API DTOs, seed data,
  Prisma mapping, SDK types and registry fixtures.
- Normalized permission create/update input and protected registry-seeded
  permissions from update/delete in seed and Prisma repositories.
- Replaced the read-only Admin Permissions fixture with a live page using
  `@opencore/sdk` and platform service methods for list/detail/current-page
  export plus custom create/update/delete actions.
- Updated the live Admin Roles page to load permission options from the
  permission API, so custom permissions can be assigned after creation.
- Extended Admin smoke checks to lock SDK-backed permission lifecycle methods
  and page-level live integration.

## Round 6 Verification

- `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=sdk,api,admin`
  pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=sdk,api` pass.
- `pnpm test:admin` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm openapi:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm sdk:check` pass.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm build && pnpm prisma:validate && pnpm test:api && NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export && pnpm openapi:registry-tags:check && pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check`
  pass.

## Round 6 Live Smoke

Against `http://127.0.0.1:3010/api` with the local seeded admin:

- `POST /api/auth/login` returned 201.
- `GET /api/core/permissions` returned 200 and included
  `core:permission:read` with `system=true`.
- `GET /api/core/permissions/core%3Apermission%3Aread` returned 200.
- `POST /api/core/permissions` created a custom smoke permission with 201 and
  `system=false`.
- `GET /api/core/permissions/:code` returned 200 for the created permission.
- `PATCH /api/core/permissions/:code` returned 200 and updated the title.
- `GET /api/core/permissions/export` returned 200 and included the `system`
  column.
- `PATCH /api/core/permissions/core%3Apermission%3Aread` returned 400, proving
  system-permission update protection.
- `DELETE /api/core/permissions/core%3Apermission%3Aread` returned 400,
  proving system-permission delete protection.
- `DELETE /api/core/permissions/:code` returned 200 with `deleted=true`.
- `GET /api/core/permissions/:code` returned 404 after deletion.
- Final list returned 200 and no longer contained the smoke permission.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Round 6 Commit Record

- Feature commit:
  `680b578 feat(core-permission): productize permission management / 产品化权限管理闭环`.
- Push: `origin/main` updated from `1ad577b` to `680b578`.

## Round 7 Capability

Capability: `core.user` productization.

Goal: turn the existing package-owned user runtime into a real login-protected
Admin operation loop with API detail, SDK dept/system alignment, OpenAPI, Admin
page and smoke coverage, while protecting the seeded administrator from
destructive user-management mutation.

## Round 7 Implemented

- Added `GET /api/core/users/:id`, guarded by `core:user:read`, and refreshed
  the OpenAPI snapshot.
- Extended `@opencore/system` user repository/service contracts with `getUser`
  for seed and Prisma implementations.
- Added `system` metadata to user summaries and protected seeded admin users
  from update/delete in seed and Prisma repositories.
- Extended `@opencore/sdk` with user detail support plus `deptId` and `system`
  user fields.
- Replaced the read-only Admin Users fixture with a live page using
  `@opencore/sdk` and platform service methods for list/detail/current-page
  export plus create/update/delete actions.
- Added role-code multi-select and department tree selection using the admitted
  role and department runtimes.
- Extended Admin smoke checks to lock SDK-backed user lifecycle methods and
  page-level live integration.

## Round 7 Verification

- `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=system,sdk,api,admin`
  pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=system,sdk,api` pass.
- `pnpm test:admin` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:check` pass.
- `pnpm sdk:check` pass.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm build && pnpm prisma:validate && pnpm test:api && NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export && pnpm openapi:registry-tags:check && pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check`
  pass.

## Round 7 Live Smoke

Against `http://127.0.0.1:3010/api` with the local seeded admin:

- `GET /api/live` returned 200.
- `GET /api/ready` returned 200.
- `GET /api/docs-json` returned 200.
- `POST /api/auth/login` returned 201.
- `GET /api/core/users` returned 200.
- `GET /api/core/users/:adminId` returned 200 for the seeded administrator.
- `POST /api/core/users` created a smoke user with 201.
- `GET /api/core/users/:id` returned 200 for the created user.
- `PATCH /api/core/users/:id` returned 200 and updated the created user.
- `GET /api/core/users/export` returned 200.
- `PATCH /api/core/users/:adminId` returned 400, proving seeded-admin update
  protection.
- `DELETE /api/core/users/:adminId` returned 400, proving seeded-admin delete
  protection.
- `DELETE /api/core/users/:id` returned 200 with `deleted=true`.
- `GET /api/core/users/:id` returned 404 after deletion.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Round 7 Commit Record

- Feature commit:
  `88c428f feat(core-user): productize user management / 产品化用户管理闭环`.
- Push: `origin/main` updated from `7d1d32f` to `88c428f`.

## Round 8 Capability

Capability: `core.dict` productization.

Goal: turn the existing package-owned dictionary runtime into a real
login-protected Admin operation loop with API detail, SDK detail support,
OpenAPI, Admin page and smoke coverage, while keeping the current embedded-item
dictionary model.

## Round 8 Implemented

- Added `GET /api/core/dicts/:code`, guarded by `core:dict:read`, and
  refreshed the OpenAPI snapshot.
- Extended `@opencore/system` dictionary repository/service contracts with
  `getDict` for seed and Prisma implementations.
- Extended `@opencore/sdk` with dictionary detail support and tests.
- Replaced the read-only Admin Dictionaries fixture with a live page using
  `@opencore/sdk` and platform service methods for list/detail/current-page
  export plus create/update/delete actions.
- Added embedded dictionary item editing in the create/update form, including
  deterministic item ID generation when operators leave item IDs blank.
- Extended Admin smoke checks to lock SDK-backed dictionary lifecycle methods,
  item editing, bounded filtering and current-page export behavior.

## Round 8 Verification

- `pnpm exec tsc --noEmit -p packages/system/tsconfig.lib.json` pass.
- `pnpm exec tsc --noEmit -p packages/sdk/tsconfig.lib.json` pass.
- `NX_DAEMON=false pnpm nx run admin:typecheck` pass.
- `NX_DAEMON=false pnpm nx run api:typecheck` pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=system,sdk,api` pass.
- `pnpm test:admin && pnpm openapi:export && pnpm openapi:check && pnpm sdk:check`
  pass after moving dictionaries out of the legacy read-only Admin smoke bucket.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` pass.
- `pnpm build && pnpm prisma:validate && pnpm test:api && NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export && pnpm openapi:registry-tags:check && pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check`
  pass.

## Round 8 Live Smoke

Against the temporary local API on port 3010:

- `GET /health/live` returned 200.
- `GET /health/ready` returned 200.
- `GET /api/docs-json` returned 200.
- `POST /api/auth/login` returned 201.
- `GET /api/core/dicts` returned 200.
- `GET /api/core/dicts/system.status` returned 200 for seeded dictionary
  detail.
- `POST /api/core/dicts` created a smoke dictionary with 201.
- `GET /api/core/dicts/:code` returned 200 for the created dictionary.
- `PATCH /api/core/dicts/:code` returned 200 and updated the created
  dictionary.
- `GET /api/core/dicts/export` returned 200.
- `DELETE /api/core/dicts/:code` returned 200 with `deleted=true`.
- `GET /api/core/dicts/:code` returned 404 after deletion.

The temporary 3010 API process was stopped after smoke verification; the
pre-existing 3000 process was left running.

## Round 8 Commit Record

- Feature commit:
  `52b3bbe feat(core-dict): productize dictionary management / 产品化字典管理闭环`.
- Push: `origin/main` updated from `f891c39` to `52b3bbe`.

## Round 9 Capability

Capability: `core.config` productization plus scripted deploy/smoke path.

Goal: turn the existing package-owned system config runtime into a real
login-protected Admin operation loop with API detail, SDK detail support,
OpenAPI, Admin page and smoke coverage, while making local smoke/deploy use
fixed uncommon ports and stable Admin production builds.

## Round 9 Implemented

- Added `GET /api/core/config/:key`, guarded by `core:config:read`, and
  refreshed the OpenAPI snapshot.
- Extended `@opencore/system` config repository/service contracts with
  `getConfig` for seed and Prisma implementations.
- Extended `@opencore/sdk` with config detail support and tests.
- Replaced the read-only Admin Config fixture with a live page using
  `@opencore/sdk` and platform service methods for list/detail/current-page
  export plus create/update/delete actions.
- Preserved secret redaction in list/detail/edit flows: secret values render as
  `[redacted]`, detail marks value as sensitive and edit updates omit unchanged
  redacted secret values.
- Added `pnpm smoke:api:local` on fixed port `39173` and `pnpm deploy:opencore`
  on fixed API/Admin ports `39172`/`39174`.
- Added an authenticated config smoke script covering health, docs, login,
  list, create, detail, update, export, secret-redaction and delete cleanup.
- Added a lightweight Admin static server for deployed `apps/admin/dist`.
- Forced Admin production builds to use stable Umi webpack by default and
  documented that OpenCore deploys must not enable `FORCE_UTOOPACK`.
- Added `esbuildMinifyIIFE: true` for webpack builds to avoid Umi
  `esbuildHelperChecker` helper-name conflicts after compilation.
- Documented the fixed local deploy path in
  `docs/deployment/opencore-local-deploy.md`.

## Round 9 Verification

- Focused typecheck pass:
  `pnpm exec tsc --noEmit -p packages/system/tsconfig.lib.json`,
  `pnpm exec tsc --noEmit -p packages/sdk/tsconfig.lib.json`,
  `NX_DAEMON=false pnpm nx run admin:typecheck`,
  `NX_DAEMON=false pnpm nx run api:typecheck`.
- Focused tests pass:
  `NX_DAEMON=false pnpm nx run-many -t test --projects=system,sdk,api`.
- `pnpm test:admin`, `pnpm openapi:export`, `pnpm openapi:check` and
  `pnpm sdk:check` pass.
- Script syntax checks pass:
  `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
  and `node --check tools/scripts/smoke-core-config.mjs && node --check tools/scripts/serve-admin-static.mjs`.
- Full gates pass: `pnpm format:check && pnpm lint && pnpm typecheck &&
pnpm test`; `pnpm build && pnpm prisma:validate && pnpm test:api &&
NX_DAEMON=false pnpm nx test contracts && NX_DAEMON=false pnpm nx test
module-registry && NX_DAEMON=false pnpm nx test sdk && pnpm openapi:export &&
pnpm openapi:registry-tags:check && pnpm openapi:check &&
pnpm registry:admin-routes:check && pnpm test:admin && pnpm sdk:check &&
pnpm smoke:api:local`.
- `pnpm build:admin` pass after webpack stabilization and emits the
  `/system/config` static route.
- `pnpm smoke:api:local` pass on fixed port `39173` and stops the temporary API
  after the smoke sequence.

## Round 9 Live Smoke

Against the scripted temporary local API on fixed port `39173`:

- `GET /health/live` returned 200.
- `GET /health/ready` returned 200.
- `GET /api/docs-json` returned 200.
- `POST /api/auth/login` returned 201 with a seeded admin.
- `GET /api/core/config` returned 200.
- `POST /api/core/config` created a smoke config with 201.
- `GET /api/core/config/:key` returned 200 for the created config.
- `PATCH /api/core/config/:key` returned 200 and updated the created config.
- `GET /api/core/config/export` returned 200 with `current-page` scope.
- `POST /api/core/config` created a secret smoke config and returned
  `[REDACTED]`.
- `GET /api/core/config/:secretKey` returned `[REDACTED]`, proving detail
  redaction.
- `DELETE /api/core/config/:key` cleanup returned 200/404-safe cleanup.

The temporary `39173` API process was stopped after smoke verification.

## Round 9 Commit Record

- Feature commit:
  `2dbf5aa feat(core-config): productize config management and deploy path / 产品化系统参数管理与部署路径`.
- Push: `origin/main`.
