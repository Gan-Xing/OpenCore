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

## Round 10 Capability

Capability: `core.file` productization plus public Admin deployment.

Goal: turn the existing package-owned file asset metadata runtime into a real
login-protected Admin operation loop with API detail, SDK detail support,
OpenAPI, Admin page and smoke coverage, while making the deployed Admin
reachable from outside the server on the fixed deploy port.

## Round 10 Implemented

- Added `GET /api/core/files/:id`, guarded by `core:file:read`, and refreshed
  the OpenAPI snapshot.
- Extended system-management repository contracts with `getFile` for seed and
  Prisma implementations.
- Extended `@opencore/sdk` with typed file detail support and tests.
- Replaced the read-only Admin File Center fixture with a live page using
  `@opencore/sdk` and platform service methods for list/detail/current-page
  export plus metadata create/update/delete actions.
- Kept file editing scoped to metadata fields admitted by the current API:
  original name, MIME type, checksum and uploader; size is create-only.
- Extended Admin smoke checks to lock SDK-backed file lifecycle methods,
  bounded current-page filtering and current-page export behavior.
- Added `tools/scripts/smoke-core-file.mjs` and wired it into
  `pnpm smoke:api:local` and `pnpm deploy:opencore`.
- Updated the deploy script so Admin binds to `0.0.0.0`, uses the detected
  server public host for the browser API base URL and prints the public Admin
  URL after deployment.

## Round 10 Verification

- Script syntax checks pass:
  `bash -n tools/scripts/deploy-local-opencore.sh tools/scripts/run-local-api-smoke.sh`
  and
  `node --check tools/scripts/smoke-core-file.mjs && node --check tools/scripts/smoke-core-config.mjs && node --check tools/scripts/serve-admin-static.mjs`.
- Focused typecheck pass:
  `pnpm exec tsc --noEmit -p packages/sdk/tsconfig.lib.json`,
  `NX_DAEMON=false pnpm nx run api:typecheck` and
  `NX_DAEMON=false pnpm nx run admin:typecheck`.
- Focused tests pass:
  `NX_DAEMON=false pnpm nx run-many -t test --projects=api,sdk`.
- `pnpm test:admin`, `pnpm openapi:export`, `pnpm openapi:check` and
  `pnpm sdk:check` pass.
- Full gates pass: `bash -n tools/scripts/run-local-api-smoke.sh
tools/scripts/deploy-local-opencore.sh && node --check
tools/scripts/smoke-core-file.mjs && pnpm format:check && pnpm lint &&
pnpm typecheck && pnpm test`; `pnpm build && pnpm prisma:validate &&
pnpm test:api && NX_DAEMON=false pnpm nx test contracts &&
NX_DAEMON=false pnpm nx test module-registry && NX_DAEMON=false pnpm nx test
sdk && pnpm openapi:export && pnpm openapi:registry-tags:check &&
pnpm openapi:check && pnpm registry:admin-routes:check && pnpm test:admin &&
pnpm sdk:check && pnpm smoke:api:local`.
- Deployed API smoke against `http://127.0.0.1:39172` pass for file metadata:
  health, login, list, create, detail, update, export and delete cleanup.
- Public frontend checks pass at `http://144.217.243.161:39174/`, and Admin
  now serves `/system/files/index.html` from the deployed build.

## Round 10 Live Smoke

Against the scripted temporary local API on fixed port `39173`:

- `GET /health/live` returned 200.
- `GET /health/ready` returned 200.
- `GET /api/docs-json` returned 200.
- `POST /api/auth/login` returned 201 with a seeded admin.
- `GET /api/core/files` returned 200.
- `POST /api/core/files` created a smoke file asset with 201.
- `GET /api/core/files/:id` returned 200 for the created file asset.
- `PATCH /api/core/files/:id` returned 200 and updated checksum/uploader
  metadata.
- `GET /api/core/files/export` returned 200 with `current-page` scope.
- `DELETE /api/core/files/:id` returned 200 with `deleted=true`.
- `GET /api/core/files/:id` returned 404 after deletion.

The temporary `39173` API process was stopped after smoke verification.

## Round 10 Commit Record

- Feature commit:
  `097979c feat(core-file): productize file asset management / 产品化文件资产管理`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 11 Capability

Capability: `core.login-log` productization plus Admin API base deploy
hardening.

Goal: turn the existing login-log audit runtime into a real login-protected
Admin diagnostic loop with API detail, SDK detail support, OpenAPI, Admin page
and smoke coverage, while permanently blocking the deployed frontend regression
where login POSTs fall through to the Admin static server and return HTTP 405.

## Round 11 Implemented

- Added `GET /api/core/login-logs/:id`, guarded by `core:login-log:read`, and
  refreshed the OpenAPI snapshot.
- Extended `@opencore/audit` login-log repository/service contracts with
  `getLoginLog` for seed and Prisma implementations.
- Extended `@opencore/sdk` with `LoginLogQueryRequest`, typed list/export query
  support and `getLoginLog`.
- Replaced the fixture-only Admin Login Logs page with a live read-only page
  using `@opencore/sdk` and platform service methods for list/detail/current-
  page export.
- Kept fallback fixtures only for API-unavailable page rendering; normal
  logged-in use reads real audit rows.
- Added `tools/scripts/smoke-core-login-log.mjs` and wired it into
  `pnpm smoke:api:local` and `pnpm deploy:opencore`.
- Updated Admin config so `process.env.ADMIN_API_BASE_URL` is defined into the
  browser bundle during production builds.
- Hardened deploy so it fails if the built Admin JavaScript does not contain
  the configured public API base URL.
- Added Admin static-server `/api/*` proxy plus deploy-time same-origin
  `/api/auth/login` smoke, so relative API POSTs cannot return the static
  server's 405.

## Round 11 Verification

- Script syntax checks pass:
  `node --check tools/scripts/serve-admin-static.mjs &&
node --check tools/scripts/smoke-core-login-log.mjs &&
node --check apps/admin/scripts/smoke-test.mjs` and
  `bash -n tools/scripts/deploy-local-opencore.sh tools/scripts/run-local-api-smoke.sh`.
- `pnpm test:admin` pass after Admin smoke locked live login-log service/page
  behavior and `ADMIN_API_BASE_URL` bundle exposure.
- `FORCE_UTOOPACK= OPENCORE_ADMIN_BUNDLER=webpack ADMIN_API_BASE_URL=http://144.217.243.161:39172/api pnpm build:admin`
  pass and emits `apps/admin/dist/umi.c9abe7a3.js`.
- `rg -l --fixed-strings "http://144.217.243.161:39172/api" apps/admin/dist -g '*.js'`
  returns `apps/admin/dist/umi.c9abe7a3.js`, proving the deployed browser bundle
  will not use a relative `/api` base.
- Full gate pass:
  `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test &&
pnpm openapi:check && pnpm sdk:check && pnpm smoke:api:local`.
- `pnpm smoke:api:local` pass on fixed port `39173` for config, file metadata
  and login-log audit checks.

## Round 11 Live Smoke

Against the scripted temporary local API on fixed port `39173`:

- `GET /health/live` returned 200.
- `GET /health/ready` returned 200.
- `GET /api/docs-json` returned 200 during config smoke.
- `POST /api/auth/login` returned 201 with the seeded admin.
- `GET /api/core/login-logs` returned 200.
- A failed login using a generated username returned 401/403.
- `GET /api/core/login-logs?username=<generated>&success=false` returned the
  recorded failed-login row.
- `GET /api/core/login-logs/:id` returned 200 for that failed-login row.
- `GET /api/core/login-logs/export?username=<generated>&success=false`
  returned `current-page` export preview.

The temporary `39173` API process was stopped after smoke verification.

## Round 11 Commit Record

- Feature commit:
  `40d879c feat(core-login-log): productize login log audit trail / 产品化登录日志审计链路`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 12 Capability

Capability: `core.audit-log` productization plus Admin API origin deploy guard.

Goal: turn the existing operation-log audit runtime into a real
login-protected Admin read-only audit loop with API detail, SDK detail support,
OpenAPI, Admin page and smoke coverage, while permanently blocking the deployed
frontend regression where an `/api`-suffixed Admin API base produces
`/api/api/auth/login`.

## Round 12 Implemented

- Added `GET /api/core/audit-logs/:id`, guarded by `core:audit-log:read`, and
  refreshed the OpenAPI snapshot.
- Extended `@opencore/audit` operation-log repository/service contracts with
  `getOperationLog` for seed and Prisma implementations.
- Extended `@opencore/sdk` with `AuditLogQueryRequest`, typed list/export query
  support and `getAuditLog`.
- Replaced the fixture-only Admin Operation Logs page with a live read-only
  page using `@opencore/sdk` and platform service methods for list/detail/
  current-page export.
- Kept fallback fixtures only for API-unavailable page rendering; normal
  logged-in use reads real operation audit rows.
- Added `tools/scripts/smoke-core-audit-log.mjs` and wired it into
  `pnpm smoke:api:local` and `pnpm deploy:opencore`.
- The operation-log smoke creates a temporary config through
  `POST /api/core/config`, waits for the audit interceptor to record the write
  operation, reads detail, exports filtered rows and deletes the temporary
  config.
- Hardened `pnpm deploy:opencore` so `ADMIN_API_BASE_URL` defaults to the API
  origin without `/api` and deployment fails if an `/api`-suffixed value would
  cause browser requests like `/api/api/auth/login`.
- Updated deployment docs to state that `OPENCORE_DEPLOY_ADMIN_API_BASE_URL`
  must be an API origin, for example `http://144.217.243.161:39172`.

## Round 12 Verification

- Script checks pass:
  `node --check tools/scripts/smoke-core-audit-log.mjs` and
  `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`.
- Focused typecheck pass:
  `pnpm exec tsc --noEmit -p packages/audit/tsconfig.lib.json`,
  `pnpm exec tsc --noEmit -p packages/sdk/tsconfig.lib.json`,
  `NX_DAEMON=false pnpm nx run api:typecheck` and
  `NX_DAEMON=false pnpm nx run admin:typecheck`.
- Focused tests pass:
  `NX_DAEMON=false pnpm nx run-many -t test --projects=audit,api,sdk`.
- `pnpm test:admin`, `pnpm openapi:export`, `pnpm openapi:check` and
  `pnpm sdk:check` pass.
- Full gate pass: `pnpm format:check && pnpm lint && pnpm typecheck &&
pnpm test && pnpm openapi:registry-tags:check &&
pnpm registry:admin-routes:check && pnpm smoke:api:local`.
- `pnpm build && pnpm prisma:validate` pass.
- `pnpm deploy:opencore` pass and deploys API/Admin on fixed ports
  `39172`/`39174`.
- Public login checks pass:
  `http://144.217.243.161:39172/api/auth/login` returns 201,
  `http://144.217.243.161:39174/api/auth/login` returns 201, and the deployed
  Admin bundle contains `http://144.217.243.161:39172` without
  `http://144.217.243.161:39172/api`.

## Round 12 Live Smoke

Against the scripted temporary local API on fixed port `39173`:

- `GET /health/live` returned 200.
- `GET /health/ready` returned 200.
- `GET /api/docs-json` returned 200 during config smoke.
- `POST /api/auth/login` returned 201 with the seeded admin.
- `GET /api/core/audit-logs` returned 200.
- `POST /api/core/config` created a temporary smoke config with 201.
- `GET /api/core/audit-logs?action=POST&resource=/api/core/config` returned
  the recorded write-operation row.
- `GET /api/core/audit-logs/:id` returned 200 for that operation-log row.
- `GET /api/core/audit-logs/export?action=POST&resource=/api/core/config`
  returned `current-page` export preview.
- `DELETE /api/core/config/:key` cleaned up the temporary config.

The temporary `39173` API process was stopped after smoke verification.

## Round 12 Commit Record

- Feature commit:
  `26c4e1c feat(core-audit-log): productize operation audit trail / 产品化操作审计日志链路`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 13 Capability

Capability: `monitor.online-user` productization plus stale Admin login guard.

Goal: turn the existing online-user runtime into a real login-protected Admin
monitoring loop with live list/detail/current-page export and permission-gated
kick-out, while keeping stale browser tabs from failing login through
`/api/api/auth/login`.

## Round 13 Implemented

- Preserved two active seed online sessions so smoke can revoke
  `session_operator` without revoking `session_admin`.
- Updated online-user package, API operation summary test and SDK fixtures to
  reflect the two-session seed state.
- Added online-user methods to the Admin platform service and
  `canManageOnlineUsers` to Admin access.
- Replaced the fixture-only Admin Online Users page with a live page using the
  Operations SDK client for list, detail and kick-out.
- Added current-page filters/export, reload, detail drawer, sensitive token and
  revocation fields, and a disabled/already-revoked state for kick-out.
- Added `tools/scripts/smoke-core-online-user.mjs` and wired it into
  `pnpm smoke:api:local` and `pnpm deploy:opencore`.
- Hardened the Admin static server to serve a no-store retired
  `/service-worker.js`, avoid caching runtime manifests/scripts and normalize
  stale `/api/api/*` proxy requests to `/api/*`.
- Hardened deploy with a public Admin bundle check that fetches the live login
  HTML, current `umi.*.js` and retired service worker endpoint after startup.

## Round 13 Verification

- Runtime stale-login verification pass on a temporary Admin static port:
  `/service-worker.js` returns `no-store` JavaScript containing
  `self.registration.unregister`, and both `/api/auth/login` and
  `/api/api/auth/login` return 201 through the Admin proxy.
- `pnpm test:admin` pass after Admin smoke locked live online-user service/page
  behavior and deploy/static-server guards.
- Full gate pass: `pnpm format:check && pnpm lint && pnpm typecheck &&
pnpm test && pnpm openapi:export && pnpm openapi:check && pnpm sdk:check &&
pnpm openapi:registry-tags:check && pnpm registry:admin-routes:check &&
pnpm smoke:api:local && pnpm build && pnpm prisma:validate`.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  online-user list, detail, kick-out, repeat-kick rejection and admin-session
  preservation.

## Round 13 Live Smoke

Against the scripted temporary local API on fixed port `39173`:

- `GET /health/live` returned 200.
- `GET /health/ready` returned 200.
- `POST /api/auth/login` returned 201 with the seeded admin.
- `GET /api/monitor/online-users` returned the seeded admin and operator
  sessions.
- `GET /api/monitor/online-users/session_operator` returned 200.
- `POST /api/monitor/online-users/session_operator/kick-out` returned 200 and
  set revocation metadata.
- Repeating the same kick-out returned 400.
- `GET /api/monitor/online-users?active=false` returned the revoked operator
  session.
- `GET /api/monitor/online-users?username=admin&active=true` confirmed the
  admin session remains active.

The temporary `39173` API process was stopped after smoke verification.

## Round 13 Commit Record

- Feature commit:
  `0381de1 feat(monitor-online-user): productize online sessions / 产品化在线会话管理`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 14 Capability

Capability: `monitor.online-user` revocation productization.

Goal: close the Round 13 thin loop by making kick-out revoke real bearer
sessions, adding batch kick-out and surfacing browser/OS metadata through
API/SDK/Admin/smoke.

## Round 14 Implemented

- Added bearer token IDs (`jti`) and exposed token expiry from
  `@opencore/security`.
- Added `SecurityAuthSessionRepository` and wired auth login/session creation
  to register online-session records.
- Made bearer authentication check the online-session repository so revoked or
  expired sessions are rejected.
- Implemented online-user session registration, active-session assertion and
  batch kick-out in seed and Prisma repositories.
- Added browser/OS parsing from user-agent strings and surfaced those fields in
  online-user DTOs, SDK types, fixtures and Admin detail/export/table flows.
- Added `POST /api/monitor/online-users/kick-out`, guarded by
  `monitor:online-user:manage`.
- Added selected-row batch kick-out to the Admin Online Users page.
- Extended online-user smoke to log in twice, find the second login by token
  ID, batch-kick that real session and verify the kicked token receives 401 on
  `/api/auth/me`.

## Round 14 Verification

- `pnpm install --lockfile-only` pass; lockfile diff is limited to the
  `@opencore/online-user` dependency on `@opencore/security`.
- Script checks pass:
  `node --check tools/scripts/smoke-core-online-user.mjs` and
  `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`.
- Focused tests pass:
  `NX_DAEMON=false pnpm nx test security --runInBand`,
  `NX_DAEMON=false pnpm nx test online-user --runInBand` and
  `NX_DAEMON=false pnpm nx test sdk --runTestsByPath packages/sdk/src/operations-client.spec.ts`.
- Focused typecheck pass:
  `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=security,online-user,sdk,api,admin`.
- `pnpm test:admin` pass.
- `pnpm test:api` pass.
- `pnpm openapi:export` pass.
- `pnpm sdk:check` pass.
- `pnpm openapi:check` pass.
- `pnpm openapi:registry-tags:check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `monitor.online-user.batch-kick-out` and
  `monitor.online-user.revoked-token-rejected`.
- Full gates pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build` and `pnpm prisma:validate`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`.

## Round 14 Public Verification

Against public endpoints after deploy:

- `POST http://144.217.243.161:39172/api/auth/login` returned 201.
- `GET http://144.217.243.161:39172/api/monitor/online-users?...active=true`
  showed the second login session by token ID.
- `POST http://144.217.243.161:39172/api/monitor/online-users/kick-out`
  returned `requested=1`, `kicked=1`, `skipped=0`.
- `GET http://144.217.243.161:39172/api/auth/me` with the kicked token
  returned 401.
- `GET http://144.217.243.161:39174/user/login` returned 200.
- `GET http://144.217.243.161:39174/monitor/online-users/index.html`
  returned 200.

## Round 14 Commit Record

