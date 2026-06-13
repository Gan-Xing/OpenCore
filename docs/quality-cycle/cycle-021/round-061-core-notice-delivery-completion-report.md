# Round 61 Completion Report: core.notice Delivery Records

Date: 2026-06-13
Feature commit: `27cfa0c feat(notice): add notice delivery records / 新增通知投递记录`

## Scope

Round 61 productized the persisted in-app delivery/message-record stage for
`core.notice`. OpenCore now creates durable per-recipient delivery rows for
published notices, lets operators inspect delivery records and supports
explicit idempotent dispatch.

This round deliberately stayed inside System Notice foundation scope. It did
not add real WebSocket/mail/SMS provider adapter execution, multi-channel retry
queues, tenant notices, BPM approval or member/mobile notification channels.

## Delivered

- Prisma `SystemNoticeDelivery` model, migration and seeded delivery data.
- Seed drift fix that resolves the actual admin user id by username instead of
  assuming an existing database still uses `user_admin`.
- `@opencore/system` DTOs, records, seed/Prisma repositories, service methods
  and tests for delivery listing, publish-time auto dispatch, explicit
  dispatch, read sync and guards.
- API routes:
  - `GET /api/core/notices/:id/deliveries`
  - `POST /api/core/notices/:id/dispatch`
- SDK types/client/spec, registry fixtures and OpenAPI snapshot updates.
- Admin System Notices `Delivery records` modal and
  `Dispatch in-app deliveries` action.
- Fixed-port/deploy/public smoke guards for missing notice delivery queries,
  draft dispatch blocking, malformed `readStatus/channel` deserialization,
  unread/read delivery records, dispatch idempotency and read sync.
- Deploy-script stale bundle guard for the System Notices delivery UI markers.

## Verification

- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm prisma:validate`
- `pnpm nx test system --testFile=packages/system/src/system-notice/system-notice.spec.ts`
- `pnpm nx test sdk --testFile=packages/sdk/src/system-management-client.spec.ts`
- `pnpm --dir apps/admin test`
- `pnpm openapi:export`
- `pnpm openapi:registry-tags:check`
- `pnpm sdk:check`
- `pnpm typecheck`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm openapi:check`
- `pnpm smoke:api:local`
- `git diff --check`
- `bash -n tools/scripts/deploy-local-opencore.sh`
- `pnpm deploy:opencore`
- `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-notice`

Public deployment:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`

Public Admin bundle verification proved these deployed markers:

- `System Notice Delivery Records`
- `Delivery records`
- `Dispatch in-app deliveries`
- `listNoticeDeliveries`
- `dispatchNotice`

## Smoke Evidence

`tools/scripts/smoke-core-notice.mjs` now verifies:

- `core.notice.deliveries.missing-guard`
- `core.notice.deliveries.dispatch-draft-guard`
- `core.notice.deliveries.bad-read-status-guard`
- `core.notice.deliveries.bad-channel-guard`
- `core.notice.deliveries.unread-records`
- `core.notice.deliveries.dispatch-idempotent`
- `core.notice.deliveries.read-records`

## Remaining Notice Debt

- Real WebSocket/mail/SMS provider adapter execution.
- Multi-channel retry/failure queues and delivery failure observability.
- Tenant-scoped notices.
- BPM approval around announcements.
- Member/mobile notification channels.

These remain separate foundation/productization stages and are not hidden
inside Round 61.
