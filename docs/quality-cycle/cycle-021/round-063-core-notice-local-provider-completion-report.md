# Round 63 Completion Report: core.notice Local Delivery Provider

Date: 2026-06-13

Feature commit:
`b53edcc feat(notice): execute local delivery provider / 执行本地通知投递提供器`

## Scope

Round 63 productized the local provider execution stage for `core.notice`.
Round 61 had durable in-app delivery records and idempotent dispatch, but
delivery rows were still an outbox without an execution state. This round adds
provider execution metadata and an explicit operator action before real
WebSocket/SMS/Mail adapters are admitted.

## Delivered

- Added provider execution fields to `SystemNoticeDelivery`: `provider`,
  `providerStatus`, `attemptCount`, `lastAttemptAt`, `sentAt` and `lastError`.
- Backfilled existing and seeded delivery rows as sent local-provider records.
- Kept read-state `status` separate from execution-state `providerStatus`.
- Made new publish/dispatch rows enter `pending`.
- Added `POST /api/core/notices/:id/deliveries/execute` for idempotent
  `in_app.local` provider execution under `core:notice:update`.
- Added `providerStatus` filtering and strict deserialization guards.
- Updated Prisma and seed repositories, DTOs, SDK, OpenAPI and Admin services.
- Added Admin `Execute local provider` action and Provider/Provider
  Status/Attempts/Last Attempt At/Sent At/Last Error columns.
- Extended fixed-port, deploy and public smoke for provider execution.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

`pnpm lint` passed with existing warnings in
`packages/system/src/system-user/system-user.prisma-repository.ts` and
`apps/admin/src/pages/shared/CurrentPageExportButton.tsx`; no Round 63 lint
errors were introduced.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.909cfc55.js`
- System Notices chunk: `p__System__Notices.ca48749a.async.js`
- Public `smoke:core-notice` passed against `http://144.217.243.161:39172`.
- Public Admin chunk contains `Execute local provider`, `Provider Status`,
  `Local provider executed` and `sent`.
- Public OpenAPI docs contain
  `/api/core/notices/{id}/deliveries/execute`, `providerStatus` and
  `SystemNoticeDeliveryExecutionResultDto`.

## Smoke Evidence

The notice smoke now proves:

- malformed providerStatus values are rejected;
- published local-provider delivery rows start as `pending`;
- `POST /core/notices/:id/deliveries/execute` executes the local provider;
- executed rows become `sent` with attempt metadata;
- repeat execution is idempotent;
- read-state sync still works after provider execution.

## Remaining Notice Debt

- Real WebSocket/SMS/Mail adapter execution.
- Multi-channel failure and retry queues.
- Provider credential binding and health checks.
- Tenant-scoped notices.
- Member/mobile notification channels.
- BPM approval around announcements.