- Feature commit:
  `688b665 feat(monitor-online-user): enforce session revocation / 强制在线会话撤销生效`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 15 Capability

Capability: `core.file` content loop productization.

Goal: close the Round 10 metadata-only gap by letting logged-in operators
upload real file content, download stored bytes and verify the loop through
fixed-port smoke and public deployment.

## Round 15 Implemented

- Added `UploadFileAssetDto` and `POST /api/core/files/upload`, guarded by
  `core:file:create`.
- Upload decodes base64 file content, writes bytes through
  `FileStorageService.storeObjectAtKey` and creates matching metadata.
- Added `GET /api/core/files/:id/download`, guarded by `core:file:read`, with
  MIME, content-length, content-disposition and storage-key headers.
- File deletion now deletes the stored object before removing metadata.
- Metadata updates preserve the existing `storageKey` so renaming metadata does
  not detach a row from its stored object.
- Added a binary response pass-through guard to `ApiResponseInterceptor` so
  file downloads are not wrapped or JSON-serialized.
- Extended `@opencore/file` tests for writing object content at an existing
  key.
- Extended `@opencore/sdk` with upload request contracts and a download path
  helper.
- Updated Admin File Center so create is a real file upload and each row has a
  download action.
- Updated core-file smoke to upload text content, read detail, download the
  file and assert exact content equality before delete cleanup.

## Round 15 Verification

- `node --check tools/scripts/smoke-core-file.mjs` pass.
- Focused typecheck pass:
  `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=core,file,sdk,api,admin`.
- Focused tests pass:
  `NX_DAEMON=false pnpm nx run-many -t test --projects=core,file,sdk,api,admin`.
- `pnpm openapi:export`, `pnpm openapi:check` and `pnpm sdk:check` pass.
- `pnpm openapi:registry-tags:check` and `pnpm registry:admin-routes:check`
  pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.file.upload` and `core.file.download`.
- Full gates pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build` and `pnpm prisma:validate`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`.

## Round 15 Public Verification

Against public endpoints after deploy:

- `POST http://144.217.243.161:39172/api/auth/login` returned 201.
- `POST http://144.217.243.161:39172/api/core/files/upload` uploaded a text
  file and returned metadata with the expected byte size.
- `GET http://144.217.243.161:39172/api/core/files/:id` returned matching
  metadata and storage key.
- `GET http://144.217.243.161:39172/api/core/files/:id/download` returned
  bytes matching the uploaded content exactly.
- `DELETE http://144.217.243.161:39172/api/core/files/:id` cleaned up the
  public verification file.
- `GET http://144.217.243.161:39174/system/files/index.html` returned 200.
- The deployed Admin Files chunk includes upload/download wiring markers:
  `uploadFileAsset`, `getFileDownloadPath`, `Upload File` and `Choose file`.

## Round 15 Commit Record

- Feature commit:
  `0923009 feat(core-file): add authenticated file content loop / 新增认证文件内容闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 16 Capability

Capability: `core.menu` tree metadata productization.

Goal: close the Round 4 flat-menu gap by making menu management a tree-aware
route metadata control plane with deployable API/SDK/Admin/smoke coverage.

## Round 16 Implemented

- Extended menu contracts with `parentKey`, `type`, `icon`, `component`,
  `status`, `cache` and `hidden` metadata.
- Added registry-derived directory parent nodes and deterministic leaf
  component/status/cache defaults.
- Added Prisma migration `20260612191500_menu_tree_metadata`.
- Updated seed data to write directory parents before leaf menus.
- Updated `SystemMenuRepository` normalization and Prisma/seed repositories for
  parent existence checks, self-parent rejection, cycle prevention and delete
  guards when children exist.
- Fixed nullable parent semantics: omitted `parentKey` preserves the current
  parent, `parentKey: null` clears it and string values reparent.
- Extended API DTOs, OpenAPI and `@opencore/sdk` menu types.
- Replaced Admin Menus flat table with a tree table, parent `TreeSelect`,
  add-child action and status/cache/hidden controls.
- Added `tools/scripts/smoke-core-menu.mjs` and wired it into both
  `pnpm smoke:api:local` and `pnpm deploy:opencore`.

## Round 16 Verification

- `node --check tools/scripts/smoke-core-menu.mjs` pass.
- `pnpm prisma:generate` pass.
- `pnpm prisma:validate` pass.
- Focused typecheck pass:
  `NX_DAEMON=false pnpm nx run-many -t typecheck --projects=contracts,module-registry,system,sdk,api,admin`.
- Focused tests pass:
  `NX_DAEMON=false pnpm nx run-many -t test --projects=contracts,module-registry,system,sdk,api,admin`.
- `pnpm openapi:export`, `pnpm sdk:check`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and `pnpm registry:admin-routes:check`
  pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.menu.seed-tree-metadata`, `core.menu.create-child`,
  `core.menu.delete-parent-guard` and `core.menu.update`.
- Full gates pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build` and `pnpm prisma:validate`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes `core.menu.*`.

## Round 16 Public Verification

Against public endpoints after deploy:

- `POST http://144.217.243.161:39172/api/auth/login` returned 201.
- `GET http://144.217.243.161:39172/api/core/menus` returned `system` as a
  `directory` and `system.menus` with `parentKey=system` plus
  `component=System/Menus`.
- `POST http://144.217.243.161:39172/api/core/menus` created a parent menu
  under `system`.
- `POST http://144.217.243.161:39172/api/core/menus` created a child menu under
  the public verification parent.
- `DELETE http://144.217.243.161:39172/api/core/menus/:parentKey` returned 400
  while the parent still had a child.
- `PATCH http://144.217.243.161:39172/api/core/menus/:childKey` with
  `parentKey: null` cleared the child parent and updated status/cache/hidden.
- Cleanup deleted the public verification menus.
- `GET http://144.217.243.161:39174/system/menus/index.html` returned 200.
- The deployed Admin Menus chunk includes tree UI markers: `Add child`,
  `Parent`, `Cache`, `Hidden`, `parentKey`, `component`, `status` and
  `directory`.

## Round 16 Commit Record

- Feature commit:
  `4b0fa58 feat(core-menu): add tree metadata loop / 新增菜单树元数据闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 17 Capability

Capability: `core.role` menu assignment productization.

Goal: close the first `core.role` P1 RBAC gap by adding a role menu-tree
assignment loop that works with OpenCore's permission catalog and makes
role-permission mutation invalidate affected active sessions.

## Round 17 Implemented

- Added `AssignRoleMenusDto` and `RoleMenuAssignmentDto` to `@opencore/system`.
- Added `SystemRoleService.getRoleMenuAssignment()` and
  `SystemRoleService.assignRoleMenus()`.
- Mapped selected menu keys to menu-bound permission codes while preserving
  non-menu permission codes such as action-level grants.
- Imported `SystemMenuModule` into `SystemRoleModule` so the role service owns
  menu/permission translation instead of duplicating it in the API controller.
- Added `GET /api/core/roles/:code/menus` and
  `PATCH /api/core/roles/:code/menus`.
- Revoked active online-user sessions for users holding the changed role after
  role menu assignment.
- Extended OpenAPI and `@opencore/sdk` with role menu assignment types and
  client methods.
- Added Admin Roles row-level Menu Assignment tree dialog backed by SDK service
  methods.
- Added `tools/scripts/smoke-core-role.mjs` and wired it into both
  `pnpm smoke:api:local` and `pnpm deploy:opencore`.
- Hardened Admin lint so it generates Umi runtime types before running `tsc`.

## Round 17 Verification

- `node --check tools/scripts/smoke-core-role.mjs` pass.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-role/system-role.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/rbac-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- Focused typecheck pass for `system`, `sdk`, `api` and `admin`.
- `pnpm openapi:export`, `pnpm sdk:check`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and `pnpm registry:admin-routes:check`
  pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.role.menu-assignment.get`,
  `core.role.menu-assignment.patch`,
  `core.role.menu-assignment.preserve-non-menu-permission`,
  `core.role.menu-assignment.revoke-session` and
  `core.role.menu-assignment.relogin-refresh`.
- Full gates pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build` and `pnpm prisma:validate`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes `core.role.menu-assignment.*`.

## Round 17 Public Verification

Against public endpoints after deploy:

- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-role.mjs` passed with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public role smoke verified menu assignment get/patch, preserved non-menu
  permission, revoked old token 401 and relogin permission refresh.
- `GET http://144.217.243.161:39174/system/roles/index.html` returned 200.
- The deployed Admin Roles chunk
  `p__System__Roles.f1229292.async.js` contains `Menu Assignment`,
  `checkedMenuKeys`, `assignOpenCoreRoleMenus`,
  `getOpenCoreRoleMenuAssignment` and `revokedSessionCount` markers.

## Round 17 Commit Record

- Feature commit:
  `13168fc feat(core-role): add role menu assignment loop / 新增角色菜单授权闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 18 Capability

Capability: `core.role` user assignment productization.

Goal: close the next `core.role`/`core.user` P1 RBAC gap by adding a role-user
assignment loop that protects system users and invalidates affected active
sessions after user-role mutation.

## Round 18 Implemented

- Added `AssignRoleUsersDto` and `RoleUserAssignmentDto` to
  `@opencore/system`.
- Added `SystemUserService.getRoleUserAssignment()` and
  `SystemUserService.assignRoleUsers()`.
- Implemented seed and Prisma repository support for reading available and
  assigned users for a role.
- Rejected malformed assignment payloads, duplicate user IDs, missing users and
  system users before mutating assignments.
- Added `GET /api/core/roles/:code/users` and
  `PATCH /api/core/roles/:code/users`.
- Revoked active online-user sessions only for users whose role assignment
  changed after role-user assignment.
- Extended OpenAPI and `@opencore/sdk` with role-user assignment types and
  client methods.
- Added Admin Roles row-level User Assignment `Transfer` dialog backed by SDK
  service methods.
- Extended `tools/scripts/smoke-core-role.mjs` so local/deploy/public smoke
  covers role-user get, unassign, assign, revoked old token 401 and relogin
  role/permission refresh.

## Round 18 Verification

- `node --check tools/scripts/smoke-core-role.mjs` pass.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-user/system-user.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/rbac-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- Focused typecheck pass for `system`, `api` and `admin`.
- `pnpm openapi:export`, `pnpm nx test admin`, `pnpm sdk:check`,
  `pnpm openapi:check`, `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.role.user-assignment.get`,
  `core.role.user-assignment.unassign`,
  `core.role.user-assignment.assign`,
  `core.role.user-assignment.revoke-session` and
  `core.role.user-assignment.relogin-refresh`.
- Full gates pass: `pnpm format:check`, `pnpm prisma:validate`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test` and `pnpm build`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes `core.role.user-assignment.*`.

## Round 18 Public Verification

Against public endpoints after deploy:

- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-role.mjs` passed with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public role smoke verified role-user assignment get/unassign/assign, revoked
  old token 401 and relogin role/permission refresh.
- `GET http://144.217.243.161:39174/system/roles/index.html` returned 200.
- The deployed Admin Roles chunk
  `p__System__Roles.49178996.async.js` contains `User Assignment`,
  `assignedUserIds`, `assignOpenCoreRoleUsers`,
  `getOpenCoreRoleUserAssignment` and `Role users updated` markers.

## Round 18 Commit Record

- Feature commit:
  `b4f8117 feat(core-role): add role user assignment loop / 新增角色用户分配闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 19 Capability

Capability: `core.user` security mutation productization.

Goal: close the next `core.user` P1 gap by adding direct user status and
password-reset mutation loops, and by making direct user update/status/reset/
delete invalidate affected active sessions.

## Round 19 Implemented

- Added `SetUserStatusDto`, `ResetUserPasswordDto` and
  `UserMutationResultDto` to `@opencore/system`.
- Hardened user input normalization so status payloads require real booleans
  and malformed password/status bodies are rejected before mutation.
- Added `SystemUserService.setUserStatus()` and
  `SystemUserService.resetUserPassword()` across seed and Prisma-backed flows.
- Added `PATCH /api/core/users/:id/status` and
  `POST /api/core/users/:id/reset-password`, guarded by `core:user:update`.
- Changed direct user update and delete responses to include
  `revokedSessionCount` where applicable.
- Revoked active online-user sessions after user status changes, password
  resets, direct user updates and deletes.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests for
  user status/reset-password calls.
- Updated Admin Users with row-level enable/disable controls, a reset-password
  dialog and revoked-session feedback.
- Added `tools/scripts/smoke-core-user.mjs` and wired it into local and deploy
  smoke.
- Stabilized `tools/scripts/smoke-core-online-user.mjs` so deploy smoke checks
  the current admin token session instead of requiring the seeded admin session
  to appear on the first active-admin page.

## Round 19 Verification

- `node --check tools/scripts/smoke-core-user.mjs` pass.
- `node --check tools/scripts/smoke-core-online-user.mjs` pass.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-user/system-user.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/rbac-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- Focused typecheck pass for `system`, `api` and `admin`.
- `pnpm nx test admin` pass.
- `pnpm openapi:export`, `pnpm sdk:check`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm prisma:validate` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.user.status.disable`, `core.user.status.revoke-session`,
  `core.user.status.login-blocked`, `core.user.reset-password`,
  `core.user.reset-password.revoke-session`,
  `core.user.reset-password.old-password-blocked`,
  `core.user.update.revoke-session` and `core.user.delete.revoke-session`.
- Full gates pass: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
  `pnpm test` and `pnpm build`. The existing non-failing Biome regex warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes `core.user.*` and the stabilized
  online-user admin-session preservation check.

## Round 19 Public Verification

Against public endpoints after deploy:

- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-user.mjs` passed with
  `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public user smoke verified create, disable/login-block, enable, password
  reset, old-password rejection, update session revocation and delete session
  revocation.
- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `GET http://144.217.243.161:39174/system/users/index.html` returned 200.
- The deployed Admin Users chunk `p__System__Users.d0368dd0.async.js`
  contains `Reset Password` and `Revoked sessions` markers, and the public main
  bundle contains API origin `http://144.217.243.161:39172` with no duplicated
  `/api/api` marker.

## Round 19 Commit Record

- Feature commit:
  `c4347b4 feat(core-user): add user security mutation loop / 新增用户安全变更闭环`.
- Smoke hardening commit:
  `04e446c fix(online-user): stabilize admin session smoke / 稳定在线用户管理员会话冒烟`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 20 Capability

Capability: `core.role` status security productization.

Goal: close the remaining basic `core.role` status gap by adding enabled/
disabled role control and making role status/update/delete mutations invalidate
affected active sessions while disabled roles stop contributing authorization.

## Round 20 Implemented

- Added `enabled` to persisted roles, Prisma migration
  `20260612210500_role_status`, seed data and role summary DTOs.
- Added `SetRoleStatusDto` and `RoleMutationResultDto` with strict boolean
  normalization so string booleans are rejected before mutation.
- Added `SystemRoleService.setRoleStatus()` across seed and Prisma-backed
  flows.
- Added `PATCH /api/core/roles/:code/status`, guarded by `core:role:update`.
- Prevented system roles from being disabled.
- Filtered disabled roles out of login `roleCodes`, permission aggregation and
  data-scope role calculations while preserving management-side assignments.
- Changed direct role update and delete responses to include
  `revokedSessionCount` where applicable.
- Revoked affected active online-user sessions after role status changes,
  direct role updates and role deletes.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests for
  role status calls.
- Updated Admin Roles with status filter, status column, enable/disable
  controls and revoked-session feedback.
- Extended `tools/scripts/smoke-core-role.mjs` so local/deploy/public smoke
  covers role disable/enable, disabled-role filtering, stale-token 401 after
  update/delete and cleanup.

## Round 20 Verification

- `pnpm prisma:generate` pass.
- `pnpm prisma:migrate` applied `20260612210500_role_status`.
- `node --check tools/scripts/smoke-core-role.mjs` pass.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-role/system-role.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/rbac-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/rbac.permission-matrix.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/prisma-rbac.repository.spec.ts`
- Focused typecheck pass for `system`, `api` and `admin`.
- `pnpm nx test admin` pass.
- `pnpm openapi:export`, `pnpm sdk:check`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm prisma:validate` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.role.status.disable`,
  `core.role.status.disabled-role-filtered`,
  `core.role.status.enable`,
  `core.role.update.revoke-session` and
  `core.role.delete.revoke-session`.
- Full gates pass sequentially: `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test` and `pnpm build`. The existing non-failing
  Biome regex warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the extended `core.role.*` status,
  update and delete checks.

## Round 20 Public Verification

Against public endpoints after deploy:

- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-role.mjs` passed with
  `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public role smoke verified role disable, disabled-role auth filtering,
  re-enable, relogin permission restoration, direct role update session
  revocation and role delete session revocation.
- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `GET http://144.217.243.161:39174/system/roles/index.html` returned 200.
- The deployed Admin Roles chunk `p__System__Roles.8910f000.async.js`
  contains `Revoked sessions`, `Disable this role`, `Enable this role`,
  `System roles cannot be disabled` and status markers.

## Round 20 Commit Record

- Feature commit:
  `32a6f5d feat(core-role): add role status security loop / 新增角色状态安全闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 21 Capability

Capability: `core.dict` item data simple-list productization.

Goal: close the `core.dict` P1 gap by adding item-level management API/SDK/Admin
and a public simple-list consumer endpoint, while turning repeated
deserialization failures into tests and smoke guards.

## Round 21 Implemented

- Added `DictDataOption` DTO/types and dict item create/update DTOs.
- Hardened dict item input normalization so malformed booleans and sort values
  are rejected before mutation.
- Added public `GET /api/core/dict-data/simple-list` with optional `dictCode`
  filtering.
- Added item management endpoints under `/api/core/dicts/:code/items` for
  list/detail/create/update/delete.
- Implemented item CRUD and simple-list filtering in seed and Prisma
  repositories.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests.
- Updated Admin Dicts with a row-level `Dictionary Items` modal for item CRUD
  and public simple-list visibility feedback.
- Added `tools/scripts/smoke-core-dict.mjs` and wired it into fixed-port local
  and deploy smoke.
- Extended static Admin smoke to lock the Dicts item modal and service markers.

## Round 21 Verification

- `node --check tools/scripts/smoke-core-dict.mjs` pass.
- `bash -n tools/scripts/run-local-api-smoke.sh` and
  `bash -n tools/scripts/deploy-local-opencore.sh` pass.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-dict/system-dict.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/system-management-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/system-management/system-management.permission-matrix.spec.ts`
