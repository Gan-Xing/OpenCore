# Round 056 Completion Report: core.notice Read-User Analytics

Date: 2026-06-13
Feature commit:
`e2601a7 feat(notice): add read user analytics / 新增通知已读用户分析`

## Capability

`core.notice` read-user analytics productization.

Round 56 closes the management-side read-user analytics stage for system
notices. It builds on Round 55 read receipts and does not claim notification
templates, delivery adapters, WebSocket/mail/SMS fan-out, tenant notices or BPM
approval.

## Delivered

- Added notice read-user DTOs and page query shape.
- Added `listNoticeReadUsers` to `@opencore/system` repository and service
  contracts.
- Implemented seed and Prisma read-user queries backed by real
  `SystemNoticeReadReceipt` rows.
- Added `GET /api/core/notices/:id/read-users` protected by
  `core:notice:read`.
- Extended API permission matrix, OpenAPI snapshot and SDK client/types/tests.
- Added Admin System Notices row-level `Read users` action and
  `System Notice Read Users` modal.
- Extended Admin static smoke and `tools/scripts/smoke-core-notice.mjs` so the
  route and UI are guarded.

## Verification

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

Deployment completed through `pnpm deploy:opencore` on fixed ports:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`

Public Admin verification:

- Main bundle `umi.a866353b.js` contains `listNoticeReadUsers`.
- System Notices chunk `p__System__Notices.004f7e06.async.js` contains
  `Read users` and `System Notice Read Users`.

## Smoke Guard Added

`tools/scripts/smoke-core-notice.mjs` now verifies:

- missing notice read-user queries return 404;
- a published notice can be marked read by the logged-in user;
- `GET /core/notices/:id/read-users` returns that user with a non-empty
  `readAt`.

## Remaining Notice Debt

- Notification template productization.
- Delivery adapter configuration.
- WebSocket/mail/SMS fan-out if admitted.
- Tenant-scoped notices if admitted.
- BPM/workflow approval around announcements if admitted.

## Notes

Do not run commands that invoke Admin `max setup` in parallel. A first
repo-level gate attempt ran `pnpm typecheck` and `pnpm lint` simultaneously,
and `admin:lint` became flaky because generated Umi types were raced. Running
the same lint command alone passed.
