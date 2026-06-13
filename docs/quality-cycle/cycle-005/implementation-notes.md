# cycle-005 Implementation Notes

## Plan

- Add read-only detail repository contracts and controller routes for admitted S10/S11/S12 records.
- Keep deleted messages hidden and provider config redacted.
- Add SDK detail methods and path specs.
- Update permission matrix specs and OpenForge docs.

## Implementation Evidence

- Collaboration detail contracts added for messages, notices, todos, and Approval Lite requests:
  - Repository APIs now expose `getMessage`, `getNotice`, `getTodo`, and `getApprovalLiteRequest`.
  - Seed and Prisma repositories share the same visible-record behavior; deleted messages return not found from detail reads.
  - Controller routes now expose `GET /collaboration/messages/:id`, `GET /collaboration/notices/:id`, `GET /collaboration/todos/:id`, and `GET /collaboration/approvals/:id`.
  - Permission matrix and repository specs cover the read methods and hidden deleted-message policy.
- Operations detail contracts added for scheduler jobs, job runs, online users, and optional reports:
  - Repository APIs now expose `getJob`, `getJobRun`, `getOnlineUser`, and `getReport`.
  - Job-run lookup is scoped by both job code and run id.
  - Controller routes now expose `GET /monitor/jobs/:code`, `GET /monitor/jobs/:code/runs/:id`, `GET /monitor/online-users/:id`, and `GET /optional/reports/:code`.
  - Permission matrix and repository specs cover read-only detail lookups without triggering scheduler or report execution.
- Integration detail contracts added for providers, mail/SMS templates, and mail/SMS outbox messages:
  - Repository APIs now expose `getProvider`, `getTemplate`, and `getOutboxMessage`.
  - Provider detail responses keep config redacted.
  - Outbox lookup is scoped by channel and id.
  - Controller routes now expose `GET /integrations/providers/:code`, `GET /integrations/mail/templates/:code`, `GET /integrations/mail/outbox/:id`, `GET /integrations/sms/templates/:code`, and `GET /integrations/sms/outbox/:id`.
  - Permission matrix and repository specs cover provider redaction plus template/outbox detail reads.
- SDK clients now include detail methods and path specs across collaboration, operations, and integration clients.
- OpenForge authoring and architecture docs now require list/detail/action-heavy generated modules to define read-only detail endpoints with explicit read permission, redaction, and hidden/deleted-record policy.
- OpenAPI export now includes 90 paths, 118 operations, and 108 schemas after the detail endpoints were admitted.