- Focused typecheck pass for `system`, `api` and `admin`.
- `pnpm nx test admin` pass.
- `pnpm openapi:export`, `pnpm sdk:check`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm prisma:validate` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.dict.item.bad-boolean-rejected`, `core.dict.item.create`,
  `core.dict.item.list`, `core.dict.item.detail`,
  `core.dict.simple-list.public-consumer`,
  `core.dict.simple-list.disabled-item-filtered`,
  `core.dict.simple-list.disabled-dict-filtered`,
  `core.dict.item.update` and `core.dict.item.delete`.
- Full gates pass sequentially: `pnpm format:check`, `pnpm lint`,
  `pnpm typecheck`, `pnpm test` and `pnpm build`. The existing non-failing
  Biome regex warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new `core.dict.*` item and
  simple-list checks.

## Round 21 Public Verification

Against public endpoints after deploy:

- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-dict.mjs` passed with
  `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public dict smoke verified dict creation, malformed item boolean rejection,
  item create/list/detail/update/delete, public simple-list consumption,
  disabled item filtering and disabled dict type filtering.
- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `GET http://144.217.243.161:39174/system/dicts/index.html` returned 200.
- The deployed Admin Dicts chunk `p__System__Dicts.fe464f3b.async.js`
  contains `Dictionary Items`, `New Item`, `simple-list consumer endpoint`,
  `listOpenCoreDictItems`, `createOpenCoreDictItem` and
  `deleteOpenCoreDictItem` markers.

## Round 21 Commit Record

- Feature commit:
  `07d4e9b feat(core-dict): add item data simple-list loop / 新增字典数据项消费闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 22 Capability

Capability: `core.user` post binding productization.

Goal: close the next `core.user` P1 gap by adding persisted user-post binding
through API/SDK/Admin, using the already live `core.post` capability as the
option source.

## Round 22 Implemented

- Added Prisma `UserPost` relation and migration
  `20260612220000_user_post_binding`.
- Seed now binds bootstrap admin to the seeded `admin` post and keeps
  user-post rows synchronized.
- Added `postCodes` to user summary/create/update DTOs, OpenAPI, SDK types and
  SDK request tests.
- Extended seed and Prisma user repositories to validate unknown and duplicate
  post codes, persist create/update post assignments and delete assignments
  during user deletion.
- Updated Admin Users with post tags in table/detail, post multi-select in
  create/edit forms and current-page export support.
- Admin Users loads post options from live `core.post` and falls back to
  fixtures only if the API is unavailable.
- Extended Admin static smoke and `tools/scripts/smoke-core-user.mjs` with
  post-binding guards.

## Round 22 Verification

- `pnpm prisma:generate` pass.
- `pnpm prisma:validate` pass.
- `node --check tools/scripts/smoke-core-user.mjs` pass.
- `node --check apps/admin/scripts/smoke-test.mjs` pass.
- `pnpm prisma:migrate` applied `20260612220000_user_post_binding` locally.
- `pnpm prisma:seed` pass and seeded admin post binding.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-user/system-user.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/rbac-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/permission.guard.spec.ts`
  - `pnpm nx test security`
- `pnpm nx test admin` pass.
- `pnpm openapi:export`, `pnpm sdk:check`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.user.post.unknown-rejected`, `core.user.post.create` and
  `core.user.post.clear`.
- `pnpm build:api` pass.
- `pnpm build:admin` pass.
- `git diff --check` pass.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new `core.user.post.*` checks and
  the existing login-prefix/frontend-cache/session-revocation guards.

## Round 22 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-user.mjs` passed with
  `OPENCORE_SMOKE_CHECK_DOCS=false` and the deployed admin password loaded from
  `.env.opencore.local` without printing secrets.
- Public user smoke verified unknown-post rejection, create-time `engineer`
  post binding, update-time post clearing, status disable/login-block, password
  reset, old-password rejection and update/delete session revocation.
- `GET http://144.217.243.161:39174/system/users/` returned 200 with
  `cache-control: no-cache`.
- The deployed Admin Users chunk `p__System__Users.072504ad.async.js`
  contains `Select posts` and `postCodes`.
- The deployed main Admin bundle `umi.d1ee1ea1.js` contains API origin
  `http://144.217.243.161:39172` and does not contain
  `/api/api/auth/login`.

## Round 22 Commit Record

- Feature commit:
  `98e10be feat(core-user): add post binding loop / 新增用户岗位绑定闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 23 Capability

Capability: `core.user` department tree filter productization.

Goal: close the next `core.user` P1 gap by adding RuoYi/Yudao-style department
scope filtering to user list/export and the Admin Users page.

## Round 23 Implemented

- Added `ListUsersQueryDto` with optional `deptId` and wired it through
  `GET /api/core/users` and `GET /api/core/users/export`.
- Extended seed and Prisma user repositories to normalize list queries, reject
  unknown department IDs and filter by selected department plus descendants.
- Extended OpenAPI, `@opencore/sdk` request types/client methods and SDK path
  tests for user list/export query parameters.
- Updated Admin Users with a left Department scope tree backed by live
  `core.dept`, an All departments reset and fallback subtree filtering when
  the live API is unavailable.
- Extended Admin static smoke and `tools/scripts/smoke-core-user.mjs` with
  department-filter guards.

## Round 23 Verification

- `node --check tools/scripts/smoke-core-user.mjs` pass.
- `node --check apps/admin/scripts/smoke-test.mjs` pass.
- `git diff --check` pass before the feature commit.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-user/system-user.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/rbac-client.spec.ts`
  - `pnpm nx test admin`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/rbac/permission.guard.spec.ts`
- `pnpm openapi:export`, `pnpm openapi:check`, `pnpm sdk:check`,
  `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm prisma:validate` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.user.dept.unknown-rejected`, `core.user.dept.create`,
  `core.user.dept.filter` and `core.user.dept.subtree-filter`.
- `pnpm build:api` pass.
- `pnpm build:admin` pass.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new department-filter checks and
  the existing login-prefix/frontend-cache/session-revocation guards.

## Round 23 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-user.mjs` passed with
  `OPENCORE_SMOKE_CHECK_DOCS=false` and the deployed admin password loaded from
  `.env.opencore.local` without printing secrets.
- Public user smoke verified unknown-department rejection, create-time
  operations department binding, direct department filtering, headquarters
  subtree filtering, unrelated engineering exclusion, status disable/
  login-block, password reset, old-password rejection and update/delete session
  revocation.
- `GET http://144.217.243.161:39174/system/users/` returned 200 with
  `cache-control: no-cache`.
- The deployed Admin Users chunk `p__System__Users.f2a8caa6.async.js`
  contains `Department scope`, `All departments` and `deptId`.

## Round 23 Commit Record

- Feature commit:
  `fda33c4 feat(core-user): add department tree filter loop / 新增用户部门树过滤闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 24 Capability

Capability: `core.config` value-by-key and cache refresh productization.

Goal: close the next `core.config` P1 gap by adding a runtime-safe public
config value consumer endpoint and cache refresh/invalidation semantics.

## Round 24 Implemented

- Added `SystemConfigValueDto`, `SystemConfigValueQueryDto` and
  `SystemConfigCacheRefreshDto`.
- Added service-level public config value cache in `SystemConfigService`.
- Added `getConfigValueByKey()` that returns only `visibility=public` values
  and blocks private/secret values with 403.
- Added `refreshConfigCache()` that rebuilds the service value cache from all
  public config rows.
- Made create/update/delete invalidate the affected cached key.
- Added `GET /api/core/config/get-value-by-key?key=...` and permission-gated
  `POST /api/core/config/refresh-cache`.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests.
- Updated Admin Config with a toolbar `Refresh cache` action and public row
  `Read public value by key` action.
- Extended Admin static smoke and `tools/scripts/smoke-core-config.mjs` with
  value/cache guards.

## Round 24 Verification

- `node --check tools/scripts/smoke-core-config.mjs` pass.
- `node --check apps/admin/scripts/smoke-test.mjs` pass.
- `git diff --check` pass before the feature commit.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-config/system-config.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/system-management-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/system-management/system-management.permission-matrix.spec.ts`
  - `pnpm nx test admin`
- `pnpm openapi:export`, `pnpm openapi:check`, `pnpm sdk:check`,
  `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm prisma:validate` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.config.value-by-key`, `core.config.value-cache-invalidation`,
  `core.config.cache-refresh` and `core.config.secret-value-blocked`.
- `pnpm build:api` pass.
- `pnpm build:admin` pass.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new config value/cache checks and
  the existing login-prefix/frontend-cache/session-revocation guards.

## Round 24 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-config.mjs` passed with
  `OPENCORE_SMOKE_CHECK_DOCS=false` and the deployed admin password loaded from
  `.env.opencore.local` without printing secrets.
- Public config smoke verified value-by-key, cache invalidation after update,
  explicit cache refresh, secret value 403, secret redaction and cleanup.
- `GET http://144.217.243.161:39174/system/config/` returned 200 with
  `cache-control: no-cache`.
- The deployed Admin Config chunk `p__System__Config.19ce36ed.async.js`
  contains `Refresh cache` and `Read public value by key`.
- The deployed main Admin bundle `umi.b4f1a190.js` contains
  `get-value-by-key`, `refresh-cache`, API origin
  `http://144.217.243.161:39172` and no `/api/api/auth/login`.

## Round 24 Commit Record

- Feature commit:
  `79c4e93 feat(core-config): add value cache refresh loop / 新增配置值读取与缓存刷新闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 25 Capability

Capability: `core.post` simple-list option productization.

Goal: close the next `core.post` P1 foundation gap by adding a dedicated
enabled-post option source and making Admin Users consume it instead of the
post management page.

## Round 25 Implemented

- Added `SystemPostOptionDto` with lightweight `{ code, name, order }` shape.
- Added `listPostOptions()` to `SystemPostRepository` and `SystemPostService`.
- Implemented enabled-only, order/name sorted option queries in seed and
  Prisma post repositories.
- Added public `GET /api/core/posts/simple-list` ahead of the dynamic
  `posts/:code` route.
- Extended the system-management permission matrix to assert simple consumer
  endpoints are not accidentally converted into management-permission routes.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests.
- Added `listOpenCoreSystemPostOptions()` to Admin platform services.
- Updated Admin Users so post name maps and post multi-select options load
  from the simple-list option source.
- Added `tools/scripts/smoke-core-post.mjs` and wired it into fixed-port local
  smoke plus deploy smoke.

## Round 25 Verification

- `node --check tools/scripts/smoke-core-post.mjs` pass.
- `node --check apps/admin/scripts/smoke-test.mjs` pass.
- `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
  pass.
- `git diff --check` pass before the feature commit.
- Focused tests pass:
  - `pnpm nx test system --testFile=packages/system/src/system-post/system-post.spec.ts`
  - `pnpm nx test sdk --testFile=packages/sdk/src/system-management-client.spec.ts`
  - `pnpm nx test api --testFile=apps/api/src/modules/core/system-management/system-management.permission-matrix.spec.ts`
  - `pnpm nx test admin`
- `pnpm openapi:export`, `pnpm openapi:check`, `pnpm sdk:check`,
  `pnpm openapi:registry-tags:check` and
  `pnpm registry:admin-routes:check` pass.
- `pnpm prisma:validate` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.post.simple-list.public-consumer`,
  `core.post.simple-list.disabled-filtered`,
  `core.post.simple-list.option-shape` and `core.post.delete`.
- `pnpm build:api` pass.
- `pnpm build:admin` pass.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new core-post option-source
  checks and the existing login-prefix/frontend-cache/session-revocation
  guards.

## Round 25 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 node
tools/scripts/smoke-core-post.mjs` passed with
  `OPENCORE_SMOKE_CHECK_DOCS=false` and the deployed admin password loaded from
  `.env.opencore.local` without printing secrets.
- Public post smoke verified disabled-post filtering, enabled option inclusion,
  lightweight option shape, export/detail/delete and cleanup.
- `GET http://144.217.243.161:39174/system/users/` returned 200.
- The deployed Admin Users chunk `p__System__Users.7894d121.async.js`
  contains `Select posts`.
- The deployed main Admin bundle `umi.17f471f6.js` contains
  `/core/posts/simple-list`, API origin `http://144.217.243.161:39172` and no
  `/api/api/auth/login`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and the stale-compatible `/api/api/auth/login`.

## Round 25 Commit Record

- Feature commit:
  `27d15cc feat(core-post): add simple-list option loop / 新增岗位选项列表闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 26 Capability

Capability: `core.login-log` device and server-filter productization.

Goal: close the next login-log P1 foundation gap by adding readable
browser/OS fields and server-side IP/time filtering while preserving the
immutable audit-log storage model.

## Round 26 Implemented

- Added shared `parseUserAgent()` in `@opencore/common`.
- Updated `monitor.online-user` to reuse the shared parser.
- Added computed `browser` and `os` fields to login-log DTOs/records.
- Added `ip`, `createdFrom` and `createdTo` query filters to login-log
  list/export contracts.
- Added invalid date and reversed date-range guards.
- Implemented seed and Prisma repository filtering for IP and created-time
  windows.
- Extended OpenAPI, SDK types/fixtures/path tests and audit repository tests.
- Updated Admin Login Logs with server-side username/IP/result/time filters and
  Browser/OS table/detail/export fields.
- Extended static Admin smoke and `tools/scripts/smoke-core-login-log.mjs` to
  lock the new device/filter behavior.

## Round 26 Verification

- Focused tests pass:
  - `NX_DAEMON=false pnpm nx test common --runInBand`
  - `NX_DAEMON=false pnpm nx test online-user --runInBand`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand --runTestsByPath packages/sdk/src/system-management-client.spec.ts packages/sdk/src/registry-fixtures.spec.ts`
  - `NX_DAEMON=false pnpm nx test audit --runInBand --runTestsByPath packages/audit/src/audit-login-log/audit-login-log.spec.ts`
  - `pnpm test:admin`
- `pnpm openapi:export`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and `pnpm sdk:check` pass.
- `pnpm typecheck` pass.
- `pnpm lint` pass; the known Biome warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains non-blocking.
- `pnpm prisma:validate` pass.
- `pnpm build` pass.
- `pnpm format:check` pass.
- `pnpm test` pass for all 19 Nx projects.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.login-log.server-filters`,
  `core.login-log.invalid-time-range-guard` and
  `core.login-log.device-fields`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new login-log device/filter checks
  and the existing login-prefix/frontend-cache/session-revocation guards.

## Round 26 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm
smoke:core-login-log` passed with `OPENCORE_SMOKE_CHECK_DOCS=false` and the
  deployed admin password loaded from `.env.opencore.local` without printing
  secrets.
- Public login-log smoke verified failed-login recording, server-side
  username/result/IP/time filters, future-window exclusion, invalid
  `createdFrom` 400, Chrome/Windows device fields and export device columns.
- `GET http://144.217.243.161:39174/security/login-logs/` returned 200.
- The deployed main Admin bundle `umi.688dcb49.js` contains API origin
  `http://144.217.243.161:39172` and `/core/login-logs`, and does not contain
  `/api/api/auth/login`.
- The deployed Login Logs chunk
  `p__Security__LoginLogs.990c6615.async.js` contains `createdFrom`,
  `createdTo`, `Browser`, `OS` and `Apply server filters`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and the stale-compatible `/api/api/auth/login`.

## Round 26 Commit Record

- Feature commit:
  `dd720f8 feat(core-login-log): add device filters loop / 新增登录日志设备筛选闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 27 Capability

Capability: `core.dept` simple-list option-source productization.

Goal: close the next department P1 foundation gap by adding a lightweight
enabled-department option source for consumer forms while keeping the full
department management tree as the management surface.

## Round 27 Implemented

- Added `SystemDeptOptionDto` and `SystemDeptOptionRecord` for lightweight
  `{ id, name, parentId, order }` department options.
- Added `listDeptOptions()` to the department repository/service contract.
- Implemented enabled-only, order/name sorted option queries in seed and Prisma
  repositories.
- Added public `GET /api/core/depts/simple-list` before
  `GET /api/core/depts/:id`.
- Extended the API permission matrix so the department simple-list consumer
  route remains free of management permissions.
- Extended OpenAPI, SDK types, fixtures, client methods and SDK path tests.
- Added Admin platform `listOpenCoreSystemDeptOptions()`.
- Updated Admin Users to consume department options from simple-list for the
  create/edit `TreeSelect`, while preserving the left Department scope filter
  on the full department tree.
- Added static Admin smoke markers and `tools/scripts/smoke-core-dept.mjs`.
- Wired `smoke-core-dept.mjs` into `pnpm smoke:api:local` and
  `pnpm deploy:opencore`.

## Round 27 Verification

- Static script checks pass:
  - `node --check tools/scripts/smoke-core-dept.mjs`
  - `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
