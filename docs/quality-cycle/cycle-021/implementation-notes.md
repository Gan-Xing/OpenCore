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
