# Round 55 Completion Report: core.notice Inbox Read-State

## Scope

Round 55 closed the admitted notice inbox/read-state stage for `core.notice`.

This round delivered:

- persisted `SystemNoticeReadReceipt` rows with unique `(noticeId, userId)`;
- authenticated notice inbox page/detail, unread-list, unread-count,
  mark-read and mark-all-read APIs;
- seed and Prisma repository behavior for published, currently valid
  `all/admin` audience notices;
- strict guards for malformed `readStatus`, empty/duplicate read ids, hidden
  drafts, missing notices and repeated mark-read idempotency;
- SDK/OpenAPI coverage for the inbox consumer routes;
- Admin System Notices `Manage` / `Inbox` tabs with inbox detail, read state,
  row mark-read, mark-all-read and current-page export;
- header `NoticeBell` with unread count, latest unread list, mark-read,
  mark-all-read and inbox navigation;
- fixed-port, deploy and public smoke coverage through
  `tools/scripts/smoke-core-notice.mjs`;
- Prisma client sync hardening for Prisma 7 generated schema formatting.

Out of scope: notification templates, delivery adapter configuration,
WebSocket/mail/SMS fan-out, tenant-scoped notices, BPM approval and full
read-user analytics.

## Commits

- Feature commit:
  `15edffc feat(notice): add system notice inbox read state / 新增系统通知收件箱已读状态`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.72fe51c2.js`
- System Notices chunk: `p__System__Notices.b3ee31ae.async.js`

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Local fixed-port smoke passed on `39173` with:

- `core.notice.inbox.auth-required`
- `core.notice.inbox.bad-read-status-guard`
- `core.notice.inbox.empty-read-ids-guard`
- `core.notice.inbox.duplicate-read-ids-guard`
- `core.notice.inbox.draft-hidden`
- `core.notice.inbox.mark-draft-hidden-guard`
- `core.notice.inbox.unread-page`
- `core.notice.inbox.unread-list`
- `core.notice.inbox.unread-count`
- `core.notice.inbox.mark-read`
- `core.notice.inbox.repeat-read-idempotent`
- `core.notice.inbox.read-page`
- `core.notice.inbox.mark-all-read`

Deploy smoke passed on fixed ports `39172`/`39174` with the same notice checks,
plus Admin same-origin login, duplicate-prefix login compatibility, public
Admin bundle checks and retired service-worker behavior.

Public API notice smoke passed with the same notice inbox checks against
`http://144.217.243.161:39172`.

Public Admin verification passed with:

- main bundle `umi.72fe51c2.js` containing `/core/notices/inbox`,
  `/core/notices/inbox/unread-count`, `/core/notices/inbox/unread-list`,
  `/core/notices/inbox/read`, `/core/notices/inbox/read-all`,
  `/system/notices?tab=inbox` and `System notice inbox`;
- System Notices chunk `p__System__Notices.b3ee31ae.async.js` containing
  `System Notices`, `System Notice Inbox Detail`, `Inbox (`, `Mark all read`
  and `Read At`.

## Remaining Debt

- `core.notice`: delivery adapter design, notification templates and any
  admitted WebSocket/mail/SMS fan-out.
- `core.notice`: read-user analytics if the product admits an operator-facing
  read-user report.
- `core.notice`: tenant-scoped notices and BPM approval remain separate
  admissions.