- Focused tests pass:
  - `NX_DAEMON=false pnpm nx test system --runInBand --runTestsByPath packages/system/src/system-dept/system-dept.spec.ts`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand --runTestsByPath packages/sdk/src/system-management-client.spec.ts packages/sdk/src/registry-fixtures.spec.ts`
  - `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/system-management/system-management.permission-matrix.spec.ts`
  - `pnpm test:admin`
- `pnpm openapi:export`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and `pnpm sdk:check` pass.
- `pnpm typecheck` pass.
- `pnpm lint` pass; the known Biome warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains non-blocking.
- `pnpm prisma:validate` pass.
- `pnpm build` pass.
- `pnpm format:check` pass.
- `pnpm test` pass for all 19 Nx projects.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.dept.simple-list.public-consumer`,
  `core.dept.simple-list.disabled-filtered` and
  `core.dept.simple-list.option-shape`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new core-dept option-source checks
  and the existing login-prefix/frontend-cache/session-revocation guards.

## Round 27 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm
smoke:core-dept` passed with `OPENCORE_SMOKE_CHECK_DOCS=false` and the deployed
  admin password loaded from `.env.opencore.local` without printing secrets.
- Public dept smoke verified disabled-department filtering, enabled option
  inclusion, lightweight option shape, export/detail/delete and cleanup.
- `GET http://144.217.243.161:39174/system/users/` returned 200.
- The deployed main Admin bundle `umi.cf2e4e65.js` contains API origin
  `http://144.217.243.161:39172` and `/core/depts/simple-list`, and does not
  contain `/api/api/auth/login`.
- The deployed Users chunk `p__System__Users.b034bbd1.async.js` contains
  `Select department`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and the stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Round 27 Commit Record

- Feature commit:
  `844f36d feat(core-dept): add simple-list option source / 新增部门精简选项源`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 28 Capability

Capability: `core.user` self-profile basic information productization.

Goal: close the next user P1 foundation gap by adding an authenticated current
user profile read/update loop without weakening system-user management
protections.

## Round 28 Implemented

- Added `RequireAuthenticated()` RBAC metadata and guard support for endpoints
  that require a bearer session but no management permission.
- Moved `/api/auth/me` to auth-only semantics instead of requiring
  `core:dashboard:read`.
- Added `GET /api/core/users/profile` and `PATCH /api/core/users/profile`.
- Added `UpdateUserProfileDto` and `UserProfileDto` API/System DTOs.
- Added `updateUserProfile()` to system user repository/service contracts and
  seed/Prisma implementations.
- Kept management `PATCH /api/core/users/:id` protected for seeded/system
  users while allowing a user to update only their own `displayName` through
  the profile endpoint.
- Extended API permission-matrix tests to lock profile endpoints and
  `/auth/me` as auth-only, not permission-gated.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests.
- Added Admin `/personal/profile`, Avatar menu entry and profile page for
  identity display plus display-name editing.
- Extended static Admin smoke guards for the route, Avatar menu entry, Admin
  service methods and profile page markers.
- Extended `tools/scripts/smoke-core-user.mjs` to prove profile get/update,
  `/auth/me` display-name refresh, invalid display-name 400 and system-user
  management update protection, with cleanup restoring the admin display name.

## Round 28 Verification

- `node --check tools/scripts/smoke-core-user.mjs` pass.
- `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
  pass.
- Focused tests pass:
  - `NX_DAEMON=false pnpm nx test security --runInBand --runTestsByPath packages/security/src/security-rbac/security-rbac.spec.ts`
  - `NX_DAEMON=false pnpm nx test system --runInBand --runTestsByPath packages/system/src/system-user/system-user.spec.ts`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand --runTestsByPath packages/sdk/src/rbac-client.spec.ts`
  - `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/rbac.permission-matrix.spec.ts`
  - `pnpm test:admin`
- `pnpm openapi:export`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and `pnpm sdk:check` pass.
- `pnpm typecheck` pass.
- `pnpm lint` pass; the known Biome warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains non-blocking.
- `pnpm prisma:validate` pass.
- `pnpm format:check` pass.
- `pnpm test` pass for all 19 Nx projects.
- `pnpm build` pass for all 19 Nx projects.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.user.profile.get`, `core.user.profile.update`,
  `core.user.profile.auth-me-refresh`,
  `core.user.profile.invalid-display-name-guard` and
  `core.user.profile.management-system-user-guard`.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new user profile checks and the
  existing login-prefix/frontend-cache/session-revocation guards.

## Round 28 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false` and the
  deployed admin password loaded from `.env.opencore.local` without printing
  secrets.
- Public user smoke verified profile get/update, `/auth/me` display-name
  refresh, invalid display-name 400, system-user management update protection,
  user create/dept/post/status/reset/update/delete and session revocation.
- `GET http://144.217.243.161:39174/personal/profile/` returned 200.
- The deployed main Admin bundle `umi.b3f9bcae.js` contains API origin
  `http://144.217.243.161:39172` and `/core/users/profile`, and does not
  contain `/api/api/auth/login`.
- The deployed Profile chunk `p__Personal__Profile.7e74b02d.async.js` contains
  `Display name`, `Profile saved.` and `postCodes`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and the stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Round 28 Commit Record

- Feature commit:
  `7db10fe feat(core-user): add self-profile loop / 新增个人资料闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 29 Capability

Capability: `core.user` self-password productization.

Goal: close the next user profile security gap by adding authenticated
self-service password change with old-password verification and session
revocation.

## Round 29 Implemented

- Added `UpdateUserPasswordDto` with `oldPassword/newPassword`.
- Added `updateUserPassword()` to system user repository/service contracts.
- Implemented old-password verification, same-password rejection and password
  hash update in seed and Prisma system user repositories.
- Added `PATCH /api/core/users/profile/password` as an auth-only current-user
  endpoint before dynamic `users/:id` routes.
- Returned a password mutation result with `changed` and
  `revokedSessionCount`.
- Revoked active online-user sessions for the current username after a
  successful self password change.
- Extended the API permission matrix so self-password stays auth-only and does
  not require `core:user:update`.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests.
- Added Admin Profile `Change password` form, current/new/confirm password
  validation, local token cleanup and login redirect after success.
- Extended static Admin smoke markers for the new service method, form labels,
  logout behavior and success message.
- Extended `tools/scripts/smoke-core-user.mjs` to prove wrong old password 401,
  same password 400, successful password update, stale token 401, old password
  blocked and new password login.

## Round 29 Verification

- `node --check tools/scripts/smoke-core-user.mjs`, `node --check
apps/admin/scripts/smoke-test.mjs` and `bash -n
tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
  pass.
- Focused tests pass:
  - `NX_DAEMON=false pnpm nx test system --runInBand --runTestsByPath packages/system/src/system-user/system-user.spec.ts`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand --runTestsByPath packages/sdk/src/rbac-client.spec.ts`
  - `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/rbac.permission-matrix.spec.ts`
  - `pnpm test:admin`
- `pnpm openapi:export`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and `pnpm sdk:check` pass.
- `pnpm typecheck` pass.
- `pnpm lint` pass; the known Biome warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains non-blocking.
- `pnpm prisma:validate` pass.
- `pnpm format:check` pass.
- `git diff --check` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.user.profile.password.wrong-old-password-guard`,
  `core.user.profile.password.same-password-guard`,
  `core.user.profile.password.update`,
  `core.user.profile.password.revoke-session`,
  `core.user.profile.password.old-password-blocked` and
  `core.user.profile.password.new-password-login`.
- `pnpm test` pass for all 19 Nx projects.
- `pnpm build` pass for all 19 Nx projects.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new user self-password checks and
  the existing login-prefix/frontend-cache/session-revocation guards.

## Round 29 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false` and the
  deployed admin password loaded from `.env.opencore.local` without printing
  secrets.
- Public user smoke verified wrong old password 401, same password 400,
  successful self-password update, stale token 401, old password blocked, new
  password login, and the existing user security mutation checks.
- `GET http://144.217.243.161:39174/personal/profile/` returned 200.
- The deployed main Admin bundle `umi.4cacaf95.js` contains API origin
  `http://144.217.243.161:39172` and `/core/users/profile/password`, and does
  not contain `/api/api/auth/login`.
- The deployed Profile chunk `p__Personal__Profile.d2b0fdde.async.js`
  contains `Change password`, `Current password`, `New password`,
  `Confirm password`, `Password changed`, `Sign in again`, `/user/login` and
  `/personal/profile`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and the stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Round 29 Commit Record

- Feature commit:
  `b46f9bb feat(core-user): add self-password loop / 新增自助改密闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 30 Capability

Capability: `core.user` simple-list option source productization.

Goal: close the next user option-source foundation gap by adding an
authenticated enabled-user simple-list endpoint and a real Admin consumer
without exposing management-only fields.

## Round 30 Implemented

- Added `UserOptionDto` with `id`, `username`, `displayName`, `deptId` and
  `postCodes`.
- Added `listUserOptions()` to system user repository/service contracts.
- Implemented enabled-user filtering and existing department-subtree filtering
  for seed and Prisma repositories.
- Added `GET /api/core/users/simple-list` as an auth-only endpoint before
  dynamic `users/:id` routes.
- Kept user simple-list free of `core:user:read` while still requiring bearer
  authentication because it exposes people data.
- Extended API permission-matrix tests so the route remains auth-only.
- Extended OpenAPI, `@opencore/sdk` types/client methods and SDK path tests.
- Added Admin platform `listOpenCoreUserOptions()`.
- Updated Admin Roles User Assignment `Transfer` to consume the user option
  source for labels while role-user assignment state remains owned by
  `GET/PATCH /api/core/roles/:code/users`.
- Extended static Admin smoke guards for the new service method and Roles page
  consumer markers.
- Extended `tools/scripts/smoke-core-user.mjs` to prove unauthenticated 401,
  unknown-department 404, department filtering, enabled-only filtering and
  option shape without `roleCodes`/`enabled`/`system`.

## Round 30 Verification

- `node --check tools/scripts/smoke-core-user.mjs` pass.
- `node --check apps/admin/scripts/smoke-test.mjs` pass.
- Focused tests pass:
  - `NX_DAEMON=false pnpm nx test system --runInBand --runTestsByPath packages/system/src/system-user/system-user.spec.ts`
  - `NX_DAEMON=false pnpm nx test sdk --runInBand --runTestsByPath packages/sdk/src/rbac-client.spec.ts`
  - `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/rbac.permission-matrix.spec.ts`
  - `pnpm test:admin`
- `pnpm openapi:export`, `pnpm openapi:check`,
  `pnpm openapi:registry-tags:check` and `pnpm sdk:check` pass.
- `pnpm typecheck` pass.
- `pnpm lint` pass; the known Biome warning in
  `apps/admin/src/pages/shared/CurrentPageExportButton.tsx` remains non-blocking.
- `pnpm prisma:validate` pass.
- `pnpm format:check` pass.
- `git diff --check` pass.
- `pnpm registry:admin-routes:check` pass.
- `pnpm test:api`, `NX_DAEMON=false pnpm nx test contracts`,
  `NX_DAEMON=false pnpm nx test module-registry` and
  `NX_DAEMON=false pnpm nx test sdk` pass.
- `pnpm smoke:api:local` pass on fixed port `39173`, including
  `core.user.simple-list.auth-guard`,
  `core.user.simple-list.authenticated-consumer`,
  `core.user.simple-list.option-shape`,
  `core.user.simple-list.dept-filter`,
  `core.user.simple-list.disabled-filtered` and
  `core.user.simple-list.enabled-filter`.
- `pnpm test` pass for all 19 Nx projects.
- `pnpm build` pass for all 19 Nx projects.
- `pnpm deploy:opencore` pass, deploying API/Admin on fixed ports
  `39172`/`39174`; deploy smoke includes the new user simple-list checks and
  the existing login-prefix/frontend-cache/session-revocation guards.

## Round 30 Public Verification

Against public endpoints after deploy:

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `GET http://144.217.243.161:39174/system/roles/` returned 200.
- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false` and the
  deployed admin password loaded from `.env.opencore.local` without printing
  secrets.
- Public user smoke verified authenticated simple-list consumption,
  unauthenticated 401, unknown-department 404, department filtering,
  disabled-user filtering, enabled-user re-entry and option shape without
  management fields.
- Public main Admin bundle `umi.a7593895.js` contains API origin
  `http://144.217.243.161:39172` and `/core/users/simple-list`, and does not
  contain `/api/api/auth/login`.
- Public Roles chunk `p__System__Roles.978efe8a.async.js` contains
  `User Assignment`, `Available users` and `Assigned users`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and the stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Round 30 Commit Record

- Feature commit:
  `3dd1b5a feat(core-user): add simple-list option source / 新增用户精简选项源`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 31 Capability

Capability: `core.user` profile avatar productization.

Goal: close the next user profile gap by adding authenticated current-user
avatar upload/removal and public preview backed by OpenCore file storage.

## Round 31 Implemented

- Added nullable user avatar metadata columns:
  `avatarUrl`, internal `avatarStorageKey`, `avatarMimeType`,
  `avatarSizeBytes` and `avatarUpdatedAt`.
- Added Prisma migration
  `20260613010000_user_profile_avatar/migration.sql`.
- Extended system user seed/Prisma repository and service contracts with
  `getUserAvatar()`, `updateUserAvatar()` and `clearUserAvatar()`.
- Kept `avatarStorageKey` out of public user summary/profile DTOs while
  exposing `avatarUrl` and public metadata.
- Extended security auth user records and `/auth/me` user payload with
  `avatarUrl`.
- Added `POST /api/core/users/profile/avatar` as an auth-only current-user
  upload endpoint before dynamic `users/:id` routes.
- Added file-name, base64, max-size, allowed MIME and image magic-byte
  validation; SVG and arbitrary text are rejected.
- Stored avatar bytes through `FileStorageService` and delete old avatar
  objects on replacement.
- Added `DELETE /api/core/users/profile/avatar` to clear the current user's
  avatar and remove the stored object.
- Added public read-only `GET /api/core/users/:id/avatar` for browser image
  preview and Admin same-origin proxy usage.
- Extended API permission-matrix tests so upload/delete stay authenticated-only
  without `core:user:update`, while preview stays intentionally public.
- Extended OpenAPI and `@opencore/sdk` avatar request/types/client methods.
- Added Admin Profile upload/remove avatar controls, client-side MIME/size
  checks and `avatarUrl` synchronization to Ant Design Pro's `avatar` field.
- Extended Admin static smoke markers for the avatar service methods, page
  controls and current-user avatar mapping.
- Extended `tools/scripts/smoke-core-user.mjs` to prove auth guard,
  MIME/base64 rejection, upload, public byte-for-byte download, `/auth/me`
  avatar refresh, delete and post-delete 404 while preserving any pre-existing
  admin avatar.

## Round 31 Verification

- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm nx test security --testFile=security-auth.spec.ts`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `node scripts/smoke-test.mjs` from `apps/admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,security`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm nx test admin`
- `pnpm smoke:api:local`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `pnpm openapi:registry-tags:check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.profile.avatar.auth-guard`,
`core.user.profile.avatar.mime-guard`,
`core.user.profile.avatar.base64-guard`,
`core.user.profile.avatar.upload`,
`core.user.profile.avatar.public-download`,
`core.user.profile.avatar.auth-me-refresh`,
`core.user.profile.avatar.delete` and
`core.user.profile.avatar.delete-removes-public-download`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke includes the new user avatar checks and the
existing login-prefix/frontend-cache/session-revocation guards.

## Round 31 Public Verification

Against public endpoints after deploy:

- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` after loading the deployed admin password
  from `.env.opencore.local` without printing secrets.
- Public user smoke verified unauthenticated avatar upload 401, invalid MIME
  400, invalid base64 400, avatar upload, public byte-for-byte download,
  `/auth/me` avatar URL refresh, delete and post-delete 404.
- `GET http://144.217.243.161:39172/health/ready` returned 200.
- `GET http://144.217.243.161:39174/` returned 200.
- `GET http://144.217.243.161:39174/personal/profile` returned 200.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.
- Public Profile chunk `p__Personal__Profile.e34daa22.async.js` contains
  `Upload avatar`, `Remove avatar`, `Avatar updated.`, `Avatar removed.` and
  `avatarUrl`.
- Public Admin same-origin avatar verification uploaded a PNG via
  `http://144.217.243.161:39174/api/core/users/profile/avatar`, then fetched
  the returned `avatarUrl` through the Admin origin and matched the image bytes.

## Round 31 Commit Record

- Feature commit:
  `09cb9b0 feat(core-user): add profile avatar loop / 新增用户头像闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 32 Capability

Capability: `core.user` batch mutation productization.

Goal: close the user-management batch status/delete workflow while preserving
system-user protection and the session revocation semantics introduced by the
single-user mutation rounds.

## Round 32 Implemented

- Added `BatchSetUserStatusDto`, `BatchDeleteUsersDto` and
  `BatchUserMutationResultDto`.
- Added repository-level batch ID normalization that rejects empty arrays,
  duplicate IDs and non-string IDs.
- Extended system user seed and Prisma repositories with `setUsersStatus()` and
  `deleteUsers()` contracts.
- Protected missing users and system users before mutation.
- Implemented Prisma batch delete as a transaction across `userRole`,
  `userPost` and `user`.
- Added `PATCH /api/core/users/batch/status`, guarded by `core:user:update`.
- Added `DELETE /api/core/users/batch`, guarded by `core:user:delete`.
- Kept both static batch routes before dynamic `users/:id` routes.
- Revoked active online sessions for all affected usernames after batch status
  and batch delete.
- Extended API permission-matrix tests.
- Extended OpenAPI snapshot, SDK batch request/result types, client methods and
  SDK path tests.
- Added Admin platform methods `setOpenCoreUsersStatus()` and
  `deleteOpenCoreUsers()`.
- Added Admin Users row selection, system-user disabled checkboxes and toolbar
  actions for `Enable selected`, `Disable selected` and `Delete selected`.
- Extended Admin static smoke guards for batch service methods and page markers.
- Extended `tools/scripts/smoke-core-user.mjs` to prove empty/duplicate/system/
  missing-user guards, batch disable session revocation and login blocking,
  batch enable, and batch delete session revocation plus login blocking.

## Round 32 Verification

- `pnpm prisma:validate`
- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `node scripts/smoke-test.mjs` from `apps/admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm nx test admin`
- `pnpm smoke:api:local`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `pnpm openapi:registry-tags:check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.batch-status.empty-guard`,
`core.user.batch-status.duplicate-guard`,
`core.user.batch-status.system-user-guard`,
`core.user.batch-status.missing-user-guard`,
`core.user.batch-delete.duplicate-guard`,
`core.user.batch-delete.system-user-guard`,
`core.user.batch-status.disable`,
`core.user.batch-status.revoke-sessions`,
`core.user.batch-status.login-blocked`,
`core.user.batch-status.enable`,
`core.user.batch-delete`,
`core.user.batch-delete.revoke-sessions` and
`core.user.batch-delete.login-blocked`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke includes the new user batch checks and the
existing login-prefix/frontend-cache/session-revocation guards.

## Round 32 Public Verification

Against public endpoints after deploy:

- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` after loading the deployed admin password
  from `.env.opencore.local` without printing secrets.
