# Cycle-021 Round 12 Completion Report: core.audit-log

Date: 2026-06-12

## Capability

`core.audit-log` productization plus Admin API origin deploy guard.

This round turns the existing operation-log runtime into a logged-in,
read-only Admin audit loop with API detail, SDK detail support, OpenAPI, Admin
page and smoke coverage. It also fixes the deployed frontend `/api/api` login
regression by making `ADMIN_API_BASE_URL` an API origin instead of an
`/api`-prefixed API path.

## Reference Comparison

RuoYi exposes operation logs as a Monitor operation surface with list, export,
detail, delete and clean operations. Yudao exposes operate-log detail, page and
export APIs under System with trace, user, request and extra metadata fields.

OpenCore admitted only the bounded immutable audit loop for this round:

- operation-log list, detail and current-page export;
- live read-only Admin page and detail drawer;
- smoke verification that a real write operation is recorded by the global
  audit interceptor;
- deploy guard preventing `/api`-suffixed Admin API base URLs.

OpenCore did not admit delete/clean, batch delete, duration/location/user-agent
schema expansion, operation type enum expansion, async indexing or
business-domain audit timeline views.

## Implemented

- Added `GET /api/core/audit-logs/:id`, guarded by `core:audit-log:read`.
- Added `getOperationLog` to `@opencore/audit` repository/service contracts and
  seed/Prisma implementations.
- Added typed `AuditLogQueryRequest` and SDK `getAuditLog`.
- Replaced the fixture-only Operation Logs Admin page with a live SDK-backed
  read-only table, detail drawer and current-page export.
- Added `tools/scripts/smoke-core-audit-log.mjs`.
- Wired audit-log smoke into `pnpm smoke:api:local` and
  `pnpm deploy:opencore`.
- Hardened deploy so `ADMIN_API_BASE_URL` defaults to
  `http://<host>:39172` and rejects values ending in `/api` or `/api/`.
- Refreshed OpenAPI snapshot and deployment docs.

## Verification

- `node --check tools/scripts/smoke-core-audit-log.mjs` pass.
- `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
  pass.
- `pnpm exec tsc --noEmit -p packages/audit/tsconfig.lib.json` pass.
- `pnpm exec tsc --noEmit -p packages/sdk/tsconfig.lib.json` pass.
- `NX_DAEMON=false pnpm nx run api:typecheck` pass.
- `NX_DAEMON=false pnpm nx run admin:typecheck` pass.
- `NX_DAEMON=false pnpm nx run-many -t test --projects=audit,api,sdk` pass.
- `pnpm test:admin` pass.
- `pnpm openapi:export` pass.
- `pnpm openapi:check` pass.
- `pnpm sdk:check` pass.
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test &&
pnpm openapi:registry-tags:check && pnpm registry:admin-routes:check &&
pnpm smoke:api:local` pass.
- `pnpm build && pnpm prisma:validate` pass.
- `pnpm deploy:opencore` pass on fixed ports `39172` and `39174`.

## Public Deploy Verification

- Frontend: `http://144.217.243.161:39174/user/login`.
- API: `http://144.217.243.161:39172`.
- Login HTML returns `cache-control: no-cache`.
- Deployed Admin bundle contains `http://144.217.243.161:39172`.
- Deployed Admin bundle does not contain
  `http://144.217.243.161:39172/api`.
- Direct API login `POST /api/auth/login` returns 201.
- Admin same-origin proxy login `POST /api/auth/login` on port `39174`
  returns 201.

## Commit Record

- Feature commit:
  `26c4e1c feat(core-audit-log): productize operation audit trail / 产品化操作审计日志链路`.
- Docs commit: this documentation commit.
- Push: `origin/main`.
