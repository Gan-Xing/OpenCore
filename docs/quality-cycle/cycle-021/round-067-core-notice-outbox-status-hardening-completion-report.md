# Round 67 Completion Report: core.notice Outbox Status Hardening

Date: 2026-06-13
Cycle: `cycle-021`
Capability: `core.notice`
Stage: integration outbox retry/status hardening

## Summary

Round 67 closes a Round 66 state-machine defect. Mail/SMS outbox handoff no
longer marks notice deliveries as sent when the work is only queued. External
notice delivery status now follows explicit IntegrationOutbox failed, retry and
sent transitions, and the same behavior is guarded in API tests, SDK tests,
Admin static smoke, deploy stale-bundle checks and public notice smoke.

## Defect Closed

Round 66 incorrectly allowed this state:

- `IntegrationOutbox.status = queued`
- matching `SystemNoticeDelivery.providerStatus = sent`

That was wrong because queued/accepted work is not provider success. Round 67
directly replaces that behavior. Mail/SMS execute creates outbox work and keeps
the delivery pending until an outbox status operation moves it to failed,
queued-for-retry or sent.

## Implemented

- Kept mail/SMS delivery rows `pending` after outbox handoff and made external
  execute return `sentCount=0`.
- Prevented repeat mail/SMS execute from duplicating outbox rows for deliveries
  that already have `providerMessageId`.
- Added mail/SMS Integration outbox state APIs:
  - `PATCH /api/integrations/mail/outbox/:id/failed`
  - `PATCH /api/integrations/mail/outbox/:id/retry`
  - `PATCH /api/integrations/mail/outbox/:id/sent`
  - `PATCH /api/integrations/sms/outbox/:id/failed`
  - `PATCH /api/integrations/sms/outbox/:id/retry`
  - `PATCH /api/integrations/sms/outbox/:id/sent`
- Added strict failure reason normalization and sent-message mutation guards.
- Synchronized outbox failed/retry/sent transitions back to notice delivery
  rows through `payload.deliveryId` plus `providerMessageId`.
- Extended SDK types/client/spec and Integration controller permission matrix.
- Added Admin System Notices delivery-row `Outbox Actions` for `Fail outbox`,
  `Retry outbox` and `Mark outbox sent`.
- Extended notice smoke for pending handoff, repeat execute idempotency, blank
  failure 400, failed -> retry -> sent synchronization and sent-row guards.
- Extended deploy stale-bundle checks for the new outbox action markers.
- Replaced prior ledger `this-commit` placeholders for Rounds 64-66 with real
  hashes: `719c4ce`, `f55c8f3` and `119128c`.

## Out Of Scope

- Real external SMTP/SMS provider workers.
- Webhook/callback reconciliation.
- Automatic retry backoff or worker queue orchestration.
- WebSocket realtime push.
- Tenant/member/mobile notice channels.
- BPM approval around announcements.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Passed gates:

- Focused API/system/SDK/Admin tests for outbox state operations.
- Prisma validate/generate/seed, OpenAPI export/check, SDK check, typecheck,
  lint, root test/build, format check and diff check.
- Fixed local smoke on `39173`, including
  `core.notice.deliveries.outbox-failed-retry-sent-sync`.

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.288260ce.js`
- System Notices chunk: `p__System__Notices.eb30aad5.async.js`

Public verification passed: notice smoke on the public API, System Notices
chunk markers for `Fail outbox`/`Retry outbox`/`Mark outbox sent`, and OpenAPI
markers for the six mail/SMS outbox state paths plus `FailOutboxMessageDto`.

## Commit

- Feature+docs commit: current Round 67 feature+docs commit.
- Push: `origin/main`.