- Public user smoke verified empty IDs 400, duplicate IDs 400, system-user 400,
  missing user 404, batch disable, two-session revocation, login blocking,
  batch re-enable, batch delete, two-session revocation and post-delete login
  blocking.
- Public Admin `GET http://144.217.243.161:39174/system/users/` returned 200.
- Public Users chunk `p__System__Users.9bc5aeb8.async.js` contains
  `Enable selected`, `Disable selected`, `Delete selected` and
  `Selected users deleted.`.
- Public main bundle `umi.43e7d8e3.js` contains `/core/users/batch/status` and
  `/core/users/batch`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.
- Public Admin same-origin batch status guard returned 400 for an empty
  `userIds` payload, proving the Admin proxy reaches the new batch endpoint.

## Round 32 Commit Record

- Feature commit:
  `1bfd082 feat(core-user): add batch user mutations / 新增用户批量变更闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 33 Capability

Capability: `core.user` import template and CSV import productization.

Goal: close the user-management import-template/import-result workflow while
preserving existing create/update validation, system-user protection and
session revocation semantics.

## Round 33 Implemented

- Added user import template, import request, import failure and import result
  DTOs.
- Added a CSV-compatible import template with filename
  `opencore-system-users-import-template.csv`.
- Added strict base64, CSV header, file-size, empty-file and unclosed-quote
  validation.
- Added fixed import columns: `username`, `displayName`, `password`,
  `roleCodes`, `deptId`, `postCodes` and `enabled`.
- Treated blank department/post cells as no binding and semicolon-delimited
  role/post lists.
- Required `updateExisting` to be a real boolean and rejected string boolean
  payloads with 400.
- Returned file-level failures as 400 and row-level business failures inside
  structured `failures` while allowing other rows to succeed.
- Created new users through existing repository validation and updated
  existing normal users only when `updateExisting: true`.
- Kept system-user mutation protection at the repository boundary.
- Revoked active online sessions for usernames updated by import.
- Added `GET /api/core/users/import-template` and
  `POST /api/core/users/import`, guarded by `core:user:create` and registered
  before dynamic `users/:id` routes.
- Extended API permission-matrix tests.
- Extended OpenAPI snapshot, SDK import request/result types, client methods
  and SDK path tests.
- Added Admin platform methods for template download and import submission.
- Added Admin Users toolbar actions for `Download import template` and
  `Import users`, plus an import modal with CSV selection, update-existing
  checkbox and import result/failure display.
- Extended Admin static smoke guards for import service methods and page
  markers.
- Extended `tools/scripts/smoke-core-user.mjs` to prove import template
  download, strict `updateExisting` boolean guard, partial import results,
  update-existing session revocation and enabled-user option filtering.

## Round 33 Verification

- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `node scripts/smoke-test.mjs` from `apps/admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm nx test admin`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm format:check`
- `pnpm smoke:api:local`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `git diff --check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.import-template`,
`core.user.import.update-existing-boolean-guard`,
`core.user.import.partial-result`,
`core.user.import.update-revoke-session` and
`core.user.import.enabled-filter`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke includes the new user import checks and the
existing login-prefix/frontend-cache/session-revocation guards.

## Round 33 Public Verification

Against public endpoints after deploy:

- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` after loading the deployed admin password
  from `.env.opencore.local` without printing secrets.
- Public user smoke verified template download, strict `updateExisting`
  string rejection, partial import result, update-existing session revocation
  and disabled imported-user filtering from `users/simple-list`.
- Public Admin `GET http://144.217.243.161:39174/system/users/` returned 200.
- Public main bundle `umi.4dea9225.js` contains `/core/users/import-template`
  and `/core/users/import`.
- Public Users chunk `p__System__Users.b1acfbc5.async.js` contains
  `Download import template`, `Import users`, `Update existing users` and
  `Select CSV file`.
- Public Admin same-origin proxy login returned 201 for `/api/auth/login` and
  stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.
- Public Admin same-origin import-template returned the expected filename and
  sample row `operator_import`.
- Public Admin same-origin import strict boolean guard returned 400 for
  `updateExisting: "true"`.

## Round 33 Commit Record

- Feature commit:
  `1c49e36 feat(core-user): add user import loop / 新增用户导入闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 34 Capability

Capability: `core.user` import permission productization.

Goal: split user import away from `core:user:create` so operators can grant
single-user creation without granting bulk import.

## Round 34 Implemented

- Added `import` to the `PermissionAction` contract.
- Registered `core:user:import` only on the `core.user` module.
- Added contracts, module-registry and SDK registry fixture tests for the new
  permission action.
- Moved `GET /api/core/users/import-template` to `core:user:import`.
- Moved `POST /api/core/users/import` to `core:user:import`.
- Updated API permission-matrix tests.
- Added `canImportUsers` to Admin access.
- Guarded Admin Users import-template and import buttons with `canImportUsers`.
- Added a missing-permission marker for users without `core:user:import`.
- Extended Admin static smoke for `core:user:import`, `canImportUsers` and the
  Users page marker.
- Extended `tools/scripts/smoke-core-user.mjs` with a temporary create-only
  role/user that proves create permission does not authorize import.

## Round 34 Verification

- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm nx test sdk --testFile=registry-fixtures.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `node scripts/smoke-test.mjs` from `apps/admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx test admin`
- `pnpm smoke:api:local`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.import.permission-split`,
`core.user.import-template`,
`core.user.import.update-existing-boolean-guard`,
`core.user.import.partial-result`,
`core.user.import.update-revoke-session` and
`core.user.import.enabled-filter`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke includes the new import permission split and the
existing login-prefix/frontend-cache/session-revocation guards. Prisma seed
reported `permissions: 105`, proving the registry permission count includes
the new `core:user:import` entry.

## Round 34 Public Verification

Against public endpoints after deploy:

- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` after loading the deployed admin password
  from `.env.opencore.local` without printing secrets.
- Public user smoke verified a create-only role/user has `core:user:create`,
  does not have `core:user:import`, and receives 403 from import-template and
  import endpoints.
- Public Admin `GET http://144.217.243.161:39174/system/users/` returned 200.
- Public main bundle `umi.5add3ee4.js` contains `core:user:import`,
  `/core/users/import-template` and `/core/users/import`.
- Public Users chunk `p__System__Users.1a00d4b1.async.js` contains
  `Download import template`, `Import users`, `Update existing users`,
  `Select CSV file` and `Missing core:user:import`.
- Public Admin same-origin proxy login returned 201 for `/api/auth/login` and
  stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.
- Public Admin same-origin permission catalog returned `core:user:import`.
- Public Admin same-origin import-template returned
  `opencore-system-users-import-template.csv`.

## Round 34 Commit Record

- Feature commit:
  `f152c4d feat(core-user): add import permission / 新增用户导入权限`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 35 Capability

Capability: `core.user` native XLSX export productization.

Goal: move user export from a metadata preview to a real downloadable Excel
file payload while keeping XLSX import parsing as a later, separate loop.

## Round 35 Implemented

- Rechecked RuoYi user `/export` plus `ExcelUtil.exportExcel` and Yudao
  `/export-excel` plus `ExcelUtils.write`.
- Added `contentType` and `contentBase64` to the shared RBAC export response
  shape.
- Changed `core.user` export to return `opencore-system-users.xlsx` with MIME
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Generated the XLSX container with `fflate`, avoiding a large new Excel
  dependency and lockfile churn.
- Preserved `core:user:export` on `GET /api/core/users/export`.
- Added SDK/OpenAPI optional export payload fields.
- Added Admin `canExportUsers` access mapping.
- Added an Admin Users `Download Excel` backend export button guarded by
  `core:user:export`.
- Extended Admin static smoke for export service, permission and UI markers.
- Extended `tools/scripts/smoke-core-user.mjs` with `core.user.export.xlsx`,
  checking filename, MIME, columns, base64, XLSX zip header and byte length.
- Added `tools/scripts/sync-prisma-client-instances.mjs` and chained it from
  `pnpm prisma:generate` so pnpm workspace `@prisma/client` peer instances do
  not keep stale generated schemas after install.

## Round 35 Verification

- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `pnpm nx test system --testFile=system-user.spec.ts`
- `node scripts/smoke-test.mjs` from `apps/admin`
- `pnpm nx test admin`
- `pnpm install --frozen-lockfile --ignore-scripts`
- `pnpm prisma:generate`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm format:check`
- `pnpm smoke:api:local`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `git diff --check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.export.xlsx`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke also included `core.user.export.xlsx` and the
existing login-prefix/frontend-cache/session-revocation guards. Prisma seed
reported `permissions: 105`.

## Round 35 Public Verification

Against public endpoints after deploy:

- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` after loading the deployed admin password
  from `.env.opencore.local` without printing secrets.
- Public user smoke verified `core.user.export.xlsx`: filename
  `opencore-system-users.xlsx`, Excel MIME, export columns, base64 body and
  XLSX zip header.
- Public Admin `GET http://144.217.243.161:39174/system/users/` returned 200.
- Public main bundle `umi.c69be9c1.js` contains `core:user:export` and
  `/core/users/export`.
- Public Users chunk `p__System__Users.375bc26e.async.js` contains
  `Download Excel`, `User Excel export downloaded`,
  `Missing core:user:export` and `Download import template`.
- Public Admin same-origin proxy login returned 201 for `/api/auth/login` and
  stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.
- Public Admin same-origin
  `/api/core/users/export?deptId=dept_operations` returned an XLSX payload with
  the expected filename, MIME, columns and `PK` zip header.

## Round 35 Commit Record

- Feature commit:
  `407dbd0 feat(core-user): add xlsx user export / 新增用户 Excel 导出`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 36 Capability

Capability: `core.user` native XLSX import productization.

Goal: close the user import file-format gap by returning an XLSX import
template and accepting XLSX import payloads, while preserving CSV backwards
compatibility and the existing import permission/result/session semantics.

## Round 36 Implemented

- Rechecked RuoYi and Yudao user import-template/import Excel workflows.
- Changed `createSystemUserImportTemplate()` to return
  `opencore-system-users-import-template.xlsx`.
- Reused the existing `fflate` XLSX zip generation path through a generic
  workbook helper.
- Added `parseSystemUserImport()` with automatic XLSX/CSV detection.
- Added XLSX parsing for `xl/worksheets/sheet1.xml`, inline strings, shared
  strings, boolean cells and basic value cells.
- Kept CSV import backwards compatible through `parseSystemUserImportCsv()` as
  a compatibility wrapper.
- Preserved `core:user:import`, strict `updateExisting` boolean validation,
  partial failures, role/dept/post validation and import-update session
  revocation.
- Updated OpenAPI import description from CSV-only to CSV/XLSX.
- Updated Admin Users upload text and accepted file types to CSV/XLSX.
- Updated Admin static smoke marker to `Select CSV/XLSX file`.
- Extended `tools/scripts/smoke-core-user.mjs` with `core.user.import.xlsx`,
  using a dynamically generated XLSX file and dynamic username.

## Round 36 Verification

- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `node --check tools/scripts/smoke-core-user.mjs`
- `pnpm nx test admin`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm format:check`
- `pnpm smoke:api:local`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `git diff --check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.import.xlsx`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke also included `core.user.import.xlsx`, the
duplicate `/api/api` login guards, Admin bundle no-cache guard and session
revocation guards. Prisma seed reported `permissions: 105`.

## Round 36 Public Verification

Against public endpoints after deploy:

- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` after loading the deployed admin password
  from `.env.opencore.local` without printing secrets.
- Public user smoke verified `core.user.import.xlsx` by uploading a dynamic
  XLSX workbook and creating a dynamic user through the import endpoint.
- Public Admin bundle check passed for `http://144.217.243.161:39174`, with
  bundle `/umi.429950b2.js` and no duplicate API prefix.
- Public Users chunk `p__System__Users.241380ef.async.js` contains
  `Select CSV/XLSX file`, `Download import template` and `Import users`.
- Public Admin same-origin `/api/core/users/import-template` returned
  `opencore-system-users-import-template.xlsx`, the Excel MIME type and an
  XLSX `PK` zip header.

## Round 36 Commit Record

- Feature commit:
  `1437eb8 feat(core-user): add xlsx user import / 新增用户 Excel 导入`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 37 Capability

Capability: `core.config` metadata enrichment.

Goal: add operator-facing config `category`, `name` and `remark` across the
runtime/API/SDK/Admin surfaces while preserving secret redaction and the
existing public value/cache controls.

## Round 37 Implemented

- Rechecked Yudao config DTOs and RuoYi config management metadata shape.
- Added `category`, required `name` and optional `remark` to `SystemConfig`.
- Added a Prisma migration that backfills existing rows with
  `category='system'` and `name=key` before enforcing required names.
- Updated config seed records and runtime fixtures with meaningful metadata.
- Extended DTOs, repository normalization, Prisma repository and seed
  repository behavior for metadata create/update.
- Preserved secret value redaction while exposing metadata for secret configs.
- Extended SDK config types, registry fixtures and OpenAPI output.
- Extended Admin Config list/detail/create/edit/filter/export surfaces for
  category/name/remark.
- Extended Admin static smoke and `tools/scripts/smoke-core-config.mjs` to
  guard metadata create/detail/update/export behavior.

## Round 37 Verification

- `pnpm prisma:generate && pnpm prisma:migrate`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm openapi:export && pnpm sdk:check`
- `node --check tools/scripts/smoke-core-config.mjs`
- `pnpm nx test admin`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test sdk --testFile=registry-fixtures.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm format:check`
- `pnpm prisma:validate`
- `pnpm smoke:api:local`
- `pnpm build:api`
- `pnpm build:admin`
- `git diff --check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.metadata`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included `core.config.metadata`, duplicate
`/api/api` login guards, Admin bundle no-cache checks and session guards.

## Round 37 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.metadata`.
- Public Admin Config chunk `p__System__Config.a971fcdf.async.js` contains
  `Category`, `Name`, `Remark`, `Refresh cache` and
  `Read public value by key`.
- Public Admin same-origin login via `/api/auth/login` succeeded.
- Public Admin same-origin `/api/core/config?page=1&pageSize=10` returned the
  seeded `opencore.admin.title` row with `category='system'`,
  `name='Admin title'` and a non-empty `remark`.

## Round 37 Commit Record

- Feature commit:
  `2a1f324 feat(core-config): add config metadata / 新增系统配置元数据`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 38 Capability

Capability: `core.config` native XLSX export.

Goal: move config export from preview metadata to a real downloadable Excel
payload while preserving the existing JSON API boundary and secret redaction.

## Round 38 Implemented

- Rechecked Yudao `ConfigController` `/export-excel` and Admin
  `request.download` config export shape.
- Added `contentType/contentBase64` to `core.config` export results.
- Changed config export filename to `opencore-system-config.xlsx`.
- Added workbook columns
  `category/name/key/value/valueType/visibility/public/description/remark`.
- Preserved secret value redaction by exporting redacted repository results.
- Extracted `packages/system/src/export-xlsx.ts` and reused it from user and
  config exports.
- Extended OpenAPI and SDK export preview types with optional file payload
  fields.
- Added Admin `canExportSystemConfig` access mapping.
- Added Admin Config `Download Excel` backend export action and
  `Missing core:config:export` marker.
- Extracted a shared Admin `downloadBase64File()` helper and reused it from
  Users and Config.
- Extended Admin static smoke and `tools/scripts/smoke-core-config.mjs` with
  XLSX export guards.

## Round 38 Verification

- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm nx test admin`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `pnpm openapi:export && pnpm sdk:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm format:check`
- `pnpm prisma:validate`
- `pnpm smoke:api:local`
- `pnpm build:api`
- `pnpm build:admin`
- `git diff --check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.export.xlsx`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included `core.config.export.xlsx`, duplicate
`/api/api` login guards, Admin bundle no-cache checks and session guards.

## Round 38 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.export.xlsx`.
- Public Admin Config chunk `p__System__Config.911ece50.async.js` contains
  `Download Excel`, `Config Excel export downloaded`,
  `Missing core:config:export`, `contentBase64`, `Refresh cache` and
  `Read public value by key`.
- Public Admin same-origin `/api/auth/login` succeeded.
- Public Admin same-origin
  `/api/core/config/export?page=1&pageSize=100` returned
  `opencore-system-config.xlsx`, the XLSX MIME type, a `value` column and a
  `PK` zip payload.

## Round 38 Commit Record

