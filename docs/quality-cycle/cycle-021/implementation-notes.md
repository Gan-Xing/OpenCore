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

- Feature commit: pending.
- Push: pending.
