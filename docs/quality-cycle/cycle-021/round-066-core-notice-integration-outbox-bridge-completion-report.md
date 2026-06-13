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

## Out Of Scope

- Real external SMTP/SMS provider sending.
- Webhook/callback reconciliation.
- Retry/failure queue orchestration.
- WebSocket realtime push.
- Tenant/member/mobile notice channels.
- BPM approval around announcements.

## Verification

- `pnpm exec jest -c packages/system/jest.config.ts packages/system/src/system-notice/system-notice.spec.ts --runInBand`
- `pnpm nx test sdk --testFile=packages/sdk/src/system-management-client.spec.ts --testFile=packages/sdk/src/integration-client.spec.ts --testFile=packages/sdk/src/registry-fixtures.spec.ts`
- `pnpm --dir apps/admin test`
- `bash -n tools/scripts/deploy-local-opencore.sh`
- `node --check tools/scripts/smoke-core-notice.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm prisma:validate`
- `pnpm prisma:migrate`
- `pnpm prisma:generate`
- `pnpm prisma:seed`
- `pnpm typecheck`
- `pnpm openapi:export`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm openapi:check`
- `pnpm lint`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm smoke:api:local`
- `pnpm format:check`
- `git diff --check`
- `pnpm exec jest -c packages/system/jest.config.ts --runInBand`
- `pnpm registry:admin-routes:check`
- `pnpm deploy:opencore`

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

- Feature+docs commit: this commit.
- Push: `origin/main`.