- Feature commit:
  `3419c24 feat(core-config): add xlsx config export / 新增配置 Excel 导出`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 39 Capability

Capability: `core.config` batch deletion.

Goal: add a permission-gated selected-row batch delete loop for system config
while preserving OpenCore's key-based config identity and value-cache
invalidation semantics.

## Round 39 Implemented

- Rechecked Yudao `ConfigController` `/delete-list` and Admin
  `deleteConfigList(ids)` config deletion shape.
- Added `BatchDeleteSystemConfigsDto` and
  `SystemConfigBatchMutationResultDto`.
- Added `deleteConfigs` to the system config repository/service contract and
  both seed and Prisma implementations.
- Added strict batch key normalization for array shape, non-empty values and
  duplicates.
- Added missing-config validation before mutation.
- Added service-level cache invalidation for every deleted key.
- Added `DELETE /api/core/config/batch`, guarded by `core:config:delete`,
  before the dynamic `config/:key` route.
- Extended OpenAPI, SDK types/client and SDK path tests.
- Added Admin Config `rowSelection`, selected-key state and `Delete selected`
  action using `deleteOpenCoreSystemConfigs`.
- Extended Admin static smoke for batch-delete UI/service markers.
- Extended `tools/scripts/smoke-core-config.mjs` with empty-array,
  duplicate-key, missing-key, success and cache-invalidation guards.

## Round 39 Verification

- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `node --check tools/scripts/smoke-core-config.mjs`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm format:check`
- `pnpm prisma:validate`
- `git diff --check`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.batch-delete.empty-guard`,
`core.config.batch-delete.duplicate-guard`,
`core.config.batch-delete.missing-guard`, `core.config.batch-delete` and
`core.config.batch-delete.cache-invalidation`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included the same `core.config` batch-delete
guards, duplicate `/api/api` login guards, Admin bundle no-cache checks and
session guards.

## Round 39 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.batch-delete.*` guards.
- Public Admin Config chunk `p__System__Config.8795ee37.async.js` contains
  `Delete selected`, `rowSelection` and `Selected configs deleted`.
- Public Admin main bundle `umi.257e0bb2.js` contains `/core/config/batch`.
- Public Admin same-origin `/api/auth/login` succeeded.
- Public Admin same-origin `/api/core/config/batch` created two temporary
  configs, batch-deleted both and confirmed both return 404.

## Round 39 Commit Record

- Feature commit:
  `4940291 feat(core-config): add batch config deletion / 新增配置批量删除`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 40 Capability

Capability: `core.config` system deletion policy.

Goal: add a persisted system/custom boundary for configuration rows so seeded
built-in configs cannot be deleted by single-row or batch-delete flows, while
operator-created configs remain mutable.

## Round 40 Implemented

- Rechecked Yudao `ConfigTypeEnum.SYSTEM/CUSTOM`, create-as-custom behavior and
  single/batch delete system-config guards.
- Added `SystemConfig.system` with Prisma migration backfill for
  `opencore.admin.title` and `auth.login.lockoutMinutes`.
- Marked seed records and SDK fixtures with `system=true`; new config creation
  stores `system=false`.
- Added shared `assertSystemConfigMutable` and enforced it in seed and Prisma
  single-delete paths.
- Added batch-delete preflight rejection for any selected system config before
  mutation.
- Exposed `system` through DTO/OpenAPI/SDK types and XLSX export columns.
- Added Admin Config System column/filter/detail/export support.
- Disabled row delete and row-selection checkboxes for system rows; batch delete
  now sends only selected custom keys.
- Extended Admin static smoke and `tools/scripts/smoke-core-config.mjs` with
  system flag, single-delete guard and mixed-batch guard checks.

## Round 40 Verification

- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm nx test sdk --testFile=registry-fixtures.spec.ts`
- `pnpm nx test admin`
- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system`
- `pnpm prisma:validate`
- `pnpm format:check`
- `git diff --check`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test contracts`
- `pnpm nx test module-registry`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.system-flag`, `core.config.system-delete-guard` and
`core.config.batch-delete.system-guard`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included the same `core.config` system deletion
guards, duplicate `/api/api` login guards, Admin bundle no-cache checks and
session guards.

## Round 40 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.system-flag`, `core.config.system-delete-guard` and
  `core.config.batch-delete.system-guard`.
- Public Admin Config chunk `p__System__Config.c06f078e.async.js` contains
  `System built-in configs cannot be deleted`, `getCheckboxProps`,
  `selected custom config(s)?` and `dataIndex:"system"`.
- Public Admin main bundle `umi.d3cc4418.js` contains the deployed API origin
  and does not contain `/api/api`.
- Public Admin same-origin `/api/auth/login` succeeded.
- Public API `/api/core/config/opencore.admin.title` returned `system=true`.
- Public API single delete for `opencore.admin.title` returned 400.
- Public API mixed batch delete with a custom config plus
  `opencore.admin.title` returned 400 and left the custom config intact before
  cleanup.

## Round 40 Commit Record

- Feature commit:
  `c7a3db8 feat(core-config): guard system config deletion / 保护系统配置删除`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 41 Capability

Capability: `core.user` dedicated user-side role assignment.

Goal: add the operator workflow expected from RuoYi/Yudao where a user row can
open a role-assignment dialog, save selected roles through a dedicated
permission, and revoke stale sessions when the assignment changes.

## Round 41 Implemented

- Rechecked Yudao user role assignment through
  `list-user-roles` and `assign-user-role`, plus the user table `分配角色`
  modal.
- Added `core:user:manage` to the `core.user` registry permission set.
- Added user-role assignment DTOs and repository/service contracts.
- Implemented seed and Prisma role assignment reads and writes.
- Reused role-code normalization and added duplicate/missing-role/system-user
  guards for the user-side mutation path.
- Added `GET/PATCH /api/core/users/:id/roles`, guarded by
  `core:user:manage`, before the dynamic `users/:id` route.
- Revoked active online-user sessions when the role set changes.
- Extended API permission matrix, OpenAPI snapshot, SDK types/client/tests and
  registry fixture tests.
- Added Admin access `canAssignUserRoles`.
- Added Admin Users `Assign Roles` row action, modal, missing-permission copy
  and system-user disabled state.
- Extended Admin static smoke and `tools/scripts/smoke-core-user.mjs` with
  role-assignment service/UI markers and real HTTP guards.

## Round 41 Verification

- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm nx test api --testFile=rbac.permission-matrix.spec.ts`
- `pnpm nx test sdk --testFile=rbac-client.spec.ts`
- `pnpm nx test module-registry`
- `pnpm nx test admin`
- `pnpm nx test contracts`
- `node --check tools/scripts/smoke-core-user.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.role-assignment.get`,
`core.user.role-assignment.permission-guard`,
`core.user.role-assignment.system-user-guard`,
`core.user.role-assignment.duplicate-role-guard`,
`core.user.role-assignment.missing-role-guard`,
`core.user.role-assignment.clear`,
`core.user.role-assignment.revoke-session`,
`core.user.role-assignment.login-refresh`,
`core.user.role-assignment.restore` and
`core.user.role-assignment.restore-revoke-session`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included the same `core.user` role-assignment
guards, duplicate `/api/api` login guards, Admin bundle cache checks and
session guards.

## Round 41 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-user` passed and included all
  `core.user.role-assignment.*` guards.
- Public Admin Users chunk `p__System__Users.9f27a9ab.async.js` contains
  `Assign Roles`, `Missing core:user:manage`,
  `System users cannot be assigned roles`, `Roles assigned.` and
  `Select roles`.
- Public Admin main bundle `umi.a0a7b9b5.js` contains the deployed API origin
  and does not contain duplicate `/api/api` prefixes.
- Public Admin same-origin `/api/auth/login` succeeded.
- Public API `/api/auth/login` succeeded.

## Round 41 Commit Record

- Feature commit:
  `fdfbd12 feat(core-user): add dedicated user role assignment / 新增用户侧角色分配`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 42 Capability

Capability: `core.post` batch deletion.

Goal: close the next `core.post` foundation gap by adding selected-row batch
deletion across API/SDK/Admin while preserving strict all-or-nothing validation
before mutation.

## Round 42 Implemented

- Rechecked Yudao post `delete-list` and Admin table batch-delete shape.
- Added `BatchDeleteSystemPostsDto` and
  `SystemPostBatchMutationResultDto`.
- Added `deletePosts` to the post repository/service contracts.
- Implemented seed and Prisma batch delete with array/non-empty/duplicate code
  validation and missing-post preflight before deleting anything.
- Added `DELETE /api/core/posts/batch`, guarded by `core:post:delete`, before
  the dynamic `posts/:code` route.
- Extended API permission matrix, OpenAPI snapshot and SDK types/client/tests.
- Added Admin platform `deleteOpenCoreSystemPosts`.
- Added Admin Posts `rowSelection`, `Delete selected`, loading state and
  selected-row cleanup.
- Extended Admin static smoke and `tools/scripts/smoke-core-post.mjs` with
  batch-delete service/UI markers and real HTTP guards.

## Round 42 Verification

- `pnpm nx test system --testFile=system-post.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `node --check tools/scripts/smoke-core-post.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.post.batch-delete.empty-guard`,
`core.post.batch-delete.duplicate-guard`,
`core.post.batch-delete.missing-guard`,
`core.post.batch-delete` and
`core.post.batch-delete.simple-list-cleanup`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included the same `core.post` batch-delete
guards, duplicate `/api/api` login guards, Admin bundle cache checks and
session guards.

## Round 42 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-post` passed and included all
  `core.post.batch-delete.*` guards.
- Public Admin Posts chunk `p__System__Posts.f86b24a4.async.js` contains
  `Delete selected`, `Selected posts deleted` and `rowSelection`.
- Public Admin main bundle `umi.d7bf768f.js` contains the deployed API origin
  and does not contain duplicate `/api/api` auth prefixes.
- Public Admin same-origin `/api/auth/login` succeeded.
- Public Admin same-origin `/api/core/posts` created two temporary posts, and
  `/api/core/posts/batch` deleted both with `affected=2`; both detail endpoints
  then returned 404.

## Round 42 Commit Record

- Feature commit:
  `885fa9e feat(core-post): add batch post deletion / 新增岗位批量删除`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 43 Capability

Capability: `core.dept` user-binding delete guard.

Goal: prevent deleting a department while users are assigned to it, and prove
the failed delete preserves each bound user's `deptId` instead of letting the
Prisma relation silently set it to null.

## Round 43 Implemented

- Rechecked RuoYi/Yudao department deletion guards and OpenCore's
  `User.deptId` relation behavior.
- Added a shared department repository guard for assigned-user counts.
- Applied the guard to seed and Prisma `deleteDept` implementations after the
  existing child-department preflight and before mutation.
- Extended seed repository tests to reject deleting a department with assigned
  users and keep the department row present.
- Extended Prisma repository tests to create a temporary department/user, reject
  department deletion while assigned, verify the user `deptId` remains, then
  delete the user and successfully clean up the department.
- Extended `tools/scripts/smoke-core-dept.mjs` with
  `core.dept.delete.assigned-user-guard` and
  `core.dept.delete.assigned-user-preserved`.
- Added Admin Departments delete-error handling with an assigned-user fallback
  message.
- Extended Admin static smoke to lock the assigned-user delete warning.

## Round 43 Verification

- `node --check tools/scripts/smoke-core-dept.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-dept.spec.ts`
- `pnpm nx test admin`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm prisma:validate`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.dept.delete.assigned-user-guard` and
`core.dept.delete.assigned-user-preserved`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included the same `core.dept` assigned-user
delete guards, duplicate `/api/api` login guards, Admin bundle cache checks and
session guards.

## Round 43 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-dept` passed and included
  `core.dept.delete.assigned-user-guard` and
  `core.dept.delete.assigned-user-preserved`.
- Public Admin Departments chunk `p__System__Departments.f85a1a09.async.js`
  contains `assigned users cannot be deleted`.
- Public Admin main bundle contains the deployed API origin and does not
  contain duplicate `/api/api` auth prefixes.
- Public Admin same-origin `/api/auth/login` and compatible
  `/api/api/auth/login` both succeeded.
- Public Admin same-origin proxy created a temporary department plus bound
  user, `DELETE /api/core/depts/:id` returned 400, `GET /api/core/users/:id`
  preserved the same `deptId`, and cleanup deleted the user then the
  department.

## Round 43 Commit Record

- Feature commit:
  `b4624cf feat(core-dept): guard deleting assigned departments / 保护已分配用户的部门删除`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 44 Capability

Capability: `core.config` runtime Admin config.

Goal: turn the seeded public `opencore.admin.title` config into an actual
frontend runtime setting by exposing a public runtime summary endpoint and
having Admin bootstrap/login consume it.

## Round 44 Implemented

- Rechecked Yudao/RuoYi config-center positioning as runtime parameter sources.
- Added `SystemConfigRuntimeDto` and `SystemConfigRuntimeResult`.
- Added public `GET /api/core/config/runtime` before the dynamic
  `config/:key` route.
- Built runtime config from `opencore.admin.title` through the existing public
  config value cache and update invalidation path.
- Extended API permission matrix to keep the runtime endpoint explicitly
  public.
- Extended OpenAPI snapshot, SDK types/client/tests with tokenless
  `getConfigRuntime()`.
- Added Admin `runtimeConfig` service.
- Updated Admin `getInitialState` to load runtime config and set the layout
  title.
- Updated the login page to render the runtime title with `OpenCore Admin` as
  fallback.
- Extended Admin static smoke for runtime config service and login runtime
  title markers.
- Extended `tools/scripts/smoke-core-config.mjs` with
  `core.config.runtime` and `core.config.runtime-cache-invalidation`.

## Round 44 Verification

- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm prisma:validate`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.runtime` and `core.config.runtime-cache-invalidation`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included the same `core.config` runtime guards,
duplicate `/api/api` login guards, Admin bundle cache checks and session
guards.

## Round 44 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed and included
  `core.config.runtime` and `core.config.runtime-cache-invalidation`.
- Public Admin main bundle `umi.19450df1.js` contains
  `/core/config/runtime`, the deployed API origin and no duplicate
  `/api/api/auth/login`.
- Public login chunk contains the runtime title fallback.
- Public Admin same-origin `/api/core/config/runtime` succeeded without a
  bearer token.
- Public Admin same-origin `/api/auth/login` and compatible
  `/api/api/auth/login` both succeeded.
- Public Admin same-origin proxy updated `opencore.admin.title`, public Admin
  runtime config and public API runtime config both returned the new title, and
  the original title was restored.

## Round 44 Commit Record

- Feature commit:
  `bd55c61 feat(core-config): add runtime admin config / 新增运行时管理端配置`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 45 Capability

Capability: `core.login-log` login type and result schema.

Goal: move login logs beyond a single `success` boolean by persisting,
exposing, filtering and rendering explicit login behavior type plus outcome,
while keeping the legacy success field for compatibility.

## Round 45 Implemented

- Rechecked RuoYi remote HEAD `41720e624c5a668c7d3777835e4c87095a7a1dfd`.
- Rechecked Yudao backend HEAD
  `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb` and Admin HEAD
  `caa6fa9be35a7ef13dc3aba082f4675962f5c234`.
- Added `SecurityLoginLogType` and `SecurityLoginResult` string enums.
- Recorded username-login success as `login.username/success`.
- Recorded missing users and bad passwords as
  `login.username/bad_credentials`.
- Recorded disabled users as `login.username/user_disabled` while keeping the
  outward auth failure response unchanged.
- Added persisted `LoginLog.logType` and `LoginLog.result` plus migration
  `20260613064000_login_log_result_schema`.
- Extended Prisma seed, audit DTOs, seed repository, Prisma repository, export
  columns and query normalization.
- Added 400 guards for invalid `logType/result` query values.
- Extended OpenAPI, SDK types, fixtures and SDK path tests.
- Updated Admin Login Logs with Login Type/Result columns, detail fields,
  current-page export columns, current-page filters and server-side filters.
- Extended Admin static smoke and `tools/scripts/smoke-core-login-log.mjs`.
- Fixed the existing XLSX helper regex lint blocker by replacing the regex
  control-character removal with explicit character filtering.

## Round 45 Verification

- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `node --check tools/scripts/smoke-core-login-log.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test security --testFile=security-auth.spec.ts`
- `pnpm nx test audit --testFile=audit-login-log.spec.ts`
- `pnpm nx test api --testFile=auth.service.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm prisma:validate`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,audit,security,contracts`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm lint`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm nx test system --testFile=system-user.spec.ts`
- `pnpm nx typecheck system`
- `pnpm build:api`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.login-log.result-schema` and `core.login-log.invalid-result-guard`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included duplicate `/api/api` login guards,
Admin bundle cache checks, session guards and the same login-log result-schema
checks.

## Round 45 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-login-log` passed with
  `core.login-log.result-schema` and
  `core.login-log.invalid-result-guard`.
- Public Admin main bundle `umi.63f63e69.js` contains the deployed API origin
  and no duplicate `/api/api/auth/login`.
- Public Login Logs chunk `p__Security__LoginLogs.1e1a0df4.async.js` contains
  the Login Type/Result UI and filter markers.
- Public Admin same-origin `/api/auth/login` and compatible
  `/api/api/auth/login` both succeeded.
- Public Admin same-origin proxy recorded a real failed login and returned it
  through `logType=login.username&result=bad_credentials`.
- Public Admin same-origin detail exposed `logType`, `result` and parsed
  browser/device fields.
- Public Admin same-origin export preview included `logType` and `result`
  columns.
- Public Admin same-origin invalid `result` query returned 400.

## Round 45 Commit Record

- Supporting lint commit:
  `4df5dd1 fix(system): satisfy xlsx export lint guard / 修复 XLSX 导出 lint 守卫`.
