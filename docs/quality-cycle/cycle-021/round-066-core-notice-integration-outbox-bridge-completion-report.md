# Round 66 Completion Report: core.notice Integration Outbox Provider Bridge

Date: 2026-06-13
Cycle: `cycle-021`
Capability: `core.notice`
Stage: mail/SMS sandbox integration outbox bridge

## Summary

Round 66 productized the next `core.notice` P1 delivery stage. OpenCore can now
dispatch and execute notice deliveries by channel: `in_app` continues through
the local provider path, while `mail` and `sms` use sandbox integration
providers to enqueue `IntegrationOutbox` rows and record delivery
`recipient/providerMessageId` values for operator traceability.

This is a feature+docs commit by design: runtime code, tests, deploy guards,
OpenAPI/SDK/Admin changes and cycle documentation are kept together so the
deployed product state and the productization record do not drift.

## Implemented

- Added `recipient` and `providerMessageId` to `SystemNoticeDelivery` with a
  migration and provider-message index.
- Added the missing integration runtime table migration for
  `IntegrationProvider`, `IntegrationTemplate` and `IntegrationOutbox`.
- Seeded Integration providers/templates/outbox through `prisma/seed.ts`.
- Extended notice dispatch and delivery execution request bodies with optional
  `channel=in_app|mail|sms`.
- Added `mail.sandbox` and `sms.sandbox` provider mapping, provider readiness
  guards and deterministic sandbox recipients.
- Queued mail/SMS deliveries into `IntegrationOutbox` and surfaced
  `queuedOutboxCount`.
- Updated DTOs, service/repository contracts, Prisma and seed repositories,
  SDK types/client/spec and OpenAPI.
- Added Admin System Notices mail/SMS dispatch and execute actions plus
  Recipient and Provider Message delivery columns.
- Extended fixed-port/deploy/public notice smoke for disabled provider guard,
  provider enablement, outbox rows and delivery/outbox payload matching.
- Extended Admin static smoke and deploy-script stale bundle guards for the new
  System Notices UI markers.

## Follow-up Defect

Round 67 later identified and corrected a Round 66 state-machine defect: queued
mail/SMS `IntegrationOutbox` handoff was being reflected as provider `sent` on
the matching notice delivery. The current intended semantics are that queued
outbox work keeps notice delivery `pending` until explicit outbox failed,
retry or sent transitions synchronize back to the delivery row.

## Out Of Scope

- Real external SMTP/SMS provider sending.
- Webhook/callback reconciliation.
- Retry/failure queue orchestration.
- WebSocket realtime push.
- Tenant/member/mobile notice channels.
- BPM approval around announcements.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

`pnpm lint` passed with existing warnings only:

- `packages/system/src/system-user/system-user.prisma-repository.ts`
- `apps/admin/src/pages/shared/CurrentPageExportButton.tsx`

`pnpm smoke:api:local` passed on fixed port `39173`, including:

- `core.notice.deliveries.mail-outbox-provider`
- `core.notice.deliveries.sms-outbox-provider`

## Deploy And Public Verification

`pnpm deploy:opencore` passed and deployed fixed ports:

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.244622b2.js`
- System Notices chunk: `p__System__Notices.b68b76ed.async.js`

Public verification passed:

- Public API notice smoke:
  `OPENCORE_SMOKE_BASE_URL=http://144.217.243.161:39172 pnpm smoke:core-notice`.
- Public System Notices chunk contains `Dispatch mail deliveries`,
  `Dispatch SMS deliveries`, `Execute mail outbox provider`,
  `Execute SMS outbox provider` and `Provider Message`.
- Public OpenAPI docs contain dispatch/execute channel schemas for mail/SMS and
  delivery `recipient/providerMessageId`.

## Commit

- Feature+docs commit: `119128c`.
- Push: `origin/main`.
