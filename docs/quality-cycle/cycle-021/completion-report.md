# cycle-021 Completion Report

Date: 2026-06-13

## Latest Completed Round

Round 76: `notice.mail` outbox subject persistence.

## Closed

- Added `IntegrationOutbox.subject` and Prisma migration/seed support.
- Rendered mail template subjects into queued outbox rows.
- SMTP delivery now sends the persisted outbox subject instead of reading
  `payload.subject` or `payload.title`.
- SDK/Admin/OpenAPI/smoke/deploy guards expose and verify mail outbox subject.

## Still Open

- Notice still needs realtime push, broader provider-secret injection,
  STARTTLS/attachments and provider diagnostics.