- Feature commit:
  `167bf08 feat(login-log): add login type result schema / 新增登录日志类型结果模型`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 46 Capability

Capability: `core.config` runtime login policy.

Goal: move the seeded `auth.login.lockoutMinutes` config from a private CRUD
row into the public runtime summary consumed by Admin login, while guarding
runtime config value types so bad operator edits cannot break the runtime
endpoint.

## Round 46 Implemented

- Rechecked RuoYi remote HEAD `41720e624c5a668c7d3777835e4c87095a7a1dfd`.
- Rechecked Yudao backend HEAD
  `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb` and Admin HEAD
  `caa6fa9be35a7ef13dc3aba082f4675962f5c234`.
- Compared RuoYi `selectConfigByKey`, captcha/login account-policy config
  consumption and Yudao `ConfigApi.getConfigValueByKey(...)` runtime usage.
- Made seeded `auth.login.lockoutMinutes` a public system config.
- Added migration `20260613072000_config_runtime_login_policy`.
- Added `loginLockoutMinutes` to `SystemConfigRuntimeDto` and SDK runtime
  summary types.
- Read `loginLockoutMinutes` through the existing public config value cache.
- Added boolean/number config value validation in seed and Prisma repositories.
- Guarded runtime keys from private/secret visibility or incompatible value
  types.
- Required `auth.login.lockoutMinutes` to stay an integer between 1 and 1440.
- Stored `runtimeConfig` in Admin initial state and displayed the Login lockout
  window on the Admin login page.
- Extended Admin static smoke and `tools/scripts/smoke-core-config.mjs`.
- Refreshed OpenAPI snapshot.

## Round 46 Verification

- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm prisma:validate`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,contracts`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.runtime-login-policy` and
`core.config.runtime-login-policy-guards`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included duplicate `/api/api` login guards,
Admin bundle cache checks and the same runtime login-policy guards.

## Round 46 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed with
  `core.config.runtime-login-policy` and
  `core.config.runtime-login-policy-guards`.
- Public Admin main bundle `umi.e39122bd.js` contains the deployed API origin,
  `/core/config/runtime`, runtime config state and no duplicate
  `/api/api/auth/login`.
- Public Admin login chunk `p__user__login__index.48a5b578.async.js` contains
  `loginLockoutMinutes` and `Login lockout window`.
- Public Admin login page returned `cache-control: no-cache`.
- Public Admin same-origin `/api/core/config/runtime` matched public API
  runtime for `adminTitle` and `loginLockoutMinutes`.
- Public Admin same-origin `/api/auth/login` and compatible
  `/api/api/auth/login` both succeeded.
- Public Admin same-origin `auth.login.lockoutMinutes` detail returned
  `public=true`, `visibility=public` and `valueType=number`.
- Public Admin same-origin invalid `value=not-a-number` and
  `visibility=private` updates returned 400.
- Public Admin same-origin valid login-policy update propagated to both public
  API and Admin runtime endpoints, then restored the original value.

## Round 46 Commit Record

- Feature commit:
  `b0b23ee feat(core-config): add runtime login policy / 新增运行时登录策略`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 47 Capability

Capability: `core.login-log` login lockout and unlock.

Goal: turn the runtime `auth.login.lockoutMinutes` policy into an enforced
username/password login lockout, record `account_locked` login-log results and
let an authorized Admin operator unlock a username from the Login Logs surface.

## Round 47 Implemented

- Rechecked RuoYi password retry lockout and login-info username unlock shape.
- Rechecked Yudao login-log result modeling for structured login outcomes.
- Added Prisma `LoginLockout` and migration
  `20260613083000_login_lockout_policy`.
- Added `SecurityLoginLockoutRepository`,
  `SecurityLoginPolicyProvider`, default/noop implementations and security
  unit coverage.
- Added API `LoginSecurityModule`, Prisma lockout repository and
  system-config-backed login policy provider.
- Enforced lockout in shared `SecurityAuthService` before password
  verification and clear counters on success.
- Added `account_locked` login result across audit DTO/repository/OpenAPI/SDK
  and Admin result filters.
- Added permissioned `POST /api/core/login-logs/unlock` with
  `core:login-log:manage`.
- Registered the manage permission in module-registry and Admin access.
- Added SDK `unlockLoginUser` and Admin Login Logs unlock row action.
- Extended Admin static smoke and `tools/scripts/smoke-core-login-log.mjs`.
- Refreshed OpenAPI snapshot.

## Round 47 Verification

- `pnpm prisma:generate`
- `pnpm nx test security --testFile=security-auth.spec.ts`
- `pnpm nx test audit --testFile=audit-login-log.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test module-registry --testFile=index.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test api --testFile=auth.service.spec.ts`
- `node --check tools/scripts/smoke-core-login-log.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,security,audit,system,contracts,module-registry`
- `pnpm format:check`
- `pnpm prisma:migrate`
- `pnpm prisma:validate`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm lint`
- `pnpm nx lint security`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`auth.login-lockout.enforced`, `core.login-log.account-locked-filter` and
`core.login-log.unlock-restores-login`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included duplicate-prefix login compatibility,
Admin bundle cache checks and the same login-lockout/unlock guards.

## Round 47 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public API smoke passed after loading `.env.opencore.local` credentials:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-login-log`.
  Checks included `auth.login-lockout.enforced`,
  `core.login-log.account-locked-filter` and
  `core.login-log.unlock-restores-login`.
- Public Admin main bundle `umi.8f59c62c.js` contains the deployed API origin,
  `/core/login-logs/unlock` and no bundle-generated duplicate
  `/api/api/auth/login`.
- Public Admin Login Logs chunk
  `p__Security__LoginLogs.c1cd7a6e.async.js` contains
  `Audit trail with username unlock`, `account_locked`, `Unlock username` and
  `core:login-log:manage`.
- Public Admin login page returned `cache-control: no-cache`.
- Public Admin same-origin `/api/auth/login` succeeded.
- Public Admin same-origin `/api/core/login-logs/unlock` succeeded for a
  throwaway username.

## Round 47 Commit Record

- Feature commit:
  `8295eb5 feat(login-log): add login lockout unlock flow / 新增登录锁定解锁闭环`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 48 Capability

Capability: `core.login-log` cleanup maintenance actions.

Goal: add the RuoYi-style selected-row delete and clean-all maintenance surface
for login logs while keeping strict guards, permission boundaries, SDK/Admin
coverage and fixed/deploy/public smoke verification.

## Round 48 Implemented

- Rechecked RuoYi login-info `remove` and `clean` controller actions.
- Rechecked Yudao's current login-log controller as a read/export baseline.
- Added login-log batch delete and clean-all DTO/result contracts.
- Extended `@opencore/audit` login-log repository/service contracts.
- Implemented seed and Prisma `deleteLoginLogs` with empty-array,
  duplicate-ID, missing-ID and no-partial-delete protection.
- Implemented seed and Prisma `cleanLoginLogs` with affected count.
- Added `DELETE /api/core/login-logs/batch` and
  `DELETE /api/core/login-logs/clean` before the dynamic detail route.
- Registered dangerous `core:login-log:delete` permission in
  module-registry, API permission matrix and Admin access.
- Added SDK types/client methods and Admin platform service wrappers.
- Added Admin Login Logs row selection, `Delete selected` and `Clean all`
  actions guarded by `canDeleteLoginLogs`.
- Extended Admin static smoke and `tools/scripts/smoke-core-login-log.mjs`.
- Refreshed OpenAPI snapshot.

## Round 48 Verification

- `node --check tools/scripts/smoke-core-login-log.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test audit --testFile=audit-login-log.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test module-registry --testFile=index.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm test:admin`
- `pnpm openapi:export`
- `pnpm prisma:validate`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,audit,security,system,contracts,module-registry`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.login-log.batch-delete-empty-guard`,
`core.login-log.batch-delete-duplicate-guard`,
`core.login-log.batch-delete-missing-no-partial`,
`core.login-log.batch-delete`, `core.login-log.batch-delete-detail-404`,
`core.login-log.clean-all`, `core.login-log.clean-all-list-empty` and
`auth.post-clean-failed-login-recorded`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included duplicate-prefix login compatibility,
Admin bundle cache checks and the same login-log cleanup guards.

## Round 48 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.5e1fae41.js`
- Login Logs chunk: `p__Security__LoginLogs.1647b5aa.async.js`
- Public API smoke passed after loading `.env.opencore.local` credentials:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-login-log`.
  Checks included the batch-delete guard path, successful deletion, clean-all,
  empty-list assertion and post-clean failed-login recording.
- Public Admin login page returned `cache-control: no-cache`.
- Public Admin main bundle contains the deployed API origin and no
  bundle-generated duplicate `/api/api/auth/login`.
- Public Admin Login Logs chunk contains `Delete selected`, `Clean all`,
  `core:login-log:delete` and `Audit trail with unlock and cleanup`.
- Public Admin same-origin `/api/core/login-logs/batch` returned 400 for an
  empty `ids` payload, proving the deployed Admin proxy reaches the new route.

## Round 48 Commit Record

- Feature commit:
  `052d9be feat(login-log): add cleanup maintenance actions / 新增登录日志清理维护动作`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 49 Capability

Capability: `core.config/security-auth` configurable failed-attempt limit.

Goal: replace the hardcoded username/password failed-attempt threshold with
runtime `auth.login.maxFailedAttempts`, expose it to Admin/SDK/OpenAPI and
prove security-auth lockout enforcement consumes the configured value.

## Round 49 Implemented

- Rechecked RuoYi password retry settings
  `user.password.maxRetryCount`/`lockTime` and Yudao login-log outcome
  modeling.
- Added seeded public system config `auth.login.maxFailedAttempts` with
  default value `5`.
- Extended `SystemConfigRuntimeDto`, service result, SDK runtime type and
  OpenAPI snapshot with `loginMaxFailedAttempts`.
- Added runtime-key guardrails requiring
  `auth.login.maxFailedAttempts` to remain public, number typed and an integer
  between 1 and 20.
- Changed API `SystemSecurityLoginPolicyProvider` to read
  `runtimeConfig.loginMaxFailedAttempts` instead of using a hardcoded value.
- Added provider unit coverage proving runtime config maps to the security
  login policy.
- Updated Admin initial-state tests and login page to render
  `Login lockout policy: {attempts} failed attempts / {minutes} minutes`.
- Extended Admin static smoke to require the runtime field and deploy-script
  stale frontend guard.
- Extended `pnpm deploy:opencore` to reject Admin bundles missing
  `loginMaxFailedAttempts` or `Login lockout policy`.
- Extended `tools/scripts/smoke-core-config.mjs` with runtime failed-attempt
  update/restore and invalid value/visibility guards.
- Extended `tools/scripts/smoke-core-login-log.mjs` to set the threshold to 3,
  trigger lockout at that threshold, verify unlock count and restore the
  original value.

## Round 49 Verification

- `bash -n tools/scripts/deploy-local-opencore.sh tools/scripts/run-local-api-smoke.sh`
- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check tools/scripts/smoke-core-login-log.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test api --testFile=system-security-login-policy.provider.spec.ts`
- `pnpm nx test system --testFile=system-config.spec.ts --skip-nx-cache`
- `pnpm nx test sdk --testFile=registry-fixtures.spec.ts --skip-nx-cache`
- `pnpm nx test admin --skip-nx-cache`
- `pnpm nx test security --testFile=security-auth.spec.ts`
- `pnpm openapi:export`
- `pnpm prisma:validate`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,security,system,contracts --skip-nx-cache`
- `pnpm build:api`
- `FORCE_UTOOPACK= OPENCORE_ADMIN_BUNDLER=webpack NX_DAEMON=false pnpm exec nx build admin --skip-nx-cache`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.config.runtime-login-attempt-policy`,
`core.config.runtime-login-attempt-policy-guards` and
`auth.login-lockout.configurable-attempt-limit`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included duplicate-prefix login compatibility,
Admin no-cache/bundle checks, the new stale frontend login-policy guard and the
same runtime failed-attempt lockout guards.

## Round 49 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.91a0b1a3.js`
- Login page chunk: `p__user__login__index.b5055d16.async.js`
- Public API config smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-config`.
  Checks included `core.config.runtime-login-attempt-policy` and
  `core.config.runtime-login-attempt-policy-guards`.
- Public API login-log smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-login-log`.
  Checks included `auth.login-lockout.configurable-attempt-limit`.
- Public Admin login page returned no-cache headers.
- Public Admin main bundle contains API origin
  `http://144.217.243.161:39172` and no bundle-generated
  `/api/api/auth/login`.
- Public Admin login chunk contains `loginMaxFailedAttempts` and
  `Login lockout policy`.
- Public API and Admin proxy runtime config both returned
  `{ adminTitle: "OpenCore Admin", loginLockoutMinutes: 15, loginMaxFailedAttempts: 5 }`.
- Public Admin same-origin `/api/auth/login`, compatible
  `/api/api/auth/login` and public API `/api/api/auth/login` all returned a
  valid access token using the deployed admin credentials.

## Round 49 Commit Record

- Feature commit:
  `b4a0258 feat(login-policy): add configurable attempt limit / 新增登录失败次数策略`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 50 Capability

Capability: `core.login-log/security-auth` self logout session revocation.

Goal: turn Admin logout from a local-token-only action into a backend security
operation that revokes the current bearer session and records `logout.self`,
aligned with RuoYi `/logout` and Yudao `/system/auth/logout`.

## Round 50 Implemented

- Rechecked RuoYi `LogoutSuccessHandlerImpl` and Yudao auth logout flow:
  both remove the current token and record a logout login-log row.
- Added `LogoutResponseDto` and `POST /api/auth/logout` with bearer auth,
  explicit `@HttpCode(200)` and OpenAPI coverage.
- Added `SecurityAuthService.logout`, which verifies the current bearer token,
  asserts the session is active, revokes it by tokenId and records
  `logType=logout.self`, `result=success`.
- Extended `SecurityAuthSessionRepository` with `revokeSession(tokenId, ...)`.
- Implemented tokenId revocation in Prisma and seed online-user repositories;
  the allow-all repository keeps no-op behavior for tests that do not install
  online-user storage.
- Added security-auth unit coverage proving logout records `logout.self` and
  the same token later fails bearer authentication.
- Extended SDK RBAC types/client/spec with `logout(token)`.
- Changed Admin avatar logout to call `logoutFromOpenCore()` before clearing
  local token state and redirecting.
- Extended Admin static smoke to require `logoutFromOpenCore` in the auth
  service and avatar menu.
- Extended `tools/scripts/smoke-core-login-log.mjs` to create a temporary
  logout user, login, call `/auth/logout`, prove `/auth/me` rejects the same
  token and verify the `logout.self` row.

## Round 50 Verification

- `pnpm nx test security`
- `pnpm nx test sdk`
- `pnpm nx test online-user`
- `pnpm nx test api`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm nx typecheck api`
- `pnpm nx typecheck admin`
- `pnpm nx typecheck sdk`
- `pnpm nx typecheck security`
- `pnpm nx typecheck online-user`
- `pnpm smoke:api:local`
- `pnpm format:check`
- `pnpm lint`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`auth.logout.self`, `auth.logout.revokes-session` and
`core.login-log.logout-self-recorded`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included duplicate-prefix login compatibility,
public Admin no-cache/bundle checks and the same logout session-revocation
guards.

During the first local smoke run, `/auth/logout` returned Nest's default `201`
while OpenAPI advertised `200`. The fix was to add `@HttpCode(200)` to the
new logout controller action and keep the smoke strict. This is now captured as
a code-level contract instead of a memory note.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 50 lint
errors were introduced.

## Round 50 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.f9e7d7a1.js`
- Login page chunk: `p__user__login__index.b5055d16.async.js`
- Public API login-log smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-login-log`.
  Checks included `auth.logout.self`, `auth.logout.revokes-session` and
  `core.login-log.logout-self-recorded`.
- Public Admin main bundle contains API origin
  `http://144.217.243.161:39172` and `/auth/logout`.
- Public Admin main bundle does not contain the API base with an extra `/api`
  suffix.
- `pnpm deploy:opencore` also verified Admin same-origin `/api/auth/login`,
  duplicate `/api/api/auth/login`, public bundle API origin and retired service
  worker behavior.

## Round 50 Commit Record

- Feature commit:
  `f4ecd68 feat(auth): add self logout session revocation / 新增自助登出会话撤销`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 51 Capability

Capability: `core.login-log/monitor.online-user` forced logout logging.

Goal: make explicit Monitor Online Users kick-out create filterable
`logout.force` login-log rows, aligned with RuoYi online-user force logout and
Yudao admin token deletion, while avoiding false forced-logout rows from
internal RBAC/user session invalidation.

## Round 51 Implemented

- Rechecked RuoYi online-user `forceLogout` and Yudao OAuth2 token deletion:
  both treat forced token/session removal as an explicit operator action.
- Added `AuditLoginLogModule` to `OperationsModule`.
- Injected `AuditLoginLogService` into `OperationsController`.
- Recorded successful `logType=logout.force` rows after explicit single
  `POST /api/monitor/online-users/:id/kick-out`.
- Recorded successful `logout.force` rows for each returned item after batch
  `POST /api/monitor/online-users/kick-out`.
- Used the target session username, IP and user agent for the login-log row.
- Kept structured actor/reason on online-user
  `revokedBy/revokedReason`; current login-log schema carries the same context
  as `failureReason` text until a later structured actor/reason field is
  admitted.
- Kept logging at the controller boundary so role/user mutation session
  invalidation does not create false `logout.force` login-log rows.
- Extended `tools/scripts/smoke-core-online-user.mjs` with
  `core.login-log.logout-force-recorded`, proving the kicked token returns
  401 and a filterable forced logout row exists.
- Extended Admin static smoke to require `logout.force` and `Forced logout`
  markers in the Login Logs page.

## Round 51 Verification

- `node --check tools/scripts/smoke-core-online-user.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test api --testFile=operations.permission-matrix.spec.ts`
- `pnpm nx test online-user`
- `pnpm nx test admin`
- `pnpm prisma:seed`
- `pnpm nx test audit`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm nx typecheck api`
- `pnpm nx typecheck audit`
- `pnpm nx typecheck admin`
- `pnpm smoke:api:local`
- `pnpm format:check`
- `pnpm lint`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.login-log.logout-force-recorded`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included Admin same-origin login,
duplicate-prefix login compatibility, public bundle checks and the online-user
forced logout logging guard.

The first `pnpm nx test audit` run failed because the prior login-log
clean-all smoke had removed seeded login-log rows expected by existing audit
tests. After `pnpm prisma:seed`, `pnpm nx test audit` passed. This is a
test-data precondition/flaky-task note, not a Round 51 product failure.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 51 lint
errors were introduced.

## Round 51 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.ae1b5b3e.js`
- Login Logs chunk: `p__Security__LoginLogs.1647b5aa.async.js`
- Public API online-user smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-online-user`.
  Checks included `monitor.online-user.batch-kick-out`,
  `core.login-log.logout-force-recorded`,
  `monitor.online-user.revoked-token-rejected` and
  `monitor.online-user.admin-session-preserved`.
- Public Admin Login Logs chunk contains `logout.force` and `Forced logout`.
- `pnpm deploy:opencore` also verified Admin same-origin `/api/auth/login`,
  duplicate `/api/api/auth/login`, public bundle API origin and retired
  service-worker behavior.

## Round 51 Commit Record

- Feature commit:
  `bfd2454 feat(login-log): record forced logout entries / 记录强退登出日志`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 52 Capability

Capability: `core.dept` sibling order updates.

Goal: close the department ordered-tree operations gap by adding a same-parent
order update API/SDK/Admin loop, aligned with RuoYi `updateSort` and Yudao
department `sort`, while keeping data-scope workflow and drag-sort UI outside
this stage.

## Round 52 Implemented

- Rechecked RuoYi `SysDeptController.updateSort` and Yudao department save
  shape before selecting the slice.
- Added department order DTOs and mutation result DTOs in `@opencore/system`.
- Added repository/service order-update contracts with normalized item input.
- Implemented seed and Prisma same-parent order updates.
- Rejected duplicate IDs, missing IDs, cross-parent batches and malformed
  order values before mutation.
- Added `PATCH /api/core/depts/order` with `core:dept:update` permission.
- Updated API permission matrix, OpenAPI snapshot, SDK types/client/spec and
  Admin platform service.
- Added Admin Departments Move up / Move down row actions and a success
  message after saved order updates.
- Extended Admin static smoke with department order UI/service markers.
- Extended `tools/scripts/smoke-core-dept.mjs` with duplicate, missing,
  same-parent, bad-order, update, tree-order and simple-list-order checks.

## Round 52 Verification

- `node --check tools/scripts/smoke-core-dept.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-dept.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `pnpm nx typecheck system`
- `pnpm nx typecheck api`
- `pnpm nx typecheck sdk`
- `pnpm nx typecheck admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm prisma:validate`
- `pnpm smoke:api:local`
- `pnpm format:check`
- `pnpm lint`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm typecheck`
- `pnpm build`
- `pnpm prisma:seed`
- `pnpm nx test audit`
- `pnpm test`
- `git diff --check`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.dept.order.duplicate-guard`, `core.dept.order.missing-guard`,
`core.dept.order.same-parent-guard`, `core.dept.order.bad-order-guard`,
`core.dept.order.update`, `core.dept.order.tree-order` and
`core.dept.order.simple-list-order`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included Admin same-origin login,
duplicate-prefix login compatibility, public bundle checks, stale
service-worker retirement and the same department order guards.

The first `pnpm test` run failed at `audit:test` because a prior login-log
clean-all smoke had removed seeded login-log rows expected by existing audit
tests. After `pnpm prisma:seed`, both `pnpm nx test audit` and full
`pnpm test` passed. Nx still reported `audit:test` as flaky due to this
test-data precondition.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 52 lint
errors were introduced.

## Round 52 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.c97fac69.js`
- Departments chunk: `p__System__Departments.a9ff471b.async.js`
- Public API department smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-dept`.
  Checks included `core.dept.order.duplicate-guard`,
  `core.dept.order.missing-guard`, `core.dept.order.same-parent-guard`,
  `core.dept.order.bad-order-guard`, `core.dept.order.update`,
  `core.dept.order.tree-order` and `core.dept.order.simple-list-order`.
- Public Admin main bundle contains API origin
  `http://144.217.243.161:39172`, `/core/depts/order` and no
  `/api/api/auth/login`.
- Public Admin Departments chunk contains `Move up`, `Move down` and
  `Department order saved.`.

## Round 52 Commit Record

- Feature commit:
  `2086842 feat(dept): add sibling order updates / 新增部门同级排序`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 53 Capability

Capability: `core.post` ordered list updates.

Goal: close the post ordered-list refinement gap by adding a batch order update
API/SDK/Admin loop, aligned with RuoYi `postSort` and Yudao岗位 `sort`, while
keeping drag-sort-only UI and broader岗位 workflow automation outside this
stage.

## Round 53 Implemented

- Rechecked RuoYi post `postSort` table/form usage and Yudao岗位 `sort` save/
  response shape before selecting the slice.
- Added post order DTOs and mutation result DTOs in `@opencore/system`.
- Added repository/service order-update contracts with normalized item input.
- Implemented seed and Prisma order updates by post code.
- Rejected duplicate codes, missing codes and malformed order values before
  mutation.
- Added `PATCH /api/core/posts/order` with `core:post:update` permission before
  dynamic post detail routes.
- Updated API permission matrix, OpenAPI snapshot, SDK types/client/spec and
  Admin platform service.
- Added Admin Posts Move up / Move down row actions and a success message after
  saved order updates.
- Extended Admin static smoke with post order UI/service markers.
- Extended `tools/scripts/smoke-core-post.mjs` with bad-order, duplicate,
  missing, update, management-list-order and simple-list-order checks.

## Round 53 Verification

- `node --check tools/scripts/smoke-core-post.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-post.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `pnpm nx typecheck system`
- `pnpm nx typecheck api`
- `pnpm nx typecheck sdk`
- `pnpm nx typecheck admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm prisma:validate`
- `pnpm smoke:api:local`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm format:check`
- `git diff --check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm prisma:seed`
- `pnpm test`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.post.order.bad-order-guard`, `core.post.order.duplicate-guard`,
`core.post.order.missing-guard`, `core.post.order.update`,
`core.post.order.list-order` and `core.post.order.simple-list-order`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included Admin same-origin login,
duplicate-prefix login compatibility, public bundle checks, stale
service-worker retirement and the same post order guards.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 53 lint
errors were introduced.

## Round 53 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.1d2d9305.js`
- Posts chunk: `p__System__Posts.f6a42e2e.async.js`
- Public API post smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-post`.
  Checks included `core.post.order.bad-order-guard`,
  `core.post.order.duplicate-guard`, `core.post.order.missing-guard`,
  `core.post.order.update`, `core.post.order.list-order` and
  `core.post.order.simple-list-order`.
- Public Admin main bundle contains API origin
  `http://144.217.243.161:39172`, `/core/posts/order` and no
  `/api/api/auth/login`.
- Public Admin Posts chunk contains `Move up`, `Move down` and
  `Post order saved.`.

## Round 53 Commit Record

- Feature commit:
  `99078df feat(post): add ordered list updates / 新增岗位排序更新`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 54 Capability

Capability: `core.user/core.dept` data-scope query enforcement.

Goal: close the admitted department data-scope workflow gap by applying the
existing role dataScope model and `SecurityDataScopeGuard` to user management
query consumers, aligned with RuoYi `@DataScope` and Yudao data-permission
server-side filtering.

## Round 54 Implemented

- Rechecked RuoYi/Yudao data-scope enforcement and OpenCore's existing
  `@opencore/security` data-scope guard/service/policy before selecting the
  slice.
- Added internal `SystemUserDataScopeFilter` support to `@opencore/system`
  user list queries.
- Applied `RequireDataScope({ userIdField: 'id', deptIdField: 'deptId' })` to
  `GET /api/core/users`, `GET /api/core/users/export` and
  `GET /api/core/users/simple-list`.
- Converted request data-scope constraints into internal user query filters in
  the API controller without exposing a public OpenAPI input.
- Merged explicit department subtree filters with role data-scope filters in
  both seed and Prisma repositories.
- Preserved `all` scope behavior, denied `none` scope and supported restricted
  self/dept filters through `userIds`/`deptIds`.
- Extended seed and Prisma system-user tests for self-scope, department
  intersection, no-data scope, simple-list and export row counts.
- Extended `tools/scripts/smoke-core-user.mjs` with a temporary
  `dataScope=self` low-permission user proving list, simple-list and XLSX
  export only expose scoped data.

## Round 54 Verification

- `node --check tools/scripts/smoke-core-user.mjs`
- `pnpm nx test system`
- `pnpm nx test api`
- `pnpm nx typecheck system`
- `pnpm nx typecheck api`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm prisma:validate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm prisma:seed`
- `pnpm deploy:opencore`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.user.data-scope.self-list`, `core.user.data-scope.dept-intersection`,
`core.user.data-scope.simple-list` and `core.user.data-scope.export`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included Admin same-origin login,
duplicate-prefix login compatibility, public bundle checks, stale
service-worker retirement and the same user data-scope guards.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 54 lint
errors were introduced.

## Round 54 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.773e27e7.js`
- Users chunk: `p__System__Users.55735978.async.js`
- Public API user smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-user`.
  Checks included `core.user.data-scope.self-list`,
  `core.user.data-scope.dept-intersection`,
  `core.user.data-scope.simple-list` and
  `core.user.data-scope.export`.
- Public health/docs/Admin checks returned 200 for `/health/live`,
  `/health/ready`, `/api/docs-json` and `/user/login`.
- Public Admin main bundle contains API origin
  `http://144.217.243.161:39172` and no `/api/api/auth/login`.
- Public Admin Users chunk contains the existing `Department scope`,
  `/core/users/export`, `/core/users/simple-list` and `deptId` markers.

## Round 54 Commit Record

- Feature commit:
  `446d9af feat(user): enforce data-scope on user queries / 用户查询启用数据范围约束`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 55 Capability

Capability: `core.notice` inbox/read-state productization.

Round 55 closes the P1 notice read/unread and header badge stage without
claiming full delivery/fan-out depth.

Reference comparison:

- RuoYi exposes notice read helpers such as top-list, mark-read/all-read and
  read-user records around system notices.
- Yudao exposes notify message consumer APIs for unread count, unread list,
  personal message page and mark-read/all-read.
- OpenCore already had management CRUD from Round 1, but no persisted per-user
  read state, inbox consumer API or header notification entry.

## Round 55 Implemented

- Added Prisma `SystemNoticeReadReceipt` with unique `(noticeId, userId)`,
  read timestamps and cascade cleanup to notice/user rows.
- Added notice inbox DTOs and repository/service contracts for page, detail,
  unread-list, unread-count, mark-read and mark-all-read.
- Implemented seed and Prisma inbox behavior for published, currently valid
  `all/admin` notices only.
- Added guardrails for malformed `readStatus`, empty id arrays, duplicate ids,
  draft notices, missing notices and repeated mark-read idempotency.
- Added authenticated-only API routes:
  - `GET /api/core/notices/inbox`
  - `GET /api/core/notices/inbox/:id`
  - `GET /api/core/notices/inbox/unread-list`
  - `GET /api/core/notices/inbox/unread-count`
  - `POST /api/core/notices/inbox/read`
  - `POST /api/core/notices/inbox/read-all`
- Kept inbox consumer routes out of management permission requirements while
  still requiring a valid authenticated user.
- Extended SDK types/client/spec and refreshed OpenAPI.
- Added Admin System Notices `Manage` / `Inbox` tabs with inbox detail,
  unread state, mark-read, mark-all-read and current-page export.
- Added header `NoticeBell` with unread count, latest unread list and inbox
  navigation.
- Added `tools/scripts/smoke-core-notice.mjs` and wired it into fixed-port
  local smoke plus deploy smoke.
- Hardened `sync-prisma-client-instances.mjs` so Prisma 7 generated schema
  formatting no longer breaks workspace Prisma client synchronization.

Out of scope for Round 55:

- notification templates;
- WebSocket/mail/SMS delivery fan-out;
- delivery adapter configuration;
- tenant-scoped notices;
- BPM/workflow approval;
- full read-user analytics surface.

## Round 55 Verification

- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm nx test system --runInBand`
- `pnpm test:api --runInBand`
- `pnpm nx test sdk --runInBand`
- `pnpm test:admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm sdk:check`
- `pnpm exec prettier --check --ignore-unknown ...`
- `git diff --check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-notice`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.notice.inbox.auth-required`, `core.notice.inbox.bad-read-status-guard`,
`core.notice.inbox.empty-read-ids-guard`,
`core.notice.inbox.duplicate-read-ids-guard`,
`core.notice.inbox.draft-hidden`, `core.notice.inbox.mark-read`,
`core.notice.inbox.repeat-read-idempotent` and
`core.notice.inbox.mark-all-read`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included Admin same-origin login,
duplicate-prefix login compatibility, public bundle checks, stale
service-worker retirement and the same notice inbox guards.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 55 lint
errors were introduced.

## Round 55 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.72fe51c2.js`
- System Notices chunk: `p__System__Notices.b3ee31ae.async.js`
- Public API notice smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-notice`.
  Checks included auth-required, invalid read-status guard, empty/duplicate id
  guards, draft-hidden guard, unread page/list/count, mark-read idempotency,
  read/unread split and mark-all-read.
- Public Admin main bundle contains `/core/notices/inbox`,
  `/core/notices/inbox/unread-count`, `/core/notices/inbox/unread-list`,
  `/core/notices/inbox/read`, `/core/notices/inbox/read-all`,
  `/system/notices?tab=inbox` and `System notice inbox`.
- Public System Notices chunk contains `System Notices`,
  `System Notice Inbox Detail`, `Inbox (`, `Mark all read` and `Read At`.

## Round 55 Commit Record

- Feature commit:
  `15edffc feat(notice): add system notice inbox read state / 新增系统通知收件箱已读状态`.
- Docs commit: this documentation commit.
- Push: `origin/main`.

## Round 56 Capability

Capability: `core.notice` read-user analytics productization.

Round 56 closes the P1 notice read-user analytics stage that Round 55 left
open. It does not claim delivery adapter, template or WebSocket/mail/SMS
fan-out depth.

Reference comparison:

- RuoYi-style notice products expose read-user records around system notices so
  operators can verify whether announcements reached users.
- Yudao's notify-message model keeps read state explicit and queryable on the
  consumer side.
- OpenCore already had persisted `SystemNoticeReadReceipt` from Round 55, so
  the lowest-dependency management loop was to surface those receipts by
  notice.

## Round 56 Implemented

- Added `SystemNoticeReadUserDto`, page DTO and query DTO.
- Added `listNoticeReadUsers` to `@opencore/system` repository/service
  contracts.
- Implemented seed read-user lookup with seeded user metadata fallback.
- Implemented Prisma read-user lookup backed by
  `systemNoticeReadReceipt`, including user select and missing notice 404.
- Added `GET /api/core/notices/:id/read-users` with `core:notice:read` and
  route order before `GET /api/core/notices/:id`.
- Extended API permission matrix, OpenAPI snapshot, SDK types/client/spec and
  Admin platform service.
- Added Admin System Notices `Read users` row action and
  `System Notice Read Users` modal with username, display name and read time.
- Extended Admin static smoke to lock service and page markers.
- Extended `tools/scripts/smoke-core-notice.mjs` to prove missing read-user
  notice guards and real read receipt visibility after mark-read.

Out of scope for Round 56:

- notification templates;
- WebSocket/mail/SMS delivery fan-out;
- delivery adapter configuration;
- tenant-scoped notices;
- BPM/workflow approval;
- delivery/read analytics beyond the per-notice read-user list.

## Round 56 Verification

- `pnpm nx test system --runInBand`
- `pnpm nx test sdk --runInBand`
- `pnpm test:api --runInBand`
- `pnpm test:admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm sdk:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-notice`

`pnpm smoke:api:local` passed on fixed port `39173`, including
`core.notice.read-users.missing-guard` and `core.notice.read-users.list`.

`pnpm deploy:opencore` passed, deploying API/Admin on fixed ports
`39172`/`39174`; deploy smoke included Admin same-origin login,
duplicate-prefix login compatibility, public bundle checks, stale
service-worker retirement and the new notice read-user guards.

`pnpm lint` passed after rerunning it alone. A first attempt ran
`pnpm typecheck` and `pnpm lint` in parallel; both invoke Admin `max setup`,
which made `admin:lint` flaky by racing generated Umi types. Do not run
commands that invoke Admin `max setup` in parallel.

## Round 56 Public Verification

Against public endpoints after deploy:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.a866353b.js`
- System Notices chunk: `p__System__Notices.004f7e06.async.js`
- Public API notice smoke passed:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-notice`.
  Checks included missing read-users guard and read-users list visibility after
  mark-read.
- Public Admin main bundle contains `listNoticeReadUsers`.
- Public System Notices chunk contains `Read users` and
  `System Notice Read Users`.

## Round 56 Commit Record

- Feature commit:
  `e2601a7 feat(notice): add read user analytics / 新增通知已读用户分析`.
- Docs commit: this documentation commit.
- Push: `origin/main`.
